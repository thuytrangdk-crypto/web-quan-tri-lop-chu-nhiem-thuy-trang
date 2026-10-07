import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Phone, Home, Sparkles } from 'lucide-react';
import { Gender, Student } from '../types';
import { generateStudentId } from '../utils/helpers';

interface StudentFormModalProps {
  isOpen: boolean;
  studentToEdit?: Student | null;
  existingStudents: Student[];
  onSave: (studentData: Partial<Student>) => void;
  onClose: () => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  studentToEdit,
  existingStudents,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<Gender>('Nam');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setName(studentToEdit.name || '');
      setDob(studentToEdit.dob || '');
      setGender(studentToEdit.gender || 'Nam');
      setParentName(studentToEdit.parentName || '');
      setPhone(studentToEdit.phone || '');
      setAddress(studentToEdit.address || '');
    } else {
      setName('');
      setDob('');
      setGender('Nam');
      setParentName('');
      setPhone('');
      setAddress('');
    }
  }, [studentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (studentToEdit) {
      onSave({
        ...studentToEdit,
        name: name.trim(),
        dob,
        gender,
        parentName: parentName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
    } else {
      const newId = generateStudentId(dob, existingStudents);
      onSave({
        id: newId,
        name: name.trim(),
        dob,
        gender,
        parentName: parentName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        avatar: '',
        password: newId,
        grades: {},
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/70">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {studentToEdit ? 'Chỉnh sửa Học sinh' : 'Thêm Học sinh mới'}
            </h3>
            <p className="text-xs text-gray-400">
              {studentToEdit
                ? `Mã học sinh: ${studentToEdit.id}`
                : 'Mã số học sinh (ID) sẽ được tạo tự động theo ngày sinh'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center border border-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Họ và tên học sinh <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: NGUYỄN VĂN AN"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Ngày sinh
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Giới tính
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white cursor-pointer font-medium"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Họ tên phụ huynh
            </label>
            <input
              type="text"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn Ba (Bố)"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Số điện thoại liên hệ
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Địa chỉ thường trú
            </label>
            <div className="relative">
              <Home className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, đường phố, phường/xã, quận/huyện..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {!studentToEdit && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2 text-xs text-blue-700">
              <Sparkles className="w-4 h-4 shrink-0 text-blue-500" />
              <span>
                Mã học sinh (ID) dùng để tra cứu sau này sẽ tự động sinh theo ngày sinh. Mật khẩu mặc định bằng đúng mã ID.
              </span>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-blue-200 transition-all cursor-pointer"
            >
              {studentToEdit ? 'Lưu thay đổi' : 'Thêm học sinh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
