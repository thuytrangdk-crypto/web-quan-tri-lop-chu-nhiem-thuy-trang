import React, { useState } from 'react';
import { GraduationCap, Lock, Calendar, KeyRound, Sparkles, User, Check, ChevronRight } from 'lucide-react';
import { Student } from '../types';
import { matchesStudentDob, getStudentDobDisplay } from '../utils/helpers';

interface LoginModalProps {
  appName: string;
  teacherPassword: string;
  students: Student[];
  onLoginTeacher: () => void;
  onLoginStudent: (studentId: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  appName,
  teacherPassword,
  students,
  onLoginTeacher,
  onLoginStudent,
}) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
  const [teacherPassInput, setTeacherPassInput] = useState('');
  const [studentDobInput, setStudentDobInput] = useState('');
  const [studentPassInput, setStudentPassInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [matchedStudents, setMatchedStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (teacherPassInput === teacherPassword) {
      onLoginTeacher();
    } else {
      setErrorMessage('Mật khẩu quản lý không chính xác!');
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // If already picked from multiple matches
    if (selectedStudent) {
      verifyAndLoginStudent(selectedStudent);
      return;
    }

    const cleanInput = studentDobInput.trim();
    if (!cleanInput) {
      setErrorMessage('Vui lòng nhập ngày tháng năm sinh của học sinh!');
      return;
    }

    // Find all matching students by DOB or ID or name
    const found = students.filter(
      (s) =>
        matchesStudentDob(s, cleanInput) ||
        s.name.toLowerCase().trim() === cleanInput.toLowerCase()
    );

    if (found.length === 0) {
      setErrorMessage(
        'Không tìm thấy học sinh nào có ngày sinh "' +
          cleanInput +
          '". Vui lòng kiểm tra lại ngày sinh (ví dụ: 15/05/2012 hoặc 15052012)!'
      );
      setMatchedStudents([]);
      return;
    }

    if (found.length === 1) {
      verifyAndLoginStudent(found[0]);
    } else {
      // Multiple students share same DOB
      setMatchedStudents(found);
      setErrorMessage('');
    }
  };

  const verifyAndLoginStudent = (student: Student) => {
    const cleanPass = studentPassInput.trim();
    if (!cleanPass) {
      setErrorMessage('Vui lòng nhập mật khẩu (ngày sinh của em)!');
      return;
    }

    const passMatches =
      matchesStudentDob(student, cleanPass) ||
      (student.password && student.password === cleanPass) ||
      student.id === cleanPass;

    if (passMatches) {
      onLoginStudent(student.id);
    } else {
      setErrorMessage(
        `Mật khẩu không chính xác cho học sinh ${student.name}! Mật khẩu là ngày tháng năm sinh của em.`
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 animate-fadeIn max-h-[92vh] overflow-y-auto">
        <div className="text-center mb-6">
          {/* Nón tú tài trên nền xanh ngọc - xanh dương */}
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg shadow-blue-200">
            <GraduationCap className="w-9 h-9 stroke-[2.2]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase">
            {appName || 'TRỢ LÝ CHỦ NHIỆM'}
          </h2>
          <p className="text-gray-500 text-xs mt-1 font-medium">
            Cổng thông tin &amp; Quản lý Lớp học Thông minh
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex gap-1.5 mb-5 bg-gray-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('teacher');
              setErrorMessage('');
              setMatchedStudents([]);
              setSelectedStudent(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'teacher'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Giáo viên
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('student');
              setErrorMessage('');
              setMatchedStudents([]);
              setSelectedStudent(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'student'
                ? 'bg-white shadow-sm text-emerald-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Học sinh / Phụ huynh
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl text-center leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* Teacher form */}
        {activeTab === 'teacher' ? (
          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Mật khẩu Quản lý Giáo viên
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={teacherPassInput}
                  onChange={(e) => setTeacherPassInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/70 focus:bg-white transition-all text-sm font-medium"
                  placeholder="Nhập mật khẩu..."
                  required
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5 italic">
                * Mật khẩu mặc định: <code className="font-mono font-bold text-blue-600">admin</code> (có thể đổi sau khi đăng nhập)
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-blue-200 text-sm cursor-pointer mt-2"
            >
              Đăng nhập Giáo viên
            </button>
          </form>
        ) : (
          /* Student form */
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Tài khoản (Ngày tháng năm sinh)
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                <input
                  type="text"
                  value={studentDobInput}
                  onChange={(e) => {
                    setStudentDobInput(e.target.value);
                    setMatchedStudents([]);
                    setSelectedStudent(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50/70 focus:bg-white transition-all text-sm font-semibold"
                  placeholder="Ví dụ: 15/05/2012 hoặc 15052012"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 italic">
                * Định dạng: <span className="font-bold text-emerald-700">ngày/tháng/năm</span> (theo thông tin GVCN đã cập nhật)
              </p>
            </div>

            {/* If multiple students have the same DOB, let student pick their name */}
            {matchedStudents.length > 1 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-emerald-900">
                  Lớp có {matchedStudents.length} bạn trùng ngày sinh này. Vui lòng chọn tên em:
                </p>
                <div className="space-y-1.5">
                  {matchedStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStudent(s)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        selectedStudent?.id === s.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-gray-700 hover:bg-emerald-100/60 border border-emerald-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        <span>{s.name} ({s.gender})</span>
                      </div>
                      {selectedStudent?.id === s.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Mật khẩu (Ngày tháng năm sinh)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={studentPassInput}
                  onChange={(e) => setStudentPassInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50/70 focus:bg-white transition-all text-sm font-medium"
                  placeholder="Nhập ngày tháng năm sinh (trùng tài khoản)"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 italic">
                * Mật khẩu là ngày tháng năm sinh của học sinh
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-emerald-200 text-sm cursor-pointer mt-2"
            >
              Đăng nhập Học sinh
            </button>
          </form>
        )}

        {/* Demo fast pick for easy testing */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="flex items-center gap-1 text-gray-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Thử nghiệm nhanh:
            </span>
            <button
              type="button"
              onClick={() => {
                setTeacherPassInput(teacherPassword || 'admin');
                onLoginTeacher();
              }}
              className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer underline text-[11px]"
            >
              Vào quyền Giáo viên
            </button>
          </div>

          {/* Quick select first student demo */}
          {students.length > 0 && (
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-[11px] text-slate-600 border border-slate-200/70">
              <span className="truncate">
                Học sinh mẫu: <strong>{students[0].name}</strong> ({getStudentDobDisplay(students[0].dob)})
              </span>
              <button
                type="button"
                onClick={() => {
                  const s = students[0];
                  const dobStr = getStudentDobDisplay(s.dob);
                  setStudentDobInput(dobStr);
                  setStudentPassInput(dobStr);
                  onLoginStudent(s.id);
                }}
                className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer shrink-0 ml-2"
              >
                Vào ngay
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
