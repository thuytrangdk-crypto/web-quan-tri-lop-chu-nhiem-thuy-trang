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
  availableClasses?: string[];
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
}

export interface SeatingLayout {
  groups: number; // số tổ/dãy (ví dụ 4 tổ)
  rows: number; // số hàng bàn (ví dụ 4 hoặc 5 bàn)
  seatsPerTable: number; // số ghế mỗi bàn (mặc định 2)
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
  _syncMeta?: {
    clientId?: string;
    timestamp?: number;
  };
}
