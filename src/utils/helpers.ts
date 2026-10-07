import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { ConductThresholds, Student } from '../types';

export const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const getTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getCurrentMonthStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export const generateStudentId = (dob?: string, existingStudents: Student[] = []): string => {
  if (!dob) {
    let rand = Math.floor(10000000 + Math.random() * 90000000).toString();
    while (existingStudents.some((s) => s.id === rand)) {
      rand = Math.floor(10000000 + Math.random() * 90000000).toString();
    }
    return rand;
  }
  const parts = dob.split('-');
  if (parts.length !== 3) {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  }
  // DDMMYYYY
  const baseId = `${parts[2]}${parts[1]}${parts[0]}`;
  let finalId = baseId;
  let counter = 65; // 'A'
  while (existingStudents.some((s) => s.id === finalId)) {
    finalId = `${baseId}${String.fromCharCode(counter)}`;
    counter++;
  }
  return finalId;
};

export const normalizeDateInput = (str: string): string => {
  return str.trim().replace(/[\/\-\.\s]/g, '');
};

export const matchesStudentDob = (student: Student, input: string): boolean => {
  if (!input) return false;
  const cleanInput = normalizeDateInput(input);
  if (!cleanInput) return false;

  // Check against student.dob (format YYYY-MM-DD or DD/MM/YYYY)
  if (student.dob) {
    const cleanDob = normalizeDateInput(student.dob);
    if (cleanInput === cleanDob) return true;

    const parts = student.dob.split('-');
    if (parts.length === 3) {
      const ddmmyyyy = `${parts[2]}${parts[1]}${parts[0]}`;
      const yyyymmdd = `${parts[0]}${parts[1]}${parts[2]}`;
      if (cleanInput === ddmmyyyy || cleanInput === yyyymmdd) return true;
    }
  }

  // Also match student.id (often DDMMYYYY like 15052012)
  if (cleanInput.toUpperCase() === student.id.trim().toUpperCase()) return true;
  if (normalizeDateInput(student.id).toUpperCase() === cleanInput.toUpperCase()) return true;

  return false;
};

export const getStudentDobDisplay = (dob?: string): string => {
  if (!dob) return '';
  const parts = dob.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dob;
};

export const calculateConduct = (
  totalScore: number,
  thresholds: ConductThresholds = { good: 0, fair: -5, average: -10 }
): { text: string; color: string; bg: string; border: string } => {
  if (totalScore < thresholds.average) {
    return {
      text: 'Yếu',
      color: 'text-red-600',
      bg: 'bg-red-50 text-red-700',
      border: 'border-red-200',
    };
  }
  if (totalScore < thresholds.fair) {
    return {
      text: 'Trung bình',
      color: 'text-orange-500',
      bg: 'bg-orange-50 text-orange-700',
      border: 'border-orange-200',
    };
  }
  if (totalScore < thresholds.good) {
    return {
      text: 'Khá',
      color: 'text-blue-600',
      bg: 'bg-blue-50 text-blue-700',
      border: 'border-blue-200',
    };
  }
  return {
    text: 'Tốt',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-200',
  };
};

export const resizeImageBase64 = (
  file: File,
  maxWidth: number,
  maxHeight: number,
  callback: (base64: string) => void
) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height *= maxWidth / width));
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width *= maxHeight / height));
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      }
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

export const parseExcelDate = (val: unknown): string => {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel date numeric format
    const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const cleanStr = String(val).trim();
  if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  if (cleanStr.includes('-') && cleanStr.split('-').length === 3) {
    const parts = cleanStr.split('-');
    if (parts[0].length === 4) return cleanStr; // YYYY-MM-DD
    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return cleanStr;
};

export const triggerConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
  });
};

export const exportStudentsToExcel = (students: Student[], className: string) => {
  const exportData = students.map((s, index) => ({
    STT: index + 1,
    'Mã học sinh (ID)': s.id,
    'Họ và tên': s.name,
    'Giới tính': s.gender,
    'Ngày sinh': formatDisplayDate(s.dob),
    'Họ tên phụ huynh': s.parentName || '',
    'Số điện thoại': s.phone || '',
    'Địa chỉ': s.address || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Danh sách lớp ${className}`);
  XLSX.writeFile(workbook, `Danh_sach_lop_${className}_${getTodayStr()}.xlsx`);
};

export const downloadSampleExcelTemplate = () => {
  const sampleData = [
    {
      'Họ và tên': 'Nguyễn Văn An',
      'Ngày sinh': '15/05/2012',
      'Giới tính': 'Nam',
      'Họ tên phụ huynh': 'Nguyễn Văn Ba',
      'Số điện thoại': '0912345678',
      'Địa chỉ': '123 Phố Huế, Hai Bà Trưng, Hà Nội',
    },
    {
      'Họ và tên': 'Trần Thị Bình',
      'Ngày sinh': '20/08/2012',
      'Giới tính': 'Nữ',
      'Họ tên phụ huynh': 'Trần Thị Mai',
      'Số điện thoại': '0987654321',
      'Địa chỉ': '45 Cầu Giấy, Hà Nội',
    },
    {
      'Họ và tên': 'Lê Hoàng Châu',
      'Ngày sinh': '10/11/2012',
      'Giới tính': 'Nữ',
      'Họ tên phụ huynh': 'Lê Văn Cường',
      'Số điện thoại': '0901122334',
      'Địa chỉ': '78 Đống Đa, Hà Nội',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_nhap_hoc_sinh');
  XLSX.writeFile(wb, 'Mau_nhap_danh_sach_hoc_sinh.xlsx');
};
