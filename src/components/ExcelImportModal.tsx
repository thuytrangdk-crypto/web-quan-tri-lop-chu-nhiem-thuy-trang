import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  UserCheck,
  HelpCircle,
  RefreshCw,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
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
  onImport: (newStudents: Student[], mode: 'append' | 'replace') => void;
  onClose: () => void;
}

interface ParsedRow {
  isValid: boolean;
  statusMsg: string;
  isMissingDob: boolean;
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
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isConfirmedDobRequirement, setIsConfirmedDobRequirement] = useState(true);
  const [showRequirementDetails, setShowRequirementDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const missingDobCount = parsedRows.filter((r) => r.isMissingDob).length;

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
          (h) => h.includes('ngày sinh') || h.includes('ngay sinh') || h.includes('sinh') || h.includes('dob')
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
          const isMissingDob = !rawDob;

          if (!rawName || rawName.length < 2) {
            isValid = false;
            statusMsg = 'Tên không hợp lệ';
          } else if (isMissingDob) {
            // DOB is critical because it's the student login and password!
            isValid = false;
            statusMsg = 'Thiếu ngày sinh (Không thể cấp TK)';
          } else if (importMode === 'append') {
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
            isMissingDob,
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

    const baseList: Student[] = importMode === 'replace' ? [] : [...existingStudents];
    const accumulated: Student[] = [...baseList];

    const newStudents: Student[] = validOnes.map((item) => {
      const generatedId = generateStudentId(item.data.dob, accumulated);
      // Student password is explicitly formatted as their Date of Birth (e.g. DD/MM/YYYY)
      const dobDisplayPassword = formatDisplayDate(item.data.dob);

      const student: Student = {
        id: generatedId,
        name: item.data.name,
        dob: item.data.dob,
        gender: item.data.gender,
        parentName: item.data.parentName,
        phone: item.data.phone,
        address: item.data.address,
        avatar: '',
        password: dobDisplayPassword || generatedId,
        grades: {},
      };
      accumulated.push(student);
      return student;
    });

    onImport(newStudents, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900">
                Nhập danh sách học sinh từ Excel
              </h3>
              <p className="text-xs text-gray-500">
                Tự động tạo mã ID và cấp tài khoản đăng nhập học sinh theo Ngày sinh
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
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
          {/* PHẦN NỘI DUNG YÊU CẦU QUAN TRỌNG TRƯỚC KHI NHẬP */}
          <div className="bg-amber-50/80 border-2 border-amber-200 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-black text-amber-950 uppercase tracking-wide flex items-center gap-2">
                    <span>Yêu cầu &amp; Quy định bảo mật tài khoản học sinh</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                      Bắt buộc
                    </span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowRequirementDetails(!showRequirementDetails)}
                    className="text-xs text-amber-800 hover:text-amber-950 font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {showRequirementDetails ? 'Thu gọn hướng dẫn' : 'Xem chi tiết quy định'}
                  </button>
                </div>

                <div className="text-xs text-amber-900 space-y-1.5 leading-relaxed font-medium">
                  <p>
                    🔑 <strong>Tài khoản &amp; Mật khẩu đăng nhập:</strong> Hệ thống sử dụng{' '}
                    <span className="underline font-bold text-amber-950">
                      cột Ngày tháng năm sinh
                    </span>{' '}
                    trong file Excel làm <strong>Tài khoản và Mật khẩu</strong> để học sinh đăng nhập.
                  </p>
                  <p>
                    🛡️ <strong>Phân quyền riêng tư:</strong> Khi học sinh đăng nhập bằng ngày sinh, các em chỉ có thể xem{' '}
                    <strong>hồ sơ của chính mình</strong>, thông tin hồ sơ của các bạn khác hoàn toàn bị khóa để bảo mật.
                  </p>
                </div>

                {showRequirementDetails && (
                  <div className="mt-3 pt-3 border-t border-amber-200/80 text-xs text-amber-900/90 space-y-2 bg-amber-100/50 p-3 rounded-xl">
                    <p className="font-bold text-amber-950">
                      📋 Cấu trúc các cột yêu cầu trong file Excel:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                        <strong className="text-emerald-700">1. Cột 'Họ và tên':</strong> Bắt buộc (Ví dụ: Nguyễn Văn An)
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                        <strong className="text-emerald-700">2. Cột 'Ngày sinh':</strong> Bắt buộc (Định dạng: <code>dd/mm/yyyy</code>, VD: <code>15/05/2012</code>)
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                        <strong className="text-gray-700">3. Cột 'Giới tính':</strong> Nam hoặc Nữ
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                        <strong className="text-gray-700">4. Cột 'Phụ huynh':</strong> Tên cha/mẹ (tùy chọn)
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                        <strong className="text-gray-700">5. Cột 'Số điện thoại':</strong> SĐT liên lạc (tùy chọn)
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                        <strong className="text-gray-700">6. Cột 'Địa chỉ':</strong> Nơi ở hiện tại (tùy chọn)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CÂU HỎI LỰA CHỌN CHẾ ĐỘ NHẬP DANH SÁCH */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Câu hỏi: Thầy/Cô muốn nhập danh sách học sinh theo hình thức nào?
              </label>
              <span className="text-[11px] text-slate-500">
                Hiện có: <strong>{existingStudents.length} học sinh</strong> trong lớp
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Append */}
              <div
                onClick={() => setImportMode('append')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  importMode === 'append'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    importMode === 'append'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {importMode === 'append' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    Thêm bổ sung vào danh sách hiện có
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                    Giữ lại <strong>{existingStudents.length} học sinh cũ</strong>, chỉ nạp thêm học sinh mới từ file Excel (tự động bỏ qua bạn trùng tên và ngày sinh).
                  </p>
                </div>
              </div>

              {/* Option 2: Replace */}
              <div
                onClick={() => setImportMode('replace')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  importMode === 'replace'
                    ? 'border-red-500 bg-red-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    importMode === 'replace'
                      ? 'border-red-600 bg-red-600 text-white'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {importMode === 'replace' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                    <RefreshCw className="w-3.5 h-3.5 text-red-600" />
                    Làm mới &amp; Thay thế toàn bộ danh sách lớp
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                    Xóa danh sách học sinh cũ của lớp, nạp mới hoàn toàn danh sách từ file Excel và cấp lại tài khoản học sinh.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CHỌN FILE HOẶC BẢNG PREVIEW */}
          {parsedRows.length === 0 ? (
            /* Upload dropzone */
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-3xl p-8 sm:p-10 text-center hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col items-center justify-center bg-gray-50/50"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-inner">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-gray-900 font-black text-base mb-1">
                  Kéo thả file Excel vào đây hoặc bấm để chọn file
                </p>
                <p className="text-xs text-gray-500 mb-4 max-w-md">
                  Định dạng hỗ trợ: Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) hoặc CSV (<strong>.csv</strong>)
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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
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

              {/* Tải file mẫu chuẩn */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-blue-900">
                  <p className="font-black text-sm text-blue-950 mb-0.5 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    Chưa có file Excel theo mẫu chuẩn?
                  </p>
                  <p className="text-blue-700 text-[11px]">
                    Tải file mẫu có sẵn các cột chuẩn (Họ tên, Ngày sinh để cấp tài khoản, Giới tính, Phụ huynh, SĐT).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleExcelTemplate}
                  className="px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600" /> Tải file Excel mẫu chuẩn
                </button>
              </div>
            </div>
          ) : (
            /* Preview table */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Hợp lệ (Đủ ngày sinh &amp; TK): {validCount}
                  </span>
                  {missingDobCount > 0 && (
                    <span className="flex items-center gap-1.5 text-amber-800 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Thiếu ngày sinh: {missingDobCount}
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1.5 text-red-800 bg-red-100 px-3 py-1.5 rounded-xl border border-red-200">
                      <AlertCircle className="w-4 h-4 text-red-600" /> Bỏ qua / Lỗi: {invalidCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setParsedRows([])}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Chọn file khác
                </button>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto custom-scrollbar shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2.5 font-bold text-gray-700 text-center w-10">STT</th>
                      <th className="px-3 py-2.5 font-bold text-gray-700">Họ và tên</th>
                      <th className="px-3 py-2.5 font-bold text-gray-700 bg-emerald-50 text-emerald-900 border-x border-emerald-100">
                        <div className="flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ngày sinh (Tài khoản &amp; MK)</span>
                        </div>
                      </th>
                      <th className="px-3 py-2.5 font-bold text-gray-700 text-center">Giới tính</th>
                      <th className="px-3 py-2.5 font-bold text-gray-700">Phụ huynh</th>
                      <th className="px-3 py-2.5 font-bold text-gray-700">Số điện thoại</th>
                      <th className="px-3 py-2.5 font-bold text-gray-700 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/40'}
                      >
                        <td className="px-3 py-2.5 text-center text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-black text-gray-900 uppercase">{row.data.name}</td>
                        <td className="px-3 py-2.5 bg-emerald-50/50 border-x border-emerald-100">
                          {row.data.dob ? (
                            <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1 w-fit">
                              <KeyRound className="w-3 h-3 text-emerald-600 shrink-0" />
                              {formatDisplayDate(row.data.dob)}
                            </span>
                          ) : (
                            <span className="text-red-600 font-bold italic flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Chưa có ngày sinh
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold text-gray-600">{row.data.gender}</td>
                        <td className="px-3 py-2.5 text-gray-600">{row.data.parentName || '-'}</td>
                        <td className="px-3 py-2.5 text-gray-600 font-medium">{row.data.phone || '-'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              row.isValid
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
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

              {/* Hộp xác nhận yêu cầu trước khi nhấn nhập */}
              <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirmDobCheckbox"
                  checked={isConfirmedDobRequirement}
                  onChange={(e) => setIsConfirmedDobRequirement(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label
                  htmlFor="confirmDobCheckbox"
                  className="text-xs text-emerald-950 font-bold leading-relaxed cursor-pointer select-none"
                >
                  Tôi xác nhận đã kiểm tra cột Ngày tháng năm sinh để cấp Tài khoản &amp; Mật khẩu đăng nhập cho {validCount} học sinh này (theo đúng quy định bảo mật riêng tư của học sinh).
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <span className="font-bold text-gray-700">Chế độ đã chọn:</span>
            {importMode === 'append' ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                Thêm bổ sung ({existingStudents.length} học sinh hiện tại + {validCount} học sinh mới)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg bg-red-100 text-red-800 font-bold text-[11px]">
                Thay thế toàn bộ ({validCount} học sinh mới)
              </span>
            )}
          </div>

          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={validCount === 0 || !isConfirmedDobRequirement || isProcessing}
              onClick={handleImportValid}
              className={`flex-1 sm:flex-none px-6 py-2.5 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                importMode === 'replace'
                  ? 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
                  : 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {importMode === 'replace' ? 'Thay thế & Nhập' : 'Nhập'}{' '}
                {validCount > 0 ? `${validCount} học sinh` : 'danh sách'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
