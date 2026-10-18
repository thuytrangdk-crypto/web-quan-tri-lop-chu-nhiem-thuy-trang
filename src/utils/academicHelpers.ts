import * as XLSX from 'xlsx';
import { MonthlyGradeRecord, Student, AppConfig, AcademicHonorsAnnouncement } from '../types';
import { formatDisplayDate } from './helpers';

export interface StudentAcademicSummary {
  stt: number;
  studentId: string;
  name: string;
  className: string;
  grades: Record<string, number | undefined>; // subject -> score
  validSubjectsCount: number;
  totalGradedSubjectsCount: number;
  rawAverage: number | null;
  formattedAverage: string; // e.g. "8,25" or "Chưa có điểm"
  rank: number | null;
}

export interface AcademicHonorsItem {
  rank: number;
  studentId: string;
  name: string;
  avatar: string;
  rawAverage: number;
  formattedAverage: string; // e.g. "8,50"
  validSubjectsCount: number;
  totalGradedSubjectsCount: number;
  className: string;
  schoolYear: string;
  month: string;
}

/**
 * Checks if a subject is evaluation-only (môn nhận xét: Đ/CĐ)
 */
export const isSubjectEvaluationOnly = (
  subject: string,
  evaluationSubjects: string[] = []
): boolean => {
  const norm = subject.trim().toLowerCase();
  return evaluationSubjects.some((ev) => ev.trim().toLowerCase() === norm);
};

/**
 * Parses and sanitizes a grade input value (accepts 0-10, commas and dots).
 * Returns undefined for empty/blank string.
 * Throws or returns null if invalid.
 */
export const parseGradeValue = (val: unknown): { score: number | undefined; isValid: boolean; error?: string } => {
  if (val === null || val === undefined) {
    return { score: undefined, isValid: true };
  }

  const str = String(val).trim();
  if (str === '' || str === '-' || str.toLowerCase() === 'null') {
    return { score: undefined, isValid: true };
  }

  // Replace comma with dot for decimal: "8,5" -> "8.5"
  const normalizedStr = str.replace(',', '.');
  const num = Number(normalizedStr);

  if (isNaN(num)) {
    return { score: undefined, isValid: false, error: `Giá trị "${str}" không phải là số hợp lệ` };
  }

  if (num < 0 || num > 10) {
    return { score: undefined, isValid: false, error: `Điểm ${num} vượt quá thang điểm 0 - 10` };
  }

  // Round to max 2 decimal places to prevent floating precision issues
  const rounded = Math.round(num * 100) / 100;
  return { score: rounded, isValid: true };
};

/**
 * Computes class academic summary and ranking for a specific month.
 * Formula: Trung bình cộng = Tổng điểm các môn có điểm / Số môn có điểm.
 * Trọng số bằng nhau. Ô trống không tính. Điểm 0 tính bình thường.
 * Xếp hạng bằng giá trị thô chưa làm tròn. Hiển thị 2 chữ số thập phân.
 */
