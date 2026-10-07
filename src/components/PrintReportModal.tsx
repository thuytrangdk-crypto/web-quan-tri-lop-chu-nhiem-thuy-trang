import React, { useRef } from 'react';
import { X, Printer, GraduationCap, Award, Calendar, Phone, MapPin } from 'lucide-react';
import { AppState, Student } from '../types';
import { calculateConduct, formatDisplayDate } from '../utils/helpers';

interface PrintReportModalProps {
  isOpen: boolean;
  student: Student;
  state: AppState;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  student,
  state,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Calculate attendance summary
  const studentAtt = state.attendance.filter((a) => a.studentId === student.id);
  const excused = studentAtt.filter((a) => a.status === 'v').length;
  const unexcused = studentAtt.filter((a) => a.status === 'kp').length;
  const late = studentAtt.filter((a) => a.status === 'm').length;

  // Calculate discipline & conduct
  const studentDisc = state.discipline.filter((d) => d.studentId === student.id);
  let totalPoints = 0;
  studentDisc.forEach((d) => {
    totalPoints += d.type === 'plus' ? d.points : -d.points;
  });
  const conduct = calculateConduct(totalPoints, state.config.conductThresholds);

  // Grades summary
  const grades = student.grades || {};
  const gradeKeys = Object.keys(grades);
  let gpaStr = '-';
  if (gradeKeys.length > 0) {
    const sum = gradeKeys.reduce((acc, k) => acc + (grades[k] || 0), 0);
    gpaStr = (sum / gradeKeys.length).toFixed(1);
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header toolbar */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-200 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Phiếu Liên Lạc / Báo Cáo Học Sinh
              </h3>
              <p className="text-xs text-gray-500">
                Sẵn sàng để in ấn hoặc xuất PDF gửi phụ huynh
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>In phiếu (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center border border-gray-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white" ref={printRef}>
          <div className="max-w-2xl mx-auto border-2 border-gray-800 p-8 rounded-xl space-y-6 text-gray-800 font-serif">
            {/* National Header */}
            <div className="text-center border-b pb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider">
                TRƯỜNG THCS • NĂM HỌC {state.config.schoolYear}
              </h4>
              <h2 className="text-xl font-bold uppercase mt-2 text-indigo-950 tracking-wide font-sans">
                PHIẾU LIÊN LẠC HỌC SINH
              </h2>
              <p className="text-xs italic text-gray-600 mt-1">
                Lớp: <span className="font-bold">{state.config.className}</span> — GVCN:{' '}
                <span className="font-bold">{state.config.teacherName}</span>
              </p>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <p>
                  <span className="text-gray-500">Họ và tên:</span>{' '}
                  <strong className="text-sm uppercase text-gray-900">{student.name}</strong>
                </p>
                <p className="mt-1">
                  <span className="text-gray-500">Mã học sinh (ID):</span>{' '}
                  <strong className="font-mono">{student.id}</strong>
                </p>
                <p className="mt-1">
                  <span className="text-gray-500">Ngày sinh:</span>{' '}
                  <strong>{formatDisplayDate(student.dob)}</strong> (Giới tính: {student.gender})
                </p>
              </div>
              <div>
                <p>
                  <span className="text-gray-500">Phụ huynh:</span>{' '}
                  <strong>{student.parentName || 'Chưa cập nhật'}</strong>
                </p>
                <p className="mt-1">
                  <span className="text-gray-500">Số điện thoại:</span>{' '}
                  <strong>{student.phone || 'Chưa cập nhật'}</strong>
                </p>
                <p className="mt-1">
                  <span className="text-gray-500">Địa chỉ:</span>{' '}
                  <span>{student.address || 'Chưa cập nhật'}</span>
                </p>
              </div>
            </div>

            {/* Attendance & Conduct summary */}
            <div className="grid grid-cols-2 gap-4 pt-2 font-sans">
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                <h5 className="font-bold text-xs uppercase text-gray-700 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Chuyên cần &amp; Điểm danh
                </h5>
                <div className="text-xs space-y-1">
                  <p>Vắng có phép: <strong className="text-blue-600">{excused}</strong> buổi</p>
                  <p>Vắng không phép: <strong className="text-red-600">{unexcused}</strong> buổi</p>
                  <p>Đi học muộn: <strong className="text-amber-600">{late}</strong> lần</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                <h5 className="font-bold text-xs uppercase text-gray-700 mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-indigo-600" /> Rèn luyện &amp; Hạnh kiểm
                </h5>
                <div className="text-xs space-y-1">
                  <p>Tổng điểm thi đua: <strong className={totalPoints >= 0 ? 'text-emerald-600' : 'text-red-600'}>{totalPoints > 0 ? `+${totalPoints}` : totalPoints} điểm</strong></p>
                  <p>Xếp loại hạnh kiểm: <strong className="text-indigo-700 uppercase font-extrabold text-sm">{conduct.text}</strong></p>
                  <p>Điểm trung bình học tập: <strong className="text-indigo-700">{gpaStr}</strong></p>
                </div>
              </div>
            </div>

            {/* Subject Grades Table */}
            <div className="font-sans">
              <h5 className="font-bold text-xs uppercase text-gray-700 mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> Bảng điểm học tập các môn
              </h5>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-3 py-2 font-bold text-gray-700">Môn học</th>
                      <th className="px-3 py-2 font-bold text-gray-700 text-center w-24">Điểm TB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {state.config.subjects.map((sub) => (
                      <tr key={sub}>
                        <td className="px-3 py-1.5 font-medium">{sub}</td>
                        <td className="px-3 py-1.5 text-center font-bold text-indigo-900">
                          {student.grades?.[sub] !== undefined ? student.grades[sub] : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-2 text-center text-xs font-sans">
              <div>
                <p className="font-bold uppercase text-gray-700">Ý KIẾN PHỤ HUYNH HỌC SINH</p>
                <p className="text-[10px] italic text-gray-400 mt-0.5">(Ký và ghi rõ họ tên)</p>
                <div className="h-16" />
              </div>
              <div>
                <p className="text-gray-500 italic">Ngày ..... tháng ..... năm 202...</p>
                <p className="font-bold uppercase text-gray-700 mt-1">GIÁO VIÊN CHỦ NHIỆM</p>
                <p className="text-[10px] italic text-gray-400 mt-0.5">(Ký và ghi rõ họ tên)</p>
                <div className="h-16 flex items-end justify-center">
                  <p className="font-bold text-gray-900">{state.config.teacherName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
