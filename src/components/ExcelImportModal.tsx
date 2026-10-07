import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Gender, Student } from '../types';
import {
  downloadSampleExcelTemplate,
  formatDisplayDate,
  generateStudentId,
  parseExcelDate,
} from '../utils/helpers';

interface ExcelImportModalProps {
  isOpen: boolean;
  existingStudents: Student[];
  onImport: (newStudents: Student[]) => void;
  onClose: () => void;
}

interface ParsedRow {
  isValid: boolean;
  statusMsg: string;
  data: {
    name: string;
    dob: string;
    gender: Gender;
    parentName: string;
    phone: string;
    address: string;
  };
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  existingStudents,
  onImport,
  onClose,
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    e.target.value = '';
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    setErrorMessage('');
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawJson: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!rawJson || rawJson.length < 2) {
          setErrorMessage('File Excel trống hoặc không có hàng tiêu đề!');
          setIsProcessing(false);
          return;
        }

        const headers = (rawJson[0] || []).map((h) =>
          h ? String(h).toLowerCase().trim() : ''
        );

        const nameIdx = headers.findIndex(
          (h) => h.includes('họ') && (h.includes('tên') || h.includes('ten'))
        );
        const dobIdx = headers.findIndex(
          (h) => h.includes('ngày sinh') || h.includes('ngay sinh') || h.includes('sinh')
        );
        const genderIdx = headers.findIndex(
          (h) => h.includes('giới tính') || h.includes('gioi tinh') || h.includes('phái')
        );
        const parentIdx = headers.findIndex(
          (h) => h.includes('phụ huynh') || h.includes('phu huynh') || h.includes('bố') || h.includes('mẹ')
        );
        const phoneIdx = headers.findIndex(
          (h) =>
            h.includes('sđt') ||
            h.includes('sdt') ||
            h.includes('điện thoại') ||
            h.includes('dien thoai') ||
            h.includes('phone')
        );
        const addressIdx = headers.findIndex(
          (h) => h.includes('địa chỉ') || h.includes('dia chi')
        );

        if (nameIdx === -1) {
          setErrorMessage("Không tìm thấy cột 'Họ và tên' trong file Excel!");
          setIsProcessing(false);
          return;
        }

        const rowsResult: ParsedRow[] = [];

        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.length === 0) continue;

          const rawName = row[nameIdx] ? String(row[nameIdx]).trim() : '';
          if (!rawName) continue; // Skip completely empty names

          let rawDob = dobIdx > -1 && row[dobIdx] ? parseExcelDate(row[dobIdx]) : '';
          let rawGender =
            genderIdx > -1 && row[genderIdx]
              ? String(row[genderIdx]).trim().toLowerCase()
              : '';

          // Auto fix if gender and dob were swapped
          if (rawDob.toLowerCase() === 'nam' || rawDob.toLowerCase() === 'nữ' || rawDob.toLowerCase() === 'nu') {
            rawGender = rawDob;
            rawDob = genderIdx > -1 && row[genderIdx] ? parseExcelDate(row[genderIdx]) : '';
          }

          const gender: Gender =
            rawGender === 'nữ' || rawGender === 'nu' || rawGender === 'female'
              ? 'Nữ'
              : 'Nam';
          const parentName = parentIdx > -1 && row[parentIdx] ? String(row[parentIdx]).trim() : '';
          const phone = phoneIdx > -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : '';
          const address = addressIdx > -1 && row[addressIdx] ? String(row[addressIdx]).trim() : '';

          let isValid = true;
          let statusMsg = 'Hợp lệ';

          if (!rawName || rawName.length < 2) {
            isValid = false;
            statusMsg = 'Tên không hợp lệ';
          } else {
            const isDuplicate = existingStudents.some(
              (s) =>
                s.name.toLowerCase() === rawName.toLowerCase() &&
                s.dob === rawDob
            );
            if (isDuplicate) {
              isValid = false;
              statusMsg = 'Đã có trong danh sách';
            }
          }

          rowsResult.push({
            isValid,
            statusMsg,
            data: {
              name: rawName,
              dob: rawDob,
              gender,
              parentName,
              phone,
              address,
            },
          });
        }

        if (rowsResult.length === 0) {
          setErrorMessage('Không tìm thấy dòng học sinh nào trong file!');
        } else {
          setParsedRows(rowsResult);
        }
      } catch (err) {
        console.error(err);
        setErrorMessage('Không thể đọc định dạng file này. Vui lòng kiểm tra lại!');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImportValid = () => {
    const validOnes = parsedRows.filter((r) => r.isValid);
    if (validOnes.length === 0) return;

    const accumulated: Student[] = [...existingStudents];
    const newStudents: Student[] = validOnes.map((item) => {
      const generatedId = generateStudentId(item.data.dob, accumulated);
      const student: Student = {
        id: generatedId,
        name: item.data.name,
        dob: item.data.dob,
        gender: item.data.gender,
        parentName: item.data.parentName,
        phone: item.data.phone,
        address: item.data.address,
        avatar: '',
        password: generatedId,
        grades: {},
      };
      accumulated.push(student);
      return student;
    });

    onImport(newStudents);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Nhập danh sách học sinh từ Excel
              </h3>
              <p className="text-xs text-gray-400">
                Hỗ trợ file .xlsx, .xls, .csv theo mẫu tiêu chuẩn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center border border-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {parsedRows.length === 0 ? (
            /* Upload dropzone */
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-3xl p-10 text-center hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-gray-800 font-bold text-base mb-1">
                  Kéo thả file Excel vào đây hoặc bấm để chọn file
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  Định dạng hỗ trợ: Microsoft Excel (.xlsx, .xls) hoặc CSV (.csv)
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer"
                >
                  Chọn file từ máy tính
                </button>
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-gray-600">
                  <p className="font-bold text-gray-800 mb-0.5">Bạn chưa có file theo mẫu chuẩn?</p>
                  <p>Tải file mẫu để điền thông tin nhanh chóng và chính xác nhất.</p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleExcelTemplate}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" /> Tải file Excel mẫu
                </button>
              </div>
            </div>
          ) : (
            /* Preview table */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Hợp lệ: {validCount}
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1.5 text-red-700 bg-red-100/70 px-3 py-1.5 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600" /> Bỏ qua / Lỗi: {invalidCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setParsedRows([])}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline"
                >
                  Chọn file khác
                </button>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2.5 font-bold text-gray-600 text-center w-12">STT</th>
                      <th className="px-3 py-2.5 font-bold text-gray-600">Họ và tên</th>
                      <th className="px-3 py-2.5 font-bold text-gray-600">Ngày sinh</th>
                      <th className="px-3 py-2.5 font-bold text-gray-600">Giới tính</th>
                      <th className="px-3 py-2.5 font-bold text-gray-600">Phụ huynh</th>
                      <th className="px-3 py-2.5 font-bold text-gray-600">Số điện thoại</th>
                      <th className="px-3 py-2.5 font-bold text-gray-600 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50/30'}
                      >
                        <td className="px-3 py-2.5 text-center text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-bold text-gray-900 uppercase">{row.data.name}</td>
                        <td className="px-3 py-2.5 text-gray-600">{formatDisplayDate(row.data.dob)}</td>
                        <td className="px-3 py-2.5 text-gray-600 font-medium">{row.data.gender}</td>
                        <td className="px-3 py-2.5 text-gray-600">{row.data.parentName || '-'}</td>
                        <td className="px-3 py-2.5 text-gray-600">{row.data.phone || '-'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.isValid
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {row.statusMsg}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/70 flex justify-between items-center">
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            Hệ thống sẽ tự động tạo ID và mật khẩu mặc định cho từng học sinh.
          </span>
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={validCount === 0}
              onClick={handleImportValid}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer"
            >
              Nhập {validCount} học sinh hợp lệ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
