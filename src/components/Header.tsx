import React from 'react';
import { Menu, GraduationCap, ChevronDown, Home, Cloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SyncStatus } from '../services/supabaseService';

interface HeaderProps {
  title: string;
  className: string;
  teacherName: string;
  syncStatus?: SyncStatus;
  onOpenMobileSidebar: () => void;
  onOpenClassSwitch: () => void;
  onGoHome: () => void;
  onOpenSupabaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  className,
  teacherName,
  syncStatus,
  onOpenMobileSidebar,
  onOpenClassSwitch,
  onGoHome,
  onOpenSupabaseModal,
}) => {
  const teacherInitial = teacherName
    ? teacherName.trim().split(' ').pop()?.charAt(0).toUpperCase() || 'G'
    : 'G';

  return (
    <header className="h-18 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shrink-0 shadow-xs z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden text-gray-500 hover:text-gray-800 p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Mở menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Bar matching user reference mockup */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <GraduationCap className="w-5 h-5 text-white stroke-[2.2]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">
                TRỢ LÝ CHỦ NHIỆM
              </span>

              {/* Class Pill with Chevron */}
              <button
                onClick={onOpenClassSwitch}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-blue-700 font-extrabold text-xs border border-blue-200/90 shadow-2xs transition-colors cursor-pointer"
                title="Bấm để đổi lớp hoặc năm học"
              >
                <span>Lớp {className}</span>
                <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
              </button>
            </div>

            {/* GVCN subline with green dot */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>
                GVCN: <strong className="text-slate-800">{teacherName}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Supabase Sync Button */}
        {onOpenSupabaseModal && (
          <button
            onClick={onOpenSupabaseModal}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
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
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
          title="Về trang tổng quan"
        >
          <Home className="w-3.5 h-3.5 text-blue-600" />
          <span>Trang chủ</span>
        </button>

        {/* Teacher Avatar */}
        <div
          className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-blue-100 shrink-0"
          title={`GVCN: ${teacherName}`}
        >
          {teacherInitial}
        </div>
      </div>
    </header>
  );
};
