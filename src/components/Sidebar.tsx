import React, { useRef } from 'react';
import {
  LayoutDashboard,
  Megaphone,
  GraduationCap,
  CalendarCheck2,
  Settings,
  LogOut,
  X,
  Cloud,
  KeyRound,
  UserCheck,
  Grid3X3,
  BookOpen,
  ChevronDown,
  Camera,
} from 'lucide-react';
import { SyncStatus } from '../services/supabaseService';
import { resizeImageBase64 } from '../utils/helpers';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  className: string;
  classAvatar?: string;
  isTeacher?: boolean;
  studentName?: string;
  teacherName?: string;
  onUpdateClassAvatar?: (base64: string) => void;
  onOpenClassSwitch?: () => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenChangePassword?: () => void;
  onOpenMyProfile?: () => void;
  syncStatus?: SyncStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  className,
  classAvatar,
  isTeacher = true,
  studentName,
  teacherName,
  onUpdateClassAvatar,
  onOpenClassSwitch,
  onLogout,
  isMobileOpen,
  onCloseMobile,
  onOpenSupabaseModal,
  onOpenChangePassword,
  onOpenMyProfile,
  syncStatus,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateClassAvatar) {
      resizeImageBase64(file, 300, 300, (base64) => {
        onUpdateClassAvatar(base64);
      });
    }
    e.target.value = '';
  };

  const teacherNavItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'board', label: 'Bảng tin & Sơ đồ lớp', icon: Megaphone },
    { id: 'students', label: 'Học sinh', icon: GraduationCap },
    { id: 'academics', label: 'Học tập', icon: BookOpen },
    { id: 'attendance', label: 'Điểm danh', icon: CalendarCheck2 },
  ];

  const studentNavItems = [
    { id: 'board_notices', label: 'Bảng tin thông báo', icon: Megaphone },
    { id: 'board_seating', label: 'Sơ đồ lớp học', icon: Grid3X3 },
    { id: 'profile', label: 'Hồ sơ của tôi', icon: UserCheck },
  ];

  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`bg-white w-64 h-full border-r border-gray-200 flex flex-col fixed md:static z-50 transition-transform duration-300 shadow-xl md:shadow-none shrink-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* APP INFO BLOCK AT TOP OF SIDEBAR */}
        <div className="p-3.5 border-b border-gray-200 shrink-0 bg-slate-50/70">
          {/* Row 1: Logo + App Name + Close button on mobile */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                onClick={() => isTeacher && onUpdateClassAvatar && fileInputRef.current?.click()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-2xs relative group ${
                  isTeacher && onUpdateClassAvatar ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''
                }`}
                title={isTeacher && onUpdateClassAvatar ? 'Bấm để đổi ảnh đại diện lớp' : `Lớp ${className}`}
              >
                {classAvatar ? (
                  <img src={classAvatar} alt="Lớp" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 flex items-center justify-center text-white">
                    <GraduationCap className="w-5 h-5 text-white" />
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
                  onChange={handleAvatarFile}
                />
              )}

              <div className="min-w-0">
                <h1 className="text-xs font-black text-slate-900 tracking-tight uppercase leading-none truncate">
                  TRỢ LÝ CHỦ NHIỆM
                </h1>
                {/* Class selector */}
                {isTeacher && onOpenClassSwitch ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenClassSwitch();
                      onCloseMobile();
                    }}
                    className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 font-extrabold text-[11px] border border-blue-200 transition-colors cursor-pointer"
                    title="Bấm để đổi lớp hoặc năm học"
                  >
                    <span>Lớp {className}</span>
                    <ChevronDown className="w-3 h-3 text-blue-600" />
                  </button>
                ) : (
                  <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200">
                    Lớp {className}
                  </span>
                )}
              </div>
            </div>

            {/* Close button on mobile */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer shrink-0"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Row 2: GVCN name */}
          <div className="text-[11px] font-semibold text-gray-600 truncate flex items-center gap-1.5 mb-2 px-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-gray-400 font-medium">GVCN:</span>
            <span className="text-gray-900 font-bold truncate">
              {teacherName || 'Chưa thiết lập'}
            </span>
          </div>

          {/* Row 3: Supabase connection status pill */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSupabaseModal) {
                onOpenSupabaseModal();
                onCloseMobile();
              }
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
              syncStatus?.isTableReady
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80'
                : syncStatus?.isConnected
                ? 'bg-amber-50/80 border-amber-200 text-amber-800 hover:bg-amber-100/80'
                : 'bg-red-50/80 border-red-200 text-red-800 hover:bg-red-100/80'
            }`}
            title="Bấm để kiểm tra đồng bộ Supabase Cloud"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Cloud className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">
                {syncStatus?.isTableReady
                  ? 'Supabase: Đã kết nối'
                  : syncStatus?.isConnected
                  ? 'Supabase: Cần tạo bảng'
                  : 'Supabase: Chưa kết nối'}
              </span>
            </div>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                syncStatus?.isTableReady
                  ? 'bg-emerald-500 animate-pulse'
                  : syncStatus?.isConnected
                  ? 'bg-amber-400'
                  : 'bg-red-400'
              }`}
            />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto pt-3 pb-4 px-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentView === item.id ||
              (item.id === 'board_notices' && currentView === 'board') ||
              (item.id === 'board' &&
                (currentView === 'board' ||
                  currentView === 'board_notices' ||
                  currentView === 'board_seating'));
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (item.id === 'profile' && onOpenMyProfile) {
                    onOpenMyProfile();
                  }
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Teacher Only System Section */}
          {isTeacher && (
            <>
              <div className="pt-4 pb-2 px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Hệ thống
              </div>

              {onOpenChangePassword && (
                <button
                  onClick={() => {
                    onOpenChangePassword();
                    onCloseMobile();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-600 hover:bg-blue-50/70 hover:text-blue-700 transition-all text-left cursor-pointer"
                  title="Đổi mật khẩu tài khoản giáo viên"
                >
                  <KeyRound className="w-4 h-4 text-blue-500" />
                  <span>Đổi mật khẩu GV</span>
                </button>
              )}

              {onOpenSupabaseModal && (
                <button
                  onClick={() => {
                    onOpenSupabaseModal();
                    onCloseMobile();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-600 hover:bg-emerald-50/60 hover:text-emerald-800 transition-all text-left cursor-pointer group"
                  title="Cấu hình & Đồng bộ hóa Supabase Cloud"
                >
                  <div className="flex items-center gap-3">
                    <Cloud className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span>Supabase Cloud</span>
                  </div>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      syncStatus?.isTableReady
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-amber-400'
                    }`}
                    title={
                      syncStatus?.isTableReady
                        ? 'Đã kết nối'
                        : 'Cần khởi tạo bảng'
                    }
                  />
                </button>
              )}

              <button
                onClick={() => {
                  onNavigate('settings');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all text-left cursor-pointer ${
                  currentView === 'settings'
                    ? 'bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Settings
                  className={`w-4 h-4 ${
                    currentView === 'settings' ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
                <span>Cài đặt</span>
              </button>
            </>
          )}
        </nav>

        {/* Footer with Logout */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="truncate max-w-[130px]">
            <span className="text-xs font-bold text-gray-700 block truncate">
              {isTeacher ? 'Giáo viên' : studentName || 'Học sinh'}
            </span>
            <span className="text-[10px] text-gray-400 block truncate">
              {isTeacher ? 'Quyền quản lý' : 'Xem tin & Lớp học'}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Thoát</span>
          </button>
        </div>
      </aside>
    </>
  );
};
