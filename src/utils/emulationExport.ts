import * as XLSX from 'xlsx';
import { AppState, DisciplineRecord, Student } from '../types';
import { calculateConduct, calculateStudentPoints, formatDisplayDate } from './helpers';

export type ReportPeriodType = 'week' | 'month' | 'semester' | 'year' | 'custom';

export interface ReportPeriodConfig {
  type: ReportPeriodType;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  subOption?: string; // e.g., 'this_week' | 'last_week' | 'sem_1' | 'sem_2'
}

/**
 * Returns the current date and time formatted in Vietnam timezone (UTC+7).
 */
export const getVietnamNow = (): { dateStr: string; timeStr: string; fullStr: string } => {
  const now = new Date();
  
  // Format Date (YYYY-MM-DD)
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  // Format Time (HH:mm:ss)
  const timeParts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  // Format Display: HH:mm:ss DD/MM/YYYY
  const [y, m, d] = dateParts.split('-');
  const displayDate = `${d}/${m}/${y}`;
  const fullStr = `${timeParts} ngày ${displayDate}`;

  return {
    dateStr: dateParts,
    timeStr: timeParts,
    fullStr,
  };
};

/**
 * Normalizes any date value (string or Date) to YYYY-MM-DD in Vietnam timezone (UTC+7).
 */
export const normalizeToVNDateStr = (dateVal?: string | Date): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  try {
    const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    }
  } catch {
    // fallback
  }
  return String(dateVal).substring(0, 10);
};

/**
 * Calculates start and end dates for a given week (Monday to Sunday) based on a reference date.
 */
