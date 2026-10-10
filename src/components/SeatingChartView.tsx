import React, { useState } from 'react';
import {
  Users,
  Shuffle,
  Printer,
  RotateCcw,
  Check,
  UserPlus,
  ArrowLeftRight,
  X,
  Sparkles,
  Info,
  Maximize2,
  Plus,
  Minus,
} from 'lucide-react';
import { AppState, SeatingLayout, Student } from '../types';

interface SeatingChartViewProps {
  state: AppState;
  onUpdateSeatingChart: (newChart: Record<string, string>) => void;
  onUpdateSeatingLayout?: (layout: SeatingLayout) => void;
  onSelectStudent: (studentId: string) => void;
  isTeacher: boolean;
  currentStudentId?: string | null;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
}

export const SeatingChartView: React.FC<SeatingChartViewProps> = ({
  state,
  onUpdateSeatingChart,
  onUpdateSeatingLayout,
  onSelectStudent,
  isTeacher,
  currentStudentId,
  onShowToast,
}) => {
  const layout: SeatingLayout = {
    groups: state.seatingLayout?.groups || 4,
    rows:
      state.seatingLayout?.rows && state.seatingLayout.rows >= 8
        ? state.seatingLayout.rows
        : 8,
    seatsPerTable: state.seatingLayout?.seatsPerTable || 2,
  };
  const seatingMap = state.seatingChart || {};

  // Handlers to add/remove tables per row/dãy
  const handleAddRow = () => {
    if (layout.rows >= 12) {
      onShowToast('Số bàn mỗi dãy tối đa là 12 bàn', 'error');
      return;
    }
    const newRows = layout.rows + 1;
    if (onUpdateSeatingLayout) {
      onUpdateSeatingLayout({ ...layout, rows: newRows });
    }
  };

  const handleRemoveRow = () => {
    if (layout.rows <= 3) {
      onShowToast('Số bàn mỗi dãy tối thiểu là 3 bàn', 'error');
      return;
    }
    const newRows = layout.rows - 1;
    if (onUpdateSeatingLayout) {
      onUpdateSeatingLayout({ ...layout, rows: newRows });
    }
  };

  // Selecting a seat for assignment or swap
  const [selectedSeatKey, setSelectedSeatKey] = useState<string | null>(null);
  const [swapSourceSeatKey, setSwapSourceSeatKey] = useState<string | null>(null);

  // List of students who are assigned vs unassigned
  const assignedStudentIds = new Set(Object.values(seatingMap).filter(Boolean));
  const unassignedStudents = state.students.filter(
    (s) => !assignedStudentIds.has(s.id)
  );

  const totalSeats = layout.groups * layout.rows * layout.seatsPerTable;
  const occupiedCount = Object.values(seatingMap).filter((id) =>
    state.students.some((s) => s.id === id)
  ).length;

  // Auto arrange students (random or gender alternating)
  const handleAutoArrange = (mode: 'random' | 'gender') => {
    const studentsToPlace = [...state.students];
    if (mode === 'random') {
      studentsToPlace.sort(() => Math.random() - 0.5);
    } else {
      const males = studentsToPlace.filter((s) => s.gender === 'Nam');
      const females = studentsToPlace.filter((s) => s.gender === 'Nữ');
      const alternating: Student[] = [];
      const maxLen = Math.max(males.length, females.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < males.length) alternating.push(males[i]);
        if (i < females.length) alternating.push(females[i]);
      }
      studentsToPlace.length = 0;
      studentsToPlace.push(...alternating);
    }

    const newMap: Record<string, string> = {};
    let studentIdx = 0;

    for (let r = 1; r <= layout.rows; r++) {
      for (let g = 1; g <= layout.groups; g++) {
        for (let s = 1; s <= layout.seatsPerTable; s++) {
          const key = `g${g}-r${r}-s${s}`;
          if (studentIdx < studentsToPlace.length) {
            newMap[key] = studentsToPlace[studentIdx].id;
            studentIdx++;
          }
        }
      }
    }

    onUpdateSeatingChart(newMap);
    onShowToast(`Đã tự động xếp chỗ cho ${studentIdx} học sinh`);
  };

  const handleClearSeating = () => {
    onUpdateSeatingChart({});
    setSelectedSeatKey(null);
    setSwapSourceSeatKey(null);
    onShowToast('Đã xóa trắng sơ đồ chỗ ngồi');
  };

  const handleSeatClick = (seatKey: string) => {
    if (!isTeacher) {
      const studentId = seatingMap[seatKey];
      if (studentId) {
        if (studentId === currentStudentId) {
          onSelectStudent(studentId);
        } else {
          const seatedStudent = state.students.find((s) => s.id === studentId);
          onShowToast(`Chỗ ngồi của bạn ${seatedStudent ? seatedStudent.name : ''}. (Bảo mật: Học sinh chỉ xem chi tiết hồ sơ cá nhân của chính mình)`);
        }
      }
      return;
    }

    // If currently in swap mode
    if (swapSourceSeatKey) {
      if (swapSourceSeatKey === seatKey) {
        setSwapSourceSeatKey(null);
        return;
      }
      // Perform swap
      const sourceStudent = seatingMap[swapSourceSeatKey];
      const targetStudent = seatingMap[seatKey];
      const updated = { ...seatingMap };
      if (sourceStudent) updated[seatKey] = sourceStudent;
      else delete updated[seatKey];

      if (targetStudent) updated[swapSourceSeatKey] = targetStudent;
      else delete updated[swapSourceSeatKey];

      onUpdateSeatingChart(updated);
      setSwapSourceSeatKey(null);
      setSelectedSeatKey(null);
      onShowToast('Đã đổi vị trí 2 chỗ ngồi');
      return;
    }

    setSelectedSeatKey(seatKey);
  };

  const handleAssignStudent = (studentId: string) => {
    if (!selectedSeatKey) return;
    const updated = { ...seatingMap, [selectedSeatKey]: studentId };
    onUpdateSeatingChart(updated);
    setSelectedSeatKey(null);
    onShowToast('Đã xếp học sinh vào chỗ ngồi');
  };

  const handleRemoveStudentFromSeat = (seatKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...seatingMap };
    delete updated[seatKey];
    onUpdateSeatingChart(updated);
    if (selectedSeatKey === seatKey) setSelectedSeatKey(null);
    onShowToast('Đã bỏ học sinh khỏi chỗ ngồi');
  };

  const handleStartSwap = (seatKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSwapSourceSeatKey(seatKey);
    setSelectedSeatKey(null);
    onShowToast('Chọn chỗ ngồi thứ hai để hoán đổi');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Seating Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-xs border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">
              Sơ đồ Chỗ ngồi Lớp {state.config.className}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {occupiedCount}/{totalSeats} chỗ
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Mô hình: {layout.groups} tổ/dãy • {layout.rows} hàng bàn • Bàn đôi (2 học sinh/bàn)
          </p>
        </div>

        {isTeacher && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Table Rows Control */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs">
              <span className="font-bold text-slate-500 mr-1">Quy mô:</span>
              <button
                type="button"
                onClick={handleRemoveRow}
                disabled={layout.rows <= 3}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer transition-colors shadow-2xs"
                title="Bớt 1 bàn mỗi dãy"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-black text-blue-700 px-1.5 min-w-[50px] text-center">
                {layout.rows} bàn/dãy
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                disabled={layout.rows >= 10}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer transition-colors shadow-2xs"
                title="Thêm 1 bàn mỗi dãy"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Auto Arrange Random */}
            <button
              onClick={() => handleAutoArrange('random')}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Xếp ngẫu nhiên danh sách vào các chỗ"
            >
              <Shuffle className="w-3.5 h-3.5 text-blue-600" />
              <span>Xếp ngẫu nhiên</span>
            </button>

            {/* Auto Arrange Gender */}
            <button
              onClick={() => handleAutoArrange('gender')}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Xếp xen kẽ nam và nữ"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xen kẽ Nam - Nữ</span>
            </button>

            {/* Clear All */}
            <button
              onClick={handleClearSeating}
              className="px-3 py-2 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs font-bold rounded-xl border border-gray-200 transition-colors cursor-pointer"
              title="Xóa sơ đồ để xếp lại"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa sơ đồ</span>
            </button>

            {/* Print Seating Chart */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="In sơ đồ lớp để dán tại lớp"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In sơ đồ</span>
            </button>
          </div>
        )}
      </div>

      {swapSourceSeatKey && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-800 font-bold">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>
              Đang chọn chế độ hoán đổi. Vui lòng bấm vào chỗ ngồi thứ 2 để đổi chỗ!
            </span>
          </div>
          <button
            onClick={() => setSwapSourceSeatKey(null)}
            className="text-amber-900 underline cursor-pointer text-xs"
          >
            Hủy hoán đổi
          </button>
        </div>
      )}

      {/* Main Classroom Seating Layout */}
      <div className="bg-white rounded-3xl shadow-xs border border-gray-100 p-6 overflow-x-auto print:border-none print:shadow-none">
        {/* PODIUM / TEACHER DESK (BỤC GIẢNG & BÀN GIÁO VIÊN) */}
        <div className="max-w-md mx-auto mb-8 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black py-2.5 px-6 rounded-2xl text-xs sm:text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-2">
            <span>BẢNG ĐEN • BỤC GIẢNG &amp; BÀN GIÁO VIÊN</span>
          </div>
          <div className="h-4 border-l-2 border-r-2 border-dashed border-gray-200 mx-auto w-3/4" />
        </div>

        {/* COLUMNS / GROUPS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 min-w-[700px]">
          {Array.from({ length: layout.groups }).map((_, groupIdx) => {
            const groupNum = groupIdx + 1;
            return (
              <div
                key={`group-${groupNum}`}
                className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col space-y-3"
              >
                {/* Group Title Header */}
                <div className="text-center pb-2 border-b border-slate-200">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    TỔ {groupNum} (DÃY {groupNum})
                  </span>
                </div>

                {/* Rows of Tables */}
                <div className="space-y-3">
                  {Array.from({ length: layout.rows }).map((_, rowIdx) => {
                    const rowNum = rowIdx + 1;
                    return (
                      <div
                        key={`g${groupNum}-r${rowNum}`}
                        className="bg-white border border-slate-200 rounded-xl p-2 shadow-2xs hover:border-blue-300 transition-colors"
                      >
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 flex justify-between items-center px-1">
                          <span>Bàn {rowNum}</span>
                        </div>

                        {/* 2 Seats per table */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {Array.from({ length: layout.seatsPerTable }).map(
                            (_, seatIdx) => {
                              const seatNum = seatIdx + 1;
                              const seatKey = `g${groupNum}-r${rowNum}-s${seatNum}`;
                              const studentId = seatingMap[seatKey];
                              const student = state.students.find(
                                (s) => s.id === studentId
                              );
                              const isSelected = selectedSeatKey === seatKey;
                              const isSwapSource = swapSourceSeatKey === seatKey;
                              const isMySeat = !isTeacher && student && student.id === currentStudentId;

                              return (
                                <div
                                  key={seatKey}
                                  onClick={() => handleSeatClick(seatKey)}
                                  className={`rounded-xl p-2 border transition-all relative min-h-[76px] flex flex-col justify-between ${
                                    isTeacher || isMySeat ? 'cursor-pointer' : 'cursor-default'
                                  } ${
                                    isMySeat
                                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 shadow-xs'
                                      : isSwapSource
                                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300 animate-pulse'
                                      : isSelected
                                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
                                      : student
                                      ? student.gender === 'Nam'
                                        ? 'border-blue-100 bg-blue-50/30 hover:border-blue-300'
                                        : 'border-pink-100 bg-pink-50/30 hover:border-pink-300'
                                      : 'border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/20'
                                  }`}
                                >
                                  {student ? (
                                    <>
                                      <div className="flex items-start gap-1.5 min-w-0">
                                        <div
                                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5 ${
                                            isMySeat
                                              ? 'bg-emerald-600'
                                              : student.gender === 'Nam'
                                              ? 'bg-blue-600'
                                              : 'bg-pink-600'
                                          }`}
                                        >
                                          {student.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1">
                                            <p
                                              className="text-[11px] font-bold text-gray-900 uppercase leading-snug break-words flex-1"
                                              title={student.name}
                                            >
                                              {student.name}
                                            </p>
                                            {isMySeat && (
                                              <span className="text-[9px] font-black bg-emerald-600 text-white px-1 py-0.2 rounded shrink-0">
                                                BẠN
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Teacher seat controls */}
                                      {isTeacher && (
                                        <div className="flex items-center justify-end gap-1 mt-1 pt-1 border-t border-gray-100">
                                          <button
                                            type="button"
                                            onClick={(e) =>
                                              handleStartSwap(seatKey, e)
                                            }
                                            className="text-[9px] text-blue-600 hover:text-blue-800 font-bold px-1 rounded hover:bg-blue-100 transition-colors"
                                            title="Đổi chỗ này với chỗ khác"
                                          >
                                            <ArrowLeftRight className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) =>
                                              handleRemoveStudentFromSeat(seatKey, e)
                                            }
                                            className="text-[9px] text-gray-400 hover:text-red-600 p-0.5 rounded"
                                            title="Bỏ học sinh khỏi chỗ"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 hover:text-blue-500 transition-colors py-2">
                                      <UserPlus className="w-3.5 h-3.5 mb-0.5" />
                                      <span className="text-[10px] font-semibold">
                                        Ghế trống
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Entrance / Exit indicator at bottom */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>🚪 CỬA RA VÀO (CUỐI LỚP)</span>
          <span className="font-semibold">
            Trợ Lý Chủ Nhiệm • Sơ đồ chỗ ngồi Lớp {state.config.className}
          </span>
        </div>
      </div>

      {/* Drawer / Popover: Assign Student to Selected Seat */}
      {selectedSeatKey && isTeacher && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-900 text-sm">
                  Chọn học sinh vào chỗ ngồi
                </h4>
                <p className="text-[11px] text-gray-500">
                  Vị trí:{' '}
                  <strong className="text-blue-700 uppercase">
                    {selectedSeatKey}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedSeatKey(null)}
                className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 text-gray-400 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Học sinh chưa xếp chỗ ({unassignedStudents.length}):
              </p>

              {unassignedStudents.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-xs">
                  Tất cả học sinh trong lớp đều đã được xếp chỗ ngồi!
                </div>
              ) : (
                unassignedStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleAssignStudent(s.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center ${
                          s.gender === 'Nam' ? 'bg-blue-600' : 'bg-pink-600'
                        }`}
                      >
                        {s.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 uppercase break-words leading-snug">
                          {s.name}
                        </p>
                        <span className="text-[10px] text-gray-400 font-mono">
                          ID: {s.id} • {s.gender}
                        </span>
                      </div>
                    </div>
                    <button className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg text-[11px] cursor-pointer">
                      Chọn
                    </button>
                  </div>
                ))
              )}

              {/* Also allow reassigning any student from class */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Hoặc chọn từ tất cả học sinh:
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {state.students.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleAssignStudent(s.id)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer text-xs"
                    >
                      <span className="font-semibold text-gray-800 uppercase">
                        {s.name}
                      </span>
                      <span className="text-[10px] text-blue-600 font-bold">
                        Đổi vào đây
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
