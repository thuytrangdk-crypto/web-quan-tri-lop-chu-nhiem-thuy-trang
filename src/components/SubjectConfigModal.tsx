import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, BookOpen, AlertCircle, Save } from 'lucide-react';
import { AppConfig } from '../types';

interface SubjectConfigModalProps {
  isOpen: boolean;
  config: AppConfig;
  onSaveSubjects: (newSubjects: string[], newEvalSubjects: string[]) => void;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const SubjectConfigModal: React.FC<SubjectConfigModalProps> = ({
  isOpen,
  config,
  onSaveSubjects,
  onClose,
  onShowToast,
}) => {
  if (!isOpen) return null;

  const [subjectsList, setSubjectsList] = useState<string[]>([...config.subjects]);
  const [evalSubjects, setEvalSubjects] = useState<string[]>([
    ...(config.evaluationSubjects || []),
  ]);
  const [newSubjectInput, setNewSubjectInput] = useState('');

  const handleAddSubject = () => {
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;
    if (subjectsList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      onShowToast?.(`Môn "${trimmed}" đã tồn tại trong danh sách!`, 'error');
      return;
    }
    setSubjectsList((prev) => [...prev, trimmed]);
    setNewSubjectInput('');
  };

  const handleRemoveSubject = (sub: string) => {
    setSubjectsList((prev) => prev.filter((s) => s !== sub));
    setEvalSubjects((prev) => prev.filter((s) => s !== sub));
  };

  const handleToggleEval = (sub: string) => {
    setEvalSubjects((prev) => {
      if (prev.includes(sub)) {
        return prev.filter((s) => s !== sub);
      } else {
        return [...prev, sub];
      }
    });
  };

  const handleSave = () => {
    if (subjectsList.length === 0) {
      onShowToast?.('Danh sách môn học không được để trống!', 'error');
      return;
    }
    onSaveSubjects(subjectsList, evalSubjects);
    onShowToast?.('Đã lưu cấu hình danh sách môn học thành công!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Cấu Hình Môn Học Lớp {config.className}
              </h3>
              <p className="text-xs text-gray-500">
                Chọn môn tính điểm số hoặc môn đánh giá nhận xét
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center border border-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {/* Add Subject Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Thêm môn học mới:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectInput}
                onChange={(e) => setNewSubjectInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                placeholder="Nhập tên môn học (ví dụ: Tin học, GDĐP...)"
                className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm</span>
              </button>
            </div>
          </div>

          {/* Subjects List */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase">
              Danh sách môn học của lớp ({subjectsList.length} môn):
            </label>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {subjectsList.map((sub) => {
                const isEval = evalSubjects.includes(sub);
                return (
                  <div
                    key={sub}
                    className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-200/80 hover:bg-gray-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-gray-800">{sub}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Toggle Evaluation Only */}
                      <button
                        type="button"
                        onClick={() => handleToggleEval(sub)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isEval
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                        title="Bấm để chuyển chế độ tính điểm / nhận xét"
                      >
                        {isEval ? 'Đánh giá nhận xét (k tính ĐTB)' : 'Chấm điểm số (0 - 10)'}
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSubject(sub)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa môn này khỏi lớp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-800 leading-relaxed">
            <strong>Ghi chú:</strong> Các môn được đánh dấu là <em>“Đánh giá nhận xét”</em> sẽ không được đưa vào phép tính trung bình cộng (ĐTB) của học sinh.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm border border-gray-200 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-blue-200 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu cấu hình</span>
          </button>
        </div>
      </div>
    </div>
  );
};
