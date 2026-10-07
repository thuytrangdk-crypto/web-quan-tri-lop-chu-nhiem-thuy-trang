import React, { useState } from 'react';
import { X, Megaphone, Info, AlertTriangle, Sparkles } from 'lucide-react';
import { NoticeType } from '../types';

interface BoardNoticeModalProps {
  isOpen: boolean;
  onSave: (title: string, content: string, type: NoticeType) => void;
  onClose: () => void;
}

export const BoardNoticeModal: React.FC<BoardNoticeModalProps> = ({
  isOpen,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoticeType>('info');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave(title.trim(), content.trim(), type);
    setTitle('');
    setContent('');
    setType('info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Đăng thông báo lớp học
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center border border-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Tiêu đề thông báo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Lịch thi giữa kỳ I, Thông báo họp phụ huynh..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Nội dung thông báo <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chi tiết thông báo đến học sinh và phụ huynh..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Phân loại tính chất
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('info')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  type === 'info'
                    ? 'bg-blue-50 text-blue-700 border-blue-400 ring-2 ring-blue-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Info className="w-4 h-4 text-blue-500" />
                <span>Thông tin</span>
              </button>

              <button
                type="button"
                onClick={() => setType('warning')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  type === 'warning'
                    ? 'bg-amber-50 text-amber-700 border-amber-400 ring-2 ring-amber-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Nhắc nhở</span>
              </button>

              <button
                type="button"
                onClick={() => setType('success')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-400 ring-2 ring-emerald-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Khen thưởng</span>
              </button>
            </div>
          </div>

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
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-indigo-200 transition-all cursor-pointer"
            >
              Đăng tin ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
