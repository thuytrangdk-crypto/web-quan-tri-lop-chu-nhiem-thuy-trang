import React, { useState } from 'react';
import { X, School, Calendar, Check, Plus, User } from 'lucide-react';

interface ClassSwitchModalProps {
  isOpen: boolean;
  currentClass: string;
  currentYear: string;
  teacherName: string;
  availableClasses: string[];
  onSave: (data: { className: string; schoolYear: string; teacherName: string; availableClasses: string[] }) => void;
  onClose: () => void;
}

export const ClassSwitchModal: React.FC<ClassSwitchModalProps> = ({
  isOpen,
  currentClass,
  currentYear,
  teacherName,
  availableClasses,
  onSave,
  onClose,
}) => {
  const [selectedClass, setSelectedClass] = useState(currentClass);
  const [newClassName, setNewClassName] = useState('');
  const [schoolYear, setSchoolYear] = useState(currentYear);
  const [teacher, setTeacher] = useState(teacherName);
  const [classList, setClassList] = useState<string[]>(
    availableClasses.length > 0 ? availableClasses : [currentClass, '9A5', '8A3', '7A1', '6A2']
  );

  if (!isOpen) return null;

  const handleAddNewClass = () => {
    const trimmed = newClassName.trim().toUpperCase();
    if (trimmed && !classList.includes(trimmed)) {
      const updated = [...classList, trimmed];
      setClassList(updated);
      setSelectedClass(trimmed);
      setNewClassName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      className: selectedClass.trim() || currentClass,
      schoolYear: schoolYear.trim() || currentYear,
      teacherName: teacher.trim() || teacherName,
      availableClasses: classList,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                Thay đổi Lớp &amp; Năm học
              </h3>
              <p className="text-[11px] text-gray-400">
                Chuyển đổi lớp chủ nhiệm hoặc cập nhật năm học
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 flex items-center justify-center cursor-pointer border border-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick select class */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Chọn Lớp chủ nhiệm
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {classList.map((cls) => {
                const isSelected = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span>Lớp {cls}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>

            {/* Add new class name */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Nhập tên lớp khác (VD: 9A1)..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
              <button
                type="button"
                onClick={handleAddNewClass}
                className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>
          </div>

          {/* School Year */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Năm học
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="2026-2027"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Teacher name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Giáo viên chủ nhiệm (GVCN)
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="Nguyễn Thị Diễm Hương"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md cursor-pointer"
            >
              Áp dụng thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
