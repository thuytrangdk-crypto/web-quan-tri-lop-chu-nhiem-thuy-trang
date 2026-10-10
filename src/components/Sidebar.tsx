import React, { useRef } from 'react';
import {
  LayoutDashboard,
  Megaphone,
  GraduationCap,
  CalendarCheck2,
  Settings,
  LogOut,
  X,
  Camera,
  ChevronDown,
  Cloud,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { resizeImageBase64 } from '../utils/helpers';
import { SyncStatus } from '../services/supabaseService';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  className: string;
  classAvatar: string;
  isTeacher?: boolean;
  studentName?: string;
  onUpdateClassAvatar: (base64: string) => void;
  onOpenClassSwitch: () => void;
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      resizeImageBase64(file, 400, 400, (base64) => {
        onUpdateClassAvatar(base64);
      });
    }
    e.target.value = '';
  };

  const teacherNavItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'board', label: 'Bảng tin & Sơ đồ lớp', icon: Megaphone },
    { id: 'students', label: 'Học sinh', icon: GraduationCap },
    { id: 'attendance', label: 'Điểm danh', icon: CalendarCheck2 },
  ];

  const studentNavItems = [
    { id: 'board', label: 'Bảng tin & Sơ đồ lớp', icon: Megaphone },
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
        {/* Header / Brand with graduation cap on green-blue gradient */}
        <div className="h-18 flex items-center px-4 border-b border-gray-200 shrink-0 gap-3">
          {/* Graduation Cap Logo */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative w-11 h-11 rounded-2xl flex-shrink-0 cursor-pointer overflow-hidden border border-blue-200/50 shadow-sm group hover:ring-2 hover:ring-blue-400 transition-all"
            title="Đổi ảnh đại diện lớp hoặc bấm đổi ảnh"
          >
            {classAvatar ? (
              <img
                src={classAvatar}
                alt="Lớp"
                className="w-full h-full object-cover"
              />
            ) : (
              /* Nón tú tài trên nền xanh lục - xanh dương gradient như ảnh mẫu */
              <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-inner">
                <GraduationCap className="w-6 h-6 text-white stroke-[2.2]" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg, image/png, image/webp"
            onChange={handleAvatarChange}
          />

          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black text-gray-900 tracking-tight uppercase truncate">
              Trợ lý chủ nhiệm
            </h1>
            {/* Class Badge Button */}
            <button
              onClick={onOpenClassSwitch}
              className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200/80 transition-colors cursor-pointer"
              title="Bấm để đổi lớp hoặc năm học"
            >
              <span>Lớp {className}</span>
              <ChevronDown className="w-3 h-3 text-blue-500" />
            </button>
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden text-gray-400 hover:text-gray-700 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
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
