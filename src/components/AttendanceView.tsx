import React, { useState } from 'react';
import {
  Calendar,
  CheckCheck,
  Save,
  Check,
  Mail,
  X as XIcon,
  Clock,
  UserX,
} from 'lucide-react';
import { AppState, AttendanceStatus } from '../types';
import { getTodayStr } from '../utils/helpers';

interface AttendanceViewProps {
  state: AppState;
  onUpdateAttendanceStatus: (studentId: string, date: string, status: AttendanceStatus) => void;
  onMarkAllPresent: (date: string) => void;
  onSaveNotice: () => void;
  onSelectStudent: (studentId: string) => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  state,
  onUpdateAttendanceStatus,
  onMarkAllPresent,
  onSaveNotice,
  onSelectStudent,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());

  const recordsForDate = state.attendance.filter((a) => a.date === selectedDate);
  const presentCount = recordsForDate.filter((a) => a.status === 'c').length;
  const permissionCount = recordsForDate.filter((a) => a.status === 'v').length;
  const unexcusedCount = recordsForDate.filter((a) => a.status === 'kp').length;
  const lateCount = recordsForDate.filter((a) => a.status === 'm').length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-full flex flex-col pb-10 animate-fadeIn">
      {/* Top Bar: Date picker & Actions */}
      <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex items-center">
            <Calendar className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl font-bold text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          <span className="text-xs text-gray-400 hidden sm:inline">
            Chọn ngày cần kiểm tra hoặc điểm danh
          </span>
        </div>

        {/* Stats badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
            Có mặt: <strong>{presentCount}</strong>
          </span>
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
            Có phép: <strong>{permissionCount}</strong>
          </span>
          <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl border border-red-100">
            Kh.phép: <strong>{unexcusedCount}</strong>
          </span>
          <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
            Muộn: <strong>{lateCount}</strong>
          </span>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => onMarkAllPresent(selectedDate)}
            className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs sm:text-sm border border-emerald-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Tất cả có mặt</span>
          </button>
          <button
            onClick={onSaveNotice}
            className="flex-1 md:flex-none px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-blue-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu điểm danh</span>
          </button>
        </div>
      </div>

      {/* Student attendance grid */}
      <div className="flex-1 overflow-y-auto bg-white rounded-3xl shadow-xs border border-gray-100 p-4 sm:p-6 relative">
        {state.students.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <UserX className="w-16 h-16 text-gray-200 mb-3" />
            <p className="text-base font-semibold text-gray-600">
              Chưa có học sinh trong danh sách
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Vào mục "Học sinh" để thêm hoặc nhập dữ liệu từ Excel.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {state.students.map((student) => {
              const currentRecord = state.attendance.find(
                (a) => a.studentId === student.id && a.date === selectedDate
              );
              const currentStatus = currentRecord ? currentRecord.status : 'c';

              return (
                <div
                  key={student.id}
                  className="bg-gray-50/70 border border-gray-200/90 rounded-2xl p-3.5 flex flex-col justify-between hover:border-blue-300 transition-colors"
                >
                  <div
                    onClick={() => onSelectStudent(student.id)}
                    className="flex items-center gap-3 mb-3 cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
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
                      <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-xs sm:text-sm uppercase truncate">
                        {student.name}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">
                        ID: {student.id}
                      </p>
                    </div>
                  </div>

                  {/* 4 buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {/* Có mặt */}
                    <button
                      onClick={() =>
                        onUpdateAttendanceStatus(student.id, selectedDate, 'c')
                      }
                      className={`py-2 px-1 flex flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        currentStatus === 'c'
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                          : 'bg-white text-gray-500 hover:bg-emerald-50 border border-gray-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 mb-0.5" />
                      <span>Có mặt</span>
                    </button>

                    {/* Có phép */}
                    <button
                      onClick={() =>
                        onUpdateAttendanceStatus(student.id, selectedDate, 'v')
                      }
                      className={`py-2 px-1 flex flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        currentStatus === 'v'
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                          : 'bg-white text-gray-500 hover:bg-blue-50 border border-gray-200'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5 mb-0.5" />
                      <span>Có phép</span>
                    </button>

                    {/* Không phép */}
                    <button
                      onClick={() =>
                        onUpdateAttendanceStatus(student.id, selectedDate, 'kp')
                      }
                      className={`py-2 px-1 flex flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        currentStatus === 'kp'
                          ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-300'
                          : 'bg-white text-gray-500 hover:bg-red-50 border border-gray-200'
                      }`}
                    >
                      <XIcon className="w-3.5 h-3.5 mb-0.5" />
                      <span>Kh.phép</span>
                    </button>

                    {/* Đi muộn */}
                    <button
                      onClick={() =>
                        onUpdateAttendanceStatus(student.id, selectedDate, 'm')
                      }
                      className={`py-2 px-1 flex flex-col items-center justify-center rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        currentStatus === 'm'
                          ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                          : 'bg-white text-gray-500 hover:bg-amber-50 border border-gray-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 mb-0.5" />
                      <span>Muộn</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
