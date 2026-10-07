import React, { useState } from 'react';
import { GraduationCap, Lock, IdCard, KeyRound, Sparkles } from 'lucide-react';
import { Student } from '../types';

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
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentPassInput, setStudentPassInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
    const cleanId = studentIdInput.trim().toUpperCase();
    const student = students.find((s) => s.id.toUpperCase() === cleanId);
    if (!student) {
      setErrorMessage('Không tìm thấy Mã học sinh (ID) này!');
      return;
    }
    const studentPass = student.password || student.id;
    if (studentPassInput === studentPass) {
      onLoginStudent(student.id);
    } else {
      setErrorMessage('Mật khẩu tra cứu học sinh không đúng!');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 animate-fadeIn">
        <div className="text-center mb-6">
          {/* Nón tú tài trên nền xanh ngọc - xanh dương */}
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-200">
            <GraduationCap className="w-9 h-9 stroke-[2.2]" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
            {appName || 'TRỢ LÝ CHỦ NHIỆM'}
          </h2>
          <p className="text-gray-500 text-xs mt-1 font-medium">
            Cổng thông tin &amp; Quản lý Lớp học Thông minh
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex gap-1.5 mb-6 bg-gray-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('teacher');
              setErrorMessage('');
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
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
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === 'student'
                ? 'bg-white shadow-sm text-emerald-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Học sinh / Phụ huynh
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl text-center">
            {errorMessage}
          </div>
        )}

        {/* Teacher form */}
        {activeTab === 'teacher' ? (
          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Mật khẩu Quản lý
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={teacherPassInput}
                  onChange={(e) => setTeacherPassInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/70 focus:bg-white transition-all text-sm font-medium"
                  placeholder="Mật khẩu mặc định: admin"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 italic">
                * Mật khẩu mặc định cho giáo viên: <code className="font-mono font-bold text-blue-600">admin</code>
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-blue-200 text-sm cursor-pointer mt-2"
            >
              Đăng nhập Quản lý
            </button>
          </form>
        ) : (
          /* Student form */
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Mã học sinh (ID)
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50/70 focus:bg-white transition-all text-sm font-medium uppercase"
                  placeholder="Ví dụ: 15052012"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={studentPassInput}
                  onChange={(e) => setStudentPassInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50/70 focus:bg-white transition-all text-sm font-medium"
                  placeholder="Mặc định là ID của học sinh"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 italic">
                * Thử mẫu: Mã <code className="font-mono font-bold text-emerald-600">15052012</code> (Mật khẩu trùng mã)
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-emerald-200 text-sm cursor-pointer mt-2"
            >
              Tra cứu Hồ sơ Học sinh
            </button>
          </form>
        )}

        {/* Demo fast pick */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1 text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Trợ Lý Chủ Nhiệm
          </span>
          <button
            type="button"
            onClick={() => {
              setTeacherPassInput('admin');
              onLoginTeacher();
            }}
            className="text-blue-600 hover:text-blue-800 font-bold cursor-pointer underline text-[11px]"
          >
            Vào nhanh thử nghiệm
          </button>
        </div>
      </div>
    </div>
  );
};
