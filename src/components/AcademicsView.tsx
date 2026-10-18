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
} from 'lucide-react';
import { AppState, MonthlyGradeRecord } from '../types';
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

interface AcademicsViewProps {
  state: AppState;
  isTeacher: boolean;
  currentStudentId?: string | null;
  onUpdateAcademicGrades: (updatedGrades: MonthlyGradeRecord[]) => void;
  onUpdateConfig: (newConfig: Partial<AppState['config']>) => void;
  onPublishHonors?: (month: string) => void;
  onSelectStudent?: (studentId: string, month?: string) => void;
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
  onShowToast,
}) => {
  const currentMonth = getCurrentMonthStr();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // If state.academicGrades has data for currentMonth, use it
    const hasCurrent = (state.academicGrades || []).some((g) => g.month === currentMonth);
    if (hasCurrent) return currentMonth;
    // Otherwise pick the latest month that has records
    const recorded = Array.from(new Set((state.academicGrades || []).map((g) => g.month))).sort().reverse();
    return recorded[0] || currentMonth;
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

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

  // Class & config metadata
  const className = state.config.className || 'Lớp';
  const schoolYear = state.config.schoolYear || '2026-2027';
  const subjects = state.config.subjects || [];
  const evalSubjects = state.config.evaluationSubjects || [];

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

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-full flex flex-col pb-10 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                BẢNG ĐIỂM HỌC TẬP
              </h2>
              <span className="px-2.5 py-0.5 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200">
                Lớp {className}
              </span>
              <span className="px-2.5 py-0.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200">
                Năm học {schoolYear}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Theo dõi điểm tổng hợp các môn theo từng tháng • Tính trung bình cộng và xếp hạng nội bộ
            </p>
          </div>
        </div>

        {/* Month Picker Control */}
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200/90 self-stretch sm:self-auto justify-between sm:justify-start">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-white text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
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
              className="bg-transparent text-xs sm:text-sm font-extrabold text-gray-800 outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-white text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 shrink-0">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên học sinh, mã hồ sơ..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs sm:text-sm font-medium"
          />
        </div>

        {/* Buttons (Teacher only) */}
        {isTeacher && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Download Template */}
            <button
              onClick={() =>
                downloadAcademicExcelTemplate(
                  state.students,
                  className,
                  schoolYear,
                  selectedMonth,
                  subjects
                )
              }
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs border border-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Tải mẫu Excel đã điền sẵn danh sách học sinh của lớp"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Tải mẫu Excel</span>
            </button>

            {/* Import Excel */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Nhập điểm cả lớp từ tệp Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Nhập Excel điểm tháng</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={() =>
                exportAcademicClassToExcel(
                  state.students,
                  state.config,
                  selectedMonth,
                  effectiveGrades
                )
              }
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs border border-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Xuất bảng điểm tháng hiện tại ra Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            {/* Subject Config */}
            <button
              onClick={() => setIsSubjectModalOpen(true)}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Thêm bớt môn học hoặc chọn môn nhận xét"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Cấu hình môn</span>
            </button>

            {/* Save Direct Edits */}
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveDirectEdits}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu thay đổi</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Publication Status & Note Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Ghi chú:</strong> Trung bình cộng các môn theo tháng phục vụ theo dõi nội bộ, không gán thành kết quả học tập học kỳ chính thức.
          </span>
        </div>

        {/* Publication Control for Teacher */}
        {isTeacher && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <span
              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${
                isPublished
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              {isPublished ? 'Đã công bố Top 5' : 'Bản nháp (Chưa công bố)'}
            </span>

            {onPublishHonors && (
              <button
                type="button"
                onClick={() => onPublishHonors(selectedMonth)}
                className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1 transition-all"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{isPublished ? 'Cập nhật công bố' : 'Công bố vinh danh'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modified After Publish Warning */}
      {isTeacher && hasModifiedAfterPublish && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Lưu ý:</strong> Bảng điểm tháng này vừa có thay đổi sau ngày công bố vinh danh. Vui lòng bấm <em>“Cập nhật công bố”</em> để đồng bộ cho học sinh xem bảng xếp hạng mới nhất.
            </span>
          </div>
        </div>
      )}

      {/* Main Academic Table */}
      <div className="flex-1 bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gray-50/90 text-gray-700 sticky top-0 z-10 border-b border-gray-200 uppercase font-extrabold text-[11px]">
              <tr>
                <th className="px-3.5 py-3 text-center w-12">STT</th>
                <th className="px-3.5 py-3 w-28">Mã hồ sơ</th>
                <th className="px-3.5 py-3 min-w-[170px]">Họ và tên</th>

                {/* Subject Columns */}
                {subjects.map((sub) => {
                  const isEval = evalSubjects.includes(sub);
                  return (
                    <th
                      key={sub}
                      className="px-2.5 py-3 text-center min-w-[85px] max-w-[110px]"
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

                <th className="px-3 py-3 text-center min-w-[100px]">Số môn có điểm</th>
                <th className="px-3.5 py-3 text-center min-w-[125px] bg-blue-50/60 text-blue-900">
                  Trung bình cộng
                </th>
                <th className="px-3 py-3 text-center w-20">Thứ hạng</th>
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
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isLogged ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-3.5 py-2.5 text-center font-bold text-gray-400">
                        {studentSummary.stt}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-gray-700">
                        {studentId}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <button
                          type="button"
                          onClick={() => onSelectStudent?.(studentId)}
                          className="font-bold text-gray-900 hover:text-blue-600 hover:underline uppercase text-left cursor-pointer"
                        >
                          {studentSummary.name}
                        </button>
                      </td>

                      {/* Subject Cells */}
                      {subjects.map((sub) => {
                        const isEval = evalSubjects.includes(sub);
                        const bufferedVal =
                          editGradesBuffer[studentId]?.[sub];
                        const storedVal =
                          studentSummary.grades[sub];

                        const displayVal =
                          bufferedVal !== undefined
                            ? bufferedVal
                            : storedVal !== undefined
                            ? String(storedVal)
                            : '';

                        const isDirty = bufferedVal !== undefined;

                        return (
                          <td key={sub} className="px-2 py-1.5 text-center">
                            {isTeacher ? (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={displayVal}
                                onChange={(e) =>
                                  handleCellChange(studentId, sub, e.target.value)
                                }
                                placeholder="-"
                                className={`w-16 px-1.5 py-1 text-center font-bold rounded-lg border text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
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
                      <td className="px-3 py-2.5 text-center font-semibold text-gray-600">
                        {studentSummary.validSubjectsCount} /{' '}
                        {studentSummary.totalGradedSubjectsCount} môn
                      </td>

                      {/* Average GPA */}
                      <td className="px-3.5 py-2.5 text-center bg-blue-50/30">
                        {studentSummary.rawAverage !== null ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-100/80 text-blue-800 font-black text-xs">
                            {studentSummary.formattedAverage}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Chưa có điểm</span>
                        )}
                      </td>

                      {/* Rank */}
                      <td className="px-3 py-2.5 text-center">
                        {studentSummary.rank !== null ? (
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs shadow-2xs ${
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
    </div>
  );
};
