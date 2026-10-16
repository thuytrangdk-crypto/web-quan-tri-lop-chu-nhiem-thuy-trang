import React, { useRef } from 'react';
import {
  Menu,
  GraduationCap,
  ChevronDown,
  Home,
  Cloud,
  KeyRound,
  LogOut,
  UserCheck,
  Camera,
} from 'lucide-react';
import { SyncStatus } from '../services/supabaseService';
import { resizeImageBase64 } from '../utils/helpers';

interface HeaderProps {
  title: string;
  className: string;
  teacherName: string;
  isTeacher?: boolean;
  studentName?: string;
  classAvatar?: string;
  onUpdateClassAvatar?: (base64: string) => void;
  syncStatus?: SyncStatus;
  onOpenMobileSidebar: () => void;
  onOpenClassSwitch: () => void;
  onGoHome: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenChangePassword?: () => void;
  onOpenMyProfile?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  className,
  teacherName,
  isTeacher = true,
  studentName,
  classAvatar,
  onUpdateClassAvatar,
  syncStatus,
  onOpenMobileSidebar,
  onOpenClassSwitch,
  onGoHome,
  onOpenSupabaseModal,
  onOpenChangePassword,
  onOpenMyProfile,
  onLogout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateClassAvatar) {
      resizeImageBase64(file, 400, 400, (base64) => {
        onUpdateClassAvatar(base64);
      });
    }
    e.target.value = '';
  };

  const teacherInitial = teacherName
    ? teacherName.trim().split(' ').pop()?.charAt(0).toUpperCase() || 'G'
    : 'G';

  const studentInitial = studentName
    ? studentName.trim().split(' ').pop()?.charAt(0).toUpperCase() || 'H'
    : 'H';

  return (
    <header className="h-16 sm:h-18 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 shadow-xs z-10">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden text-gray-500 hover:text-gray-800 p-2 -ml-1 sm:-ml-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            onClick={() => isTeacher && onUpdateClassAvatar && fileInputRef.current?.click()}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-xs relative group ${
              isTeacher && onUpdateClassAvatar
                ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all'
                : ''
            }`}
            title={isTeacher && onUpdateClassAvatar ? 'Bấm để đổi ảnh đại diện lớp' : `Lớp ${className}`}
          >
            {classAvatar ? (
              <img src={classAvatar} alt="Lớp" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5 text-white stroke-[2.2]" />
              </div>
            )}
            {isTeacher && onUpdateClassAvatar && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
          {isTeacher && onUpdateClassAvatar && (
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg, image/png, image/webp"
              onChange={handleAvatarChange}
            />
          )}

          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-base font-black text-slate-900 tracking-tight uppercase whitespace-nowrap">
                TRỢ LÝ CHỦ NHIỆM
              </span>

              {/* Class Pill with Chevron */}
              {isTeacher ? (
                <button
                  onClick={onOpenClassSwitch}
                  className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-blue-50/90 hover:bg-blue-100 active:bg-blue-200 text-blue-700 font-extrabold text-xs border border-blue-200/90 shadow-2xs transition-all cursor-pointer touch-manipulation shrink-0"
                  title="Bấm để đổi lớp hoặc năm học"
                >
                  <span>Lớp {className}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                </button>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200/90 shadow-2xs shrink-0">
                  Lớp {className}
                </span>
              )}
            </div>

            {/* Subline with role status */}
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-slate-600 mt-0.5 truncate max-w-[190px] sm:max-w-none">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isTeacher ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
              />
              {isTeacher ? (
                <span className="truncate">
                  GVCN: <strong className="text-slate-800">{teacherName}</strong>
                </span>
              ) : (
                <span className="truncate">
                  Học sinh: <strong className="text-blue-700">{studentName || 'Đang đăng nhập'}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Supabase Sync Button for Teacher */}
        {isTeacher && onOpenSupabaseModal && (
          <button
            onClick={onOpenSupabaseModal}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              syncStatus?.isTableReady
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
            title="Trạng thái kết nối Supabase Cloud"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>
              {syncStatus?.isTableReady ? 'Supabase: Đã kết nối' : 'Cần tạo bảng Supabase'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus?.isTableReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
          </button>
        )}

        {/* Quick Home Button */}
        <button
          onClick={onGoHome}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
          title={isTeacher ? "Về trang tổng quan" : "Về bảng tin & sơ đồ lớp"}
        >
          <Home className="w-3.5 h-3.5 text-blue-600" />
          <span>Trang chủ</span>
        </button>

        {/* Teacher Change Password Button */}
        {isTeacher && onOpenChangePassword && (
          <button
            onClick={onOpenChangePassword}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors cursor-pointer shadow-2xs"
            title="Đổi mật khẩu quản lý giáo viên"
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Đổi mật khẩu</span>
          </button>
        )}

        {/* Student My Profile Button */}
        {!isTeacher && onOpenMyProfile && (
          <button
            onClick={onOpenMyProfile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
            title="Xem hồ sơ cá nhân và bảng điểm"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hồ sơ của tôi</span>
          </button>
        )}

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 transition-colors cursor-pointer shadow-2xs"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        )}

        {/* Avatar */}
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-sm ring-2 shrink-0 ${
            isTeacher
              ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 ring-blue-100'
              : 'bg-gradient-to-tr from-emerald-500 to-teal-600 ring-emerald-100'
          }`}
          title={isTeacher ? `GVCN: ${teacherName}` : `Học sinh: ${studentName}`}
        >
          {isTeacher ? teacherInitial : studentInitial}
        </div>
      </div>
    </header>
  );
};
