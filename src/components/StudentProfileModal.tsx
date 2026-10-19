import React, { useState, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Camera,
  Trash2,
  Copy,
  CalendarCheck,
  GraduationCap,
  Scale,
  Star,
  Plus,
  Printer,
  KeyRound,
  Edit2,
  LogOut,
  Calendar,
  Save,
  Check,
  User,
  Phone,
  MapPin,
  Clock,
  BookOpen,
  History,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  AppState,
  AttendanceStatus,
  DisciplineRecord,
  NoteRecord,
  Student,
} from '../types';
import {
  calculateConduct,
  calculateStudentPoints,
  formatDisplayDate,
  getCurrentMonthStr,
  getTodayStr,
  resizeImageBase64,
} from '../utils/helpers';
import {
  calculateClassAcademicSummary,
  getStudentAcademicHistory,
  parseGradeValue,
} from '../utils/academicHelpers';
import { PrintReportModal } from './PrintReportModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { ConfirmModal } from './ConfirmModal';

interface StudentProfileModalProps {
  studentId: string | null;
  state: AppState;
  isTeacher: boolean;
  initialMonth?: string;
  initialYear?: string;
  onClose: () => void;
  onEditStudent: (student: Student) => void;
  onUpdateAvatar: (studentId: string, base64: string) => void;
  onSaveGrades: (studentId: string, grades: Record<string, number>) => void;
  onSaveAcademicGrades?: (
    studentId: string,
    month: string,
    grades: Record<string, number | undefined>
  ) => void;
  onAddDiscipline: (record: Omit<DisciplineRecord, 'id'>) => void;
  onDeleteDiscipline: (recordId: string) => void;
  onDeleteAttendance?: (attendanceId: string) => void;
  onAddNote: (record: Omit<NoteRecord, 'id'>) => void;
  onDeleteNote: (noteId: string) => void;
  onChangePassword: (studentId: string, newPass: string) => void;
  onLogout: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  studentId,
  state,
  isTeacher,
  initialMonth,
  initialYear,
  onClose,
  onEditStudent,
  onUpdateAvatar,
  onSaveGrades,
  onSaveAcademicGrades,
  onAddDiscipline,
  onDeleteDiscipline,
  onDeleteAttendance,
  onAddNote,
  onDeleteNote,
  onChangePassword,
  onLogout,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<
    'info' | 'attendance' | 'grades' | 'discipline' | 'notes'
  >('info');
  const [selectedDisciplineMonth, setSelectedDisciplineMonth] = useState<string>('all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [confirmDeleteDisciplineId, setConfirmDeleteDisciplineId] = useState<string | null>(null);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
  const [confirmDeleteAttendanceId, setConfirmDeleteAttendanceId] = useState<string | null>(null);
  const [locallyDeletedDisciplineIds, setLocallyDeletedDisciplineIds] = useState<string[]>([]);
  const [locallyDeletedNoteIds, setLocallyDeletedNoteIds] = useState<string[]>([]);

  const student = useMemo(() => {
    return state.students.find((s) => s.id === studentId);
  }, [state.students, studentId]);

  // Find all distinct months recorded for this student
  const studentRecordedMonths = useMemo(() => {
    if (!student) return [];
    const sId = (student.id || '').trim();
    const months = new Set<string>();
    (state.academicGrades || []).forEach((g) => {
      if ((g.studentId || '').trim() === sId && g.month) {
        months.add(g.month.trim());
      }
    });
    // Also include class-level months if student records empty
    if (months.size === 0) {
      (state.academicGrades || []).forEach((g) => {
        if (g.month) months.add(g.month.trim());
      });
    }
    return Array.from(months).sort().reverse();
  }, [student, state.academicGrades]);

  // Academic month & year state
  const [academicMonth, setAcademicMonth] = useState<string>(() => {
    if (initialMonth) return initialMonth;
    const sId = (studentId || '').trim();
    const hasStudentRecord = (state.academicGrades || []).filter(
      (g) => (g.studentId || '').trim() === sId && g.month
    );
    if (hasStudentRecord.length > 0) {
      const sorted = Array.from(new Set(hasStudentRecord.map((g) => g.month))).sort().reverse();
      if (sorted[0]) return sorted[0];
    }
    const classMonths = Array.from(new Set((state.academicGrades || []).map((g) => g.month))).sort().reverse();
    if (classMonths[0]) return classMonths[0];
    return getCurrentMonthStr();
  });
  const [academicYear, setAcademicYear] = useState<string>(
    initialYear || state.config.schoolYear || '2026-2027'
  );

  React.useEffect(() => {
    if (initialMonth) {
      setAcademicMonth(initialMonth);
    } else if (studentRecordedMonths.length > 0 && (!academicMonth || !studentRecordedMonths.includes(academicMonth))) {
      setAcademicMonth(studentRecordedMonths[0]);
    }
  }, [initialMonth, studentId]);

  React.useEffect(() => {
    if (initialYear) {
      setAcademicYear(initialYear);
    }
  }, [initialYear]);

  // Direct discipline form state
  const [disDate, setDisDate] = useState(getTodayStr());
  const [disRuleId, setDisRuleId] = useState(state.config.rules[0]?.id || '');
  const [disNote, setDisNote] = useState('');

  // Grades local state
  const [tempGrades, setTempGrades] = useState<Record<string, number>>({});

  // Note form state
  const [noteDate, setNoteDate] = useState(getTodayStr());
  const [noteType, setNoteType] = useState<'Liên hệ PH' | 'Học tập' | 'Khác'>('Liên hệ PH');
  const [noteContent, setNoteContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailSectionRef = useRef<HTMLDivElement>(null);

  // Sync tempGrades from state.academicGrades for the selected academicMonth & academicYear
  React.useEffect(() => {
    if (student) {
      const sId = (student.id || '').trim();
      const mGrades: Record<string, number> = {};

      (state.academicGrades || []).forEach((g) => {
        const classMatch =
          !g.className ||
          !state.config.className ||
          g.className.trim().toLowerCase() === state.config.className.trim().toLowerCase();
        const yearMatch = !g.schoolYear || !academicYear || g.schoolYear.trim() === academicYear.trim();
        const monthMatch = (g.month || '').trim() === academicMonth.trim();
        const idMatch = (g.studentId || '').trim() === sId;

        if (classMatch && yearMatch && monthMatch && idMatch) {
          mGrades[g.subject.trim()] = g.score;
        }
      });

      // If no monthly records yet in academicGrades, check legacy student.grades only if academicGrades is completely uninitialized
      if (
        Object.keys(mGrades).length === 0 &&
        student.grades &&
        Object.keys(student.grades).length > 0 &&
        (state.academicGrades || []).length === 0
      ) {
        setTempGrades(student.grades);
      } else {
        setTempGrades(mGrades);
      }

      setLocallyDeletedDisciplineIds([]);
      setLocallyDeletedNoteIds([]);
    }
  }, [student?.id, academicMonth, academicYear, state.academicGrades, state.config.className]);

  // Sync disRuleId when rules load or change
  React.useEffect(() => {
    if ((!disRuleId || !state.config.rules.some((r) => r.id === disRuleId)) && state.config.rules.length > 0) {
      setDisRuleId(state.config.rules[0].id);
    }
  }, [state.config.rules, disRuleId]);

  if (!student) return null;

  // Attendance stats
  const studentAtt = state.attendance.filter((a) => a.studentId === student.id);
  const totalAbsences = studentAtt.filter(
    (a) => a.status === 'v' || a.status === 'kp' || a.status === 'm'
  ).length;

  // Discipline stats: Calculate remaining emulation score based on initialPoints
  const studentDiscipline = state.discipline.filter(
    (d) => d.studentId === student.id && !locallyDeletedDisciplineIds.includes(d.id)
  );
  const baseScore = state.config.initialPoints ?? 100;
  const overallSummary = calculateStudentPoints(studentDiscipline, baseScore);
  const overallPoints = overallSummary.remainingPoints;
  const overallConduct = calculateConduct(overallPoints, state.config.conductThresholds);

  // Academic summary for this student in the selected academicMonth
  const academicSummary = useMemo(() => {
    if (!student) return null;
    const summaries = calculateClassAcademicSummary(
      state.students,
      state.config.className,
      academicYear,
      academicMonth,
      state.academicGrades || [],
      state.config.subjects || [],
      state.config.evaluationSubjects || []
    );
    return summaries.find((s) => s.studentId.trim() === student.id.trim()) || null;
  }, [
    student,
    state.students,
    state.config.className,
    academicYear,
    academicMonth,
    state.academicGrades,
    state.config.subjects,
    state.config.evaluationSubjects,
  ]);

  // Full monthly academic history for charts and trend tracking
  const studentAcademicHistory = useMemo(() => {
    if (!student) return [];
    return getStudentAcademicHistory(
      student.id,
      state.students,
      state.config.className,
      academicYear,
      state.academicGrades || [],
      state.config.subjects || [],
      state.config.evaluationSubjects || []
    );
  }, [
    student,
    state.students,
    state.config.className,
    academicYear,
    state.academicGrades,
    state.config.subjects,
    state.config.evaluationSubjects,
  ]);

  // GPA calculation for display
  const gpaStr = academicSummary?.formattedAverage || 'Chưa có điểm';

  // Discipline month list
  const disciplineMonths = Array.from(
    new Set(studentDiscipline.map((d) => d.date.substring(0, 7)))
  ).sort().reverse();

  const filteredDiscipline =
    selectedDisciplineMonth === 'all'
      ? studentDiscipline
      : studentDiscipline.filter((d) => d.date.startsWith(selectedDisciplineMonth));

  const monthSummary = calculateStudentPoints(filteredDiscipline, baseScore);
  const monthPoints = monthSummary.remainingPoints;
  const monthConduct = calculateConduct(monthPoints, state.config.conductThresholds);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      resizeImageBase64(file, 250, 250, (base64) => {
        onUpdateAvatar(student.id, base64);
        onShowToast('Đã cập nhật ảnh đại diện học sinh');
      });
    }
    e.target.value = '';
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateAvatar(student.id, '');
    onShowToast('Đã xóa ảnh đại diện');
  };