export const calculateClassAcademicSummary = (
  students: Student[],
  className: string,
  schoolYear: string,
  month: string,
  allGrades: MonthlyGradeRecord[] = [],
  subjects: string[] = [],
  evaluationSubjects: string[] = []
): StudentAcademicSummary[] => {
  // Filter graded subjects (exclude evaluation-only)
  const gradedSubjects = subjects.filter((s) => !isSubjectEvaluationOnly(s, evaluationSubjects));

  // Build a lookup: studentId -> subject -> score
  const studentGradeMap = new Map<string, Record<string, number>>();

  allGrades.forEach((r) => {
    const classMatch =
      !r.className || !className || r.className.trim().toLowerCase() === className.trim().toLowerCase();
    const yearMatch = !r.schoolYear || !schoolYear || r.schoolYear.trim() === schoolYear.trim();
    const monthMatch = (r.month || '').trim() === (month || '').trim();

    if (classMatch && yearMatch && monthMatch) {
      const sId = (r.studentId || '').trim();
      const current = studentGradeMap.get(sId) || {};
      current[r.subject.trim()] = r.score;
      studentGradeMap.set(sId, current);
    }
  });

  // Calculate averages for all students
  const studentSummaries = students.map((student, idx) => {
    const sId = (student.id || '').trim();
    const studentGrades = studentGradeMap.get(sId) || {};
    
    // Also check legacy grades fallback for the student if monthly record is not yet created
    const effectiveGrades: Record<string, number | undefined> = {};
    subjects.forEach((sub) => {
      const cleanSub = sub.trim();
      if (studentGrades[cleanSub] !== undefined) {
        effectiveGrades[cleanSub] = studentGrades[cleanSub];
      } else if (student.grades && student.grades[cleanSub] !== undefined && studentGrades[cleanSub] === undefined) {
        // Fallback for initial un-migrated state
        effectiveGrades[cleanSub] = student.grades[cleanSub];
      } else {
        effectiveGrades[cleanSub] = undefined;
      }
    });

    // Valid graded scores
    let totalScore = 0;
    let validCount = 0;

    gradedSubjects.forEach((sub) => {
      const cleanSub = sub.trim();
      const score = effectiveGrades[cleanSub];
      if (typeof score === 'number' && !isNaN(score) && score >= 0 && score <= 10) {
        totalScore += score;
        validCount++;
      }
    });

    let rawAverage: number | null = null;
    let formattedAverage = 'Chưa có điểm';

    if (validCount > 0) {
      rawAverage = totalScore / validCount;
      // 2 decimal places with comma: e.g. "8,25"
      formattedAverage = rawAverage.toFixed(2).replace('.', ',');
    }

    return {
      stt: idx + 1,
      studentId: student.id,
      name: student.name,
      className,
      grades: effectiveGrades,
      validSubjectsCount: validCount,
      totalGradedSubjectsCount: gradedSubjects.length,
      rawAverage,
      formattedAverage,
      rank: null as number | null,
    };
  });

  // Ranking calculation:
  // Sort students who have rawAverage !== null
  const gradedList = studentSummaries
    .filter((s) => s.rawAverage !== null)
    .sort((a, b) => {
      if (b.rawAverage! !== a.rawAverage!) {
        return b.rawAverage! - a.rawAverage!;
      }
      // If equal score, sort stably by studentId (mã hồ sơ)
      return a.studentId.localeCompare(b.studentId, 'vi');
    });

  // Assign ranks (students with equal rawAverage get equal rank)
  let currentRank = 1;
  const rankMap = new Map<string, number>();

  gradedList.forEach((s, i) => {
    if (i > 0 && s.rawAverage! < gradedList[i - 1].rawAverage!) {
      currentRank = i + 1;
    }
    rankMap.set(s.studentId, currentRank);
  });

  return studentSummaries.map((s) => ({
    ...s,
    rank: rankMap.get(s.studentId) ?? null,
  }));
};

/**
 * Returns Top 5 Academic Honors for a month.
 * At most 5 students, ties share rank, ordered stably by ID when needed.
 * Students with 0 subjects with grades are excluded.
 */
export const getTop5AcademicHonors = (
  students: Student[],
  className: string,
  schoolYear: string,
  month: string,
  allGrades: MonthlyGradeRecord[] = [],
  subjects: string[] = [],
  evaluationSubjects: string[] = []
): AcademicHonorsItem[] => {
  const summaries = calculateClassAcademicSummary(
    students,
    className,
    schoolYear,
    month,
    allGrades,
    subjects,
    evaluationSubjects
  );

  // Filter students with valid average
  const candidates = summaries
    .filter((s): s is StudentAcademicSummary & { rawAverage: number } => s.rawAverage !== null)
    .sort((a, b) => {
      if (b.rawAverage !== a.rawAverage) {
        return b.rawAverage - a.rawAverage;
      }
      return a.studentId.localeCompare(b.studentId, 'vi');
    });

  const top5 = candidates.slice(0, 5);

  let currentRank = 1;
  return top5.map((s, idx) => {
    if (idx > 0 && s.rawAverage < top5[idx - 1].rawAverage) {
      currentRank = idx + 1;
    }
    const student = students.find((st) => st.id === s.studentId);
    return {
      rank: currentRank,
      studentId: s.studentId,
      name: s.name,
      avatar: student?.avatar || '',
      rawAverage: s.rawAverage,
      formattedAverage: s.formattedAverage,
      validSubjectsCount: s.validSubjectsCount,
      totalGradedSubjectsCount: s.totalGradedSubjectsCount,
      className,
      schoolYear,
      month,
    };
  });
};

