import React, { useState, useEffect, useRef } from 'react';
import {
  AppState,
  AttendanceStatus,
  BoardNotice,
  DisciplineRecord,
  NoteRecord,
  SeatingLayout,
  Student,
  UserRole,
  MonthlyGradeRecord,
  AcademicGradeBackup,
} from './types';
import { DEFAULT_INITIAL_STATE } from './defaultData';
import { generateId, getTodayStr } from './utils/helpers';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { AcademicsView } from './components/AcademicsView';
import { AttendanceView } from './components/AttendanceView';
import { BoardView } from './components/BoardView';
import { SettingsView } from './components/SettingsView';
import { StudentProfileModal } from './components/StudentProfileModal';
import { ClassSwitchModal } from './components/ClassSwitchModal';
import { SupabaseModal } from './components/SupabaseModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { supabaseService, SyncStatus, CLIENT_SESSION_ID } from './services/supabaseService';
import { CheckCircle2, AlertCircle, Menu } from 'lucide-react';

const STORAGE_KEY = 'so_chu_nhiem_8a3_data';
const SESSION_AUTH_KEY = 'scn_session_auth';

interface ToastItem {
  id: string;
  msg: string;
  type: 'success' | 'error';
}

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.config && Array.isArray(parsed.students)) {
          return {
            ...DEFAULT_INITIAL_STATE,
            ...parsed,
            config: {
              ...DEFAULT_INITIAL_STATE.config,
              ...parsed.config,
            },
            seatingLayout: {
              ...DEFAULT_INITIAL_STATE.seatingLayout,
              ...(parsed.seatingLayout || {}),
              rows:
                parsed.seatingLayout?.rows && parsed.seatingLayout.rows >= 8
                  ? parsed.seatingLayout.rows
                  : 8,
            },
          };
        }
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
    return DEFAULT_INITIAL_STATE;
  });

  const latestStateRef = useRef<AppState>(state);
  latestStateRef.current = state;

  const [authRole, setAuthRole] = useState<UserRole | null>(() => {
    try {
      const session = sessionStorage.getItem(SESSION_AUTH_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.role || null;
      }
    } catch (e) {}
    return null;
  });

  const [authStudentId, setAuthStudentId] = useState<string | null>(() => {
    try {
      const session = sessionStorage.getItem(SESSION_AUTH_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.id || null;
      }
    } catch (e) {}
    return null;
  });

  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const session = sessionStorage.getItem(SESSION_AUTH_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.role === 'student') return 'board';
      }
    } catch (e) {}
    return 'dashboard';
  });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentMonth, setSelectedStudentMonth] = useState<string | null>(null);
  const [selectedStudentYear, setSelectedStudentYear] = useState<string | null>(null);

  const handleOpenStudentProfile = (studentId: string, month?: string, year?: string) => {
    if (authRole === 'teacher' || studentId === authStudentId) {
      setSelectedStudentId(studentId);
      if (month) setSelectedStudentMonth(month);
      if (year) setSelectedStudentYear(year);
    } else {
      showToast('Bảo mật: Bạn chỉ có thể xem hồ sơ của chính mình!', 'error');
    }
  };

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isClassSwitchOpen, setIsClassSwitchOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isTeacherPasswordModalOpen, setIsTeacherPasswordModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Supabase cloud sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    isTableReady: false,
    isSyncing: false,
    lastSyncedAt: null,
    errorMessage: null,
  });

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving state', e);
    }
  }, [state]);

  // Update HTML document title
  useEffect(() => {
    document.title = `${state.config.appName} - Lớp ${state.config.className}`;
  }, [state.config.appName, state.config.className]);

  // Initial Supabase connection check and sync
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initSupabase = async () => {
      const { isConnected, isTableReady, error } =
        await supabaseService.checkConnection();

      setSyncStatus((prev) => ({
        ...prev,
        isConnected,
        isTableReady,
        errorMessage: error || null,
      }));

      if (isTableReady) {
        // Load remote data
        const { state: remoteState } = await supabaseService.loadState();
        if (remoteState && Array.isArray(remoteState.students)) {
          const localTs = latestStateRef.current._syncMeta?.timestamp || 0;
          const remoteTs = remoteState._syncMeta?.timestamp || 0;

          // If local state has newer edits made before remote arrived, upload local state!
          if (localTs > remoteTs) {
            await supabaseService.saveState(latestStateRef.current);
            setSyncStatus((prev) => ({
              ...prev,
              lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
            }));
          } else {
            // Apply remote state
            setState((prev) => ({
              ...prev,
              ...remoteState,
              config: {
                ...prev.config,
                ...remoteState.config,
              },
            }));
            latestStateRef.current = {
              ...latestStateRef.current,
              ...remoteState,
              config: {
                ...latestStateRef.current.config,
                ...remoteState.config,
              },
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteState));
            } catch (e) {}
            setSyncStatus((prev) => ({
              ...prev,
              lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
            }));
          }
        }

        // Subscribe to real-time changes from other tabs or devices
        unsubscribe = supabaseService.subscribe((updatedRemote) => {
          if (updatedRemote && Array.isArray(updatedRemote.students)) {
            const remoteTs = updatedRemote._syncMeta?.timestamp || 0;
            const currentTs = latestStateRef.current._syncMeta?.timestamp || 0;

            if (remoteTs > currentTs) {
              setState((prev) => ({
                ...prev,
                ...updatedRemote,
                config: {
                  ...prev.config,
                  ...updatedRemote.config,
                },
              }));
              latestStateRef.current = updatedRemote;
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRemote));
              } catch (e) {}
              setSyncStatus((prev) => ({
                ...prev,
                lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
              }));
            }
          }
        });
      }
    };

    initSupabase();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleCheckSupabaseConnection = async () => {
    const res = await supabaseService.checkConnection();
    setSyncStatus((prev) => ({
      ...prev,
      isConnected: res.isConnected,
      isTableReady: res.isTableReady,
      errorMessage: res.error || null,
    }));
    if (res.isTableReady) {
      showToast('Đã kết nối thành công với Supabase Cloud!');
    } else {
      showToast(res.error || 'Cần chạy mã SQL tạo bảng trên Supabase.', 'error');
    }
  };

  const handleSyncNow = async () => {
    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    const res = await supabaseService.saveState(state);
    setSyncStatus((prev) => ({
      ...prev,
      isSyncing: false,
      lastSyncedAt: res.success ? new Date().toLocaleTimeString('vi-VN') : prev.lastSyncedAt,
      errorMessage: res.error || null,
    }));
    if (res.success) {
      showToast('Đã đồng bộ toàn bộ dữ liệu lên Supabase Cloud!');
    } else {
      showToast(res.error || 'Lỗi đồng bộ dữ liệu lên Supabase', 'error');
    }
  };

  const handlePullRemote = async () => {
    const res = await supabaseService.loadState();
    if (res.state && res.state.students) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.state));
      } catch (e) {}
      setState(res.state);
      showToast('Đã tải và áp dụng dữ liệu mới từ Supabase Cloud!');
    } else {
      showToast(res.error || 'Chưa có bản ghi nào trên Supabase Cloud.', 'error');
    }
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // Unified state mutator that guarantees instant localStorage save and immediate Supabase synchronization
  const updateAppState = (
    updater: (prev: AppState) => AppState,
    syncImmediately = true
  ) => {
    setState((prev) => {
      const updated = updater(prev);
      const nextState: AppState = {
        ...updated,
        _syncMeta: {
          clientId: CLIENT_SESSION_ID,
          timestamp: Date.now(),
        },
      };
      latestStateRef.current = nextState;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } catch (e) {
        console.error('Error saving state to localStorage', e);
      }

      if (syncImmediately) {
        supabaseService.saveState(nextState).then((res) => {
          if (res.success) {
            setSyncStatus((s) => ({
              ...s,
              isConnected: true,
              isTableReady: true,
              lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
              errorMessage: null,
            }));
          } else {
            console.warn('Supabase save state error:', res.error);
          }
        });
      }

      return nextState;
    });
  };

  const handleSaveClassSwitch = (data: {
    className: string;
    schoolYear: string;
    teacherName: string;
    availableClasses: string[];
  }) => {
    updateAppState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        className: data.className,
        schoolYear: data.schoolYear,
        teacherName: data.teacherName,
        availableClasses: data.availableClasses,
      },
    }));
    showToast(`Đã chuyển sang Lớp ${data.className} (Năm học ${data.schoolYear})`);
  };

  const handleUpdateSeatingChart = (newChart: Record<string, string>) => {
    updateAppState((prev) => ({
      ...prev,
      seatingChart: newChart,
    }));
  };

  const handleUpdateSeatingLayout = (newLayout: SeatingLayout) => {
    updateAppState((prev) => ({
      ...prev,
      seatingLayout: newLayout,
    }));
    showToast(`Đã cập nhật sơ đồ lớp: ${newLayout.rows} bàn mỗi dãy`);
  };

  // Auth Handlers
  const handleLoginTeacher = () => {
    setAuthRole('teacher');
    setAuthStudentId(null);
    sessionStorage.setItem(
      SESSION_AUTH_KEY,
      JSON.stringify({ role: 'teacher', id: null })
    );
    showToast(`Xin chào cô ${state.config.teacherName}`);
  };

  const handleLoginStudent = (studentId: string) => {
    setAuthRole('student');
    setAuthStudentId(studentId);
    setSelectedStudentId(null);
    setCurrentView('board');
    sessionStorage.setItem(
      SESSION_AUTH_KEY,
      JSON.stringify({ role: 'student', id: studentId })
    );
    const s = state.students.find((x) => x.id === studentId);
    showToast(`Xin chào học sinh ${s ? s.name : ''}`);
  };

  // Guard views: restrict student role to Board & Seating Chart and their own Profile
  useEffect(() => {
    if (authRole === 'student') {
      if (currentView === 'profile') {
        if (!selectedStudentId && authStudentId) {
          setSelectedStudentId(authStudentId);
        }
      } else if (
        currentView !== 'board' &&
        currentView !== 'board_notices' &&
        currentView !== 'board_seating'
      ) {
        setCurrentView('board');
      }
    }
  }, [authRole, currentView, selectedStudentId, authStudentId]);

  const handleLogout = () => {
    setAuthRole(null);
    setAuthStudentId(null);
    setSelectedStudentId(null);
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    showToast('Đã đăng xuất khỏi hệ thống');
  };

  // Student CRUD
  const handleAddStudent = (newStudentData: Partial<Student>) => {
    const newStudent = newStudentData as Student;
    updateAppState((prev) => ({
      ...prev,
      students: [...prev.students, newStudent],
    }));
    showToast(`Đã thêm học sinh: ${newStudent.name}`);
  };

  const handleUpdateStudent = (studentData: Partial<Student>) => {
    updateAppState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentData.id ? ({ ...s, ...studentData } as Student) : s
      ),
    }));
    showToast('Đã cập nhật thông tin học sinh');
  };

  const handleDeleteStudent = (studentId: string) => {
    updateAppState((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== studentId),
      attendance: prev.attendance.filter((a) => a.studentId !== studentId),
      discipline: prev.discipline.filter((d) => d.studentId !== studentId),
      notes: prev.notes.filter((n) => n.studentId !== studentId),
    }));
    if (selectedStudentId === studentId) {
      setSelectedStudentId(null);
    }
    showToast('Đã xóa học sinh khỏi danh sách');
  };

  const INITIAL_SAMPLE_IDS = new Set([
    '15052012',
    '20082012',
    '10112012',
    '03022012',
    '18092012',
    '25122012',
    '09042012',
    '14072012',
  ]);

  const handleBatchImportStudents = (
    newStudents: Student[],
    mode: 'append' | 'replace' = 'replace'
  ) => {
    updateAppState((prev) => {
      let updatedStudents: Student[];
      let updatedAttendance = prev.attendance;
      let updatedDiscipline = prev.discipline;
      let updatedNotes = prev.notes;
      let updatedSeating = prev.seatingChart;

      if (mode === 'replace') {
        // REPLACE ENTIRELY: only keep the new list of students!
        updatedStudents = newStudents;
        const newIds = new Set(newStudents.map((s) => s.id));
        updatedAttendance = prev.attendance.filter((a) => newIds.has(a.studentId));
        updatedDiscipline = prev.discipline.filter((d) => newIds.has(d.studentId));
        updatedNotes = prev.notes.filter((n) => newIds.has(n.studentId));
        updatedSeating = Object.fromEntries(
          Object.entries(prev.seatingChart || {}).filter(([_, id]) => newIds.has(id))
        );
      } else {
        // Append mode: avoid duplicate additions
        const existingNames = new Set(prev.students.map((s) => `${s.name.toLowerCase().trim()}_${s.dob}`));
        const toAdd = newStudents.filter(
          (s) => !existingNames.has(`${s.name.toLowerCase().trim()}_${s.dob}`)
        );
        updatedStudents = [...prev.students, ...toAdd];
      }

      return {
        ...prev,
        students: updatedStudents,
        attendance: updatedAttendance,
        discipline: updatedDiscipline,
        notes: updatedNotes,
        seatingChart: updatedSeating,
      };
    });

    showToast(
      mode === 'replace'
        ? `Đã thay thế toàn bộ danh sách lớp: còn đúng ${newStudents.length} học sinh!`
        : `Đã nhập thành công ${newStudents.length} học sinh vào lớp`
    );
  };

  const handleRemoveSampleStudents = () => {
    updateAppState((prev) => {
      const updatedStudents = prev.students.filter((s) => !INITIAL_SAMPLE_IDS.has(s.id));
      const newIds = new Set(updatedStudents.map((s) => s.id));
      const updatedAttendance = prev.attendance.filter((a) => newIds.has(a.studentId));
      const updatedDiscipline = prev.discipline.filter((d) => newIds.has(d.studentId));
      const updatedNotes = prev.notes.filter((n) => newIds.has(n.studentId));
      const updatedSeating = Object.fromEntries(
        Object.entries(prev.seatingChart || {}).filter(([_, id]) => newIds.has(id))
      );

      return {
        ...prev,
        students: updatedStudents,
        attendance: updatedAttendance,
        discipline: updatedDiscipline,
        notes: updatedNotes,
        seatingChart: updatedSeating,
      };
    });

    showToast('Đã xóa sạch 8 học sinh mẫu ban đầu, hiện chỉ giữ lại học sinh của lớp!');
  };

  const handleClearAllStudents = () => {
    updateAppState((prev) => ({
      ...prev,
      students: [],
      attendance: [],
      discipline: [],
      notes: [],
      seatingChart: {},
    }));

    showToast('Đã xóa toàn bộ học sinh của lớp!');
  };

  const handleUpdateAvatar = (studentId: string, base64: string) => {
    updateAppState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, avatar: base64 } : s
      ),
    }));
  };

  const handleSaveGrades = (studentId: string, grades: Record<string, number>) => {
    updateAppState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, grades } : s
      ),
    }));
  };

  const handleChangePassword = (studentId: string, newPass: string) => {
    updateAppState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, password: newPass } : s
      ),
    }));
  };

  // Attendance Handlers
  const handleUpdateAttendanceStatus = (
    studentId: string,
    date: string,
    status: AttendanceStatus
  ) => {
    updateAppState((prev) => {
      const idx = prev.attendance.findIndex(
        (a) => a.studentId === studentId && a.date === date
      );
      if (idx > -1) {
        const nextAtt = [...prev.attendance];
        nextAtt[idx] = { ...nextAtt[idx], status };
        return { ...prev, attendance: nextAtt };
      }
      return {
        ...prev,
        attendance: [
          ...prev.attendance,
          { id: generateId(), studentId, date, status },
        ],
      };
    });
  };

  const handleMarkAllPresent = (date: string) => {
    updateAppState((prev) => {
      const nextAtt = [...prev.attendance];
      prev.students.forEach((s) => {
        const idx = nextAtt.findIndex(
          (a) => a.studentId === s.id && a.date === date
        );
        if (idx > -1) {
          nextAtt[idx] = { ...nextAtt[idx], status: 'c' };
        } else {
          nextAtt.push({
            id: generateId(),
            studentId: s.id,
            date,
            status: 'c',
          });
        }
      });
      return { ...prev, attendance: nextAtt };
    });
    showToast('Đã đánh dấu tất cả có mặt cho ngày đã chọn');
  };

  const handleDeleteAttendance = (attendanceId: string) => {
    updateAppState((prev) => ({
      ...prev,
      attendance: prev.attendance.filter((a) => a.id !== attendanceId),
    }));
    showToast('Đã xóa bản ghi điểm danh');
  };

  const handleResetStudentAttendance = (studentId: string, date: string) => {
    updateAppState((prev) => ({
      ...prev,
      attendance: prev.attendance.filter(
        (a) => !(a.studentId === studentId && a.date === date)
      ),
    }));
    showToast('Đã xóa điểm danh ngày đã chọn');
  };

  // Discipline Handlers (with auto sync attendance!)
  const handleAddDiscipline = (record: Omit<DisciplineRecord, 'id'>) => {
    const newDiscipline: DisciplineRecord = {
      ...record,
      id: generateId(),
    };

    // Auto sync attendance if rule name matches late/unexcused
    const ruleLower = record.ruleName.toLowerCase();
    let syncedStatus: AttendanceStatus | null = null;
    if (ruleLower.includes('muộn') || ruleLower.includes('trễ')) {
      syncedStatus = 'm';
    } else if (
      ruleLower.includes('không phép') ||
      ruleLower.includes('cúp tiết') ||
      ruleLower.includes('trốn học')
    ) {
      syncedStatus = 'kp';
    } else if (
      ruleLower.includes('nghỉ học') ||
      ruleLower.includes('vắng') ||
      ruleLower.includes('bỏ tiết')
    ) {
      syncedStatus = 'v';
    }

    updateAppState((prev) => {
      let nextAtt = prev.attendance;
      if (syncedStatus) {
        const idx = nextAtt.findIndex(
          (a) => a.studentId === record.studentId && a.date === record.date
        );
        if (idx > -1) {
          nextAtt = nextAtt.map((a, i) =>
            i === idx ? { ...a, status: syncedStatus as AttendanceStatus } : a
          );
        } else {
          nextAtt = [
            ...nextAtt,
            {
              id: generateId(),
              studentId: record.studentId,
              date: record.date,
              status: syncedStatus as AttendanceStatus,
            },
          ];
        }
      }

      return {
        ...prev,
        discipline: [...prev.discipline, newDiscipline],
        attendance: nextAtt,
      };
    });

    if (syncedStatus) {
      showToast('Đã ghi nhận thi đua & tự động đồng bộ Điểm danh');
    }
  };

  const handleDeleteDiscipline = (recordId: string) => {
    updateAppState((prev) => {
      const recordToDelete = prev.discipline.find((d) => d.id === recordId);
      const nextDiscipline = prev.discipline.filter((d) => d.id !== recordId);

      let nextAtt = prev.attendance;
      if (recordToDelete) {
        // If this record synced attendance, check if there are other violations on that day
        const remainingSyncViolations = nextDiscipline.filter(
          (d) => d.studentId === recordToDelete.studentId && d.date === recordToDelete.date
        );
        if (remainingSyncViolations.length === 0) {
          // Remove or reset the synced attendance for this student on this date
          nextAtt = nextAtt.filter(
            (a) => !(a.studentId === recordToDelete.studentId && a.date === recordToDelete.date)
          );
        }
      }

      return {
        ...prev,
        discipline: nextDiscipline,
        attendance: nextAtt,
      };
    });
    showToast('Đã xóa ghi nhận sự việc thi đua thành công');
  };

  // Notes Handlers
  const handleAddNote = (record: Omit<NoteRecord, 'id'>) => {
    const newNote: NoteRecord = {
      ...record,
      id: generateId(),
    };
    updateAppState((prev) => ({
      ...prev,
      notes: [...prev.notes, newNote],
    }));
    showToast('Đã thêm ghi chú liên lạc');
  };

  const handleDeleteNote = (noteId: string) => {
    updateAppState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
    }));
    showToast('Đã xóa ghi chú');
  };

  // Board Notices Handlers
  const handleAddNotice = (notice: Omit<BoardNotice, 'id'>) => {
    const newNotice: BoardNotice = {
      ...notice,
      id: generateId(),
    };
    updateAppState((prev) => ({
      ...prev,
      boardNotices: [...prev.boardNotices, newNotice],
    }));
    showToast('Đã đăng thông tin mới lên bảng tin');
  };

  const handleUpdateNotice = (updatedNotice: BoardNotice) => {
    updateAppState((prev) => ({
      ...prev,
      boardNotices: prev.boardNotices.map((n) =>
        n.id === updatedNotice.id ? updatedNotice : n
      ),
    }));
    showToast('Đã cập nhật thay đổi thông tin thành công');
  };

  const handleDeleteNotice = (noticeId: string) => {
    updateAppState((prev) => ({
      ...prev,
      boardNotices: prev.boardNotices.filter((n) => n.id !== noticeId),
    }));
    showToast('Đã xóa thông tin thành công');
  };

  // Config & Reset Handlers
  const handleUpdateConfig = (newConfig: Partial<AppState['config']>) => {
    updateAppState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        ...newConfig,
      },
    }));
  };

  const handleResetData = () => {
    updateAppState(() => DEFAULT_INITIAL_STATE);
    showToast('Đã khôi phục dữ liệu mẫu thành công');
  };

  const handleClearAllData = () => {
    updateAppState((prev) => ({
      ...prev,
      config: DEFAULT_INITIAL_STATE.config,
      students: [],
      attendance: [],
      discipline: [],
      notes: [],
      boardNotices: [],
      seatingChart: {},
    }));
    showToast('Đã xóa toàn bộ dữ liệu');
  };

  const handleImportBackup = (backupState: AppState) => {
    updateAppState(() => backupState);
    showToast('Đã khôi phục từ bản sao lưu');
  };

  // Academic Grades & Honors Handlers
  const handleUpdateAcademicGrades = (updatedGrades: MonthlyGradeRecord[]) => {
    updateAppState((prev) => ({
      ...prev,
      academicGrades: updatedGrades,
    }));
  };

  const handlePublishAcademicHonors = (month: string) => {
    updateAppState((prev) => {
      const clsName = prev.config.className;
      const yr = prev.config.schoolYear;
      const existing = prev.academicAnnouncements || [];
      const idx = existing.findIndex(
        (a) => a.className === clsName && a.schoolYear === yr && a.month === month
      );

      const now = new Date().toISOString();
      const updatedList = [...existing];
      if (idx >= 0) {
        updatedList[idx] = {
          ...updatedList[idx],
          isPublished: true,
          publishedAt: now,
          publishedBy: prev.config.teacherName,
        };
      } else {
        updatedList.push({
          className: clsName,
          schoolYear: yr,
          month,
          isPublished: true,
          publishedAt: now,
          publishedBy: prev.config.teacherName,
        });
      }

      return {
        ...prev,
        academicAnnouncements: updatedList,
      };
    });
    const [y, m] = month.split('-');
    showToast(`Đã công bố vinh danh Top 5 học tập Tháng ${Number(m)}/${y}!`, 'success');
  };

  const handleDeleteMonthlyGrades = async (
    month: string,
    onProgress?: (step: 'backing_up' | 'deleting') => void
  ): Promise<{ success: boolean; error?: string }> => {
    if (authRole !== 'teacher') {
      return { success: false, error: 'Chỉ giáo viên mới có quyền xóa bảng điểm tháng.' };
    }

    // Use latestStateRef to avoid stale closure state
    const currentState = latestStateRef.current;
    const clsName = (currentState.config.className || '').trim();
    const yr = (currentState.config.schoolYear || '').trim();

    const gradesToDelete = (currentState.academicGrades || []).filter(
      (g) =>
        (!g.className || g.className.trim().toLowerCase() === clsName.toLowerCase()) &&
        (!g.schoolYear || g.schoolYear.trim().toLowerCase() === yr.toLowerCase()) &&
        g.month === month
    );

    if (gradesToDelete.length === 0) {
      return { success: false, error: 'Không tìm thấy dữ liệu điểm của tháng này để xóa.' };
    }

    const existingAnnouncement = (currentState.academicAnnouncements || []).find(
      (a) =>
        (!a.className || a.className.trim().toLowerCase() === clsName.toLowerCase()) &&
        (!a.schoolYear || a.schoolYear.trim().toLowerCase() === yr.toLowerCase()) &&
        a.month === month
    );

    // Create Backup object
    const backup: AcademicGradeBackup = {
      id: `bak_${clsName}_${month}_${Date.now()}`,
      className: clsName,
      schoolYear: yr,
      month,
      createdAt: new Date().toISOString(),
      createdBy: currentState.config.teacherName || 'Giáo viên',
      studentCount: new Set(gradesToDelete.map((g) => g.studentId)).size,
      totalGradesCount: gradesToDelete.length,
      grades: gradesToDelete,
      announcement: existingAnnouncement,
    };

    // Filter out grades for this class, year, and month
    const remainingGrades = (currentState.academicGrades || []).filter(
      (g) =>
        !(
          (!g.className || g.className.trim().toLowerCase() === clsName.toLowerCase()) &&
          (!g.schoolYear || g.schoolYear.trim().toLowerCase() === yr.toLowerCase()) &&
          g.month === month
        )
    );

    // Update announcement for this month: remove published status so it reverts to draft/unpublished
    const updatedAnnouncements = (currentState.academicAnnouncements || []).filter(
      (a) =>
        !(
          (!a.className || a.className.trim().toLowerCase() === clsName.toLowerCase()) &&
          (!a.schoolYear || a.schoolYear.trim().toLowerCase() === yr.toLowerCase()) &&
          a.month === month
        )
    );

    // Add backup to state.academicBackups (keep latest 30 backups)
    const updatedBackups = [backup, ...(currentState.academicBackups || [])].slice(0, 30);

    const nextState: AppState = {
      ...currentState,
      academicGrades: remainingGrades,
      academicAnnouncements: updatedAnnouncements,
      academicBackups: updatedBackups,
      _syncMeta: {
        clientId: CLIENT_SESSION_ID,
        timestamp: Date.now(),
      },
    };

    // Execute atomic delete with prerequisite backup on Supabase
    const res = await supabaseService.deleteMonthlyAcademicGrades(backup, nextState, onProgress);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    // Update local state after confirmed Supabase write
    latestStateRef.current = nextState;
    setState(nextState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (e) {}

    // Verify by reading back from Supabase
    try {
      const verifyRes = await supabaseService.loadState();
      if (verifyRes.state) {
        latestStateRef.current = verifyRes.state;
        setState(verifyRes.state);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(verifyRes.state));
        } catch (e) {}
      }
    } catch (e) {
      // Non-fatal if fetch verification times out, local state is already saved
    }

    const [y, m] = month.split('-');
    showToast(`Đã xóa bảng điểm Tháng ${Number(m)}/${y} và tạo bản sao lưu an toàn!`, 'success');
    return { success: true };
  };

  const handleRestoreMonthlyGrades = async (
    backup: AcademicGradeBackup
  ): Promise<{ success: boolean; error?: string }> => {
    if (authRole !== 'teacher') {
      return { success: false, error: 'Chỉ giáo viên mới có quyền khôi phục bảng điểm.' };
    }

    const clsName = backup.className || state.config.className;
    const yr = backup.schoolYear || state.config.schoolYear;
    const month = backup.month;

    // Filter out any current grades for this month
    const remainingGrades = (state.academicGrades || []).filter(
      (g) =>
        !(
          (!g.className || g.className === clsName) &&
          (!g.schoolYear || g.schoolYear === yr) &&
          g.month === month
        )
    );

    // Merge restored grades
    const restoredGrades = [...remainingGrades, ...backup.grades];

    // Restore announcement if present, but set isPublished: false (Teacher must review & publish later!)
    const updatedAnnouncements = [...(state.academicAnnouncements || [])];
    const annIdx = updatedAnnouncements.findIndex(
      (a) => a.className === clsName && a.schoolYear === yr && a.month === month
    );
    if (annIdx >= 0) {
      updatedAnnouncements[annIdx] = {
        ...updatedAnnouncements[annIdx],
        isPublished: false,
      };
    }

    const nextState: AppState = {
      ...state,
      academicGrades: restoredGrades,
      academicAnnouncements: updatedAnnouncements,
      _syncMeta: {
        clientId: CLIENT_SESSION_ID,
        timestamp: Date.now(),
      },
    };

    // Save to Supabase
    const res = await supabaseService.saveState(nextState);
    if (!res.success) {
      return {
        success: false,
        error: `Lỗi khi lưu dữ liệu khôi phục lên Supabase: ${res.error}`,
      };
    }

    latestStateRef.current = nextState;
    setState(nextState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (e) {}

    const [y, m] = month.split('-');
    showToast(`Đã khôi phục thành công bảng điểm Tháng ${Number(m)}/${y}!`, 'success');
    return { success: true };
  };

  const handleSaveStudentAcademicGrades = (
    studentId: string,
    month: string,
    grades: Record<string, number | undefined>
  ) => {
    updateAppState((prev) => {
      const clsName = prev.config.className;
      const yr = prev.config.schoolYear;
      const currentList = [...(prev.academicGrades || [])];
      const now = new Date().toISOString();

      Object.entries(grades).forEach(([subject, score]) => {
        const cleanSub = subject.trim();
        const existingIdx = currentList.findIndex(
          (g) =>
            g.studentId === studentId &&
            g.month === month &&
            g.subject.trim() === cleanSub &&
            (!g.className || g.className === clsName)
        );

        if (score !== undefined && typeof score === 'number' && !isNaN(score)) {
          if (existingIdx >= 0) {
            currentList[existingIdx] = {
              ...currentList[existingIdx],
              score,
              className: clsName,
              schoolYear: yr,
              updatedAt: now,
            };
          } else {
            currentList.push({
              id: `mg_${studentId}_${month}_${Math.random().toString(36).substring(2, 7)}`,
              className: clsName,
              schoolYear: yr,
              month,
              studentId,
              subject: cleanSub,
              score,
              updatedAt: now,
            });
          }
        } else if (existingIdx >= 0 && (score === undefined || isNaN(score as any))) {
          currentList.splice(existingIdx, 1);
        }
      });

      return {
        ...prev,
        academicGrades: currentList,
      };
    });
    showToast('Đã lưu điểm học tập của học sinh');
  };

  // Page titles
  const pageTitles: Record<string, string> = {
    dashboard: 'Tổng quan Lớp học',
    board: 'Bảng tin & Sơ đồ lớp',
    students: 'Danh sách & Quản lý Học sinh',
    academics: 'Học tập - Bảng điểm tháng',
    attendance: 'Điểm danh Chuyên cần',
    settings: 'Cài đặt Hệ thống',
    profile: 'Hồ sơ cá nhân học sinh',
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans text-gray-800">
      {/* 1. Login Modal if unauthenticated */}
      {!authRole && (
        <LoginModal
          appName={state.config.appName}
          teacherPassword={state.config.teacherPassword}
          students={state.students}
          onLoginTeacher={handleLoginTeacher}
          onLoginStudent={handleLoginStudent}
        />
      )}

      {/* 2. Authenticated layout (Teacher or Student) */}
      {authRole && (
        <>
          <Sidebar
            currentView={currentView}
            onNavigate={(view) => setCurrentView(view)}
            className={state.config.className}
            classAvatar={state.config.classAvatar}
            teacherName={state.config.teacherName}
            isTeacher={authRole === 'teacher'}
            studentName={state.students.find((s) => s.id === authStudentId)?.name}
            onUpdateClassAvatar={(base64) =>
              handleUpdateConfig({ classAvatar: base64 })
            }
            onOpenClassSwitch={() => setIsClassSwitchOpen(true)}
            onLogout={handleLogout}
            isMobileOpen={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
            onOpenChangePassword={() => setIsTeacherPasswordModalOpen(true)}
            onOpenMyProfile={() => {
              if (authStudentId) handleOpenStudentProfile(authStudentId);
            }}
            syncStatus={syncStatus}
          />

          <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
            {/* Slim mobile-only bar to open drawer (strictly on mobile, hidden on md+) */}
            <div className="md:hidden h-11 bg-white border-b border-gray-200 flex items-center justify-between px-3 shrink-0 z-20">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 -ml-1 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2 text-xs font-bold cursor-pointer"
                aria-label="Mở menu"
              >
                <Menu className="w-5 h-5 text-gray-700" />
                <span className="font-black text-gray-900">Lớp {state.config.className}</span>
              </button>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus.isTableReady ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[11px] font-bold text-gray-500">
                  {pageTitles[currentView] || 'Trợ lý'}
                </span>
              </div>
            </div>

            {/* Main content viewport: expands to bottom without wasted top header */}
            <main className="flex-1 min-h-0 flex flex-col overflow-hidden p-2 sm:p-3 lg:p-4 bg-gray-50/60">
              {authRole === 'teacher' && currentView === 'dashboard' && (
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  <DashboardView
                    state={state}
                    isTeacher={authRole === 'teacher'}
                    currentStudentId={authStudentId}
                    onSelectStudent={(id) => handleOpenStudentProfile(id)}
                    onNavigate={(view) => setCurrentView(view)}
                    onShowToast={showToast}
                  />
                </div>
              )}

              {authRole === 'teacher' && currentView === 'students' && (
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  <StudentsView
                    state={state}
                    onSelectStudent={(id) => handleOpenStudentProfile(id)}
                    onAddStudent={handleAddStudent}
                    onUpdateStudent={handleUpdateStudent}
                    onDeleteStudent={handleDeleteStudent}
                    onBatchImportStudents={handleBatchImportStudents}
                    onRemoveSampleStudents={handleRemoveSampleStudents}
                    onClearAllStudents={handleClearAllStudents}
                    isTeacher={authRole === 'teacher'}
                    currentStudentId={authStudentId}
                    onShowToast={showToast}
                  />
                </div>
              )}

              {authRole === 'teacher' && currentView === 'academics' && (
                <AcademicsView
                  state={state}
                  isTeacher={authRole === 'teacher'}
                  currentStudentId={authStudentId}
                  onUpdateAcademicGrades={handleUpdateAcademicGrades}
                  onUpdateConfig={handleUpdateConfig}
                  onPublishHonors={handlePublishAcademicHonors}
                  onSelectStudent={(id, month) => handleOpenStudentProfile(id, month)}
                  onDeleteMonthlyGrades={handleDeleteMonthlyGrades}
                  onRestoreMonthlyGrades={handleRestoreMonthlyGrades}
                  onShowToast={showToast}
                />
              )}

              {authRole === 'teacher' && currentView === 'attendance' && (
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  <AttendanceView
                    state={state}
                    onUpdateAttendanceStatus={handleUpdateAttendanceStatus}
                    onMarkAllPresent={handleMarkAllPresent}
                    onDeleteAttendanceByDate={handleResetStudentAttendance}
                    onSaveNotice={() => showToast('Đã lưu dữ liệu điểm danh')}
                    onSelectStudent={(id) => handleOpenStudentProfile(id)}
                    isTeacher={authRole === 'teacher'}
                    currentStudentId={authStudentId}
                    onShowToast={showToast}
                  />
                </div>
              )}

              {(currentView === 'board' ||
                currentView === 'board_notices' ||
                currentView === 'board_seating') && (
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  <BoardView
                    state={state}
                    initialTab={
                      currentView === 'board_seating' ? 'seating' : 'notices'
                    }
                    onAddNotice={handleAddNotice}
                    onDeleteNotice={handleDeleteNotice}
                    onUpdateNotice={handleUpdateNotice}
                    onUpdateSeatingChart={handleUpdateSeatingChart}
                    onUpdateSeatingLayout={handleUpdateSeatingLayout}
                    onSelectStudent={(id: string, month?: string) => handleOpenStudentProfile(id, month)}
                    isTeacher={authRole === 'teacher'}
                    currentStudentId={authStudentId}
                    onPublishHonors={handlePublishAcademicHonors}
                    onShowToast={showToast}
                  />
                </div>
              )}

              {authRole === 'teacher' && currentView === 'settings' && (
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  <SettingsView
                    state={state}
                    onUpdateConfig={handleUpdateConfig}
                    onResetData={handleResetData}
                    onClearAllData={handleClearAllData}
                    onImportBackup={handleImportBackup}
                    onShowToast={showToast}
                    syncStatus={syncStatus}
                    onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
                  />
                </div>
              )}
            </main>
          </div>

          {/* Quick Class & Year Switch Modal */}
          {authRole === 'teacher' && (
            <ClassSwitchModal
              isOpen={isClassSwitchOpen}
              currentClass={state.config.className}
              currentYear={state.config.schoolYear}
              teacherName={state.config.teacherName}
              availableClasses={state.config.availableClasses || [state.config.className]}
              onSave={handleSaveClassSwitch}
              onClose={() => setIsClassSwitchOpen(false)}
            />
          )}

          {/* Teacher Change Password Modal */}
          <ChangePasswordModal
            isOpen={isTeacherPasswordModalOpen}
            title="Đổi Mật khẩu Quản lý Giáo viên"
            description="Cập nhật mật khẩu để bảo vệ hệ thống quản lý lớp học"
            currentPassword={state.config.teacherPassword}
            onSave={(newPass) => {
              handleUpdateConfig({ teacherPassword: newPass });
              showToast('Đã đổi mật khẩu giáo viên thành công!');
            }}
            onClose={() => setIsTeacherPasswordModalOpen(false)}
          />

          {/* Supabase Cloud Connection & Sync Modal */}
          <SupabaseModal
            isOpen={isSupabaseModalOpen}
            syncStatus={syncStatus}
            onCheckConnection={handleCheckSupabaseConnection}
            onSyncNow={handleSyncNow}
            onPullRemote={handlePullRemote}
            onClose={() => setIsSupabaseModalOpen(false)}
          />

          {/* Student Profile Modal (Accessible by Teacher for any student, or Student for self) */}
          {selectedStudentId && (
            <StudentProfileModal
              studentId={selectedStudentId}
              state={state}
              isTeacher={authRole === 'teacher'}
              initialMonth={selectedStudentMonth || undefined}
              initialYear={selectedStudentYear || undefined}
              onClose={() => {
                setSelectedStudentId(null);
                setSelectedStudentMonth(null);
                setSelectedStudentYear(null);
                if (authRole === 'student') {
                  setCurrentView('board');
                }
              }}
              onEditStudent={(s) => {
                setSelectedStudentId(null);
                setCurrentView('students');
              }}
              onUpdateAvatar={handleUpdateAvatar}
              onSaveGrades={handleSaveGrades}
              onSaveAcademicGrades={handleSaveStudentAcademicGrades}
              onAddDiscipline={handleAddDiscipline}
              onDeleteDiscipline={handleDeleteDiscipline}
              onDeleteAttendance={handleDeleteAttendance}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onChangePassword={handleChangePassword}
              onLogout={handleLogout}
              onShowToast={showToast}
            />
          )}
        </>
      )}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-semibold pointer-events-auto animate-fadeIn ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
