import React, { useState, useMemo } from 'react';
import {
  Search,
  List,
  LayoutGrid,
  FileSpreadsheet,
  UserPlus,
  Edit2,
  Trash2,
  Download,
  AlertTriangle,
  Award,
  Phone,
  FolderOpen,
  Lock,
  UserCheck,
} from 'lucide-react';
import { AppState, Gender, Student } from '../types';
import {
  exportStudentsToExcel,
  formatDisplayDate,
  getTodayStr,
} from '../utils/helpers';
import { StudentFormModal } from './StudentFormModal';
import { ExcelImportModal } from './ExcelImportModal';
import { ConfirmModal } from './ConfirmModal';

interface StudentsViewProps {
  state: AppState;
  onSelectStudent: (studentId: string) => void;
  onAddStudent: (newStudent: Partial<Student>) => void;
  onUpdateStudent: (student: Partial<Student>) => void;
  onDeleteStudent: (studentId: string) => void;
  onBatchImportStudents: (newStudents: Student[]) => void;
  isTeacher: boolean;
  currentStudentId?: string | null;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  state,
  onSelectStudent,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBatchImportStudents,
  isTeacher,
  currentStudentId,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | Gender>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const today = getTodayStr();

  const handleStudentClick = (studentId: string) => {
    if (isTeacher || studentId === currentStudentId) {
      onSelectStudent(studentId);
    } else {
      onShowToast?.('Bảo mật: Bạn chỉ có quyền xem chi tiết hồ sơ của chính mình!', 'error');
    }
  };