  const handleCopyPhone = () => {
    if (student.phone) {
      navigator.clipboard.writeText(student.phone);
      onShowToast(`Đã sao chép số điện thoại: ${student.phone}`);
    }
  };

  const handleJumpToTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    detailSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveAllGrades = () => {
    if (onSaveAcademicGrades) {
      onSaveAcademicGrades(student.id, academicMonth, tempGrades);
    } else {
      onSaveGrades(student.id, tempGrades as Record<string, number>);
      onShowToast('Đã lưu bảng điểm học tập');
    }
  };

  const handleSubmitDiscipline = (e: React.FormEvent) => {
    e.preventDefault();
    const rule =
      state.config.rules.find((r) => r.id === disRuleId) ||
      state.config.rules[0];
    if (!rule) {
      onShowToast('Chưa có quy tắc thi đua nào được cấu hình trong hệ thống', 'error');
      return;
    }

    onAddDiscipline({
      studentId: student.id,
      date: disDate,
      ruleId: rule.id,
      ruleName: rule.name,
      points: rule.points,
      type: rule.type,
      note: disNote.trim(),
    });

    setDisNote('');
    // Automatically switch to 'all' so the teacher immediately sees the newly saved incident in the table
    setSelectedDisciplineMonth('all');
    onShowToast(`Đã lưu ghi nhận: ${rule.name} (${rule.type === 'plus' ? `+${rule.points}` : `-${rule.points}`}đ)`);
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    onAddNote({
      studentId: student.id,
      date: noteDate,
      type: noteType,
      content: noteContent.trim(),
    });

    setNoteContent('');
    setIsAddNoteModalOpen(false);
    onShowToast('Đã thêm ghi chú liên lạc');
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col overflow-hidden animate-fadeIn">
      {/* Top Navbar */}
      <div className="bg-white border-b border-gray-200 h-16 shrink-0 flex items-center px-4 lg:px-8 shadow-xs relative z-20">
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 mr-3 p-2 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-1.5 font-bold text-xs sm:text-sm cursor-pointer"
          title="Quay lại giao diện lớp học"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
            Hồ sơ học sinh: <span className="uppercase text-blue-700">{student.name}</span>
          </h2>
          <p className="text-[11px] text-gray-400 font-mono">
            Mã định danh: {student.id}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Print Report */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="In phiếu liên lạc"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phiếu liên lạc</span>
          </button>

          {!isTeacher && (
            <>
              {/* Change Password */}
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đổi mật khẩu</span>
              </button>
              {/* Logout */}
              <button
                onClick={onLogout}
                className="px-3 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Thoát</span>
              </button>
            </>
          )}

          {isTeacher && (
            <button
              onClick={() => onEditStudent(student)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sửa thông tin</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50/70">
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
          {/* OVERVIEW CARD */}
          <div className="bg-white rounded-3xl shadow-xs border border-gray-100 p-6 flex flex-col items-center">
            {/* Avatar */}
            <div
              onClick={() => isTeacher && fileInputRef.current?.click()}
              className={`relative group mb-4 ${isTeacher ? 'cursor-pointer' : ''}`}
              title={isTeacher ? 'Bấm để đổi ảnh học sinh' : ''}
            >
              <div className="w-24 h-24 rounded-full bg-blue-50 border-4 border-white text-blue-700 flex items-center justify-center text-4xl font-black shadow-md overflow-hidden ring-4 ring-blue-50">
                {student.avatar ? (
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  student.name.charAt(0)
                )}
              </div>
              {isTeacher && (
                <>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  {student.avatar && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="absolute bottom-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-md border-2 border-white transition-colors cursor-pointer"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handleAvatarFile}
                  />
                </>
              )}
            </div>

            {/* Name & Basic info */}
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight text-center">
              {student.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-semibold text-gray-500 mt-2 mb-6">
              <span className={student.gender === 'Nam' ? 'text-blue-600' : 'text-pink-600'}>
                {student.gender}
              </span>
              <span className="text-gray-300">•</span>
              <span>Ngày sinh: {formatDisplayDate(student.dob)}</span>
              <span className="text-gray-300">•</span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-mono">
                ID: {student.id}
              </span>
            </div>

            {/* 4 Clickable Quick Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl">
              {/* Card 1: Điểm danh */}
              <div
                onClick={() => handleJumpToTab('attendance')}
                className="bg-blue-50/50 hover:bg-blue-100/60 border border-blue-100 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:-translate-y-0.5 shadow-2xs"
              >
                <span className="text-[11px] font-bold text-blue-700 uppercase flex items-center gap-1 mb-1">
                  <CalendarCheck className="w-3.5 h-3.5" /> Điểm danh
                </span>
                <p className="text-xl font-black text-blue-800">
                  {totalAbsences}{' '}
                  <span className="text-xs font-normal text-blue-600">vắng/muộn</span>
                </p>
              </div>

              {/* Card 2: Học tập */}
              <div
                onClick={() => handleJumpToTab('grades')}
                className="bg-emerald-50/50 hover:bg-emerald-100/60 border border-emerald-100 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:-translate-y-0.5 shadow-2xs"
              >
                <span className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1 mb-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Học tập
                </span>
                <p className="text-xl font-black text-emerald-800">
                  {gpaStr}{' '}
                  <span className="text-xs font-normal text-emerald-600">ĐTB môn</span>
                </p>
              </div>

              {/* Card 3: Thi đua */}
              <div
                onClick={() => handleJumpToTab('discipline')}
                className="bg-purple-50/50 hover:bg-purple-100/60 border border-purple-100 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:-translate-y-0.5 shadow-2xs"
              >
                <span className="text-[11px] font-bold text-purple-700 uppercase flex items-center gap-1 mb-1">
                  <Scale className="w-3.5 h-3.5" /> Điểm thi đua còn lại
                </span>
                <p
                  className={`text-xl font-black ${
                    overallPoints >= 90
                      ? 'text-emerald-700'
                      : overallPoints >= 80
                      ? 'text-blue-700'
                      : overallPoints >= 65
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {overallPoints}{' '}
                  <span className="text-xs font-normal text-purple-600">/ {baseScore}đ</span>
                </p>
                <span className="text-[10px] text-gray-500 mt-0.5 font-medium">
                  {overallSummary.totalMinus > 0 ? `Trừ: -${overallSummary.totalMinus}đ` : 'Chưa có điểm trừ'}
                  {overallSummary.totalPlus > 0 ? ` • +${overallSummary.totalPlus}đ` : ''}
                </span>
              </div>

              {/* Card 4: Hạnh kiểm */}
              <div
                onClick={() => handleJumpToTab('discipline')}
                className="bg-amber-50/50 hover:bg-amber-100/60 border border-amber-100 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:-translate-y-0.5 shadow-2xs"
              >
                <span className="text-[11px] font-bold text-amber-700 uppercase flex items-center gap-1 mb-1">
                  <Star className="w-3.5 h-3.5" /> Hạnh kiểm
                </span>
                <p className={`text-xl font-black ${overallConduct.color}`}>
                  {overallConduct.text}
                </p>
              </div>
            </div>
          </div>

          {/* TABS SECTION */}
          <div
            ref={detailSectionRef}
            className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden"
          >
            {/* Tab navigation */}
            <div className="flex border-b border-gray-200 bg-gray-50/60 overflow-x-auto">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-6 py-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'info'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Thông tin cá nhân
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-6 py-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Điểm danh ({studentAtt.length})
              </button>
              <button
                onClick={() => setActiveTab('grades')}
                className={`px-6 py-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'grades'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Học tập &amp; Điểm số
              </button>
              <button
                onClick={() => setActiveTab('discipline')}
                className={`px-6 py-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === 'discipline'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Thi đua &amp; Kỷ luật
              </button>
              {isTeacher && (
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-6 py-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === 'notes'
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Sổ tay &amp; Liên hệ
                </button>
              )}
            </div>

            {/* TAB CONTENT */}
            <div className="p-6">
              {/* TAB 1: THÔNG TIN */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                    Thông tin liên hệ &amp; Gia đình
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                      <span className="text-xs text-gray-400 font-semibold block mb-1">
                        Họ tên Phụ huynh
                      </span>
                      <p className="font-bold text-gray-900 text-sm">
                        {student.parentName || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-400 font-semibold block mb-1">
                          Số điện thoại liên hệ
                        </span>
                        <p className="font-bold text-gray-900 text-sm">
                          {student.phone || 'Chưa cập nhật'}
                        </p>
                      </div>
                      {student.phone && (
                        <button
                          onClick={handleCopyPhone}
                          className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
                          title="Sao chép số điện thoại"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 md:col-span-2">
                      <span className="text-xs text-gray-400 font-semibold block mb-1">
                        Địa chỉ thường trú
                      </span>
                      <p className="font-bold text-gray-900 text-sm">
                        {student.address || 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ĐIỂM DANH */}
              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-gray-800">
                      Lịch sử điểm danh chi tiết
                    </h3>
                    <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                      Tổng vắng/muộn: {totalAbsences} buổi
                    </span>
                  </div>

                    <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar scroll-smooth overscroll-contain shadow-2xs">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 font-bold text-gray-600">Ngày</th>
                          <th className="px-4 py-3 font-bold text-gray-600 text-center">
                            Trạng thái
                          </th>
                          {isTeacher && (
                            <th className="px-4 py-3 font-bold text-gray-600 text-center w-20">
                              Thao tác
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {studentAtt.length === 0 ? (
                          <tr>
                            <td colSpan={isTeacher ? 3 : 2} className="px-4 py-8 text-center text-gray-400">
                              Chưa có dữ liệu điểm danh cho học sinh này.
                            </td>
                          </tr>
                        ) : (
                          [...studentAtt]
                            .sort(
                              (a, b) =>
                                new Date(b.date).getTime() - new Date(a.date).getTime()
                            )
                            .map((att) => {
                              let statusTag = (
                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                                  Có mặt
                                </span>
                              );
                              if (att.status === 'v') {
                                statusTag = (
                                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                    Có phép
                                  </span>
                                );
                              } else if (att.status === 'kp') {
                                statusTag = (
                                  <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                                    Không phép
                                  </span>
                                );
                              } else if (att.status === 'm') {
                                statusTag = (
                                  <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">
                                    Đi học muộn
                                  </span>
                                );
                              }

                              return (
                                <tr key={att.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-semibold text-gray-800">
                                    {formatDisplayDate(att.date)}
                                  </td>
                                  <td className="px-4 py-3 text-center">{statusTag}</td>
                                  {isTeacher && (
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteAttendanceId(att.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                        title="Xóa bản ghi điểm danh này"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: HỌC TẬP & ĐIỂM SỐ */}
              {activeTab === 'grades' && (
                <div className="space-y-6">
                  {/* Month & Year Selection Bar */}
                  <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-cyan-50/90 p-4 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-gray-900 text-sm">
                            Điểm Học Tập Theo Tháng
                          </h4>
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                            Lớp {state.config.className}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            Năm học {academicYear}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Dữ liệu điểm chi tiết đồng bộ trực tiếp với Bảng điểm cả lớp và Top 5 vinh danh
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto justify-between sm:justify-start">
                      {/* Quick recorded month buttons */}
                      {studentRecordedMonths.map((mStr) => {
                        const [mY, mM] = mStr.split('-');
                        const isSel = mStr === academicMonth;
                        return (
                          <button
                            key={mStr}
                            type="button"
                            onClick={() => setAcademicMonth(mStr)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isSel
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'
                            }`}
                          >
                            T{Number(mM)}/{mY}
                          </button>
                        );
                      })}

                      {/* Month selector */}
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-blue-300 shadow-2xs">
                        <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                        <input
                          type="month"
                          value={academicMonth}
                          onChange={(e) => {
                            if (e.target.value) setAcademicMonth(e.target.value);
                          }}
                          className="bg-transparent text-xs font-black text-gray-800 outline-none cursor-pointer"
                        />
                      </div>

                      {isTeacher && (
                        <button
                          type="button"
                          onClick={handleSaveAllGrades}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Lưu điểm</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Month Summary Stats Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">
                          Trung bình cộng (ĐTB)
                        </span>
                        <div className="text-xl font-black text-blue-900">
                          {academicSummary?.formattedAverage || 'Chưa có điểm'}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          Tháng {academicMonth.split('-')[1]}/{academicMonth.split('-')[0]}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">
                          Số môn đã có điểm
                        </span>
                        <div className="text-xl font-black text-emerald-900">
                          {academicSummary?.validSubjectsCount || 0} / {state.config.subjects.length} môn
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {state.config.subjects.length - (academicSummary?.validSubjectsCount || 0) === 0
                            ? 'Đủ tất cả các môn'
                            : `Còn thiếu ${state.config.subjects.length - (academicSummary?.validSubjectsCount || 0)} môn`}
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Check className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">
                          Xếp hạng trong lớp
                        </span>
                        <div className="text-xl font-black text-amber-900">
                          {academicSummary?.rank !== null && academicSummary?.rank !== undefined
                            ? `Hạng ${academicSummary.rank} / ${state.students.length}`
                            : 'Chưa có hạng'}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          Bằng điểm cùng thứ hạng
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <Star className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Subject Grades Table */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-gray-600 w-12 text-center">STT</th>
                          <th className="px-4 py-3 font-bold text-gray-600">Môn học</th>
                          <th className="px-4 py-3 font-bold text-gray-600 text-center w-36">
                            Điểm số (Tháng {academicMonth.split('-')[1]}/{academicMonth.split('-')[0]})
                          </th>
                          <th className="px-4 py-3 font-bold text-gray-600 text-center w-44">
                            Loại đánh giá
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {state.config.subjects.map((sub, idx) => {
                          const isEval = (state.config.evaluationSubjects || []).includes(sub);
                          const val = tempGrades[sub];
                          return (
                            <tr key={sub} className="hover:bg-gray-50/70 transition-colors">
                              <td className="px-4 py-3 text-center text-gray-400 font-bold text-xs">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-800">
                                {sub}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {isTeacher ? (
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={val !== undefined ? String(val) : ''}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      const parsed = parseGradeValue(text);
                                      setTempGrades((prev) => {
                                        const next = { ...prev };
                                        if (parsed.isValid && parsed.score !== undefined) {
                                          next[sub] = parsed.score;
                                        } else if (text.trim() === '') {
                                          delete next[sub];
                                        }
                                        return next;
                                      });
                                    }}
                                    className="w-24 px-2 py-1.5 border border-gray-300 focus:border-blue-500 rounded-lg text-center font-black text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs sm:text-sm"
                                    placeholder="-"
                                  />
                                ) : (
                                  <span className="font-black text-blue-700 text-sm">
                                    {val !== undefined ? val : '-'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {isEval ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Nhận xét (không tính ĐTB)
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Tính điểm (0 - 10)
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* LỊCH SỬ ĐIỂM CÁC THÁNG & BIỂU ĐỒ THEO DÕI TIẾN ĐỘ */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
                          Lịch Sử &amp; Biểu Đồ Điểm Trung Bình Các Tháng
                        </h4>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {studentAcademicHistory.filter((h) => h.rawAverage !== null).length} tháng có dữ liệu
                      </span>
                    </div>

                    {/* Biểu đồ tiến độ ĐTB */}
                    <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                      <div className="text-[11px] font-bold text-gray-500 mb-3 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Biểu đồ so sánh điểm trung bình cộng (Thang điểm 0 - 10):</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {studentAcademicHistory.map((hist) => {
                          const hasScore = hist.rawAverage !== null;
                          const pct = hasScore ? Math.min(100, Math.max(0, (hist.rawAverage! / 10) * 100)) : 0;
                          const isSelected = hist.month === academicMonth;

                          return (
                            <div
                              key={hist.month}
                              onClick={() => setAcademicMonth(hist.month)}
                              className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-500 shadow-xs ring-2 ring-blue-400/20'
                                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                              }`}
                            >
                              <div className="text-[11px] font-extrabold text-gray-700">
                                {hist.monthDisplay}
                              </div>

                              {/* Bar indicator */}
                              <div className="my-2.5 h-16 flex items-end justify-center bg-gray-100 rounded-lg p-1 overflow-hidden">
                                {hasScore ? (
                                  <div
                                    style={{ height: `${pct}%` }}
                                    className={`w-full rounded-md transition-all ${
                                      hist.rawAverage! >= 8.0
                                        ? 'bg-emerald-500'
                                        : hist.rawAverage! >= 6.5
                                        ? 'bg-blue-500'
                                        : hist.rawAverage! >= 5.0
                                        ? 'bg-amber-500'
                                        : 'bg-red-500'
                                    }`}
                                    title={`ĐTB: ${hist.formattedAverage}`}
                                  />
                                ) : (
                                  <span className="text-[9px] text-gray-400 italic">Trống</span>
                                )}
                              </div>

                              <div>
                                <div className={`text-xs font-black ${hasScore ? 'text-blue-700' : 'text-gray-400'}`}>
                                  {hasScore ? `ĐTB: ${hist.formattedAverage}` : 'Chưa có'}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  {hist.validCount} môn
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: THI ĐUA & KỶ LUẬT (2 CỘT) */}
              {activeTab === 'discipline' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left Column: Direct Logging Form (Teacher only) */}
                  {isTeacher && (
                    <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-blue-600" /> Ghi nhận sự việc
                      </h4>
                      <form onSubmit={handleSubmitDiscipline} className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Ngày xảy ra <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={disDate}
                            onChange={(e) => setDisDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Quy tắc thi đua <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={disRuleId || state.config.rules[0]?.id || ''}
                            onChange={(e) => setDisRuleId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                          >
                            {state.config.rules.length === 0 ? (
                              <option value="">Chưa có quy tắc thi đua nào (vào Cài đặt để thêm)</option>
                            ) : (
                              state.config.rules.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.type === 'plus' ? `+${r.points}` : `-${r.points}`}đ)
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Chi tiết sự việc (Tùy chọn)
                          </label>
                          <textarea
                            rows={3}
                            value={disNote}
                            onChange={(e) => setDisNote(e.target.value)}
                            placeholder="Ghi chú thêm hoàn cảnh, tiết học..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                        >
                          Lưu ghi nhận sự việc
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Right Column: Month Filter & History */}
                  <div
                    className={`${
                      isTeacher ? 'lg:col-span-2' : 'lg:col-span-3'
                    } space-y-4`}
                  >
                    {/* Filter bar */}
                    <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">
                          Kỳ đánh giá (Tháng)
                        </label>
                        <select
                          value={selectedDisciplineMonth}
                          onChange={(e) => setSelectedDisciplineMonth(e.target.value)}
                          className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold bg-white outline-none cursor-pointer"
                        >
                          <option value="all">Tất cả thời gian</option>
                          {disciplineMonths.map((m) => {
                            const [y, mo] = m.split('-');
                            return (
                              <option key={m} value={m}>
                                Tháng {mo}/{y}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="flex flex-wrap items-center gap-6">
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">
                            Điểm thi đua còn lại
                          </span>
                          <div className="flex items-baseline justify-end gap-1">
                            <span
                              className={`text-2xl font-black ${
                                monthPoints >= 90
                                  ? 'text-emerald-600'
                                  : monthPoints >= 80
                                  ? 'text-blue-600'
                                  : monthPoints >= 65
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {monthPoints}
                            </span>
                            <span className="text-xs font-bold text-gray-400">/ {baseScore}đ</span>
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1.5 justify-end mt-0.5 font-medium">
                            <span>Điểm trừ: <strong className="text-red-500 font-bold">-{monthSummary.totalMinus}đ</strong></span>
                            <span>•</span>
                            <span>Thưởng: <strong className="text-emerald-600 font-bold">+{monthSummary.totalPlus}đ</strong></span>
                          </div>
                        </div>
                        <div className="text-right border-l pl-4 border-gray-200">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">
                            Hạnh kiểm
                          </span>
                          <span className={`text-base font-black ${monthConduct.color}`}>
                            {monthConduct.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* History table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-blue-600" />
                          Lịch sử sự việc thi đua &amp; kỷ luật ({filteredDiscipline.length})
                        </span>
                        {filteredDiscipline.length > 4 && (
                          <span className="text-[11px] text-gray-400 font-medium">
                            Cuộn xuống để xem thêm
                          </span>
                        )}
                      </div>

                      <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-[420px] overflow-y-auto custom-scrollbar scroll-smooth overscroll-contain shadow-2xs">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 font-bold text-gray-600 w-28">Ngày</th>
                            <th className="px-4 py-3 font-bold text-gray-600">Sự việc</th>
                            <th className="px-4 py-3 font-bold text-gray-600 text-center w-20">
                              Điểm
                            </th>
                            {isTeacher && (
                              <th className="px-4 py-3 font-bold text-gray-600 text-center w-14">
                                Xóa
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {filteredDiscipline.length === 0 ? (
                            <tr>
                              <td
                                colSpan={isTeacher ? 4 : 3}
                                className="px-4 py-8 text-center text-gray-400"
                              >
                                Không có ghi nhận nào trong thời gian này.
                              </td>
                            </tr>
                          ) : (
                            filteredDiscipline.map((d) => (
                              <tr key={d.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-gray-500 font-medium">
                                  {formatDisplayDate(d.date)}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-gray-900">{d.ruleName}</p>
                                  {d.note && (
                                    <p className="text-[11px] text-gray-400 mt-0.5 whitespace-pre-wrap">
                                      {d.note}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                      d.type === 'plus'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-red-50 text-red-700'
                                    }`}
                                  >
                                    {d.type === 'plus' ? `+${d.points}` : `-${d.points}`}
                                  </span>
                                </td>
                                {isTeacher && (
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => setConfirmDeleteDisciplineId(d.id)}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Xóa"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* TAB 5: SỔ TAY & LIÊN HỆ */}
              {activeTab === 'notes' && isTeacher && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-bold text-gray-800">
                      Sổ tay nhật ký &amp; Liên lạc phụ huynh
                    </h3>
                    <button
                      onClick={() => setIsAddNoteModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm ghi chú</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[450px] overflow-y-auto custom-scrollbar scroll-smooth">
                    {state.notes.filter(
                      (n) => n.studentId === student.id && !locallyDeletedNoteIds.includes(n.id)
                    ).length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">
                        Chưa có nhật ký trao đổi hay liên hệ phụ huynh nào.
                      </div>
                    ) : (
                      state.notes
                        .filter(
                          (n) =>
                            n.studentId === student.id && !locallyDeletedNoteIds.includes(n.id)
                        )
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() - new Date(a.date).getTime()
                        )
                        .map((note) => (
                          <div
                            key={note.id}
                            className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 relative group"
                          >
                            <button
                              onClick={() => setConfirmDeleteNoteId(note.id)}
                              className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-bold text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                                {note.type}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                {formatDisplayDate(note.date)}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {note.content}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub Modals */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        student={student}
        state={state}
        onClose={() => setIsPrintModalOpen(false)}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onSave={(newPass) => {
          onChangePassword(student.id, newPass);
          onShowToast('Đổi mật khẩu thành công');
        }}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* Add Note Modal */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm">
                Thêm Ghi chú / Liên hệ phụ huynh
              </h3>
              <button
                onClick={() => setIsAddNoteModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="w-4 h-4 hidden" />
                <span>✕</span>
              </button>
            </div>
            <form onSubmit={handleCreateNote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ngày ghi nhận
                </label>
                <input
                  type="date"
                  required
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phân loại
                </label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none bg-white cursor-pointer"
                >
                  <option value="Liên hệ PH">Liên hệ Phụ huynh</option>
                  <option value="Học tập">Học tập</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nội dung ghi nhận
                </label>
                <textarea
                  rows={4}
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Ghi chú chi tiết nội dung cuộc gọi hoặc sự việc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddNoteModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Lưu ghi chú
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Discipline Confirm */}
      <ConfirmModal
        isOpen={!!confirmDeleteDisciplineId}
        title="Xóa ghi nhận sự việc"
        message="Bạn có chắc chắn muốn xóa ghi nhận thi đua này?"
        confirmText="Xóa sự việc"
        onConfirm={() => {
          if (confirmDeleteDisciplineId) {
            const idToDelete = confirmDeleteDisciplineId;
            setLocallyDeletedDisciplineIds((prev) => [...prev, idToDelete]);
            onDeleteDiscipline(idToDelete);
            setConfirmDeleteDisciplineId(null);
          }
        }}
        onCancel={() => setConfirmDeleteDisciplineId(null)}
      />

      {/* Delete Note Confirm */}
      <ConfirmModal
        isOpen={!!confirmDeleteNoteId}
        title="Xóa ghi chú"
        message="Bạn có chắc chắn muốn xóa ghi chú này?"
        confirmText="Xóa ghi chú"
        onConfirm={() => {
          if (confirmDeleteNoteId) {
            const idToDelete = confirmDeleteNoteId;
            setLocallyDeletedNoteIds((prev) => [...prev, idToDelete]);
            onDeleteNote(idToDelete);
            setConfirmDeleteNoteId(null);
          }
        }}
        onCancel={() => setConfirmDeleteNoteId(null)}
      />

      {/* Delete Attendance Confirm */}
      <ConfirmModal
        isOpen={!!confirmDeleteAttendanceId}
        title="Xóa bản ghi điểm danh"
        message="Bạn có chắc chắn muốn xóa bản ghi điểm danh ngày này? Sau khi xóa, ngày này sẽ được chuyển về trạng thái Chưa điểm danh."
        confirmText="Xóa bản ghi"
        isDanger={true}
        onConfirm={() => {
          if (confirmDeleteAttendanceId) {
            const idToDelete = confirmDeleteAttendanceId;
            onDeleteAttendance?.(idToDelete);
            setConfirmDeleteAttendanceId(null);
          }
        }}
        onCancel={() => setConfirmDeleteAttendanceId(null)}
      />
    </div>
  );
};
