import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Lock,
  Calendar,
  Sparkles,
  User,
  Check,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [teacherPassInput, setTeacherPassInput] = useState('');
  const [studentPasswordInput, setStudentPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [matchedStudents, setMatchedStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Prevent browser autofilling teacher credentials into student fields
  useEffect(() => {
    if (activeTab === 'student') {
      if (
        studentPasswordInput &&
        teacherPassword &&
        (studentPasswordInput === teacherPassword ||
          studentPasswordInput.includes(teacherPassword))
      ) {
        setStudentPasswordInput('');
      }
    }
  }, [activeTab, teacherPassword, studentPasswordInput]);

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (teacherPassInput === teacherPassword) {
      onLoginTeacher();
    } else {
      setErrorMessage('Mật khẩu quản lý giáo viên không chính xác!');
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // If student already selected from multi-match list
    if (selectedStudent) {
      verifyAndLoginStudent(selectedStudent);
      return;
    }

    const cleanInput = studentPasswordInput.trim();
    if (!cleanInput) {
      setErrorMessage('Vui lòng nhập mật khẩu ddmmyyyy (ngày tháng năm sinh) của học sinh!');
      return;
    }

    if (cleanInput === teacherPassword) {
      setErrorMessage(
        'Đây là mật khẩu của giáo viên! Học sinh vui lòng nhập mật khẩu "ddmmyyyy" (ngày tháng năm sinh ví dụ: 15052012).'
      );
      setStudentPasswordInput('');
      return;
    }

    // Match student by DOB (ddmmyyyy or variations), password, or ID
    const found = students.filter(
      (s) =>
        matchesStudentDob(s, cleanInput) ||
        (s.password && s.password.toLowerCase() === cleanInput.toLowerCase()) ||
        s.id === cleanInput ||
        s.name.toLowerCase().trim() === cleanInput.toLowerCase()
    );

    if (found.length === 0) {
      setErrorMessage(
        `Không tìm thấy học sinh với mật khẩu "${cleanInput}". Vui lòng nhập đúng định dạng ddmmyyyy (ví dụ: 15052012 hoặc 15/05/2012)!`
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
    onLoginStudent(student.id);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 animate-fadeIn max-h-[92vh] overflow-y-auto">
        <div className="text-center mb-6">
          {/* Nón tú tài trên nền gradient đồng bộ */}
          <div className="w-16 h-16 bg-gradient-to-br from-[#0284c7] via-[#38bdf8] to-[#a7dff6] text-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-md shadow-sky-200 border border-[#a7dff6]/60">
            <GraduationCap className="w-9 h-9 stroke-[2.2]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase">
            {appName || 'TRỢ LÝ CHỦ NHIỆM'}
          </h2>
          <p className="text-gray-500 text-xs mt-1 font-medium">
            Cổng thông tin &amp; Quản lý Lớp học Thông minh
          </p>
        </div>

        {/* Role Tab Switcher */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6 border border-gray-200/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('student');
              setStudentPasswordInput('');
              setErrorMessage('');
              setMatchedStudents([]);
              setSelectedStudent(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'student'
                ? 'bg-[#d7effb] shadow-2xs text-sky-950 border border-[#a7dff6] font-black'
                : 'text-gray-500 hover:text-sky-950 hover:bg-[#d7effb]/30'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Học sinh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('teacher');
              setTeacherPassInput('');
              setErrorMessage('');
              setMatchedStudents([]);
              setSelectedStudent(null);
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'teacher'
                ? 'bg-[#d7effb] shadow-2xs text-sky-950 border border-[#a7dff6] font-black'
                : 'text-gray-500 hover:text-sky-950 hover:bg-[#d7effb]/30'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Giáo viên</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl text-center leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* Student form */}
        {activeTab === 'student' ? (
          <form
            key="form-student-login"
            onSubmit={handleStudentSubmit}
            autoComplete="off"
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span>Mật khẩu học sinh (ddmmyyyy)</span>
                <span className="text-[10px] font-mono text-sky-950 bg-[#d7effb] px-2 py-0.5 rounded-md font-black border border-[#a7dff6]">
                  ddmmyyyy
                </span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0284c7]" />
                <input
                  type="text"
                  inputMode="numeric"
                  name="txt_student_code_ddmmyyyy"
                  id="txt_student_code_ddmmyyyy"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  value={studentPasswordInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === teacherPassword) {
                      setStudentPasswordInput('');
                      return;
                    }
                    setStudentPasswordInput(val);
                    setMatchedStudents([]);
                    setSelectedStudent(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0284c7] focus:border-[#a7dff6] outline-none bg-gray-50/70 focus:bg-white transition-all text-sm font-semibold font-mono"
                  placeholder="ddmmyyyy (ví dụ: 15052012)"
                  required
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                * Mật khẩu đăng nhập là ngày tháng năm sinh{' '}
                <span className="font-bold text-[#0284c7] font-mono">
                  ddmmyyyy
                </span>{' '}
                của học sinh (ví dụ sinh ngày 15/05/2012 thì nhập{' '}
                <code className="font-mono font-bold text-sky-950 bg-[#d7effb] px-1 py-0.5 rounded border border-[#a7dff6]">
                  15052012
                </code>
                )
              </p>
            </div>

            {/* If multiple students have the same DOB, let student pick their name */}
            {matchedStudents.length > 1 && (
              <div className="p-3.5 bg-[#d7effb]/30 border border-[#a7dff6] rounded-2xl space-y-2">
                <p className="text-xs font-bold text-sky-950">
                  Lớp có {matchedStudents.length} bạn có ngày sinh này. Vui lòng bấm chọn tên em:
                </p>
                <div className="space-y-1.5">
                  {matchedStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(s);
                        onLoginStudent(s.id);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        selectedStudent?.id === s.id
                          ? 'bg-[#0284c7] text-white shadow-xs'
                          : 'bg-white text-gray-700 hover:bg-[#d7effb]/50 border border-[#a7dff6]/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        <span>
                          {s.name} ({s.gender})
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#0284c7]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-sky-200 text-sm cursor-pointer mt-2"
            >
              Đăng nhập Học sinh
            </button>
          </form>
        ) : (
          /* Teacher form */
          <form
            key="form-teacher-login"
            onSubmit={handleTeacherSubmit}
            autoComplete="off"
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Mật khẩu Quản lý Giáo viên
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0284c7]" />
                <input
                  type="password"
                  name="teacher_pass_input"
                  id="teacher_pass_input"
                  autoComplete="current-password"
                  value={teacherPassInput}
                  onChange={(e) => setTeacherPassInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0284c7] focus:border-[#a7dff6] outline-none bg-gray-50/70 focus:bg-white transition-all text-sm font-medium"
                  placeholder="Nhập mật khẩu giáo viên..."
                  required
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                * Mật khẩu mặc định:{' '}
                <code className="font-mono font-bold text-sky-950 bg-[#d7effb] px-1.5 py-0.5 rounded border border-[#a7dff6]">
                  admin
                </code>{' '}
                (có thể đổi sau khi đăng nhập)
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-sky-200 text-sm cursor-pointer mt-2"
            >
              Đăng nhập Giáo viên
            </button>
          </form>
        )}

        {/* Quick test buttons for easy evaluation */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-2 text-xs">
          {/* Quick select first student demo */}
          {students.length > 0 && (
            <div className="flex items-center justify-between bg-[#d7effb]/40 p-2.5 rounded-xl text-[11px] text-sky-950 border border-[#a7dff6]">
              <span className="truncate">
                Học sinh mẫu: <strong>{students[0].name}</strong> (mật khẩu:{' '}
                <code className="font-mono font-bold text-sky-950 bg-[#d7effb] px-1 py-0.5 rounded border border-[#a7dff6]">
                  {getStudentDobDisplay(students[0].dob)}
                </code>
                )
              </span>
              <button
                type="button"
                onClick={() => {
                  const s = students[0];
                  const dobStr = getStudentDobDisplay(s.dob);
                  setStudentPasswordInput(dobStr);
                  onLoginStudent(s.id);
                }}
                className="text-[#0284c7] hover:text-[#0369a1] font-black underline cursor-pointer shrink-0 ml-2"
              >
                Vào ngay
              </button>
            </div>
          )}

          <div className="flex items-center justify-between text-gray-500 px-1">
            <span className="flex items-center gap-1 text-gray-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Dành cho Giáo viên:
            </span>
            <button
              type="button"
              onClick={() => {
                setTeacherPassInput(teacherPassword || 'admin');
                onLoginTeacher();
              }}
              className="text-[#0284c7] hover:text-[#0369a1] font-black cursor-pointer underline text-[11px]"
            >
              Vào quyền Giáo viên (admin)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
