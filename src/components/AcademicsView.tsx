import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Upload,
  FileSpreadsheet,
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { AppState, MonthlyGradeRecord, AcademicGradeBackup } from '../types';
import {
  calculateClassAcademicSummary,
  downloadAcademicExcelTemplate,
  exportAcademicClassToExcel,
  ExcelImportParseResult,
  mergeMonthlyGrades,
  parseGradeValue,
} from '../utils/academicHelpers';
import { getCurrentMonthStr, formatDisplayDate } from '../utils/helpers';
import { ExcelAcademicImportModal } from './ExcelAcademicImportModal';
import { SubjectConfigModal } from './SubjectConfigModal';
import { DeleteMonthlyGradesModal, DeleteGradesStatus } from './DeleteMonthlyGradesModal';
import { RestoreAcademicGradesModal } from './RestoreAcademicGradesModal';

interface AcademicsViewProps {
  state: AppState;
  isTeacher: boolean;
  currentStudentId?: string | null;
  onUpdateAcademicGrades: (updatedGrades: MonthlyGradeRecord[]) => void;
  onUpdateConfig: (newConfig: Partial<AppState['config']>) => void;
  onPublishHonors?: (month: string) => void;
  onSelectStudent?: (studentId: string, month?: string) => void;
  onDeleteMonthlyGrades?: (
    month: string,
    onProgress?: (step: 'backing_up' | 'deleting') => void
  ) => Promise<{ success: boolean; error?: string }>;
  onRestoreMonthlyGrades?: (backup: AcademicGradeBackup) => Promise<{ success: boolean; error?: string }>;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const AcademicsView: React.FC<AcademicsViewProps> = ({
  state,
  isTeacher,
  currentStudentId,
  onUpdateAcademicGrades,
  onUpdateConfig,
  onPublishHonors,
  onSelectStudent,
  onDeleteMonthlyGrades,
  onRestoreMonthlyGrades,
  onShowToast,
}) => {
  const currentMonth = getCurrentMonthStr();
  const className = state.config.className || 'Lớp';
  const schoolYear = state.config.schoolYear || '2026-2027';
  const subjects = state.config.subjects || [];
  const evalSubjects = state.config.evaluationSubjects || [];

  // Distinct recorded months for this class
  const recordedMonths = useMemo(() => {
    return Array.from(
      new Set(
        (state.academicGrades || [])
          .filter((g) => !g.className || g.className === className)
          .map((g) => g.month)
      )
    )
      .sort()
      .reverse();
  }, [state.academicGrades, className]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // If state.academicGrades has data for currentMonth, use it
    const hasCurrent = (state.academicGrades || []).some((g) => g.month === currentMonth);
    if (hasCurrent) return currentMonth;
    // Otherwise pick the latest month that has records
    const recorded = Array.from(new Set((state.academicGrades || []).map((g) => g.month))).sort().reverse();
    return recorded[0] || currentMonth;
  });

