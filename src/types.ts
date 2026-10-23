export type Gender = 'Nam' | 'Nữ';
export type AttendanceStatus = 'c' | 'v' | 'kp' | 'm'; // c: Có mặt, v: Có phép, kp: Không phép, m: Muộn
export type DisciplineType = 'minus' | 'plus';
export type NoticeType = 'info' | 'warning' | 'success';
export type NoteType = 'Liên hệ PH' | 'Học tập' | 'Khác';
export type UserRole = 'teacher' | 'student';

export interface Rule {
  id: string;
  name: string;
  points: number;
  type: DisciplineType;
}

export interface ConductThresholds {
  good: number;
  fair: number;
  average: number;
}

export interface AppConfig {
  appName: string;
  className: string;
  schoolYear: string;
  teacherName: string;
  teacherPassword: string;
  classAvatar: string;
  subjects: string[];
  rules: Rule[];
  conductThresholds: ConductThresholds;
  initialPoints?: number; // Base emulation score (default: 100)
  availableClasses?: string[];
  evaluationSubjects?: string[]; // Môn đánh giá bằng nhận xét, không tính vào ĐTB
}

export interface Student {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD
  gender: Gender;
  parentName: string;
  phone: string;
  address: string;
  avatar: string;
  password?: string;
  grades?: Record<string, number>;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface DisciplineRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  ruleId: string;
  ruleName: string;
  points: number;
  type: DisciplineType;
  note?: string;
}

export interface NoteRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  type: NoteType;
  content: string;
}

export interface BoardNotice {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  type: NoticeType;
  image?: string; // Legacy single image data or URL (backward compatibility)
  images?: string[]; // Multiple images (Base64 data or URLs)
  videoUrl?: string; // Video URL (YouTube, MP4, Google Drive, Vimeo...)
  linkUrl?: string; // Web link, Google Forms, Drive document, etc.
  linkTitle?: string; // Custom label for link
}

export interface SeatingLayout {
  groups: number; // số tổ/dãy (ví dụ 4 tổ)
  rows: number; // số hàng bàn (ví dụ 4 hoặc 5 bàn)
  seatsPerTable: number; // số ghế mỗi bàn (mặc định 2)
}

export interface MonthlyGradeRecord {
  id: string;
  className: string;
  schoolYear: string;
  month: string; // YYYY-MM
  studentId: string;
  subject: string;
  score: number; // 0 to 10
  updatedAt?: string;
}

export interface AcademicHonorsAnnouncement {
  className: string;
  schoolYear: string;
  month: string; // YYYY-MM
  isPublished: boolean; // Bản nháp (false) hoặc Đã công bố (true)
  publishedAt?: string;
  publishedBy?: string;
  lastCalculatedAt?: string;
}

export interface AcademicGradeBackup {
  id: string;
  className: string;
  schoolYear: string;
  month: string; // YYYY-MM
  createdAt: string; // ISO string
  createdBy: string;
  studentCount: number;
  totalGradesCount: number;
  grades: MonthlyGradeRecord[];
  announcement?: AcademicHonorsAnnouncement;
}

export interface AppState {
  config: AppConfig;
  students: Student[];
  attendance: AttendanceRecord[];
  discipline: DisciplineRecord[];
  notes: NoteRecord[];
  boardNotices: BoardNotice[];
  seatingChart?: Record<string, string>; // seatKey -> studentId
  seatingLayout?: SeatingLayout;
  academicGrades?: MonthlyGradeRecord[];
  academicAnnouncements?: AcademicHonorsAnnouncement[];
  academicBackups?: AcademicGradeBackup[];
  _syncMeta?: {
    clientId?: string;
    timestamp?: number;
  };
}
