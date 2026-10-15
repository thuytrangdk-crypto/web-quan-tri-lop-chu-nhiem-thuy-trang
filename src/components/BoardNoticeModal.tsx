import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Megaphone,
  Info,
  AlertTriangle,
  Sparkles,
  Edit3,
  Trash2,
  Calendar,
  Save,
  Image as ImageIcon,
  Upload,
  Link2,
} from 'lucide-react';
import { BoardNotice, NoticeType } from '../types';
import { getTodayStr, resizeImageBase64 } from '../utils/helpers';

interface BoardNoticeModalProps {
  isOpen: boolean;
  initialNotice?: BoardNotice | null;
  onSave: (
    title: string,
    content: string,
    type: NoticeType,
    noticeId?: string,
    date?: string,
    image?: string
  ) => void;
  onDelete?: (noticeId: string) => void;
  onClose: () => void;
}

export const BoardNoticeModal: React.FC<BoardNoticeModalProps> = ({
  isOpen,
  initialNotice,
  onSave,
  onDelete,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NoticeType>('info');
  const [date, setDate] = useState(getTodayStr());
  const [image, setImage] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialNotice) {
      setTitle(initialNotice.title);
      setContent(initialNotice.content);
      setType(initialNotice.type);
      setDate(initialNotice.date || getTodayStr());
      setImage(initialNotice.image || '');
    } else {
      setTitle('');
      setContent('');
      setType('info');
      setDate(getTodayStr());
      setImage('');
    }
    setShowUrlInput(false);
    setImageUrlInput('');
  }, [initialNotice, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave(
      title.trim(),
      content.trim(),
      type,
      initialNotice?.id,
      date,
      image || undefined
    );
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      resizeImageBase64(file, 1200, 1200, (base64) => {
        setImage(base64);
      });
    }
    e.target.value = '';
  };

  const handleApplyUrl = () => {
    if (imageUrlInput.trim()) {
      setImage(imageUrlInput.trim());
      setShowUrlInput(false);
      setImageUrlInput('');
    }
  };

  const isEditing = !!initialNotice;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-100 bg-gray-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isEditing
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {isEditing ? (
                <Edit3 className="w-4 h-4" />
              ) : (
                <Megaphone className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                {isEditing
                  ? 'Thay đổi thông tin đã đăng'
                  : 'Đăng thông tin mới lên Bảng tin'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {isEditing
                  ? 'Cập nhật nội dung hoặc hình ảnh thông báo'
                  : 'Thông báo sẽ được gửi lên Bảng tin lớp'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Lưu thông báo này"
            >
              <Save className="w-4 h-4" />
              <span>Lưu</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center border border-gray-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Form with Scrollable Content and Sticky Footer */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Scrollable Fields */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Tiêu đề thông tin <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Lịch thi giữa kỳ I, Hoạt động trải nghiệm..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ngày đăng</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs sm:text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Phân loại
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as NoticeType)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs sm:text-sm font-semibold bg-white cursor-pointer"
                >
                  <option value="info">Thông tin</option>
                  <option value="warning">Nhắc nhở</option>
                  <option value="success">Khen thưởng</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Nội dung chi tiết <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chi tiết thông báo/thông tin gửi đến học sinh và phụ huynh..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm leading-relaxed"
              />
            </div>

            {/* Image attachment section */}
            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Hình ảnh đính kèm (ảnh hoạt động, thời khóa biểu...)</span>
                </label>
                {!image && (
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{showUrlInput ? 'Ẩn link' : 'Nhập link ảnh'}</span>
                  </button>
                )}
              </div>

              {/* Upload or Link Input */}
              {!image ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-3 px-4 border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 rounded-xl text-xs font-bold text-blue-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Chọn ảnh từ máy / điện thoại</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {showUrlInput && (
                    <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="Dán đường dẫn ảnh (https://...)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleApplyUrl}
                        className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shrink-0"
                      >
                        Thêm
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Image Preview */
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xs group">
                  <img
                    src={image}
                    alt="Đính kèm thông báo"
                    className="w-full max-h-52 object-contain bg-slate-900/5"
                  />
                  <div className="p-2.5 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Đổi ảnh khác</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa ảnh</span>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Kiểu thông báo
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
          </div>

          {/* Sticky Modal Footer: ALWAYS visible with clear "Lưu" action */}
          <div className="p-4 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (initialNotice) {
                    onDelete(initialNotice.id);
                  }
                }}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-1.5 border border-red-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa tin này</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-blue-200 transition-all cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Lưu thông tin</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