export const getWeekRange = (refDateStr?: string, offsetWeeks: number = 0): { start: string; end: string } => {
  const base = refDateStr ? new Date(`${refDateStr}T12:00:00+07:00`) : new Date();
  // Adjust offset
  base.setDate(base.getDate() + offsetWeeks * 7);

  // Get VN date string
  const vnStr = normalizeToVNDateStr(base);
  const [y, m, d] = vnStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  const dayOfWeek = target.getUTCDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(target);
  monday.setUTCDate(target.getUTCDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const formatUTC = (dt: Date) => {
    const yr = dt.getUTCFullYear();
    const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const da = String(dt.getUTCDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  return {
    start: formatUTC(monday),
    end: formatUTC(sunday),
  };
};

/**
 * Calculates start and end dates for a month in YYYY-MM format.
 */
export const getMonthRange = (yearMonthStr: string): { start: string; end: string } => {
  const parts = yearMonthStr.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mStr = String(m).padStart(2, '0');
  return {
    start: `${y}-${mStr}-01`,
    end: `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`,
  };
};

/**
 * Calculates semester or school year dates based on schoolYear string (e.g. '2026-2027').
 */
export const getAcademicYearRange = (
  schoolYearStr?: string,
  type: 'sem1' | 'sem2' | 'full' = 'full'
): { start: string; end: string } => {
  let startYear = new Date().getFullYear();
  let endYear = startYear + 1;

  if (schoolYearStr) {
    const years = schoolYearStr.match(/\d{4}/g);
    if (years && years.length >= 2) {
      startYear = Number(years[0]);
      endYear = Number(years[1]);
    } else if (years && years.length === 1) {
      startYear = Number(years[0]);
      endYear = startYear + 1;
    }
  }

  if (type === 'sem1') {
    return {
      start: `${startYear}-09-01`,
      end: `${endYear}-01-15`,
    };
  }
  if (type === 'sem2') {
    return {
      start: `${endYear}-01-16`,
      end: `${endYear}-05-31`,
    };
  }
  return {
    start: `${startYear}-09-01`,
    end: `${endYear}-05-31`,
  };
};

/**
 * Sanitizes user text to prevent Excel CSV/Formula injection attacks.
 * If text starts with =, +, -, @, \t, or \r, prefix with apostrophe.
 */
export const sanitizeExcelText = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return str;
};

export interface StudentEmulationExportItem {
  stt: number;
  studentId: string;
  name: string;
  className: string;
  basePoints: number;
  totalPlus: number;
  totalMinus: number;
  remainingPoints: number;
  conductText: string;
  rank: number;
  plusCount: number;
  minusCount: number;
  note: string;
}

export interface EmulationDetailExportItem {
  stt: number;
  dateDisplay: string;
  studentId: string;
  studentName: string;
  ruleName: string;
  typeLabel: string;
  pointsSigned: string;
  recordedBy: string;
  note: string;
}

/**
 * Aggregates all class emulation data for the specified date range.
 * Includes ALL students in the class, regardless of filter or pagination.
 */
export const prepareClassEmulationExportData = (
  state: AppState,
  startDate: string,
  endDate: string,
  locallyDeletedDisciplineIds: string[] = []
): {
  summaryList: StudentEmulationExportItem[];
  detailList: EmulationDetailExportItem[];
  totalClassStudents: number;
  totalPeriodRecords: number;
  totalPeriodPlus: number;
  totalPeriodMinus: number;
} => {
  const basePoints = state.config.initialPoints ?? 100;
  const className = state.config.className || '';
  const teacherName = state.config.teacherName || 'Giáo viên chủ nhiệm';
  const thresholds = state.config.conductThresholds;

  const deletedIdsSet = new Set(locallyDeletedDisciplineIds);

  // 1. Filter and deduplicate discipline records within [startDate, endDate]
  const seenRecordIds = new Set<string>();
  const periodDisciplineRecords: DisciplineRecord[] = [];

  // Map studentId to student object for quick lookup
  const studentMap = new Map<string, Student>();
  state.students.forEach((s) => {
    studentMap.set(s.id, s);
  });

  (state.discipline || []).forEach((d) => {
    if (deletedIdsSet.has(d.id)) return;
    
    // Only include records for students in the current class
    if (!studentMap.has(d.studentId)) return;

    // Deduplicate records
    const recordKey = d.id || `${d.studentId}_${d.date}_${d.ruleId}_${d.points}_${d.type}_${d.note || ''}`;
    if (seenRecordIds.has(recordKey)) return;
    seenRecordIds.add(recordKey);

    // Normalize date to Vietnam timezone
    const vnDate = normalizeToVNDateStr(d.date);
    if (!vnDate) return;

    // Inclusive date range check
    if (vnDate >= startDate && vnDate <= endDate) {
      periodDisciplineRecords.push({
        ...d,
        date: vnDate,
      });
    }
  });

  // Group discipline records by studentId
  const recordsByStudent = new Map<string, DisciplineRecord[]>();
  periodDisciplineRecords.forEach((r) => {
    const list = recordsByStudent.get(r.studentId) || [];
    list.push(r);
    recordsByStudent.set(r.studentId, list);
  });

  // 2. Compute summary for ALL students in the class
  const studentSummaries = state.students.map((student) => {
    const studentRecords = recordsByStudent.get(student.id) || [];
    const pointsSummary = calculateStudentPoints(studentRecords, basePoints);
    const conduct = calculateConduct(pointsSummary.remainingPoints, thresholds);

    const plusCount = studentRecords.filter((r) => r.type === 'plus').length;
    const minusCount = studentRecords.filter((r) => r.type === 'minus').length;

    let note = '';
    if (studentRecords.length === 0) {
      note = 'Không có vi phạm hay khen thưởng trong kỳ';
    } else if (minusCount === 0 && plusCount > 0) {
      note = 'Tích cực, không có vi phạm';
    } else if (minusCount > 0 && plusCount === 0) {
      note = `Có ${minusCount} lượt nhắc nhở/vi phạm`;
    } else {
      note = `Khen thưởng: ${plusCount} lượt, Vi phạm: ${minusCount} lượt`;
    }

    return {
      studentId: student.id,
      name: student.name,
      className,
      basePoints,
      totalPlus: pointsSummary.totalPlus,
      totalMinus: pointsSummary.totalMinus, // Positive number
      remainingPoints: pointsSummary.remainingPoints,
      conductText: conduct.text,
      plusCount,
      minusCount,
      note,
    };
  });

  // 3. Sort students by remaining points descending, then by name
  studentSummaries.sort((a, b) => {
    if (b.remainingPoints !== a.remainingPoints) {
      return b.remainingPoints - a.remainingPoints;
    }
    const nameA = a.name.trim().split(' ').pop() || '';
    const nameB = b.name.trim().split(' ').pop() || '';
    return nameA.localeCompare(nameB, 'vi');
  });

  // 4. Assign ranks (students with equal points share the same rank)
  let currentRank = 1;
  const summaryList: StudentEmulationExportItem[] = studentSummaries.map((item, index) => {
    if (index > 0 && item.remainingPoints < studentSummaries[index - 1].remainingPoints) {
      currentRank = index + 1;
    }
    return {
      ...item,
      stt: index + 1,
      rank: currentRank,
    };
  });

  // 5. Build detail list for Sheet 2
  // Sort discipline records by date descending, then student name
  const sortedDiscipline = [...periodDisciplineRecords].sort((a, b) => {
    if (b.date !== a.date) {
      return b.date.localeCompare(a.date);
    }
    const nameA = studentMap.get(a.studentId)?.name || '';
    const nameB = studentMap.get(b.studentId)?.name || '';
    return nameA.localeCompare(nameB, 'vi');
  });

  const detailList: EmulationDetailExportItem[] = sortedDiscipline.map((r, index) => {
    const student = studentMap.get(r.studentId);
    const studentName = student?.name || r.studentId;
    const isPlus = r.type === 'plus';
    const pointsSigned = isPlus ? `+${r.points}` : `-${r.points}`;
    const recordedBy =
      (r as unknown as Record<string, unknown>).recordedBy ||
      (r as unknown as Record<string, unknown>).teacher ||
      teacherName;

    let fullRuleDesc = r.ruleName || '';
    if (r.note && r.note.trim() && r.note.trim() !== r.ruleName.trim()) {
      fullRuleDesc = `${r.ruleName} (${r.note.trim()})`;
    }

    return {
      stt: index + 1,
      dateDisplay: formatDisplayDate(r.date),
      studentId: r.studentId,
      studentName,
      ruleName: fullRuleDesc,
      typeLabel: isPlus ? 'Tích cực' : 'Vi phạm',
      pointsSigned,
      recordedBy: String(recordedBy),
      note: r.note || '',
    };
  });

  const totalPeriodPlus = periodDisciplineRecords.filter((r) => r.type === 'plus').length;
  const totalPeriodMinus = periodDisciplineRecords.filter((r) => r.type === 'minus').length;

  return {
    summaryList,
    detailList,
    totalClassStudents: state.students.length,
    totalPeriodRecords: periodDisciplineRecords.length,
    totalPeriodPlus,
    totalPeriodMinus,
  };
};

/**
 * Builds the .xlsx workbook with 2 sheets and initiates the file download.
 */
export const exportClassEmulationToExcel = (
  state: AppState,
  periodConfig: ReportPeriodConfig,
  locallyDeletedDisciplineIds: string[] = []
): { success: boolean; fileName: string; error?: string } => {
  try {
    if (!state.students || state.students.length === 0) {
      return {
        success: false,
        fileName: '',
        error: 'Lớp hiện tại chưa có dữ liệu học sinh để xuất báo cáo thi đua.',
      };
    }

    const { startDate, endDate, label: periodLabel } = periodConfig;
    const exportTime = getVietnamNow().fullStr;
    const appName = state.config.appName || 'Trường THCS';
    const className = state.config.className || 'Chưa đặt tên lớp';
    const teacherName = state.config.teacherName || 'Chưa cập nhật';
    const schoolYear = state.config.schoolYear || '2026-2027';
    const baseScore = state.config.initialPoints ?? 100;

    const { summaryList, detailList, totalPeriodRecords } = prepareClassEmulationExportData(
      state,
      startDate,
      endDate,
      locallyDeletedDisciplineIds
    );

    // ==========================================
    // 1. SHEET 1: "Tổng hợp thi đua"
    // ==========================================
    const ws1Rows: unknown[][] = [];

    // Header metadata
    ws1Rows.push([{ t: 's', v: 'BÁO CÁO TỔNG HỢP THI ĐUA HỌC SINH' }]); // Row 1
    ws1Rows.push([
      { t: 's', v: `Trường / Hệ thống: ${sanitizeExcelText(appName)}` },
      null,
      null,
      { t: 's', v: `Năm học: ${sanitizeExcelText(schoolYear)}` },
    ]); // Row 2
    ws1Rows.push([
      { t: 's', v: `Lớp: ${sanitizeExcelText(className)}` },
      null,
      null,
      { t: 's', v: `Giáo viên chủ nhiệm: ${sanitizeExcelText(teacherName)}` },
    ]); // Row 3
    ws1Rows.push([
      {
        t: 's',
        v: `Kỳ báo cáo: ${sanitizeExcelText(periodLabel)} (Từ ngày ${formatDisplayDate(startDate)} đến ngày ${formatDisplayDate(endDate)})`,
      },
    ]); // Row 4
    ws1Rows.push([
      {
        t: 's',
        v: `Thời gian xuất file: ${exportTime} | Điểm ban đầu (điểm nền): ${baseScore} điểm`,
      },
    ]); // Row 5
    ws1Rows.push([]); // Row 6 (Blank)

    // Table Header (Row 7, index 6)
    const summaryHeaders = [
      'STT',
      'Mã hồ sơ học sinh',
      'Họ và tên',
      'Lớp',
      'Điểm ban đầu',
      'Tổng điểm cộng',
      'Tổng điểm trừ',
      'Tổng điểm thi đua',
      'Xếp loại thi đua',
      'Xếp hạng',
      'Số lượt tích cực',
      'Số lượt vi phạm',
      'Ghi chú',
    ];
    ws1Rows.push(summaryHeaders.map((h) => ({ t: 's', v: h })));

    // Data Rows (Row 8+)
    summaryList.forEach((item) => {
      ws1Rows.push([
        { t: 'n', v: item.stt },
        { t: 's', v: String(item.studentId), z: '@' }, // Must be text to preserve leading 0
        { t: 's', v: sanitizeExcelText(item.name) },
        { t: 's', v: sanitizeExcelText(item.className) },
        { t: 'n', v: item.basePoints },
        { t: 'n', v: item.totalPlus },
        { t: 'n', v: item.totalMinus }, // Positive number
        { t: 'n', v: item.remainingPoints },
        { t: 's', v: sanitizeExcelText(item.conductText) },
        { t: 'n', v: item.rank },
        { t: 'n', v: item.plusCount },
        { t: 'n', v: item.minusCount },
        { t: 's', v: sanitizeExcelText(item.note) },
      ]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(ws1Rows);

    // Set column widths
    wsSummary['!cols'] = [
      { wch: 6 },  // STT
      { wch: 20 }, // Mã hồ sơ học sinh
      { wch: 28 }, // Họ và tên
      { wch: 10 }, // Lớp
      { wch: 14 }, // Điểm ban đầu
      { wch: 16 }, // Tổng điểm cộng
      { wch: 16 }, // Tổng điểm trừ
      { wch: 18 }, // Tổng điểm thi đua
      { wch: 18 }, // Xếp loại thi đua
      { wch: 12 }, // Xếp hạng
      { wch: 18 }, // Số lượt tích cực
      { wch: 18 }, // Số lượt vi phạm
      { wch: 35 }, // Ghi chú
    ];

    // AutoFilter on row 7 (index 6, A7:M{lastRow})
    const summaryLastRow = ws1Rows.length;
    wsSummary['!autofilter'] = { ref: `A7:M${summaryLastRow}` };

    // Freeze panes: Freeze above data rows (freeze top 7 rows)
    wsSummary['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 7 }];

    // ==========================================
    // 2. SHEET 2: "Chi tiết ghi nhận"
    // ==========================================
    const ws2Rows: unknown[][] = [];

    // Header metadata
    ws2Rows.push([{ t: 's', v: `BẢNG CHI TIẾT GHI NHẬN THI ĐUA - LỚP ${sanitizeExcelText(className)}` }]); // Row 1
    ws2Rows.push([
      { t: 's', v: `Trường / Hệ thống: ${sanitizeExcelText(appName)}` },
      null,
      null,
      { t: 's', v: `Năm học: ${sanitizeExcelText(schoolYear)} | GVCN: ${sanitizeExcelText(teacherName)}` },
    ]); // Row 2
    ws2Rows.push([
      {
        t: 's',
        v: `Kỳ báo cáo: ${sanitizeExcelText(periodLabel)} (Từ ${formatDisplayDate(startDate)} đến ${formatDisplayDate(endDate)})`,
      },
    ]); // Row 3
    ws2Rows.push([
      {
        t: 's',
        v: `Tổng số lượt ghi nhận trong kỳ: ${totalPeriodRecords} lượt | Thời gian xuất file: ${exportTime}`,
      },
    ]); // Row 4
    ws2Rows.push([]); // Row 5 (Blank)

    // Table Header (Row 6, index 5)
    const detailHeaders = [
      'STT',
      'Thời gian',
      'Mã hồ sơ học sinh',
      'Họ và tên',
      'Nội dung sự việc',
      'Loại ghi nhận',
      'Điểm cộng/trừ',
      'Người ghi nhận',
      'Ghi chú',
    ];
    ws2Rows.push(detailHeaders.map((h) => ({ t: 's', v: h })));

    if (detailList.length === 0) {
      ws2Rows.push([
        { t: 's', v: '-' },
        { t: 's', v: '-' },
        { t: 's', v: '-' },
        { t: 's', v: '-' },
        { t: 's', v: 'Không có ghi nhận vi phạm hay khen thưởng nào trong kỳ này' },
        { t: 's', v: '-' },
        { t: 's', v: '-' },
        { t: 's', v: '-' },
        { t: 's', v: '-' },
      ]);
    } else {
      detailList.forEach((item) => {
        ws2Rows.push([
          { t: 'n', v: item.stt },
          { t: 's', v: item.dateDisplay },
          { t: 's', v: String(item.studentId), z: '@' }, // Text cell to keep leading 0
          { t: 's', v: sanitizeExcelText(item.studentName) },
          { t: 's', v: sanitizeExcelText(item.ruleName) },
          { t: 's', v: sanitizeExcelText(item.typeLabel) },
          { t: 's', v: item.pointsSigned }, // Explicit + or -
          { t: 's', v: sanitizeExcelText(item.recordedBy) },
          { t: 's', v: sanitizeExcelText(item.note) },
        ]);
      });
    }

    const wsDetails = XLSX.utils.aoa_to_sheet(ws2Rows);

    // Set column widths
    wsDetails['!cols'] = [
      { wch: 6 },  // STT
      { wch: 14 }, // Thời gian
      { wch: 20 }, // Mã hồ sơ học sinh
      { wch: 28 }, // Họ và tên
      { wch: 38 }, // Nội dung sự việc
      { wch: 16 }, // Loại ghi nhận
      { wch: 16 }, // Điểm cộng/trừ
      { wch: 24 }, // Người ghi nhận
      { wch: 35 }, // Ghi chú
    ];

    // AutoFilter on row 6 (index 5, A6:I{lastRow})
    const detailsLastRow = ws2Rows.length;
    wsDetails['!autofilter'] = { ref: `A6:I${detailsLastRow}` };

    // Freeze panes: Freeze above data rows (freeze top 6 rows)
    wsDetails['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 6 }];

    // ==========================================
    // 3. Assemble Workbook
    // ==========================================
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Tổng hợp thi đua');
    XLSX.utils.book_append_sheet(workbook, wsDetails, 'Chi tiết ghi nhận');

    // Filename format: Thi_dua_[TenLop]_[TuNgay]_[DenNgay].xlsx
    const cleanClassName = className.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');
    const fileName = `Thi_dua_${cleanClassName}_${startDate}_${endDate}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    return {
      success: true,
      fileName,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error generating emulation Excel file:', err);
    return {
      success: false,
      fileName: '',
      error: `Lỗi khi tạo file Excel thi đua: ${errorMsg}`,
    };
  }
};
