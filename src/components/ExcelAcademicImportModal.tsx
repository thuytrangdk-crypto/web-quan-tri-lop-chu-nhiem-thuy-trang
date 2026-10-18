import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Check,
} from 'lucide-react';
import { Student } from '../types';
import {
  ExcelImportParseResult,
  parseAcademicExcelData,
} from '../utils/academicHelpers';

interface ExcelAcademicImportModalProps {
  isOpen: boolean;
  className: string;
  schoolYear: string;
  month: string; // YYYY-MM
  students: Student[];
  availableSubjects: string[];
  onImportGrades: (
    validRows: ExcelImportParseResult['validRows'],
    overwriteBlanks: boolean
  ) => void;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const ExcelAcademicImportModal: React.FC<ExcelAcademicImportModalProps> = ({
  isOpen,
  className,
  schoolYear,
  month,
  students,
  availableSubjects,
  onImportGrades,
  onClose,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelImportParseResult | null>(null);
  const [overwriteBlanks, setOverwriteBlanks] = useState(false);
  const [confirmedNameMatches, setConfirmedNameMatches] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [y, m] = month.split('-');
  const monthDisplay = `Tháng ${Number(m)}/${y}`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setIsParsing(true);
    setParseResult(null);
    setConfirmedNameMatches(new Set());

    try {
      const res = await parseAcademicExcelData(selected, students, availableSubjects);
      setParseResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast?.(`Lỗi đọc file Excel: ${msg}`, 'error');
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  const handleToggleNameConfirm = (studentId: string) => {
    setConfirmedNameMatches((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const hasErrors = (parseResult?.errors?.length ?? 0) > 0;
  const rowsNeedingConfirm = (parseResult?.validRows || []).filter((r) => r.needsConfirmation);
  const allNameConfirmed = rowsNeedingConfirm.every((r) => confirmedNameMatches.has(r.studentId));

  const canSave =
    parseResult &&
    parseResult.validRows.length > 0 &&
    !hasErrors &&
    allNameConfirmed;

  const handleSave = () => {
    if (!parseResult || !canSave) return;
    onImportGrades(parseResult.validRows, overwriteBlanks);
    onShowToast?.(
      `Đã cập nhật thành công điểm học tập ${monthDisplay} cho ${parseResult.validRows.length} học sinh!`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 via-cyan-50/50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Nhập Excel Điểm Học Tập
              </h3>
              <p className="text-xs text-gray-500">
                Lớp <strong className="text-blue-700">{className}</strong> • Năm học {schoolYear} •{' '}
                <strong className="text-purple-700">{monthDisplay}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center border border-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {/* File Picker Zone */}
          {!parseResult && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center gap-3 bg-blue-50/30 hover:bg-blue-50/60 transition-all cursor-pointer group text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-100 group-hover:bg-blue-200 text-blue-600 flex items-center justify-center transition-colors shadow-sm">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-gray-800">
                {isParsing ? 'Đang đọc và phân tích file...' : 'Bấm vào đây để chọn tệp Excel (.xlsx)'}
              </p>
              <p className="text-xs text-gray-500 max-w-md">
                Tệp gồm các cột: <strong>STT, Mã hồ sơ học sinh, Họ và tên</strong>, tiếp theo là các cột điểm môn học.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Result Preview & Validation Summary */}
          {parseResult && (
            <div className="space-y-4">
              {/* Summary Stats Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Học sinh khớp</div>
                  <div className="text-base font-extrabold text-blue-600">
                    {parseResult.validRows.length} / {students.length}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Ô điểm hợp lệ</div>
                  <div className="text-base font-extrabold text-emerald-600">
                    {parseResult.totalCellsCount}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Môn nhận diện</div>
                  <div className="text-base font-extrabold text-purple-600">
                    {parseResult.recognizedSubjects.length}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Lỗi dữ liệu</div>
                  <div
                    className={`text-base font-extrabold ${
                      parseResult.errors.length > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {parseResult.errors.length}
                  </div>
                </div>
              </div>

              {/* Errors Block */}
              {parseResult.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-800 text-xs font-bold uppercase">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Phát hiện {parseResult.errors.length} lỗi cần sửa trong file Excel:</span>
                  </div>
                  <ul className="text-xs text-red-700 space-y-1.5 pl-6 list-disc max-h-40 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>
                        <strong>Dòng {err.rowNumber}:</strong> {err.message}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-red-600 italic pt-1">
                    Hệ thống chỉ lưu khi không còn lỗi. Vui lòng sửa lại file Excel và tải lên lại.
                  </p>
                </div>
              )}

              {/* Warnings Block */}
              {parseResult.warnings.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5 text-xs text-amber-800">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Cảnh báo lưu ý:</span>
                  </div>
                  <ul className="pl-6 list-disc space-y-1 text-[11px]">
                    {parseResult.warnings.map((w, i) => (
                      <li key={i}>{w.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Name Match Confirmations (if any student row had missing ID) */}
              {rowsNeedingConfirm.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-blue-900 text-xs font-bold">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>
                      Xác nhận ghép học sinh theo Họ và tên (do file thiếu Mã hồ sơ):
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {rowsNeedingConfirm.map((row) => {
                      const isConfirmed = confirmedNameMatches.has(row.studentId);
                      return (
                        <div
                          key={row.studentId}
                          onClick={() => handleToggleNameConfirm(row.studentId)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isConfirmed
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : 'bg-white border-blue-200 text-gray-800 hover:bg-blue-100/50'
                          }`}
                        >
                          <div className="text-xs">
                            <span className="font-bold">{row.studentName}</span> • Mã hồ sơ:{' '}
                            <strong className="font-mono">{row.studentId}</strong>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold">
                            {isConfirmed ? (
                              <span className="text-emerald-700 flex items-center gap-1">
                                <Check className="w-4 h-4 text-emerald-600" /> Đã xác nhận
                              </span>
                            ) : (
                              <span className="text-blue-600">Bấm để xác nhận</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Overwrite Options Checkbox */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteBlanks}
                    onChange={(e) => setOverwriteBlanks(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-800">
                      Ghi đè/xóa điểm cũ nếu ô trong file Excel để trống
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Mặc định tắt (giữ nguyên điểm cũ nếu trong file để trống). Nếu bật, ô trống trong file sẽ xóa điểm môn đó trên hệ thống.
                    </p>
                  </div>
                </label>
              </div>

              {/* Valid Rows Preview Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>Xem trước danh sách học sinh sẽ cập nhật ({parseResult.validRows.length} em)</span>
                  <button
                    onClick={() => setParseResult(null)}
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    Chọn file khác
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Mã HS</th>
                        <th className="px-3 py-2">Họ và tên</th>
                        <th className="px-3 py-2">Số môn nhập</th>
                        <th className="px-3 py-2">Chi tiết điểm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parseResult.validRows.map((r) => {
                        const filledSubjects = Object.keys(r.grades).filter(
                          (sub) => r.grades[sub] !== undefined
                        );
                        return (
                          <tr key={r.studentId} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono font-bold text-gray-700">
                              {r.studentId}
                            </td>
                            <td className="px-3 py-2 font-semibold text-gray-900">
                              {r.studentName}
                            </td>
                            <td className="px-3 py-2 text-blue-600 font-bold">
                              {filledSubjects.length} môn
                            </td>
                            <td className="px-3 py-2 text-gray-600 truncate max-w-xs">
                              {filledSubjects
                                .map((sub) => `${sub}: ${r.grades[sub]}`)
                                .join(' • ') || 'Trống'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-gray-500">
            Chỉ cập nhật đúng kỳ <strong>{monthDisplay}</strong> của Lớp {className}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm border border-gray-200 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>Xác nhận lưu điểm ({parseResult?.validRows.length || 0} học sinh)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
