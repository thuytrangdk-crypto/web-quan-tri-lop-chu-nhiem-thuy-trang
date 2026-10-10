import React, { useState, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  Trophy,
  Calendar,
  Sparkles,
  ArrowDown,
  Info,
  AlertTriangle,
  Award,
  Grid3X3,
  Flame,
  UserCheck,
} from 'lucide-react';
import { AppState, BoardNotice, NoticeType, SeatingLayout } from '../types';
import {
  formatDisplayDate,
  getCurrentMonthStr,
  triggerConfetti,
} from '../utils/helpers';
import { BoardNoticeModal } from './BoardNoticeModal';
import { ConfirmModal } from './ConfirmModal';
import { SeatingChartView } from './SeatingChartView';

interface BoardViewProps {
  state: AppState;
  onAddNotice: (notice: Omit<BoardNotice, 'id'>) => void;
  onDeleteNotice: (noticeId: string) => void;
  onUpdateNotice?: (notice: BoardNotice) => void;
  onUpdateSeatingChart: (newChart: Record<string, string>) => void;
  onUpdateSeatingLayout?: (layout: SeatingLayout) => void;
  onSelectStudent: (studentId: string) => void;
  isTeacher: boolean;
  currentStudentId?: string | null;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  state,
  onAddNotice,
  onDeleteNotice,
  onUpdateNotice,
  onUpdateSeatingChart,
  onUpdateSeatingLayout,
  onSelectStudent,
  isTeacher,
  currentStudentId,
  onShowToast,
}) => {
  const [boardSubTab, setBoardSubTab] = useState<'notices' | 'seating' | 'rankings'>('notices');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeToEdit, setNoticeToEdit] = useState<BoardNotice | null>(null);
  const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);

  const loggedStudent = useMemo(() => {
    if (!currentStudentId) return null;
    return state.students.find((s) => s.id === currentStudentId) || null;
  }, [state.students, currentStudentId]);

  // Rankings for selectedMonth
  const { topStudents, bottomStudents } = useMemo(() => {
    const scores = state.students.map((student) => {
      const monthDiscipline = state.discipline.filter(
        (d) => d.studentId === student.id && d.date.startsWith(selectedMonth)
      );

      let totalPoints = 0;
      monthDiscipline.forEach((d) => {
        totalPoints += d.type === 'plus' ? d.points : -d.points;
      });

      return {
        id: student.id,
        name: student.name,
        avatar: student.avatar,
        points: totalPoints,
      };
    });

    const tops = scores
      .filter((s) => s.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);

    const bots = scores
      .filter((s) => s.points < 0)
      .sort((a, b) => a.points - b.points)
      .slice(0, 5);

    return { topStudents: tops, bottomStudents: bots };
  }, [state.students, state.discipline, selectedMonth]);

  const handleSaveNotice = (
    title: string,
    content: string,
    type: NoticeType,
    noticeId?: string,
    date?: string
  ) => {
    const noticeDate = date || new Date().toISOString().split('T')[0];
    if (noticeId && noticeToEdit && onUpdateNotice) {
      onUpdateNotice({
        ...noticeToEdit,
        title,
        content,
        type,
        date: noticeDate,
      });
      onShowToast?.('Đã thay đổi thông tin đã đăng thành công');
    } else {
      onAddNotice({
        date: noticeDate,
        title,
        content,
        type,
      });
      onShowToast?.('Đã đăng thông tin mới lên bảng tin');
    }
    setNoticeToEdit(null);
    setIsNoticeModalOpen(false);
  };

  const handleCelebrate = () => {
    triggerConfetti();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-full flex flex-col pb-10 animate-fadeIn">
      {/* Student Welcome & Quick Actions Banner */}
      {!isTeacher && loggedStudent && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 rounded-3xl p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-lg shadow-inner overflow-hidden border border-white/30">
              {loggedStudent.avatar ? (
                <img
                  src={loggedStudent.avatar}
                  alt={loggedStudent.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                loggedStudent.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/25 text-white">
                  Học sinh Lớp {state.config.className}
                </span>
                <span className="text-xs text-blue-100">Năm học {state.config.schoolYear}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5 uppercase">
                {loggedStudent.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectStudent(loggedStudent.id)}
              className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Xem Hồ sơ của tôi</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab Switcher at the top of Board */}
      <div className="bg-white p-2 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
        <div className="flex gap-1.5">
          <button
            onClick={() => setBoardSubTab('notices')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              boardSubTab === 'notices'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Bảng tin Thông báo</span>
          </button>

          <button
            onClick={() => setBoardSubTab('seating')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              boardSubTab === 'seating'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Sơ đồ lớp</span>
          </button>

          <button
            onClick={() => setBoardSubTab('rankings')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              boardSubTab === 'rankings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Vinh danh &amp; Thi đua</span>
          </button>
        </div>

        {boardSubTab === 'notices' && isTeacher && (
          <button
            onClick={() => {
              setNoticeToEdit(null);
              setIsNoticeModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Đăng thông tin mới</span>
          </button>
        )}
      </div>

      {/* VIEW 1: SEATING CHART */}
      {boardSubTab === 'seating' && (
        <SeatingChartView
          state={state}
          onUpdateSeatingChart={onUpdateSeatingChart}
          onUpdateSeatingLayout={onUpdateSeatingLayout}
          onSelectStudent={onSelectStudent}
          isTeacher={isTeacher}
          currentStudentId={currentStudentId}
          onShowToast={onShowToast}
        />
      )}

      {/* VIEW 2: NOTICES */}
      {boardSubTab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {/* Announcements (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xs border border-gray-100 flex flex-col overflow-hidden h-full">
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Trang thông tin &amp; Bảng tin Lớp {state.config.className}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Các thông báo, kế hoạch và nhắc nhở từ GVCN đến lớp
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/30">
              {state.boardNotices.length === 0 ? (
                <div className="text-center text-gray-400 py-16 flex flex-col items-center">
                  <Megaphone className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-base font-semibold text-gray-600">
                    Chưa có thông tin hoặc thông báo nào
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {isTeacher
                      ? 'Bấm "Đăng thông tin mới" để gửi thông báo đầu tiên cho lớp.'
                      : 'Hiện chưa có thông báo mới từ GVCN.'}
                  </p>
                </div>
              ) : (
                [...state.boardNotices]
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((notice) => {
                    let borderStyle = 'border-l-4 border-l-blue-500 bg-white border-gray-200';
                    let icon = <Info className="w-4 h-4 text-blue-500" />;
                    let tagBg = 'bg-blue-50 text-blue-700';
                    let tagText = 'Thông tin';

                    if (notice.type === 'warning') {
                      borderStyle = 'border-l-4 border-l-amber-500 bg-white border-gray-200';
                      icon = <AlertTriangle className="w-4 h-4 text-amber-500" />;
                      tagBg = 'bg-amber-50 text-amber-700';
                      tagText = 'Nhắc nhở';
                    } else if (notice.type === 'success') {
                      borderStyle = 'border-l-4 border-l-emerald-500 bg-white border-gray-200';
                      icon = <Sparkles className="w-4 h-4 text-emerald-500" />;
                      tagBg = 'bg-emerald-50 text-emerald-700';
                      tagText = 'Khen thưởng';
                    }

                    return (
                      <div
                        key={notice.id}
                        className={`p-5 rounded-2xl shadow-xs border relative transition-all ${borderStyle}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {icon}
                            <h4 className="font-bold text-gray-900 text-sm sm:text-base break-words">
                              {notice.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${tagBg}`}
                            >
                              {tagText}
                            </span>

                            {isTeacher && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNoticeToEdit(notice);
                                    setIsNoticeModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-blue-200/80 shadow-2xs"
                                  title="Chỉnh sửa hoặc thay đổi thông tin đã đăng"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Thay đổi</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNoticeToDelete(notice.id)}
                                  className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-red-200/80 shadow-2xs"
                                  title="Xóa thông tin đã đăng"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {notice.content}
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Ngày đăng: {formatDisplayDate(notice.date)}
                          </span>
                          <span className="font-bold text-blue-600">GVCN Lớp {state.config.className}</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Quick Honors Widget on right */}
          <div className="bg-white rounded-3xl shadow-xs border border-gray-100 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-gray-900 text-sm">
                    Gương mặt tiêu biểu
                  </h4>
                </div>
                <button
                  onClick={() => setBoardSubTab('rankings')}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Xem bảng vàng
                </button>
              </div>

              {topStudents.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-6">
                  Chưa có điểm thưởng tháng này.
                </p>
              ) : (
                <ul className="space-y-2">
                  {topStudents.slice(0, 3).map((s, idx) => (
                    <li
                      key={s.id}
                      onClick={() => onSelectStudent(s.id)}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-blue-50/40 hover:bg-blue-100/50 transition-colors cursor-pointer"
                    >
                      <div className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black flex items-center justify-center text-xs">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-bold text-gray-900 uppercase flex-1 break-words leading-tight">
                        {s.name}
                      </span>
                      <span className="text-xs font-black text-emerald-600">
                        +{s.points}đ
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <p className="font-bold text-xs uppercase mb-1">
                Sơ đồ chỗ ngồi lớp
              </p>
              <p className="text-[11px] text-blue-50 leading-relaxed">
                Đã xếp vị trí bàn học cho {state.students.length} học sinh trong lớp.
              </p>
              <button
                onClick={() => setBoardSubTab('seating')}
                className="mt-3 px-3 py-1.5 bg-white text-blue-700 font-bold text-xs rounded-xl shadow-xs cursor-pointer hover:bg-blue-50 transition-colors w-full"
              >
                Mở sơ đồ chỗ ngồi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: RANKINGS (FULL) */}
      {boardSubTab === 'rankings' && (
        <div className="bg-white rounded-3xl shadow-xs border border-gray-100 p-6 flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  Bảng Vàng Vinh Danh &amp; Thi Đua Rèn Luyện
                </h3>
                <p className="text-xs text-gray-400">
                  Thống kê kết quả thi đua theo tháng
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 bg-white cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              <button
                onClick={handleCelebrate}
                className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Bắn pháo hoa chúc mừng"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Chúc mừng</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top 5 Khen thưởng */}
            <div className="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-100">
              <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" /> Top 5 Khen Thưởng (+ Điểm)
              </h4>

              {topStudents.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-8">
                  Chưa có dữ liệu khen thưởng trong tháng này.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {topStudents.map((s, idx) => (
                    <li
                      key={s.id}
                      onClick={() => onSelectStudent(s.id)}
                      className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs hover:shadow-xs transition-shadow cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black flex items-center justify-center text-xs">
                        {idx + 1}
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 uppercase flex-1 break-words leading-tight">
                        {s.name}
                      </span>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                        +{s.points}đ
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Cần cố gắng hơn */}
            <div className="bg-red-50/40 rounded-2xl p-5 border border-red-100">
              <h4 className="text-xs font-black text-red-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ArrowDown className="w-4 h-4 text-red-600" /> Cần Cố Gắng Hơn (- Điểm)
              </h4>

              {bottomStudents.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-8">
                  Tuyệt vời! Không có học sinh bị trừ điểm trong tháng này.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {bottomStudents.map((s) => (
                    <li
                      key={s.id}
                      onClick={() => onSelectStudent(s.id)}
                      className="flex items-center gap-3 bg-white p-3 rounded-xl border border-red-100 shadow-2xs hover:shadow-xs transition-shadow cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 font-black flex items-center justify-center text-xs">
                        !
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {s.name.charAt(0)}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 uppercase flex-1 break-words leading-tight">
                        {s.name}
                      </span>
                      <span className="text-xs font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-md">
                        {s.points}đ
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <BoardNoticeModal
        isOpen={isNoticeModalOpen}
        initialNotice={noticeToEdit}
        onSave={handleSaveNotice}
        onDelete={(id) => {
          setIsNoticeModalOpen(false);
          setNoticeToDelete(id);
        }}
        onClose={() => {
          setIsNoticeModalOpen(false);
          setNoticeToEdit(null);
        }}
      />

      <ConfirmModal
        isOpen={!!noticeToDelete}
        title="Xóa thông tin đã đăng"
        message="Bạn có chắc chắn muốn xóa bài đăng thông báo này khỏi bảng tin lớp không? Thao tác này sẽ cập nhật ngay lập tức."
        confirmText="Xóa thông tin"
        onConfirm={() => {
          if (noticeToDelete) {
            onDeleteNotice(noticeToDelete);
            setNoticeToDelete(null);
          }
        }}
        onCancel={() => setNoticeToDelete(null)}
      />
    </div>
  );
};