export interface StudentMonthlyRecord {
  month: string; // YYYY-MM
  monthDisplay: string; // Tháng MM/YYYY
  grades: Record<string, number | undefined>;
  validCount: number;
  totalCount: number;
  rawAverage: number | null;
  formattedAverage: string;
  rank: number | null;
}

/**
 * Returns full monthly academic history for a student across all recorded months in the school year.
 * Used for monthly progress charts and student profile history tab.
 */
export const getStudentAcademicHistory = (
  studentId: string,
  allStudents: Student[],
  className: string,
  schoolYear: string,
  allGrades: MonthlyGradeRecord[] = [],
  subjects: string[] = [],
  evaluationSubjects: string[] = []
): StudentMonthlyRecord[] => {
  // Find all distinct months recorded in allGrades for this class & year
  const recordedMonths = new Set<string>();
  allGrades.forEach((g) => {
    const classMatch =
      !g.className || !className || g.className.trim().toLowerCase() === className.trim().toLowerCase();
    const yearMatch = !g.schoolYear || !schoolYear || g.schoolYear.trim() === schoolYear.trim();

    if (classMatch && yearMatch && g.month) {
      recordedMonths.add(g.month.trim());
    }
  });

  // Also include the current month if not yet recorded
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  recordedMonths.add(cur);

  const sortedMonths = Array.from(recordedMonths).sort();

  return sortedMonths.map((m) => {
    const classSummary = calculateClassAcademicSummary(
      allStudents,
      className,
      schoolYear,
      m,
      allGrades,
      subjects,
      evaluationSubjects
    );

    const sSummary = classSummary.find(
      (s) => s.studentId.trim() === studentId.trim()
    );

    const [y, mon] = m.split('-');
    const monthDisplay = `Tháng ${Number(mon)}/${y}`;

    return {
      month: m,
      monthDisplay,
      grades: sSummary?.grades || {},
      validCount: sSummary?.validSubjectsCount || 0,
      totalCount: sSummary?.totalGradedSubjectsCount || subjects.length,
      rawAverage: sSummary?.rawAverage ?? null,
      formattedAverage: sSummary?.formattedAverage || 'Chưa có điểm',
      rank: sSummary?.rank ?? null,
    };
  });
};

/**
 * Generates and downloads the Excel template (.xlsx) for the current class and month.
 * Pre-populates STT, Mã hồ sơ, Họ và tên from real students of the class.
 */
