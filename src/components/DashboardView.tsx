import React from 'react';
import {
  Users,
  UserX,
  AlertTriangle,
  Award,
  Bell,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AppState, Student } from '../types';
import { calculateConduct, formatDisplayDate, getTodayStr } from '../utils/helpers';

interface DashboardViewProps {
  state: AppState;
  onSelectStudent: (studentId: string) => void;
  onNavigate: (view: string) => void;
  isTeacher?: boolean;
  currentStudentId?: string | null;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  onSelectStudent,
  onNavigate,
  isTeacher = true,
  currentStudentId,
  onShowToast,
}) => {
  const today = getTodayStr();
  const totalStudents = state.students.length;
  const maleCount = state.students.filter((s) => s.gender === 'Nam').length;
  const femaleCount = totalStudents - maleCount;

  const currentStudent = state.students.find((s) => s.id === currentStudentId);

  // Absent today
  const absentToday = state.attendance.filter(
    (a) => a.date === today && (a.status === 'v' || a.status === 'kp')
  ).length;

  // Violations & rewards past 7 days
  const aWeekAgo = new Date();
  aWeekAgo.setDate(aWeekAgo.getDate() - 7);
  const recentDiscipline = state.discipline.filter(
    (d) => new Date(d.date) >= aWeekAgo
  );
  const violationsWeek = recentDiscipline.filter((d) => d.type === 'minus').length;
  const rewardsWeek = recentDiscipline.filter((d) => d.type === 'plus').length;

  // Attention students criteria
  const getStudentAttentionFlags = (s: Student) => {
    const absences = state.attendance.filter(
      (a) =>
        a.studentId === s.id &&
        (a.status === 'v' || a.status === 'kp' || a.status === 'm')
    ).length;
    const minusViolations = state.discipline.filter(
      (d) => d.studentId === s.id && d.type === 'minus'
    ).length;
    const parentContactNotes = state.notes.filter(
      (n) => n.studentId === s.id && n.type === 'Liên hệ PH'
    ).length;

    return {
      absences,
      minusViolations,
      parentContactNotes,
      needsAttention: absences >= 2 || minusViolations > 0 || parentContactNotes > 0,
    };
  };

  const attentionStudents = state.students
    .map((s) => ({ student: s, ...getStudentAttentionFlags(s) }))
    .filter((x) => x.needsAttention);

  // Recent combined activities (discipline + notes)
  const activities = [
    ...state.discipline.map((d) => ({
      id: d.id,
      studentId: d.studentId,
      date: d.date,
      title: d.ruleName,
      desc: d.note || (d.type === 'plus' ? 'Khen thưởng' : 'Vi phạm'),
      type: d.type === 'plus' ? 'reward' : 'violation',
    })),
    ...state.notes.map((n) => ({
      id: n.id,
      studentId: n.studentId,
      date: n.date,
      title: n.type,
      desc: n.content,
      type: 'note',
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-2.5 sm:space-y-3 max-w-7xl mx-auto pb-3 animate-fadeIn">
      {/* 1. Welcome Banner: Harmonized Sky Blue Gradient with #d7effb & #a7dff6 */}
      <div className="bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-[#a7dff6] rounded-xl p-3 sm:p-4 text-white shadow-xs relative overflow-hidden shrink-0 border border-[#a7dff6]/50">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/15 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tight truncate leading-tight text-white drop-shadow-2xs">
              Trợ Lý Chủ Nhiệm • Lớp {state.config.className}
            </h1>
            <p className="text-sky-50 text-xs sm:text-sm mt-0.5 font-medium truncate flex items-center gap-1.5 flex-wrap">
              <span>Giáo viên chủ nhiệm:</span>
              <strong className="text-white font-bold">{state.config.teacherName || 'Chưa thiết lập'}</strong>
            </p>
          </div>
          <div className="shrink-0 self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold text-white border border-white/30 shadow-2xs whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Năm học {state.config.schoolYear}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. 4 Stats Grid: 4 cards in 1 row on desktop, 2x2 on mobile, height 90-105px, padding 12px, gap 12px */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Sĩ số lớp */}
        <div
          onClick={() => onNavigate('students')}
          className="bg-white p-3 rounded-xl shadow-2xs border border-gray-100 hover:shadow-xs hover:border-[#a7dff6] transition-all cursor-pointer group flex flex-col justify-between h-[94px] sm:h-[98px]"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-gray-500 font-bold text-xs sm:text-[13px] uppercase tracking-wider truncate">
              Sĩ số lớp
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#d7effb] text-[#0369a1] border border-[#a7dff6]/70 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-0.5">
            <p className="text-2xl sm:text-[26px] font-black text-gray-900 leading-none tracking-tight">
              {totalStudents}
            </p>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate mt-1">
              <span className="text-[#0284c7] font-bold">{maleCount}</span> Nam ·{' '}
              <span className="text-pink-600 font-bold">{femaleCount}</span> Nữ
            </p>
          </div>
        </div>

        {/* Card 2: Vắng (Hôm nay) */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-3 rounded-xl shadow-2xs border border-gray-100 hover:shadow-xs hover:border-red-200 transition-all cursor-pointer group flex flex-col justify-between h-[94px] sm:h-[98px]"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-gray-500 font-bold text-xs sm:text-[13px] uppercase tracking-wider truncate">
              Vắng (Hôm nay)
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-0.5">
            <p className="text-2xl sm:text-[26px] font-black text-gray-900 leading-none tracking-tight">
              {absentToday}
            </p>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate mt-1">
              {absentToday === 0 ? (
                <span className="text-[#0284c7] font-bold">Đi học đầy đủ 100%</span>
              ) : (
                <span className="text-red-500 font-bold">Cần kiểm tra lý do</span>
              )}
            </p>
          </div>
        </div>

        {/* Card 3: Vi phạm (Tuần) */}
        <div
          onClick={() => onNavigate('board')}
          className="bg-white p-3 rounded-xl shadow-2xs border border-gray-100 hover:shadow-xs hover:border-amber-200 transition-all cursor-pointer group flex flex-col justify-between h-[94px] sm:h-[98px]"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-gray-500 font-bold text-xs sm:text-[13px] uppercase tracking-wider truncate">
              Vi phạm (Tuần)
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-0.5">
            <p className="text-2xl sm:text-[26px] font-black text-gray-900 leading-none tracking-tight">
              {violationsWeek}
            </p>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate mt-1">
              Lượt trừ điểm nề nếp
            </p>
          </div>
        </div>

        {/* Card 4: Khen thưởng */}
        <div
          onClick={() => onNavigate('board')}
          className="bg-white p-3 rounded-xl shadow-2xs border border-gray-100 hover:shadow-xs hover:border-[#a7dff6] transition-all cursor-pointer group flex flex-col justify-between h-[94px] sm:h-[98px]"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-gray-500 font-bold text-xs sm:text-[13px] uppercase tracking-wider truncate">
              Khen thưởng
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#d7effb] text-[#0369a1] border border-[#a7dff6]/70 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-0.5">
            <p className="text-2xl sm:text-[26px] font-black text-gray-900 leading-none tracking-tight">
              {rewardsWeek}
            </p>
            <p className="text-[11px] sm:text-xs text-[#0284c7] font-bold truncate mt-1">
              Lượt cộng điểm gương mẫu
            </p>
          </div>
        </div>
      </div>

      {/* 3. Two Main Columns: Side-by-side on desktop, vertical on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left: Học sinh cần chú ý (Teacher) or Góc học tập (Student) */}
        {isTeacher ? (
          <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-red-50/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm">Học sinh cần chú ý</h3>
                  <p className="text-[10px] sm:text-[11px] text-gray-500">
                    Nghỉ học nhiều, có lỗi vi phạm hoặc cần liên hệ phụ huynh
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
                {attentionStudents.length} em
              </span>
            </div>

            <div className="p-2 sm:p-2.5 flex-1 overflow-y-auto max-h-[320px] sm:max-h-[360px] xl:max-h-[460px] custom-scrollbar scroll-smooth divide-y divide-gray-50">
              {attentionStudents.length === 0 ? (
                <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                  <Sparkles className="w-8 h-8 text-emerald-400 mb-1.5 opacity-80" />
                  <p className="text-xs sm:text-sm font-semibold text-gray-600">
                    Tuyệt vời! Lớp nề nếp rất tốt
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Không có học sinh nào cần lưu ý đặc biệt lúc này.
                  </p>
                </div>
              ) : (
                attentionStudents.map(({ student, absences, minusViolations, parentContactNotes }) => (
                  <div
                    key={student.id}
                    onClick={() => onSelectStudent(student.id)}
                    className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
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
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase leading-snug truncate">
                          {student.name}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {absences >= 2 && (
                            <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                              Vắng/muộn: {absences}
                            </span>
                          )}
                          {minusViolations > 0 && (
                            <span className="px-1.5 py-0.2 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold">
                              Vi phạm: {minusViolations}
                            </span>
                          )}
                          {parentContactNotes > 0 && (
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                              Cần LH phụ huynh
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Student View: Personalized Card */
          <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm">Góc học tập của bạn</h3>
                  <p className="text-[10px] sm:text-[11px] text-gray-500">
                    Thông tin thi đua, nề nếp và chuyên cần cá nhân
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                Học sinh
              </span>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              {currentStudent ? (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-black text-lg shadow-2xs shrink-0 overflow-hidden">
                      {currentStudent.avatar ? (
                        <img
                          src={currentStudent.avatar}
                          alt={currentStudent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        currentStudent.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 text-sm uppercase leading-snug truncate">
                        {currentStudent.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        Ngày sinh: <strong>{formatDisplayDate(currentStudent.dob)}</strong> • Giới tính: {currentStudent.gender}
                      </p>
                      <span className="inline-block mt-0.5 text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-semibold">
                        Mã HS: {currentStudent.id}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-center">
                    <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-emerald-700 font-medium block">Khen thưởng</span>
                      <strong className="text-base text-emerald-800 font-black">
                        {state.discipline.filter((d) => d.studentId === currentStudent.id && d.type === 'plus').length}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-100">
                      <span className="text-[10px] text-amber-700 font-medium block">Điểm danh hôm nay</span>
                      <strong className="text-xs text-amber-800 font-bold block mt-0.5">
                        {(() => {
                          const att = state.attendance.find((a) => a.studentId === currentStudent.id && a.date === today);
                          if (!att) return 'Chưa điểm danh';
                          if (att.status === 'c') return 'Có mặt';
                          if (att.status === 'v') return 'Có phép';
                          if (att.status === 'kp') return 'Không phép';
                          return 'Đi muộn';
                        })()}
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectStudent(currentStudent.id)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Xem toàn bộ Bảng điểm &amp; Hồ sơ của bạn</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="text-center text-gray-400 py-6 text-xs">
                  Vui lòng đăng nhập để xem thông tin
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right: Hoạt động gần đây */}
        <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-blue-50/40 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-xs sm:text-sm">Hoạt động gần đây</h3>
                <p className="text-[10px] sm:text-[11px] text-gray-500">
                  Nhật ký thi đua, khen thưởng và trao đổi
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('board')}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>

          <div className="p-0 flex-1 overflow-y-auto max-h-[320px] sm:max-h-[360px] xl:max-h-[460px] custom-scrollbar scroll-smooth">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs sm:text-sm">
                Chưa có hoạt động nào được ghi nhận.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activities.map((act) => {
                  const student = state.students.find((s) => s.id === act.studentId);
                  const studentName = student ? student.name : 'Học sinh';

                  let badgeColor = 'bg-blue-50 text-blue-600';
                  let icon = <Clock className="w-3.5 h-3.5" />;
                  if (act.type === 'reward') {
                    badgeColor = 'bg-emerald-50 text-emerald-600';
                    icon = <Award className="w-3.5 h-3.5" />;
                  } else if (act.type === 'violation') {
                    badgeColor = 'bg-red-50 text-red-600';
                    icon = <AlertTriangle className="w-3.5 h-3.5" />;
                  }

                  const isSelf = act.studentId === currentStudentId;
                  const handleActivityClick = () => {
                    if (isTeacher || isSelf) {
                      onSelectStudent(act.studentId);
                    } else {
                      onShowToast?.('Bảo mật: Bạn chỉ có quyền xem chi tiết hồ sơ của chính mình!', 'error');
                    }
                  };

                  return (
                    <li
                      key={act.id}
                      onClick={handleActivityClick}
                      className="px-3.5 py-2.5 flex items-start gap-3 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    >
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${badgeColor}`}
                      >
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase leading-snug truncate">
                            {studentName}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {formatDisplayDate(act.date)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 font-medium mt-0.5 truncate">
                          {act.title}
                        </p>
                        {act.desc && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {act.desc}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
