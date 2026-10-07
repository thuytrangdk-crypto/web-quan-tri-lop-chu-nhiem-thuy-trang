import React, { useState, useEffect } from 'react';
import {
  AppState,
  AttendanceStatus,
  BoardNotice,
  DisciplineRecord,
  NoteRecord,
  Student,
  UserRole,
} from './types';
import { DEFAULT_INITIAL_STATE } from './defaultData';
import { generateId, getTodayStr } from './utils/helpers';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { AttendanceView } from './components/AttendanceView';
import { BoardView } from './components/BoardView';
import { SettingsView } from './components/SettingsView';
import { StudentProfileModal } from './components/StudentProfileModal';
import { ClassSwitchModal } from './components/ClassSwitchModal';
import { SupabaseModal } from './components/SupabaseModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { supabaseService, SyncStatus } from './services/supabaseService';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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
          };
        }
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
    return DEFAULT_INITIAL_STATE;
  });

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

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
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
        if (remoteState && remoteState.students) {
          setState((prev) => ({
            ...prev,
            ...remoteState,
            config: {
              ...prev.config,
              ...remoteState.config,
            },
          }));
          setSyncStatus((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
          }));
        }

        // Subscribe to real-time changes from other tabs or devices
        unsubscribe = supabaseService.subscribe((updatedRemote) => {
          if (updatedRemote && updatedRemote.students) {
            setState((prev) => ({
              ...prev,
              ...updatedRemote,
            }));
            setSyncStatus((prev) => ({
              ...prev,
              lastSyncedAt: new Date().toLocaleTimeString('vi-VN'),
            }));
          }
        });
      }
    };

    initSupabase();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Debounced auto-save to Supabase when state changes
  useEffect(() => {
    if (!syncStatus.isTableReady) return;

    const timer = setTimeout(async () => {
      setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
      const res = await supabaseService.saveState(state);
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: res.success
          ? new Date().toLocaleTimeString('vi-VN')
          : prev.lastSyncedAt,
        errorMessage: res.error || null,
      }));
    }, 1500);

    return () => clearTimeout(timer);
  }, [state, syncStatus.isTableReady]);

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

  const handleSaveClassSwitch = (data: {
    className: string;
    schoolYear: string;
    teacherName: string;
    availableClasses: string[];
  }) => {
    setState((prev) => ({
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
    setState((prev) => ({
      ...prev,
      seatingChart: newChart,
    }));
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
    setSelectedStudentId(studentId);
    sessionStorage.setItem(
      SESSION_AUTH_KEY,
      JSON.stringify({ role: 'student', id: studentId })
    );
    const s = state.students.find((x) => x.id === studentId);
    showToast(`Xin chào học sinh ${s ? s.name : ''}`);
  };

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
    setState((prev) => ({
      ...prev,
      students: [...prev.students, newStudent],
    }));
    showToast(`Đã thêm học sinh: ${newStudent.name}`);
  };

  const handleUpdateStudent = (studentData: Partial<Student>) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentData.id ? ({ ...s, ...studentData } as Student) : s
      ),
    }));
    showToast('Đã cập nhật thông tin học sinh');
  };

  const handleDeleteStudent = (studentId: string) => {
    setState((prev) => ({
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

  const handleBatchImportStudents = (
    newStudents: Student[],
    mode: 'append' | 'replace' = 'append'
  ) => {
    setState((prev) => {
      let updatedStudents: Student[];
      let updatedAttendance = prev.attendance;
      let updatedDiscipline = prev.discipline;
      let updatedNotes = prev.notes;

      if (mode === 'replace') {
        updatedStudents = newStudents;
        const newIds = new Set(newStudents.map((s) => s.id));
        updatedAttendance = prev.attendance.filter((a) => newIds.has(a.studentId));
        updatedDiscipline = prev.discipline.filter((d) => newIds.has(d.studentId));
        updatedNotes = prev.notes.filter((n) => newIds.has(n.studentId));
      } else {
        updatedStudents = [...prev.students, ...newStudents];
      }

      return {
        ...prev,
        students: updatedStudents,
        attendance: updatedAttendance,
        discipline: updatedDiscipline,
        notes: updatedNotes,
      };
    });

    showToast(
      mode === 'replace'
        ? `Đã thay thế toàn bộ danh sách: ${newStudents.length} học sinh`
        : `Đã nhập thành công ${newStudents.length} học sinh vào lớp`
    );
  };

  const handleUpdateAvatar = (studentId: string, base64: string) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, avatar: base64 } : s
      ),
    }));
  };

  const handleSaveGrades = (studentId: string, grades: Record<string, number>) => {
    setState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, grades } : s
      ),
    }));
  };

  const handleChangePassword = (studentId: string, newPass: string) => {
    setState((prev) => ({
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
    setState((prev) => {
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
    setState((prev) => {
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

    setState((prev) => {
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
    setState((prev) => ({
      ...prev,
      discipline: prev.discipline.filter((d) => d.id !== recordId),
    }));
  };

  // Notes Handlers
  const handleAddNote = (record: Omit<NoteRecord, 'id'>) => {
    const newNote: NoteRecord = {
      ...record,
      id: generateId(),
    };
    setState((prev) => ({
      ...prev,
      notes: [...prev.notes, newNote],
    }));
  };

  const handleDeleteNote = (noteId: string) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
    }));
  };

  // Board Notices Handlers
  const handleAddNotice = (notice: Omit<BoardNotice, 'id'>) => {
    const newNotice: BoardNotice = {
      ...notice,
      id: generateId(),
    };
    setState((prev) => ({
      ...prev,
      boardNotices: [...prev.boardNotices, newNotice],
    }));
    showToast('Đã đăng thông báo mới lên bảng tin');
  };

  const handleDeleteNotice = (noticeId: string) => {
    setState((prev) => ({
      ...prev,
      boardNotices: prev.boardNotices.filter((n) => n.id !== noticeId),
    }));
    showToast('Đã xóa thông báo');
  };

  // Config & Reset Handlers
  const handleUpdateConfig = (newConfig: Partial<AppState['config']>) => {
    setState((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        ...newConfig,
      },
    }));
  };

  const handleResetData = () => {
    setState(DEFAULT_INITIAL_STATE);
  };

  const handleClearAllData = () => {
    setState({
      config: DEFAULT_INITIAL_STATE.config,
      students: [],
      attendance: [],
      discipline: [],
      notes: [],
      boardNotices: [],
    });
  };

  const handleImportBackup = (backupState: AppState) => {
    setState(backupState);
  };

  // Page titles
  const pageTitles: Record<string, string> = {
    dashboard: 'Tổng quan Lớp học',
    board: 'Bảng tin & Vinh danh Thi đua',
    students: 'Danh sách & Quản lý Học sinh',
    attendance: 'Điểm danh Chuyên cần',
    settings: 'Cài đặt Hệ thống',
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
              if (authStudentId) setSelectedStudentId(authStudentId);
            }}
            syncStatus={syncStatus}
          />

          <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <Header
              title={pageTitles[currentView] || 'Trợ lý chủ nhiệm'}
              className={state.config.className}
              teacherName={state.config.teacherName}
              isTeacher={authRole === 'teacher'}
              studentName={state.students.find((s) => s.id === authStudentId)?.name}
              syncStatus={syncStatus}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
              onOpenClassSwitch={() => setIsClassSwitchOpen(true)}
              onGoHome={() => setCurrentView('dashboard')}
              onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
              onOpenChangePassword={() => setIsTeacherPasswordModalOpen(true)}
              onOpenMyProfile={() => {
                if (authStudentId) setSelectedStudentId(authStudentId);
              }}
              onLogout={handleLogout}
            />

            <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50/60 custom-scrollbar">
              {currentView === 'dashboard' && (
                <DashboardView
                  state={state}
                  isTeacher={authRole === 'teacher'}
                  currentStudentId={authStudentId}
                  onSelectStudent={(id) => {
                    if (authRole === 'teacher' || id === authStudentId) {
                      setSelectedStudentId(id);
                    } else {
                      showToast('Bảo mật: Bạn chỉ có thể xem hồ sơ của chính mình!', 'error');
                    }
                  }}
                  onNavigate={(view) => setCurrentView(view)}
                  onShowToast={showToast}
                />
              )}

              {currentView === 'students' && (
                <StudentsView
                  state={state}
                  onSelectStudent={(id) => {
                    if (authRole === 'teacher' || id === authStudentId) {
                      setSelectedStudentId(id);
                    } else {
                      showToast('Bảo mật: Bạn chỉ có quyền xem chi tiết hồ sơ của chính mình!', 'error');
                    }
                  }}
                  onAddStudent={handleAddStudent}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onBatchImportStudents={handleBatchImportStudents}
                  isTeacher={authRole === 'teacher'}
                  currentStudentId={authStudentId}
                  onShowToast={showToast}
                />
              )}

              {currentView === 'attendance' && (
                <AttendanceView
                  state={state}
                  onUpdateAttendanceStatus={handleUpdateAttendanceStatus}
                  onMarkAllPresent={handleMarkAllPresent}
                  onSaveNotice={() => showToast('Đã lưu dữ liệu điểm danh')}
                  onSelectStudent={(id) => {
                    if (authRole === 'teacher' || id === authStudentId) {
                      setSelectedStudentId(id);
                    } else {
                      showToast('Bảo mật: Bạn chỉ có thể xem hồ sơ của chính mình!', 'error');
                    }
                  }}
                  isTeacher={authRole === 'teacher'}
                  currentStudentId={authStudentId}
                  onShowToast={showToast}
                />
              )}

              {currentView === 'board' && (
                <BoardView
                  state={state}
                  onAddNotice={handleAddNotice}
                  onDeleteNotice={handleDeleteNotice}
                  onUpdateSeatingChart={handleUpdateSeatingChart}
                  onSelectStudent={(id) => {
                    if (authRole === 'teacher' || id === authStudentId) {
                      setSelectedStudentId(id);
                    } else {
                      showToast('Bảo mật: Bạn chỉ có thể xem hồ sơ của chính mình!', 'error');
                    }
                  }}
                  isTeacher={authRole === 'teacher'}
                  onShowToast={showToast}
                />
              )}

              {authRole === 'teacher' && currentView === 'settings' && (
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
              availableClasses={state.config.availableClasses || ['9A5', '8A3', '7A1', '6A2']}
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
              onClose={() => setSelectedStudentId(null)}
              onEditStudent={(s) => {
                setSelectedStudentId(null);
                setCurrentView('students');
              }}
              onUpdateAvatar={handleUpdateAvatar}
              onSaveGrades={handleSaveGrades}
              onAddDiscipline={handleAddDiscipline}
              onDeleteDiscipline={handleDeleteDiscipline}
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