export const downloadAcademicExcelTemplate = (
  students: Student[],
  className: string,
  schoolYear: string,
  month: string,
  subjects: string[]
) => {
  const [y, m] = month.split('-');
  const monthDisplay = `Tháng ${Number(m)}/${y}`;

  // Rows array
  const rows: unknown[][] = [];

  // Header row
  const headerCols = ['STT', 'Mã hồ sơ học sinh', 'Họ và tên', ...subjects];
  rows.push(headerCols.map((h) => ({ t: 's', v: h })));

  // Students rows
  students.forEach((s, idx) => {
    const rowData: unknown[] = [
      { t: 'n', v: idx + 1 },
      { t: 's', v: String(s.id), z: '@' }, // Text format to preserve leading zeros
      { t: 's', v: s.name },
    ];
    // Empty cells for each subject
    subjects.forEach(() => {
      rowData.push(null);
    });
    rows.push(rowData);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  const cols = [
    { wch: 6 },  // STT
    { wch: 20 }, // Mã hồ sơ
    { wch: 28 }, // Họ và tên
  ];
  subjects.forEach(() => {
    cols.push({ wch: 14 });
  });
  ws['!cols'] = cols;
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headerCols.length - 1)}${rows.length}` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Điểm ${className}`);

  const fileName = `Mau_nhap_diem_${className}_${month}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Exports full class academic results for the month to Excel (.xlsx)
 */
export const exportAcademicClassToExcel = (
  students: Student[],
  config: AppConfig,
  month: string,
  allGrades: MonthlyGradeRecord[] = []
) => {
  const [y, m] = month.split('-');
  const monthDisplay = `Tháng ${Number(m)}/${y}`;
  const subjects = config.subjects || [];
  const evalSubjects = config.evaluationSubjects || [];

  const summaries = calculateClassAcademicSummary(
    students,
    config.className,
    config.schoolYear,
    month,
    allGrades,
    subjects,
    evalSubjects
  );

  const rows: unknown[][] = [];

  // Metadata headers
  rows.push([{ t: 's', v: `BẢNG TỔNG HỢP ĐIỂM HỌC TẬP THÁNG - LỚP ${config.className}` }]);
  rows.push([
    { t: 's', v: `Trường / Ứng dụng: ${config.appName || 'Trường THCS'}` },
    null,
    null,
    { t: 's', v: `Năm học: ${config.schoolYear || '2026-2027'}` },
  ]);
  rows.push([
    { t: 's', v: `Kỳ đánh giá: ${monthDisplay}` },
    null,
    null,
    { t: 's', v: `Giáo viên chủ nhiệm: ${config.teacherName || 'Chưa cập nhật'}` },
  ]);
  rows.push([
    {
      t: 's',
      v: `Lưu ý: Trung bình cộng các môn theo tháng phục vụ theo dõi nội bộ, không gán thành kết quả học tập học kỳ chính thức.`,
    },
  ]);
  rows.push([]); // Blank separator

  // Table header
  const tableHeaders = [
    'STT',
    'Mã hồ sơ học sinh',
    'Họ và tên',
    ...subjects,
    'Số môn có điểm',
    'Trung bình cộng (ĐTB)',
    'Thứ hạng',
    'Ghi chú',
  ];
  rows.push(tableHeaders.map((h) => ({ t: 's', v: h })));

  // Data rows
  summaries.forEach((s) => {
    const row: unknown[] = [
      { t: 'n', v: s.stt },
      { t: 's', v: String(s.studentId), z: '@' },
      { t: 's', v: s.name },
    ];

    // Subject grades
    subjects.forEach((sub) => {
      const score = s.grades[sub];
      if (score !== undefined) {
        row.push({ t: 'n', v: score });
      } else {
        row.push({ t: 's', v: '-' });
      }
    });

    // Counts, Average, Rank
    row.push({ t: 's', v: `${s.validSubjectsCount}/${s.totalGradedSubjectsCount}` });
    if (s.rawAverage !== null) {
      row.push({ t: 'n', v: Math.round(s.rawAverage * 100) / 100 });
    } else {
      row.push({ t: 's', v: 'Chưa có điểm' });
    }
    row.push(s.rank !== null ? { t: 'n', v: s.rank } : { t: 's', v: '-' });

    let note = '';
    if (s.validSubjectsCount === 0) {
      note = 'Chưa nhập điểm';
    } else if (s.validSubjectsCount < s.totalGradedSubjectsCount) {
      note = `Còn thiếu ${s.totalGradedSubjectsCount - s.validSubjectsCount} môn`;
    } else {
      note = 'Đủ các môn';
    }
    row.push({ t: 's', v: note });

    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const cols = [
    { wch: 6 },  // STT
    { wch: 18 }, // Mã HS
    { wch: 26 }, // Họ tên
  ];
  subjects.forEach(() => {
    cols.push({ wch: 12 });
  });
  cols.push({ wch: 16 }); // Số môn
  cols.push({ wch: 22 }); // ĐTB
  cols.push({ wch: 12 }); // Hạng
  cols.push({ wch: 20 }); // Ghi chú
  ws['!cols'] = cols;

  // AutoFilter on row 6
  const totalRows = rows.length;
  const lastColLetter = XLSX.utils.encode_col(tableHeaders.length - 1);
  ws['!autofilter'] = { ref: `A6:${lastColLetter}${totalRows}` };
  ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 6 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bang_diem_thang');

  const cleanClassName = config.className.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
  const fileName = `Bang_diem_${cleanClassName}_${month}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export interface ExcelImportParseResult {
  validRows: {
    studentId: string;
    studentName: string;
    matchedBy: 'id' | 'name';
    needsConfirmation?: boolean;
    grades: Record<string, number | undefined>;
    rowNumber: number;
  }[];
  errors: {
    rowNumber: number;
    colName?: string;
    studentId?: string;
    studentName?: string;
    message: string;
  }[];
  warnings: {
    rowNumber: number;
    message: string;
  }[];
  recognizedSubjects: string[];
  unrecognizedColumns: string[];
  totalCellsCount: number;
}

