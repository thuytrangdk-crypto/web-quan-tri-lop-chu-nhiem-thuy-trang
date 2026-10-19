import React, { useState } from 'react';
import {
  RotateCcw,
  X,
  Calendar,
  Clock,
  User,
  Database,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { AcademicGradeBackup } from '../types';

interface RestoreAcademicGradesModalProps {
  isOpen: boolean;
  className: string;
  schoolYear: string;
  selectedMonth: string;
  backups: AcademicGradeBackup[];
  currentMonthGradesCount: number;
  onRestore: (backup: AcademicGradeBackup) => Promise<void>;
  onClose: () => void;
}

export const RestoreAcademicGradesModal: React.FC<RestoreAcademicGradesModalProps> = ({
  isOpen,
  className,
  schoolYear,
  selectedMonth,
  backups,
  currentMonthGradesCount,
  onRestore,
  onClose,
}) => {
  const [selectedBackupToConfirm, setSelectedBackupToConfirm] = useState<AcademicGradeBackup | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [filterMode, setFilterMode] = useState<'currentMonth' | 'all'>('currentMonth');

  if (!isOpen) return null;

  // Filter backups for this class and school year
  const classBackups = backups.filter(
    (b) =>
      (!b.className || b.className.trim().toLowerCase() === className.trim().toLowerCase()) &&
      (!b.schoolYear || b.schoolYear === schoolYear)
  );

  const displayedBackups =
    filterMode === 'currentMonth'
      ? classBackups.filter((b) => b.month === selectedMonth)
      : classBackups;

  const [selY, selM] = selectedMonth.split('-');
  const selMonthDisplay = `Tháng ${Number(selM)}/${selY}`;

  const formatBackupTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const handleExecuteRestore = async (backup: AcademicGradeBackup) => {
    setIsRestoring(true);
    try {
      await onRestore(backup);
      setSelectedBackupToConfirm(null);
      onClose();
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm sm:text-base">
                Khôi phục bảng điểm đã xóa
              </h3>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Lớp {className} • Năm học {schoolYear}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isRestoring}
            onClick={() => {
              setSelectedBackupToConfirm(null);
              onClose();
            }}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation step if user picked a backup that will overwrite current data */}
        {selectedBackupToConfirm ? (
          <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Xác nhận khôi phục và thay thế bảng điểm</span>
              </div>

              {currentMonthGradesCount > 0 ? (
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Cảnh báo ghi đè:</strong> Bảng điểm{' '}
                  <strong>
                    Tháng {Number(selectedBackupToConfirm.month.split('-')[1])}/
                    {selectedBackupToConfirm.month.split('-')[0]}
                  </strong>{' '}
                  hiện đang có <strong>{currentMonthGradesCount} ô điểm mới</strong>.
                  Nếu khôi phục, toàn bộ điểm hiện tại sẽ được thay thế bằng dữ liệu bản sao lưu này.
                </p>
              ) : (
                <p className="text-xs text-amber-800 leading-relaxed">
                  Bạn đang chuẩn bị khôi phục lại bảng điểm{' '}
                  <strong>
                    Tháng {Number(selectedBackupToConfirm.month.split('-')[1])}/
                    {selectedBackupToConfirm.month.split('-')[0]}
                  </strong>{' '}
                  từ bản sao lưu tạo lúc{' '}
                  <strong>{formatBackupTime(selectedBackupToConfirm.createdAt)}</strong>.
                </p>
              )}

              <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs space-y-1">
                <div>
                  <span className="text-gray-500 font-medium">Bản sao lưu: </span>
                  <strong className="text-gray-900">
                    Tháng {Number(selectedBackupToConfirm.month.split('-')[1])}/
                    {selectedBackupToConfirm.month.split('-')[0]}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Thời điểm lưu: </span>
                  <strong className="text-gray-900">
                    {formatBackupTime(selectedBackupToConfirm.createdAt)}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Dữ liệu khôi phục: </span>
                  <strong className="text-blue-700 font-bold">
                    {selectedBackupToConfirm.studentCount} học sinh ·{' '}
                    {selectedBackupToConfirm.totalGradesCount} ô điểm
                  </strong>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 italic">
                * Lưu ý: Sau khi khôi phục, bảng vinh danh Top 5 tháng này sẽ ở trạng thái Bản nháp (chưa tự động công bố) để giáo viên xem xét và bấm công bố sau.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setSelectedBackupToConfirm(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => handleExecuteRestore(selectedBackupToConfirm)}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang khôi phục...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Đồng ý thay thế &amp; Khôi phục</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Normal List View */
          <div className="p-5 space-y-3.5 flex-1 overflow-hidden flex flex-col">
            {/* Filter Pills */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterMode('currentMonth')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterMode === 'currentMonth'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {selMonthDisplay} ({classBackups.filter((b) => b.month === selectedMonth).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Tất cả các tháng ({classBackups.length})
                </button>
              </div>

              <span className="text-[11px] text-gray-400 hidden sm:inline">
                Tự động sao lưu trước mỗi lần xóa
              </span>
            </div>

            {/* Backups List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
              {displayedBackups.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <Database className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs sm:text-sm font-semibold text-gray-500">
                    Chưa có bản sao lưu nào {filterMode === 'currentMonth' ? `cho ${selMonthDisplay}` : 'trong lớp này'}.
                  </p>
                  <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                    Mỗi khi giáo viên thực hiện thao tác xóa bảng điểm tháng, một bản sao lưu an toàn sẽ tự động được tạo tại đây.
                  </p>
                </div>
              ) : (
                displayedBackups.map((b) => {
                  const [bY, bM] = b.month.split('-');
                  const bMonthDisplay = `Tháng ${Number(bM)}/${bY}`;
                  const isCurrentSelected = b.month === selectedMonth;

                  return (
                    <div
                      key={b.id}
                      className="p-3.5 bg-gray-50/80 hover:bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-xs">
                            {bMonthDisplay}
                          </span>
                          <span className="text-xs font-bold text-gray-700">
                            Lớp {b.className}
                          </span>
                          {isCurrentSelected && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                              Tháng đang chọn
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-gray-600">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {formatBackupTime(b.createdAt)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-blue-700 font-bold">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                            {b.studentCount} HS · {b.totalGradesCount} ô điểm
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedBackupToConfirm(b)}
                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 font-bold rounded-xl text-xs border border-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Khôi phục bản này</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom info */}
            <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Được lưu trữ bền vững trên cơ sở dữ liệu Supabase</span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