  // Filtered & sorted students
  const filteredStudents = useMemo(() => {
    let result = [...state.students];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)) ||
          (s.parentName && s.parentName.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
      );
    }

    if (genderFilter !== 'all') {
      result = result.filter((s) => s.gender === genderFilter);
    }

    // Sort by Vietnamese first name (last word)
    return result.sort((a, b) => {
      const nameA = a.name.trim().split(' ').pop() || '';
      const nameB = b.name.trim().split(' ').pop() || '';
      return nameA.localeCompare(nameB, 'vi');
    });
  }, [state.students, searchTerm, genderFilter]);

  const handleOpenAdd = () => {
    setStudentToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setStudentToEdit(student);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    setStudentToDelete(student);
  };

  const handleConfirmDelete = () => {
    if (studentToDelete) {
      onDeleteStudent(studentToDelete.id);
      setStudentToDelete(null);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-full flex flex-col pb-10 animate-fadeIn">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row justify-between gap-3 bg-white p-4 rounded-3xl shadow-xs border border-gray-100 shrink-0">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên học sinh, số điện thoại, mã ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xs sm:text-sm font-medium"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as 'all' | Gender)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
          >
            <option value="all">Tất cả giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>

          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white shadow-xs text-blue-600'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Dạng thẻ (Grid)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white shadow-xs text-blue-600'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
              title="Dạng bảng (List)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Export Excel */}
          <button
            onClick={() => exportStudentsToExcel(state.students, state.config.className)}
            className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs sm:text-sm border border-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Xuất file Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          {isTeacher && (
            <>
              {/* Import Excel */}
              <button
                onClick={() => setIsExcelOpen(true)}
                className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs sm:text-sm border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Nhập Excel</span>
              </button>

              {/* Add Student */}
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-blue-200 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Thêm HS</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content: List or Grid */}
      <div className="flex-1 overflow-y-auto bg-white rounded-3xl shadow-xs border border-gray-100 p-4 relative min-h-[400px]">
        {filteredStudents.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <FolderOpen className="w-16 h-16 text-gray-200 mb-3" />
            <p className="text-base font-semibold text-gray-600">
              Không tìm thấy học sinh nào
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Thử tìm kiếm với từ khóa khác hoặc bấm "Thêm HS" để tạo mới.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredStudents.map((s) => {
              const vios = state.discipline.filter(
                (d) => d.studentId === s.id && d.type === 'minus'
              ).length;
              const rews = state.discipline.filter(
                (d) => d.studentId === s.id && d.type === 'plus'
              ).length;

              const attToday = state.attendance.find(
                (a) => a.studentId === s.id && a.date === today
              );

              const isSelf = s.id === currentStudentId;

              return (
                <div
                  key={s.id}
                  onClick={() => handleStudentClick(s.id)}
                  className={`bg-white border rounded-2xl p-4 flex flex-col items-center text-center transition-all cursor-pointer relative group overflow-hidden ${
                    isSelf
                      ? 'border-emerald-400 ring-2 ring-emerald-200/70 shadow-sm'
                      : !isTeacher
                      ? 'border-gray-200 hover:border-amber-300'
                      : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                  }`}
                >
                  {/* Student Mode Badge: Self vs Classmate */}
                  {!isTeacher && (
                    <div className="absolute top-2 left-2">
                      {isSelf ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shadow-2xs">
                          <UserCheck className="w-3 h-3 text-emerald-600" /> Bạn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-semibold" title="Chỉ xem thông tin cơ bản">
                          <Lock className="w-2.5 h-2.5 text-gray-400" />
                        </span>
                      )}
                    </div>
                  )}

                  {/* Warning banner if high violations (Teacher only) */}
                  {isTeacher && vios >= 2 && (
                    <div
                      className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-xl text-[10px]"
                      title="Nhiều vi phạm"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Avatar */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mb-3 shadow-xs overflow-hidden group-hover:scale-105 transition-transform ${
                    isSelf ? 'bg-emerald-50 border-2 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-2 border-blue-100 text-blue-700'
                  }`}>
                    {s.avatar ? (
                      <img
                        src={s.avatar}
                        alt={s.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      s.name.charAt(0)
                    )}
                  </div>

                  {/* Name */}
                  <h4
                    className="font-bold text-gray-900 text-xs sm:text-sm mb-1 group-hover:text-blue-600 transition-colors uppercase w-full truncate"
                    title={s.name}
                  >
                    {s.name}
                  </h4>

                  <div className="text-[11px] text-gray-500 mb-3 flex items-center justify-center gap-1.5 flex-wrap">
                    <span
                      className={`font-semibold ${
                        s.gender === 'Nam' ? 'text-blue-600' : 'text-pink-600'
                      }`}
                    >
                      {s.gender}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span>{formatDisplayDate(s.dob)}</span>
                  </div>

                  {/* Attendance status today */}
                  <div className="mt-auto w-full pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <div className="font-semibold">
                      {attToday?.status === 'c' && (
                        <span className="text-emerald-600">Có mặt</span>
                      )}
                      {attToday?.status === 'v' && (
                        <span className="text-blue-600">Có phép</span>
                      )}
                      {attToday?.status === 'kp' && (
                        <span className="text-red-600 font-bold">Không phép</span>
                      )}
                      {attToday?.status === 'm' && (
                        <span className="text-amber-600 font-bold">Muộn</span>
                      )}
                      {!attToday && <span className="text-gray-400">Chưa ĐD</span>}
                    </div>

                    <div className="flex items-center gap-1.5 font-bold">
                      {rews > 0 && (
                        <span className="text-emerald-600 flex items-center gap-0.5" title="Khen thưởng">
                          <Award className="w-3 h-3" /> {rews}
                        </span>
                      )}
                      {vios > 0 && (
                        <span className="text-red-500 flex items-center gap-0.5" title="Vi phạm">
                          <AlertTriangle className="w-3 h-3" /> {vios}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider w-14 text-center">
                    STT
                  </th>
                  <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider">
                    Học sinh
                  </th>
                  <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider w-24">
                    Giới tính
                  </th>
                  <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider w-32">
                    Ngày sinh
                  </th>
                  <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Phụ huynh &amp; Liên hệ
                  </th>
                  {isTeacher && (
                    <th className="px-4 py-3 font-bold text-gray-500 uppercase tracking-wider w-28 text-center">
                      Thao tác
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredStudents.map((s, index) => {
                  const isSelf = s.id === currentStudentId;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => handleStudentClick(s.id)}
                      className={`transition-colors cursor-pointer group ${
                        isSelf
                          ? 'bg-emerald-50/60 hover:bg-emerald-100/50'
                          : 'hover:bg-blue-50/50'
                      }`}
                    >
                      <td className="px-4 py-3 text-center text-gray-400 font-semibold group-hover:text-blue-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 overflow-hidden ${
                            isSelf ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {s.avatar ? (
                              <img
                                src={s.avatar}
                                alt={s.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              s.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-blue-700 uppercase flex items-center gap-1.5">
                              <span>{s.name}</span>
                              {!isTeacher && isSelf && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  <UserCheck className="w-3 h-3" /> Bạn
                                </span>
                              )}
                              {!isTeacher && !isSelf && (
                                <span title="Hồ sơ riêng tư">
                                  <Lock className="w-3 h-3 text-gray-300" />
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono">
                              ID: {s.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            s.gender === 'Nam' ? 'text-blue-600' : 'text-pink-600'
                          }`}
                        >
                          {s.gender}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDisplayDate(s.dob)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {isTeacher || isSelf ? (
                          <>
                            <p className="text-gray-800 font-medium">
                              {s.parentName || '-'}
                            </p>
                            {s.phone && (
                              <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-gray-400" /> {s.phone}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Riêng tư (Chỉ GV &amp; Bạn)</span>
                        )}
                      </td>
                    {isTeacher && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={(e) => handleOpenEdit(s, e)}
                            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-blue-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleOpenDelete(s, e)}
                            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-100 text-gray-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <StudentFormModal
        isOpen={isFormOpen}
        studentToEdit={studentToEdit}
        existingStudents={state.students}
        onSave={(data) => {
          if (studentToEdit) {
            onUpdateStudent(data);
          } else {
            onAddStudent(data);
          }
        }}
        onClose={() => setIsFormOpen(false)}
      />

      <ExcelImportModal
        isOpen={isExcelOpen}
        existingStudents={state.students}
        onImport={onBatchImportStudents}
        onClose={() => setIsExcelOpen(false)}
      />

      <ConfirmModal
        isOpen={!!studentToDelete}
        title="Xác nhận xóa học sinh"
        message={`Bạn có chắc muốn xóa học sinh "${studentToDelete?.name}"? Mọi thông tin điểm số, điểm danh và vi phạm của học sinh này sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa học sinh"
        onConfirm={handleConfirmDelete}
        onCancel={() => setStudentToDelete(null)}
      />
    </div>
  );
};