  // Auto-sync selectedMonth if current selected has no data but other recorded months exist
  React.useEffect(() => {
    if (recordedMonths.length > 0 && !recordedMonths.includes(selectedMonth)) {
      setSelectedMonth(recordedMonths[0]);
      setEditGradesBuffer({});
      setHasUnsavedChanges(false);
    }
  }, [recordedMonths, selectedMonth]);

  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<DeleteGradesStatus>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Direct editing buffer: studentId -> subject -> score
  const [editGradesBuffer, setEditGradesBuffer] = useState<
    Record<string, Record<string, string>>
  >({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [y, m] = selectedMonth.split('-');
  const monthDisplay = `Tháng ${Number(m)}/${y}`;

  // Month navigation
  const handlePrevMonth = () => {
    const d = new Date(Number(y), Number(m) - 2, 1);
    const prevY = d.getFullYear();
    const prevM = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${prevY}-${prevM}`);
    setEditGradesBuffer({});
    setHasUnsavedChanges(false);
  };

  const handleNextMonth = () => {
    const d = new Date(Number(y), Number(m), 1);
    const nextY = d.getFullYear();
    const nextM = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${nextY}-${nextM}`);
    setEditGradesBuffer({});
    setHasUnsavedChanges(false);
  };

  // Academic announcements (Bản nháp / Đã công bố)
  const currentAnnouncement = useMemo(() => {
    return (state.academicAnnouncements || []).find(
      (a) =>
        a.className === className &&
        a.schoolYear === schoolYear &&
        a.month === selectedMonth
    );
  }, [state.academicAnnouncements, className, schoolYear, selectedMonth]);

  const isPublished = currentAnnouncement?.isPublished ?? false;

  // Detect if grades were modified after publishing
  const hasModifiedAfterPublish = useMemo(() => {
    if (!isPublished || !currentAnnouncement?.publishedAt) return false;
    const pubTime = new Date(currentAnnouncement.publishedAt).getTime();
    return (state.academicGrades || []).some(
      (g) =>
        g.className === className &&
        g.schoolYear === schoolYear &&
        g.month === selectedMonth &&
        g.updatedAt &&
        new Date(g.updatedAt).getTime() > pubTime
    );
  }, [state.academicGrades, isPublished, currentAnnouncement, className, schoolYear, selectedMonth]);

  // Merge buffer with allGrades for live display
  const effectiveGrades = useMemo(() => {
    const baseList = state.academicGrades || [];
    if (!hasUnsavedChanges) return baseList;

    const merged = [...baseList];
    Object.keys(editGradesBuffer).forEach((studentId) => {
      const studentMap = editGradesBuffer[studentId];
      Object.keys(studentMap).forEach((subject) => {
        const strVal = studentMap[subject];
        const parsed = parseGradeValue(strVal);

        const existingIdx = merged.findIndex(
          (r) =>
            r.className === className &&
            r.schoolYear === schoolYear &&
            r.month === selectedMonth &&
            r.studentId === studentId &&
            r.subject === subject
        );

        if (parsed.isValid && parsed.score !== undefined) {
          if (existingIdx >= 0) {
            merged[existingIdx] = {
              ...merged[existingIdx],
              score: parsed.score,
              updatedAt: new Date().toISOString(),
            };
          } else {
            merged.push({
              id: `mg_${studentId}_${selectedMonth}_${subject}`,
              className,
              schoolYear,
              month: selectedMonth,
              studentId,
              subject,
              score: parsed.score,
              updatedAt: new Date().toISOString(),
            });
          }
        } else if (parsed.isValid && parsed.score === undefined && existingIdx >= 0) {
          // Cleared cell
          merged.splice(existingIdx, 1);
        }
      });
    });

    return merged;
  }, [state.academicGrades, editGradesBuffer, hasUnsavedChanges, className, schoolYear, selectedMonth]);

  // Compute full class summary and ranking
  const classSummaries = useMemo(() => {
    return calculateClassAcademicSummary(
      state.students,
      className,
      schoolYear,
      selectedMonth,
      effectiveGrades,
      subjects,
      evalSubjects
    );
  }, [state.students, className, schoolYear, selectedMonth, effectiveGrades, subjects, evalSubjects]);

  // Filter for search
  const filteredSummaries = useMemo(() => {
    let list = classSummaries;
    if (!isTeacher && currentStudentId) {
      // Student only sees themselves
      list = list.filter((s) => s.studentId === currentStudentId);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [classSummaries, searchTerm, isTeacher, currentStudentId]);

  // Handling direct input
  const handleCellChange = (studentId: string, subject: string, val: string) => {
    setEditGradesBuffer((prev) => {
      const studentMap = { ...(prev[studentId] || {}) };
      studentMap[subject] = val;
      return {
        ...prev,
        [studentId]: studentMap,
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveDirectEdits = () => {
    onUpdateAcademicGrades(effectiveGrades);
    setEditGradesBuffer({});
    setHasUnsavedChanges(false);
    onShowToast?.(`Đã lưu thay đổi bảng điểm ${monthDisplay}!`, 'success');
  };

  const handleImportExcelConfirmed = (
    validRows: ExcelImportParseResult['validRows'],
    overwriteBlanks: boolean
  ) => {
    const updated = mergeMonthlyGrades(
      state.academicGrades || [],
      validRows,
      className,
      schoolYear,
      selectedMonth,
      overwriteBlanks
    );
    onUpdateAcademicGrades(updated);
    setEditGradesBuffer({});
    setHasUnsavedChanges(false);
  };

  // Grades present specifically in the selected month
  const gradesInSelectedMonth = useMemo(() => {
    return (effectiveGrades || []).filter(
      (g) =>
        (!g.className || g.className === className) &&
        (!g.schoolYear || g.schoolYear === schoolYear) &&
        g.month === selectedMonth
    );
  }, [effectiveGrades, className, schoolYear, selectedMonth]);

  const hasGradesInSelectedMonth = gradesInSelectedMonth.length > 0;

  const gradedStudentsCount = useMemo(() => {
    return new Set(gradesInSelectedMonth.map((g) => g.studentId)).size;
  }, [gradesInSelectedMonth]);

  // Backups available for this class
  const backupsForClass = useMemo(() => {
    return (state.academicBackups || []).filter(
      (b) =>
        (!b.className || b.className.trim().toLowerCase() === className.trim().toLowerCase()) &&
        (!b.schoolYear || b.schoolYear === schoolYear)
    );
  }, [state.academicBackups, className, schoolYear]);

  const backupsForMonth = useMemo(() => {
    return backupsForClass.filter((b) => b.month === selectedMonth);
  }, [backupsForClass, selectedMonth]);

  const handleConfirmDelete = async () => {
    if (!onDeleteMonthlyGrades) {
      setDeleteError('Chức năng xóa chưa được kết nối.');
      return;
    }
    setDeleteError(null);
    setDeleteStatus('backing_up');
    try {
      const res = await onDeleteMonthlyGrades(selectedMonth, (step) => {
        setDeleteStatus(step);
      });
      if (res.success) {
        setEditGradesBuffer({});
        setHasUnsavedChanges(false);
        setIsDeleteModalOpen(false);
        setDeleteStatus('idle');
        setDeleteError(null);
      } else {
        setDeleteError(res.error || 'Xóa bảng điểm thất bại. Vui lòng thử lại.');
        setDeleteStatus('idle');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Lỗi không xác định khi thực hiện xóa.');
      setDeleteStatus('idle');
    }
  };

  const handleConfirmRestore = async (backup: AcademicGradeBackup) => {
    if (!onRestoreMonthlyGrades) return;
    const res = await onRestoreMonthlyGrades(backup);
    if (res.success) {
      setEditGradesBuffer({});
      setHasUnsavedChanges(false);
      if (backup.month !== selectedMonth) {
        setSelectedMonth(backup.month);
      }
      setIsRestoreModalOpen(false);
    } else {
      onShowToast?.(res.error || 'Khôi phục bảng điểm thất bại', 'error');
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 space-y-2 animate-fadeIn overflow-hidden">
      {/* COMPACT TOOLBAR (2 SLIM ROWS) */}
      <div className="bg-white px-3.5 py-2.5 rounded-2xl shadow-xs border border-gray-200 shrink-0 space-y-2">
        {/* ROW 1: Title, Badges, Note tooltip, Month Picker + Pills, and Top 5 Publish */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* Left: Title + Badges + Note hint */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight uppercase whitespace-nowrap">
              BẢNG ĐIỂM HỌC TẬP
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200">
              Lớp {className}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
              Năm học {schoolYear}
            </span>

            {/* Note badge with info tooltip */}
            <span
              className="hidden lg:inline-flex items-center gap-1 text-[11px] text-gray-500 pl-2 border-l border-gray-200"
              title="Ghi chú: Trung bình cộng các môn theo tháng phục vụ theo dõi nội bộ, không gán thành kết quả học kỳ chính thức."
            >
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate max-w-xs xl:max-w-md">
                ĐTB theo tháng theo dõi nội bộ
              </span>
            </span>
          </div>

          {/* Right: Quick Month Pills + Month Navigation + Top 5 Publish Button */}
          <div className="flex items-center gap-1.5 flex-wrap self-stretch sm:self-auto justify-between sm:justify-end">
            {/* Quick recorded month buttons */}
            {recordedMonths.map((mStr) => {
              const [mY, mM] = mStr.split('-');
              const isSel = mStr === selectedMonth;
              return (
                <button
                  key={mStr}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(mStr);
                    setEditGradesBuffer({});
                    setHasUnsavedChanges(false);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                    isSel
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={`Xem điểm tháng ${Number(mM)}/${mY}`}
                >
                  T{Number(mM)}/{mY}
                </button>
              );
            })}

            {/* Month input with arrows */}
            <div className="flex items-center bg-gray-50 px-1 py-0.5 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1 px-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedMonth(e.target.value);
                      setEditGradesBuffer({});
                      setHasUnsavedChanges(false);
                    }
                  }}
                  className="bg-transparent text-xs font-black text-gray-800 outline-none cursor-pointer w-23"
                />
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Top 5 Status badge */}
            <span
              className={`px-2 py-0.5 rounded-lg text-[11px] font-black border ${
                !hasGradesInSelectedMonth
                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                  : isPublished
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {!hasGradesInSelectedMonth
                ? 'Chưa có dữ liệu để công bố'
                : isPublished
                ? 'Đã công bố Top 5'
                : 'Bản nháp'}
            </span>

            {/* Teacher Publish button */}
            {isTeacher && onPublishHonors && (
              <button
                type="button"
                disabled={!hasGradesInSelectedMonth}
                onClick={() => onPublishHonors(selectedMonth)}
                className={`px-2.5 py-1 font-bold rounded-lg text-[11px] shadow-2xs flex items-center gap-1 transition-all ${
                  hasGradesInSelectedMonth
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white cursor-pointer'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }`}
                title={
                  hasGradesInSelectedMonth
                    ? 'Công bố vinh danh Top 5 lên bảng tin cho học sinh'
                    : 'Cần có dữ liệu điểm trước khi công bố vinh danh'
                }
              >
                <Trophy className="w-3 h-3" />
                <span>{isPublished ? 'Cập nhật công bố' : 'Công bố vinh danh'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: Search + Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-gray-100">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs md:max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên học sinh, mã hồ sơ..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons (Teacher only) */}
          {isTeacher && (
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() =>
                  downloadAcademicExcelTemplate(
                    state.students,
                    className,
                    schoolYear,
                    selectedMonth,
                    subjects
                  )
                }
                className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-lg text-[11px] border border-gray-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Tải mẫu Excel đã điền sẵn danh sách học sinh của lớp"
              >
                <Download className="w-3 h-3 text-blue-600" />
                <span>Tải mẫu Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px] border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Nhập điểm cả lớp từ tệp Excel"
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                <span>Nhập Excel điểm tháng</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportAcademicClassToExcel(
                    state.students,
                    state.config,
                    selectedMonth,
                    effectiveGrades
                  )
                }
                className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-lg text-[11px] border border-gray-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Xuất bảng điểm tháng hiện tại ra Excel"
              >
                <Download className="w-3 h-3 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(true)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px] border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Thêm bớt môn học hoặc chọn môn nhận xét"
              >
                <Settings className="w-3 h-3 text-slate-500" />
                <span>Cấu hình môn</span>
              </button>

              {/* Xóa bảng điểm tháng */}
              <button
                type="button"
                disabled={!hasGradesInSelectedMonth}
                onClick={() => {
                  setDeleteError(null);
                  setDeleteStatus('idle');
                  setIsDeleteModalOpen(true);
                }}
                className={`px-2.5 py-1.5 font-bold rounded-lg text-[11px] border flex items-center gap-1 transition-colors ${
                  hasGradesInSelectedMonth
                    ? 'bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 border-red-200 cursor-pointer'
                    : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed opacity-60'
                }`}
                title={
                  hasGradesInSelectedMonth
                    ? `Xóa toàn bộ điểm cả lớp trong ${monthDisplay} để nhập lại Excel`
                    : `${monthDisplay} chưa có điểm để xóa`
                }
              >
                <Trash2 className={`w-3 h-3 ${hasGradesInSelectedMonth ? 'text-red-500' : 'text-gray-300'}`} />
                <span>Xóa bảng điểm tháng</span>
              </button>

              {/* Khôi phục điểm */}
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(true)}
                className="px-2.5 py-1.5 bg-amber-50/80 hover:bg-amber-100 active:bg-amber-200 text-amber-800 font-bold rounded-lg text-[11px] border border-amber-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Khôi phục bảng điểm đã xóa từ bản sao lưu an toàn"
              >
                <RotateCcw className="w-3 h-3 text-amber-600" />
                <span>Khôi phục điểm</span>
                {backupsForMonth.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                )}
              </button>

              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleSaveDirectEdits}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg text-[11px] shadow-sm flex items-center gap-1 cursor-pointer animate-pulse"
                >
                  <Save className="w-3 h-3" />
                  <span>Lưu thay đổi</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODIFIED WARNING IF CHANGED AFTER PUBLISH */}
      {isTeacher && hasModifiedAfterPublish && (
        <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-[11px] text-amber-900 shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Lưu ý:</strong> Bảng điểm tháng này vừa có thay đổi sau ngày công bố vinh danh. Vui lòng bấm <em>“Cập nhật công bố”</em> để đồng bộ Top 5 mới nhất.
            </span>
          </div>
          {onPublishHonors && (
            <button
              type="button"
              onClick={() => onPublishHonors(selectedMonth)}
              className="ml-2 px-2 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0"
            >
              Cập nhật ngay
            </button>
          )}
        </div>
      )}

      {/* MAIN ACADEMIC TABLE - FILLS ALL REMAINING VERTICAL SPACE */}
      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 border-b border-gray-200 uppercase font-extrabold text-[11px] tracking-tight">
              <tr>
                {/* Sticky Left STT */}
                <th className="px-2 py-1.5 text-center w-11 min-w-[44px] max-w-[44px] sticky top-0 left-0 z-30 bg-gray-100 border-r border-gray-200">
                  STT
                </th>
                {/* Sticky Left Mã hồ sơ */}
                <th className="px-2.5 py-1.5 w-24 min-w-[96px] max-w-[96px] sticky top-0 left-[44px] z-30 bg-gray-100 border-r border-gray-200">
                  Mã hồ sơ
                </th>
                {/* Sticky Left Họ và tên */}
                <th className="px-3 py-1.5 min-w-[180px] max-w-[200px] sticky top-0 left-[140px] z-30 bg-gray-100 border-r-2 border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Họ và tên
                </th>

                {/* Subject Columns */}
                {subjects.map((sub) => {
                  const isEval = evalSubjects.includes(sub);
                  return (
                    <th
                      key={sub}
                      className="px-2 py-2 text-center min-w-[72px] max-w-[96px] border-r border-gray-100"
                      title={isEval ? `${sub} (Đánh giá nhận xét - Không tính ĐTB)` : sub}
                    >
                      <div className="truncate">{sub}</div>
                      {isEval && (
                        <span className="text-[9px] font-normal text-amber-600 block lowercase">
                          (nhận xét)
                        </span>
                      )}
                    </th>
                  );
                })}

                <th className="px-2 py-2 text-center min-w-[85px] border-r border-gray-100">
                  Số môn
                </th>
                <th className="px-3 py-2 text-center min-w-[110px] bg-blue-100/70 text-blue-900 border-r border-blue-200">
                  Trung bình cộng
                </th>
                <th className="px-2 py-2 text-center w-18">
                  Thứ hạng
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + subjects.length}
                    className="p-8 text-center text-gray-400 italic"
                  >
                    Không tìm thấy học sinh nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((studentSummary) => {
                  const studentId = studentSummary.studentId;
                  const isLogged = currentStudentId === studentId;

                  return (
                    <tr
                      key={studentId}
                      className={`group transition-colors ${
                        isLogged ? 'bg-amber-50/50' : 'hover:bg-blue-50/40'
                      }`}
                    >
                      {/* Sticky Left STT */}
                      <td
                        className={`px-2 py-1 text-center font-bold text-gray-500 w-11 min-w-[44px] max-w-[44px] sticky left-0 z-10 border-r border-gray-100 transition-colors ${
                          isLogged ? 'bg-amber-50 group-hover:bg-amber-100/70' : 'bg-white group-hover:bg-blue-50/80'
                        }`}
                      >
                        {studentSummary.stt}
                      </td>
                      {/* Sticky Left Mã hồ sơ */}
                      <td
                        className={`px-2.5 py-1 font-mono font-bold text-gray-700 w-24 min-w-[96px] max-w-[96px] sticky left-[44px] z-10 border-r border-gray-100 transition-colors ${
                          isLogged ? 'bg-amber-50 group-hover:bg-amber-100/70' : 'bg-white group-hover:bg-blue-50/80'
                        }`}
                      >
                        {studentId}
                      </td>
                      {/* Sticky Left Họ và tên */}
                      <td
                        className={`px-3 py-1 min-w-[180px] max-w-[200px] sticky left-[140px] z-10 border-r-2 border-gray-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors ${
                          isLogged ? 'bg-amber-50 group-hover:bg-amber-100/70' : 'bg-white group-hover:bg-blue-50/80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectStudent?.(studentId, selectedMonth)}
                          className="font-bold text-gray-900 hover:text-blue-600 hover:underline uppercase text-left cursor-pointer truncate max-w-[175px] block leading-tight"
                          title={`Xem chi tiết hồ sơ ${studentSummary.name}`}
                        >
                          {studentSummary.name}
                        </button>
                      </td>

                      {/* Subject Cells */}
                      {subjects.map((sub) => {
                        const isEval = evalSubjects.includes(sub);
                        const bufferedVal = editGradesBuffer[studentId]?.[sub];
                        const storedVal = studentSummary.grades[sub];

                        const displayVal =
                          bufferedVal !== undefined
                            ? bufferedVal
                            : storedVal !== undefined
                            ? String(storedVal)
                            : '';

                        const isDirty = bufferedVal !== undefined;

                        return (
                          <td key={sub} className="px-1 py-1 text-center border-r border-gray-100">
                            {isTeacher ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={displayVal}
                                onChange={(e) =>
                                  handleCellChange(studentId, sub, e.target.value)
                                }
                                placeholder="-"
                                className={`w-12 h-6 px-1 text-center font-bold rounded border text-xs outline-none focus:ring-1 focus:ring-blue-500 transition-all ${
                                  isDirty
                                    ? 'bg-amber-50 border-amber-400 text-amber-900'
                                    : isEval
                                    ? 'bg-gray-50 border-gray-200 text-gray-700'
                                    : 'bg-white border-gray-200 text-blue-700 hover:border-blue-300'
                                }`}
                              />
                            ) : (
                              <span className="font-bold text-gray-800">
                                {displayVal || '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Valid Subjects Count */}
                      <td className="px-2 py-1 text-center font-semibold text-gray-600 border-r border-gray-100">
                        {studentSummary.validSubjectsCount} / {studentSummary.totalGradedSubjectsCount}
                      </td>

                      {/* Average GPA */}
                      <td className="px-2 py-1 text-center bg-blue-50/40 border-r border-blue-100">
                        {studentSummary.rawAverage !== null ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-xs">
                            {studentSummary.formattedAverage}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Chưa có</span>
                        )}
                      </td>

                      {/* Rank */}
                      <td className="px-2 py-1 text-center">
                        {studentSummary.rank !== null ? (
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-[11px] ${
                              studentSummary.rank === 1
                                ? 'bg-amber-400 text-amber-950'
                                : studentSummary.rank === 2
                                ? 'bg-slate-300 text-slate-800'
                                : studentSummary.rank === 3
                                ? 'bg-amber-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {studentSummary.rank}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ExcelAcademicImportModal
        isOpen={isImportModalOpen}
        className={className}
        schoolYear={schoolYear}
        month={selectedMonth}
        students={state.students}
        availableSubjects={subjects}
        onImportGrades={handleImportExcelConfirmed}
        onClose={() => setIsImportModalOpen(false)}
        onShowToast={onShowToast}
      />

      <SubjectConfigModal
        isOpen={isSubjectModalOpen}
        config={state.config}
        onSaveSubjects={(newSubjects, newEvalSubjects) => {
          onUpdateConfig({
            subjects: newSubjects,
            evaluationSubjects: newEvalSubjects,
          });
        }}
        onClose={() => setIsSubjectModalOpen(false)}
        onShowToast={onShowToast}
      />

      {/* Delete Monthly Grades Confirmation Modal */}
      <DeleteMonthlyGradesModal
        isOpen={isDeleteModalOpen}
        className={className}
        schoolYear={schoolYear}
        month={selectedMonth}
        studentCount={gradedStudentsCount}
        totalGradesCount={gradesInSelectedMonth.length}
        status={deleteStatus}
        errorMessage={deleteError}
        onConfirmDelete={handleConfirmDelete}
        onClose={() => {
          if (deleteStatus === 'idle') {
            setIsDeleteModalOpen(false);
            setDeleteError(null);
          }
        }}
      />

      {/* Restore Academic Grades Modal */}
      <RestoreAcademicGradesModal
        isOpen={isRestoreModalOpen}
        className={className}
        schoolYear={schoolYear}
        selectedMonth={selectedMonth}
        backups={state.academicBackups || []}
        currentMonthGradesCount={gradesInSelectedMonth.length}
        onRestore={handleConfirmRestore}
        onClose={() => setIsRestoreModalOpen(false)}
      />
    </div>
  );
};
