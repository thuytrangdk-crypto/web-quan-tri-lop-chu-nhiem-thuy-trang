import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Download,
  Info,
  ChevronRight,
  School,
  User,
} from 'lucide-react';
import { AppState } from '../types';
import {
  ReportPeriodType,
  ReportPeriodConfig,
  getVietnamNow,
  getWeekRange,
  getMonthRange,
  getAcademicYearRange,
  prepareClassEmulationExportData,
  exportClassEmulationToExcel,
  normalizeToVNDateStr,
} from '../utils/emulationExport';
import { formatDisplayDate } from '../utils/helpers';

interface EmulationExportModalProps {
  isOpen: boolean;
  state: AppState;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const EmulationExportModal: React.FC<EmulationExportModalProps> = ({
  isOpen,
  state,
  onClose,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const vnNow = useMemo(() => getVietnamNow(), []);
  const currentMonthStr = vnNow.dateStr.substring(0, 7); // 'YYYY-MM'

  // Period type state
  const [periodType, setPeriodType] = useState<ReportPeriodType>('month');

  // Sub-options
  const [weekSubOption, setWeekSubOption] = useState<'this_week' | 'last_week' | 'custom_week'>('this_week');
  const [customWeekRefDate, setCustomWeekRefDate] = useState<string>(vnNow.dateStr);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const [semesterOption, setSemesterOption] = useState<'sem1' | 'sem2'>('sem1');

  // Custom range
  const [customStartDate, setCustomStartDate] = useState<string>(vnNow.dateStr);
  const [customEndDate, setCustomEndDate] = useState<string>(vnNow.dateStr);

  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live time ticker
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<string>(vnNow.fullStr);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeDisplay(getVietnamNow().fullStr);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute active date range and label based on selection
  const activePeriodConfig = useMemo<ReportPeriodConfig>(() => {
    let start = vnNow.dateStr;
    let end = vnNow.dateStr;
    let label = '';

    if (periodType === 'week') {
      if (weekSubOption === 'this_week') {
        const range = getWeekRange(undefined, 0);
        start = range.start;
        end = range.end;
        label = `Tuần này (${formatDisplayDate(start)} - ${formatDisplayDate(end)})`;
      } else if (weekSubOption === 'last_week') {
        const range = getWeekRange(undefined, -1);
        start = range.start;
        end = range.end;
        label = `Tuần trước (${formatDisplayDate(start)} - ${formatDisplayDate(end)})`;
      } else {
        const range = getWeekRange(customWeekRefDate, 0);
        start = range.start;
        end = range.end;
        label = `Tuần (${formatDisplayDate(start)} - ${formatDisplayDate(end)})`;
      }
    } else if (periodType === 'month') {
      const range = getMonthRange(selectedMonth);
      start = range.start;
      end = range.end;
      const [y, m] = selectedMonth.split('-');
      label = `Tháng ${Number(m)}/${y}`;
    } else if (periodType === 'semester') {
      const range = getAcademicYearRange(state.config.schoolYear, semesterOption);
      start = range.start;
      end = range.end;
      label = semesterOption === 'sem1' ? 'Học kỳ 1' : 'Học kỳ 2';
    } else if (periodType === 'year') {
      const range = getAcademicYearRange(state.config.schoolYear, 'full');
      start = range.start;
      end = range.end;
      label = `Cả năm học ${state.config.schoolYear || ''}`;
    } else if (periodType === 'custom') {
      start = normalizeToVNDateStr(customStartDate) || vnNow.dateStr;
      end = normalizeToVNDateStr(customEndDate) || vnNow.dateStr;
      if (start > end) {
        // Swap if reversed
        const temp = start;
        start = end;
        end = temp;
      }
      label = `Tùy chọn (${formatDisplayDate(start)} - ${formatDisplayDate(end)})`;
    }

    return {
      type: periodType,
      label,
      startDate: start,
      endDate: end,
      subOption: periodType === 'week' ? weekSubOption : semesterOption,
    };
  }, [
    periodType,
    weekSubOption,
    customWeekRefDate,
    selectedMonth,
    semesterOption,
    customStartDate,
    customEndDate,
    state.config.schoolYear,
    vnNow.dateStr,
  ]);

  // Preview data calculation
  const previewData = useMemo(() => {
    return prepareClassEmulationExportData(state, activePeriodConfig.startDate, activePeriodConfig.endDate);
  }, [state, activePeriodConfig.startDate, activePeriodConfig.endDate]);

  const cleanClassName = (state.config.className || 'Lop').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  const expectedFileName = `Thi_dua_${cleanClassName}_${activePeriodConfig.startDate}_${activePeriodConfig.endDate}.xlsx`;

  const handleExport = () => {
    setErrorMessage(null);
    setIsExporting(true);

    setTimeout(() => {
      try {
        const result = exportClassEmulationToExcel(state, activePeriodConfig);
        if (result.success) {
          onShowToast?.(`Đã xuất báo cáo thi đua Lớp ${state.config.className} thành công!`, 'success');
          onClose();
        } else {
          setErrorMessage(result.error || 'Có lỗi xảy ra khi tạo tệp Excel.');
          onShowToast?.(result.error || 'Lỗi xuất file Excel', 'error');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Lỗi: ${msg}`);
        onShowToast?.(`Lỗi: ${msg}`, 'error');
      } finally {
        setIsExporting(false);
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 via-indigo-50/40 to-blue-50/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Xuất Excel Thi Đua
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Lớp {state.config.className}
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Xuất file .xlsx gồm Sheet Tổng hợp xếp hạng & Sheet Chi tiết ghi nhận
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center border border-gray-200 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {/* Class & Timestamp Metadata Banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <School className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>Lớp:</strong> {state.config.className} ({state.config.appName || 'Trường THCS'})
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <User className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>GVCN:</strong> {state.config.teacherName || 'Chưa cập nhật'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Năm học:</strong> {state.config.schoolYear || '2026-2027'} (Điểm nền:{' '}
                {state.config.initialPoints ?? 100}đ)
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Thời gian xuất:</strong> {currentTimeDisplay}
              </span>
            </div>
          </div>

          {/* Period Selector Heading */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">
              1. Chọn Kỳ Báo Cáo Thi Đua <span className="text-red-500">*</span>
            </label>

            {/* Main Period Tabs */}
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-gray-100 rounded-2xl border border-gray-200">
              {[
                { id: 'week', label: 'Tuần' },
                { id: 'month', label: 'Tháng' },
                { id: 'semester', label: 'Học kỳ' },
                { id: 'year', label: 'Cả năm' },
                { id: 'custom', label: 'Tùy chọn' },
              ].map((tab) => {
                const isActive = periodType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setPeriodType(tab.id as ReportPeriodType);
                      setErrorMessage(null);
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                      isActive
                        ? 'bg-white text-purple-700 shadow-xs border border-purple-200/60 font-extrabold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub options based on selected Period */}
          <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 space-y-3">
            {/* WEEK OPTIONS */}
            {periodType === 'week' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-purple-900">Tùy chọn tuần báo cáo:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setWeekSubOption('this_week')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      weekSubOption === 'this_week'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Tuần này
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekSubOption('last_week')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      weekSubOption === 'last_week'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Tuần trước
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekSubOption('custom_week')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      weekSubOption === 'custom_week'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Chọn ngày trong tuần khác
                  </button>
                </div>

                {weekSubOption === 'custom_week' && (
                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-xs text-gray-600 font-medium">Chọn ngày bất kỳ trong tuần:</span>
                    <input
                      type="date"
                      value={customWeekRefDate}
                      onChange={(e) => setCustomWeekRefDate(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* MONTH OPTIONS */}
            {periodType === 'month' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-purple-900">Chọn tháng báo cáo thi đua:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* SEMESTER OPTIONS */}
            {periodType === 'semester' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-purple-900">Chọn học kỳ trong năm học {state.config.schoolYear}:</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSemesterOption('sem1')}
                    className={`flex-1 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      semesterOption === 'sem1'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm">Học kỳ 1</div>
                    <div className={`text-[11px] mt-0.5 ${semesterOption === 'sem1' ? 'text-purple-100' : 'text-gray-500'}`}>
                      Từ 01/09 đến 15/01
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSemesterOption('sem2')}
                    className={`flex-1 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      semesterOption === 'sem2'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm">Học kỳ 2</div>
                    <div className={`text-[11px] mt-0.5 ${semesterOption === 'sem2' ? 'text-purple-100' : 'text-gray-500'}`}>
                      Từ 16/01 đến 31/05
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* YEAR OPTIONS */}
            {periodType === 'year' && (
              <div className="text-xs text-purple-900 space-y-1">
                <p className="font-bold">Báo cáo cả năm học:</p>
                <p className="text-gray-600">
                  Tổng hợp toàn bộ ghi nhận thi đua từ đầu năm học (01/09) đến khi kết thúc năm học (31/05) của năm học{' '}
                  <span className="font-bold text-purple-700">{state.config.schoolYear || '2026-2027'}</span>.
                </p>
              </div>
            )}

            {/* CUSTOM DATE RANGE */}
            {periodType === 'custom' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-purple-900">Khoảng ngày tùy chọn (bao gồm trọn cả 2 ngày):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Từ ngày:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Đến ngày:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Date Range Notice */}
            <div className="flex items-center gap-2 pt-1 border-t border-purple-100 text-xs text-purple-800 font-semibold">
              <Calendar className="w-3.5 h-3.5 shrink-0 text-purple-600" />
              <span>
                Khoảng ngày áp dụng: Từ <strong>{formatDisplayDate(activePeriodConfig.startDate)}</strong> đến{' '}
                <strong>{formatDisplayDate(activePeriodConfig.endDate)}</strong>
              </span>
            </div>
          </div>

          {/* Data Preview Summary Card */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              2. Xem Trước Dữ Liệu Sẽ Xuất
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Tổng số học sinh</div>
                  <div className="text-base font-extrabold text-blue-600">
                    {previewData.totalClassStudents} <span className="text-xs font-normal text-gray-500">em</span>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Số lượt ghi nhận</div>
                  <div className="text-base font-extrabold text-purple-600">
                    {previewData.totalPeriodRecords} <span className="text-xs font-normal text-gray-500">lượt</span>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Lượt khen thưởng</div>
                  <div className="text-base font-extrabold text-emerald-600">
                    +{previewData.totalPeriodPlus}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Lượt vi phạm</div>
                  <div className="text-base font-extrabold text-red-600">
                    -{previewData.totalPeriodMinus}
                  </div>
                </div>
              </div>

              {/* Structure Explanation */}
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Cấu trúc tệp Excel gồm 2 sheet:</span>
                </div>
                <ul className="space-y-1.5 text-gray-600 pl-5 list-disc text-[11px] leading-relaxed">
                  <li>
                    <strong className="text-gray-900">Sheet “Tổng hợp thi đua”:</strong> Xuất toàn bộ{' '}
                    {previewData.totalClassStudents} học sinh của lớp (kể cả chưa có vi phạm hay khen thưởng). Bao gồm:
                    STT, Mã HS, Họ và tên, Lớp, Điểm nền ({state.config.initialPoints ?? 100}đ), Tổng điểm cộng, Tổng điểm trừ
                    (số dương), Tổng điểm thi đua còn lại, Xếp loại hạnh kiểm/thi đua, Xếp hạng giảm dần (đồng hạng nếu bằng
                    điểm), Số lượt cộng/trừ.
                  </li>
                  <li>
                    <strong className="text-gray-900">Sheet “Chi tiết ghi nhận”:</strong> {previewData.totalPeriodRecords} dòng
                    chi tiết các sự việc trong kỳ: Thời gian, Mã HS, Họ tên, Nội dung, Loại ghi nhận (Tích cực/Vi phạm), Điểm
                    có dấu (+/-), Người ghi nhận và Ghi chú.
                  </li>
                </ul>
              </div>

              {/* Filename Preview */}
              <div className="text-[11px] text-gray-500 flex items-center gap-1.5 bg-gray-100/70 px-3 py-1.5 rounded-lg font-mono">
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">Tên file: <strong>{expectedFileName}</strong></span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Guarantee Note */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-relaxed">
              Dữ liệu được lấy trực tiếp từ dữ liệu hiện tại của Lớp {state.config.className}, tái sử dụng chính xác công thức
              tính điểm thi đua và bảng ngưỡng xếp loại của nhà trường. Thao tác xuất file không sửa hay ghi đè dữ liệu trên hệ thống.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-gray-500 font-medium text-center sm:text-left">
            Chỉ tài khoản Giáo viên có quyền xuất báo cáo thi đua toàn lớp
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm border border-gray-200 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || previewData.totalClassStudents === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-purple-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Đang tạo Excel...' : 'Tải File Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