/**
 * Parses an uploaded Excel file for monthly academic grades.
 * Rigorously checks student ID, 0-10 range, duplicate students, unmapped columns.
 */
export const parseAcademicExcelData = async (
  file: File,
  existingStudents: Student[],
  availableSubjects: string[]
): Promise<ExcelImportParseResult> => {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];

  // Convert to JSON with headers
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const errors: ExcelImportParseResult['errors'] = [];
  const warnings: ExcelImportParseResult['warnings'] = [];
  const validRows: ExcelImportParseResult['validRows'] = [];

  if (rawRows.length === 0) {
    errors.push({
      rowNumber: 0,
      message: 'File Excel không có dữ liệu dòng nào.',
    });
    return {
      validRows: [],
      errors,
      warnings,
      recognizedSubjects: [],
      unrecognizedColumns: [],
      totalCellsCount: 0,
    };
  }

  // Find column headers from the first row keys
  const allKeys = Object.keys(rawRows[0] || {});

  // Identify ID column, Name column, Subject columns
  const idColKey = allKeys.find((k) => {
    const norm = k.toLowerCase().trim();
    return norm.includes('mã') || norm.includes('id') || norm === 'ma_hs';
  });

  const nameColKey = allKeys.find((k) => {
    const norm = k.toLowerCase().trim();
    return norm.includes('họ và tên') || norm.includes('tên') || norm.includes('họ tên') || norm === 'ho_ten';
  });

  // Map remaining columns to known subjects
  const recognizedSubjects: string[] = [];
  const unrecognizedColumns: string[] = [];
  const subjectKeyMap = new Map<string, string>(); // colKey -> officialSubjectName

  allKeys.forEach((key) => {
    if (key === idColKey || key === nameColKey || key.toLowerCase().includes('stt')) {
      return;
    }
    const cleanKey = key.trim();
    const matchedSub = availableSubjects.find(
      (sub) => sub.trim().toLowerCase() === cleanKey.toLowerCase()
    );

    if (matchedSub) {
      subjectKeyMap.set(key, matchedSub);
      if (!recognizedSubjects.includes(matchedSub)) {
        recognizedSubjects.push(matchedSub);
      }
    } else {
      unrecognizedColumns.push(key);
    }
  });

  if (unrecognizedColumns.length > 0) {
    warnings.push({
      rowNumber: 1,
      message: `Các cột sau không khớp danh sách môn học của lớp và sẽ được bỏ qua: ${unrecognizedColumns.join(', ')}`,
    });
  }

  if (recognizedSubjects.length === 0) {
    errors.push({
      rowNumber: 1,
      message: `File không có cột môn học nào khớp với các môn của lớp (${availableSubjects.join(', ')}).`,
    });
    return {
      validRows: [],
      errors,
      warnings,
      recognizedSubjects,
      unrecognizedColumns,
      totalCellsCount: 0,
    };
  }

  // Pre-build student maps
  const studentById = new Map<string, Student>();
  const studentsByName = new Map<string, Student[]>();

  existingStudents.forEach((s) => {
    studentById.set(s.id.trim(), s);
    const normName = s.name.trim().toLowerCase();
    const list = studentsByName.get(normName) || [];
    list.push(s);
    studentsByName.set(normName, list);
  });

  const seenIdsInFile = new Set<string>();
  let totalGradeCells = 0;

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // 1-based, accounting for header row

    const rawId = idColKey ? String(row[idColKey] || '').trim() : '';
    const rawName = nameColKey ? String(row[nameColKey] || '').trim() : '';

    if (!rawId && !rawName) {
      // Empty line, ignore
      return;
    }

    let matchedStudent: Student | undefined;
    let matchedBy: 'id' | 'name' = 'id';
    let needsConfirmation = false;

    if (rawId) {
      // Clean ID format (preserve leading zeros if read as number/text)
      const cleanId = rawId.replace(/\.0$/, '');
      matchedStudent = studentById.get(cleanId);

      if (!matchedStudent) {
        errors.push({
          rowNumber: rowNum,
          studentId: cleanId,
          studentName: rawName,
          message: `Mã hồ sơ "${cleanId}" (${rawName || 'Không có tên'}) không tồn tại trong danh sách lớp. Hệ thống không tự tạo học sinh mới.`,
        });
        return;
      }
      matchedBy = 'id';
    } else if (rawName) {
      // Missing ID, try name matching
      const candidates = studentsByName.get(rawName.toLowerCase()) || [];
      if (candidates.length === 1) {
        matchedStudent = candidates[0];
        matchedBy = 'name';
        needsConfirmation = true;
        warnings.push({
          rowNumber: rowNum,
          message: `Dòng không có mã hồ sơ, đã tìm thấy học sinh duy nhất "${matchedStudent.name}" (Mã: ${matchedStudent.id}). Vui lòng xác nhận trước khi lưu.`,
        });
      } else if (candidates.length > 1) {
        errors.push({
          rowNumber: rowNum,
          studentName: rawName,
          message: `Dòng thiếu mã hồ sơ và có ${candidates.length} học sinh trùng tên "${rawName}". Không thể tự động ghép điểm.`,
        });
        return;
      } else {
        errors.push({
          rowNumber: rowNum,
          studentName: rawName,
          message: `Không tìm thấy học sinh tên "${rawName}" trong lớp.`,
        });
        return;
      }
    }

    if (!matchedStudent) return;

    // Check duplicate student within the same file
    if (seenIdsInFile.has(matchedStudent.id)) {
      errors.push({
        rowNumber: rowNum,
        studentId: matchedStudent.id,
        studentName: matchedStudent.name,
        message: `Học sinh "${matchedStudent.name}" (Mã: ${matchedStudent.id}) bị xuất hiện trùng lặp nhiều lần trong file.`,
      });
      return;
    }
    seenIdsInFile.add(matchedStudent.id);

    // Parse each subject column
    const parsedGrades: Record<string, number | undefined> = {};
    let hasRowError = false;

    subjectKeyMap.forEach((officialSubject, colKey) => {
      const cellVal = row[colKey];
      const parsed = parseGradeValue(cellVal);

      if (!parsed.isValid) {
        hasRowError = true;
        errors.push({
          rowNumber: rowNum,
          colName: officialSubject,
          studentId: matchedStudent?.id,
          studentName: matchedStudent?.name,
          message: `Môn "${officialSubject}": ${parsed.error}`,
        });
      } else {
        parsedGrades[officialSubject] = parsed.score;
        if (parsed.score !== undefined) {
          totalGradeCells++;
        }
      }
    });

    if (!hasRowError) {
      validRows.push({
        studentId: matchedStudent.id,
        studentName: matchedStudent.name,
        matchedBy,
        needsConfirmation,
        grades: parsedGrades,
        rowNumber: rowNum,
      });
    }
  });

  return {
    validRows,
    errors,
    warnings,
    recognizedSubjects,
    unrecognizedColumns,
    totalCellsCount: totalGradeCells,
  };
};

