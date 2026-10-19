import React from 'react';
import { AlertTriangle, Trash2, X, ShieldCheck, Info, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export type DeleteGradesStatus = 'idle' | 'backing_up' | 'deleting';

interface DeleteMonthlyGradesModalProps {
  isOpen: boolean;
  className: string;
  schoolYear: string;
  month: string; // YYYY-MM
  studentCount: number;
  totalGradesCount: number;
  status: DeleteGradesStatus;
  errorMessage?: string | null;
  onConfirmDelete: () => Promise<void>;
  onClose: () => void;
}

export const DeleteMonthlyGradesModal: React.FC<DeleteMonthlyGradesModalProps> = ({
  isOpen,
  className,
  schoolYear,
  month,
  studentCount,
  totalGradesCount,
  status,
  errorMessage,
  onConfirmDelete,
  onClose,
}) => {
  if (!isOpen) return null;

  const [y, m] = month.split('-');
  const monthDisplay = `Tháng ${Number(m)}/${y}`;
  const isProcessing = status === 'backing_up' || status === 'deleting';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-red-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm sm:text-base">
                Xác nhận xóa bảng điểm tháng
              </h3>
              <p className="text-xs text-red-700 font-medium mt-0.5">
                Thao tác quản trị dành cho Giáo viên chủ nhiệm
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 space-y-3.5 text-xs sm:text-sm text-gray-700 overflow-y-auto max-h-[75vh] custom-scrollbar">
          {/* Target Info Summary Box */}
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400 font-medium block">Lớp học:</span>
              <strong className="text-gray-900 font-bold text-sm">Lớp {className}</strong>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Năm học:</span>
              <strong className="text-gray-900 font-bold text-sm">{schoolYear}</strong>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Bảng điểm xóa:</span>
              <strong className="text-red-700 font-bold text-sm">{monthDisplay}</strong>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Dữ liệu xóa:</span>
              <strong className="text-red-700 font-bold text-sm">
                {studentCount} học sinh · {totalGradesCount} ô điểm
              </strong>
            </div>
          </div>

          {/* Inline Error Box if failed */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold block text-red-800">Không thể xóa bảng điểm:</strong>
                <span>{errorMessage}</span>
                <span className="block mt-1 text-[11px] text-red-600">
                  Dữ liệu điểm của lớp vẫn được bảo vệ nguyên vẹn. Bạn có thể bấm “Thử lại” hoặc bấm “Hủy”.
                </span>
              </div>
            </div>
          )}

          {/* Warning notice bullet points */}
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-start gap-2.5 p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-amber-900">Phạm vi thực hiện:</strong> Hệ thống sẽ xóa toàn bộ điểm các môn trong <strong>{monthDisplay}</strong> của <strong>Lớp {className}</strong> (không phụ thuộc ô tìm kiếm). Danh sách học sinh, điểm danh, điểm thi đua và điểm các tháng khác vẫn được giữ nguyên vẹn.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-blue-900">Đồng bộ hồ sơ &amp; Top 5:</strong> Sau khi xóa, các ô điểm của tháng này sẽ để trống (trạng thái <em>“chưa có điểm”</em>, không phải số 0). Bảng vinh danh Top 5 tháng này sẽ được gỡ và chuyển về <em>“Chưa có dữ liệu để công bố”</em>.
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-emerald-900">Tự động sao lưu an toàn:</strong> Trước khi thực hiện xóa, hệ thống sẽ tự động lưu một bản sao lưu điểm lên Supabase Cloud. Bạn có thể sử dụng nút <strong>“Khôi phục điểm”</strong> bất kỳ lúc nào nếu cần phục hồi dữ liệu.
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs font-semibold text-gray-500">
            {status === 'backing_up' && (
              <span className="text-blue-600 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang sao lưu điểm lên Supabase Cloud...</span>
              </span>
            )}
            {status === 'deleting' && (
              <span className="text-amber-600 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xóa dữ liệu điểm tháng {Number(m)}/{y}...</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={onConfirmDelete}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {status === 'backing_up' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang sao lưu...</span>
                </>
              ) : status === 'deleting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xóa...</span>
                </>
              ) : errorMessage ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Thử lại xóa bảng điểm</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Xác nhận xóa bảng điểm</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
