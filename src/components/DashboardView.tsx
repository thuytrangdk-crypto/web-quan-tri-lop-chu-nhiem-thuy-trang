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
  CalendarCheck,
  Megaphone,
  Grid3X3,
} from 'lucide-react';
import { AppState, Student } from '../types';
import { formatDisplayDate, getTodayStr } from '../utils/helpers';

interface DashboardViewProps {
  state: AppState;
  onSelectStudent: (studentId: string) => void;
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  onSelectStudent,
  onNavigate,
}) => {
  const today = getTodayStr();
  const totalStudents = state.students.length;
  const maleCount = state.students.filter((s) => s.gender === 'Nam').length;
  const femaleCount = totalStudents - maleCount;

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
    .slice(0, 6);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Welcome Banner: Blue Ocean Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 rounded-3xl p-6 lg:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Năm học {state.config.schoolYear}
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
              Trợ Lý Chủ Nhiệm • Lớp {state.config.className}
            </h1>
            <p className="text-blue-50 text-xs sm:text-sm mt-1 max-w-xl font-medium">
              Giáo viên chủ nhiệm: <span className="font-bold text-white">{state.config.teacherName}</span>. Theo dõi nề nếp, chuyên cần, sơ đồ chỗ ngồi và rèn luyện của học sinh mỗi ngày.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('attendance')}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4 text-blue-600" /> Điểm danh ngay
            </button>
            <button
              onClick={() => onNavigate('board')}
              className="bg-blue-500/40 hover:bg-blue-500/60 border border-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Grid3X3 className="w-4 h-4" /> Sơ đồ chỗ ngồi
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sĩ số */}
        <div
          onClick={() => onNavigate('students')}
          className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover:border-blue-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">
              Sĩ số lớp
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 tracking-tight">
            {totalStudents}
          </p>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            <span className="text-blue-600 font-bold">{maleCount}</span> Nam •{' '}
            <span className="text-pink-600 font-bold">{femaleCount}</span> Nữ
          </p>
        </div>

        {/* Card 2: Vắng mặt hôm nay */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover:border-red-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">
              Vắng (Hôm nay)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 tracking-tight">
            {absentToday}
          </p>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            {absentToday === 0 ? (
              <span className="text-emerald-600 font-bold">Đi học đầy đủ 100%</span>
            ) : (
              <span className="text-red-500 font-bold">Cần kiểm tra lý do</span>
            )}
          </p>
        </div>

        {/* Card 3: Vi phạm trong tuần */}
        <div
          onClick={() => onNavigate('board')}
          className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover:border-amber-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">
              Vi phạm (Tuần)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 tracking-tight">
            {violationsWeek}
          </p>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            Lượt trừ điểm nề nếp
          </p>
        </div>

        {/* Card 4: Khen thưởng */}
        <div
          onClick={() => onNavigate('board')}
          className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover:border-emerald-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">
              Khen thưởng
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900 tracking-tight">
            {rewardsWeek}
          </p>
          <p className="text-xs text-gray-500 mt-2 font-medium text-emerald-600 font-bold">
            Lượt cộng điểm gương mẫu
          </p>
        </div>
      </div>

      {/* 2 Main Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cần chú ý (Attention list) */}
        <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-red-50/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Học sinh cần chú ý</h3>
                <p className="text-[11px] text-gray-500">
                  Nghỉ học nhiều, có lỗi vi phạm hoặc cần liên hệ phụ huynh
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">
              {attentionStudents.length} em
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[380px] divide-y divide-gray-50">
            {attentionStudents.length === 0 ? (
              <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                <Sparkles className="w-10 h-10 text-emerald-400 mb-2 opacity-80" />
                <p className="text-sm font-semibold text-gray-600">
                  Tuyệt vời! Lớp nề nếp rất tốt
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Không có học sinh nào cần lưu ý đặc biệt lúc này.
                </p>
              </div>
            ) : (
              attentionStudents.map(({ student, absences, minusViolations, parentContactNotes }) => (
                <div
                  key={student.id}
                  onClick={() => onSelectStudent(student.id)}
                  className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
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
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase truncate">
                        {student.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {absences >= 2 && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold">
                            Vắng/muộn: {absences}
                          </span>
                        )}
                        {minusViolations > 0 && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-bold">
                            Vi phạm: {minusViolations}
                          </span>
                        )}
                        {parentContactNotes > 0 && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold">
                            Cần LH phụ huynh
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hoạt động gần đây (Recent activity) */}
        <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-blue-50/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Hoạt động gần đây</h3>
                <p className="text-[11px] text-gray-500">
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

          <div className="p-0 flex-1 overflow-y-auto max-h-[380px]">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Chưa có hoạt động nào được ghi nhận.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activities.map((act) => {
                  const student = state.students.find((s) => s.id === act.studentId);
                  const studentName = student ? student.name : 'Học sinh';

                  let badgeColor = 'bg-blue-50 text-blue-600';
                  let icon = <Clock className="w-4 h-4" />;
                  if (act.type === 'reward') {
                    badgeColor = 'bg-emerald-50 text-emerald-600';
                    icon = <Award className="w-4 h-4" />;
                  } else if (act.type === 'violation') {
                    badgeColor = 'bg-red-50 text-red-600';
                    icon = <AlertTriangle className="w-4 h-4" />;
                  }

                  return (
                    <li
                      key={act.id}
                      onClick={() => onSelectStudent(act.studentId)}
                      className="p-4 flex items-start gap-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${badgeColor}`}
                      >
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-gray-900 uppercase truncate">
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