/**
 * Merges newly imported grades into existing grades array without duplicates.
 * If overwriteBlanks is true, empty cells will delete existing grades.
 * If overwriteBlanks is false (default), empty cells do not touch existing grades.
 */
export const mergeMonthlyGrades = (
  existingGrades: MonthlyGradeRecord[] = [],
  importedRows: ExcelImportParseResult['validRows'],
  className: string,
  schoolYear: string,
  month: string,
  overwriteBlanks: boolean = false
): MonthlyGradeRecord[] => {
  const result = [...existingGrades];

  importedRows.forEach((row) => {
    Object.keys(row.grades).forEach((subject) => {
      const newScore = row.grades[subject];

      // Find existing record for this (className, schoolYear, month, studentId, subject)
      const existingIdx = result.findIndex(
        (r) =>
          r.className === className &&
          r.schoolYear === schoolYear &&
          r.month === month &&
          r.studentId === row.studentId &&
          r.subject === subject
      );

      if (newScore !== undefined) {
        if (existingIdx >= 0) {
          // Update existing
          result[existingIdx] = {
            ...result[existingIdx],
            score: newScore,
            updatedAt: new Date().toISOString(),
          };
        } else {
          // Insert new
          result.push({
            id: `mg_${row.studentId}_${month}_${Math.random().toString(36).substring(2, 7)}`,
            className,
            schoolYear,
            month,
            studentId: row.studentId,
            subject,
            score: newScore,
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (overwriteBlanks && existingIdx >= 0) {
        // Delete existing if teacher explicitly selected overwriteBlanks
        result.splice(existingIdx, 1);
      }
    });
  });

  return result;
};
