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
  Video as VideoIcon,
  Plus,
  ExternalLink,
  Play,
  FileText,
} from 'lucide-react';
import { BoardNotice, NoticeType } from '../types';
import { getTodayStr, resizeImageBase64 } from '../utils/helpers';
import {
  getYouTubeEmbedUrl,
  getGoogleDriveVideoEmbed,
  isDirectVideoFile,
  sanitizeUrl,
  extractDomain,
} from '../utils/mediaHelpers';

interface BoardNoticeModalProps {
  isOpen: boolean;
  initialNotice?: BoardNotice | null;
  onSave: (
    title: string,
    content: string,
    type: NoticeType,
    noticeId?: string,
    date?: string,
    image?: string,
    images?: string[],
    videoUrl?: string,
    linkUrl?: string,
    linkTitle?: string
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

  // Media state
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');

  // Active media subtab in modal
  const [activeMediaTab, setActiveMediaTab] = useState<'images' | 'video' | 'link'>('images');

  // Input states for adding URL
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialNotice) {
      setTitle(initialNotice.title || '');
      setContent(initialNotice.content || '');
      setType(initialNotice.type || 'info');
      setDate(initialNotice.date || getTodayStr());

      // Normalize images from either images array or legacy single image
      if (initialNotice.images && Array.isArray(initialNotice.images) && initialNotice.images.length > 0) {
        setImages(initialNotice.images);
      } else if (initialNotice.image) {
        setImages([initialNotice.image]);
      } else {
        setImages([]);
      }

      setVideoUrl(initialNotice.videoUrl || '');
      setLinkUrl(initialNotice.linkUrl || '');
      setLinkTitle(initialNotice.linkTitle || '');

      if (initialNotice.videoUrl) {
        setActiveMediaTab('video');
      } else if (initialNotice.linkUrl && (!initialNotice.images || initialNotice.images.length === 0)) {
        setActiveMediaTab('link');
      } else {
        setActiveMediaTab('images');
      }
    } else {
      setTitle('');
      setContent('');
      setType('info');
      setDate(getTodayStr());
      setImages([]);
      setVideoUrl('');
      setLinkUrl('');
      setLinkTitle('');
      setActiveMediaTab('images');
    }
    setImageUrlInput('');
    setShowImageUrlInput(false);
  }, [initialNotice, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const primaryImage = images.length > 0 ? images[0] : undefined;
    const finalImages = images.length > 0 ? images : undefined;
    const finalVideo = videoUrl.trim() ? sanitizeUrl(videoUrl.trim()) : undefined;
    const finalLink = linkUrl.trim() ? sanitizeUrl(linkUrl.trim()) : undefined;
    const finalLinkTitle = linkTitle.trim() || undefined;

    onSave(
      title.trim(),
      content.trim(),
      type,
      initialNotice?.id,
      date,
      primaryImage,
      finalImages,
      finalVideo,
      finalLink,
      finalLinkTitle
    );
    onClose();
  };

  const handleMultipleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      resizeImageBase64(file, 1280, 1280, (base64) => {
        setImages((prev) => [...prev, base64]);
      });
    });
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      const sanitized = sanitizeUrl(imageUrlInput.trim());
      setImages((prev) => [...prev, sanitized]);
      setImageUrlInput('');
      setShowImageUrlInput(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const isEditing = !!initialNotice;

  // Video embeds
  const ytEmbed = getYouTubeEmbedUrl(videoUrl);
  const driveEmbed = getGoogleDriveVideoEmbed(videoUrl);
  const isDirectVideo = isDirectVideoFile(videoUrl);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] border border-[#a7dff6]/60">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[#a7dff6]/60 bg-gradient-to-r from-[#d7effb]/50 to-[#a7dff6]/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs ${
                isEditing
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'bg-[#d7effb] text-[#0284c7] border border-[#a7dff6]'
              }`}
            >
              {isEditing ? (
                <Edit3 className="w-4 h-4" />
              ) : (
                <Megaphone className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 leading-tight uppercase">
                {isEditing
                  ? 'Thay đổi thông tin đã đăng'
                  : 'Đăng thông tin mới lên Bảng tin'}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                {isEditing
                  ? 'Cập nhật nội dung, nhiều ảnh, video hoặc liên kết'
                  : 'Hỗ trợ đăng nhiều ảnh, chèn video YouTube/Drive hoặc liên kết'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-3.5 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
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

        {/* Modal Form with Scrollable Content */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Scrollable Fields */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Tiêu đề thông tin <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Kế hoạch ngoại khóa, Lịch thi, Nhắc nhở nề nếp..."
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0284c7] focus:border-[#a7dff6] outline-none text-sm font-bold text-gray-900"
              />
            </div>

            {/* Date & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>Ngày đăng</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0284c7] focus:border-[#a7dff6] outline-none text-xs sm:text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Phân loại thông tin
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as NoticeType)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0284c7] focus:border-[#a7dff6] outline-none text-xs sm:text-sm font-semibold bg-white cursor-pointer"
                >
                  <option value="info">Thông tin chung</option>
                  <option value="warning">Nhắc nhở nề nếp / Y tế</option>
                  <option value="success">Khen thưởng &amp; Vinh danh</option>
                </select>
              </div>
            </div>

            {/* Content text */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Nội dung chi tiết <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung đầy đủ của thông báo gửi đến học sinh và phụ huynh..."
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0284c7] focus:border-[#a7dff6] outline-none text-xs sm:text-sm leading-relaxed"
              />
            </div>

            {/* MULTIMEDIA ATTACHMENTS SECTION */}
            <div className="bg-[#d7effb]/20 rounded-2xl border border-[#a7dff6]/80 p-3.5 space-y-3">
              {/* Media Subtab Selector */}
              <div className="flex items-center justify-between border-b border-[#a7dff6]/60 pb-2.5 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('images')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeMediaTab === 'images'
                        ? 'bg-[#0284c7] text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-[#d7effb]/50 border border-gray-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Nhiều ảnh ({images.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('video')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeMediaTab === 'video'
                        ? 'bg-[#0284c7] text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-[#d7effb]/50 border border-gray-200'
                    }`}
                  >
                    <VideoIcon className="w-3.5 h-3.5" />
                    <span>Video {videoUrl ? '✓' : ''}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('link')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeMediaTab === 'link'
                        ? 'bg-[#0284c7] text-white shadow-xs'
                        : 'bg-white text-gray-700 hover:bg-[#d7effb]/50 border border-gray-200'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Liên kết {linkUrl ? '✓' : ''}</span>
                  </button>
                </div>

                {/* Overall status count */}
                <div className="text-[11px] text-gray-500 font-semibold flex items-center gap-1">
                  {images.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-[#d7effb] text-sky-950 font-bold border border-[#a7dff6]">
                      {images.length} ảnh
                    </span>
                  )}
                  {videoUrl && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                      1 video
                    </span>
                  )}
                  {linkUrl && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      1 liên kết
                    </span>
                  )}
                </div>
              </div>

              {/* TAB 1: NHIỀU ẢNH (IMAGES) */}
              {activeMediaTab === 'images' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-white hover:bg-[#d7effb]/40 text-sky-950 font-bold text-xs rounded-xl border border-[#a7dff6] shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#0284c7]" />
                      <span>Chọn nhiều ảnh từ máy / điện thoại</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMultipleFilesChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => setShowImageUrlInput(!showImageUrlInput)}
                      className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#0284c7]" />
                      <span>{showImageUrlInput ? 'Ẩn ô dán link' : 'Dán link ảnh'}</span>
                    </button>

                    {images.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setImages([])}
                        className="text-xs text-red-600 hover:text-red-700 font-bold ml-auto cursor-pointer"
                      >
                        Xóa tất cả ảnh ({images.length})
                      </button>
                    )}
                  </div>

                  {showImageUrlInput && (
                    <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#a7dff6] animate-fadeIn">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="Dán đường dẫn ảnh (https://...)"
                        className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#0284c7]"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-3 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                      >
                        Thêm ảnh
                      </button>
                    </div>
                  )}

                  {/* Thumbnail gallery */}
                  {images.length === 0 ? (
                    <div className="py-6 px-4 border border-dashed border-[#a7dff6] rounded-2xl text-center bg-white/70">
                      <ImageIcon className="w-8 h-8 text-[#0284c7] mx-auto mb-1.5 opacity-60" />
                      <p className="text-xs font-bold text-gray-700">Chưa có ảnh nào được chọn</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Bạn có thể chọn cùng lúc nhiều ảnh từ máy tính hoặc điện thoại
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                      {images.map((imgSrc, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white shadow-2xs aspect-video"
                        >
                          <img
                            src={imgSrc}
                            alt={`Ảnh ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1 left-1 px-1.5 py-0.2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold rounded">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                            title="Xóa ảnh này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: VIDEO (YOUTUBE / DRIVE / MP4) */}
              {activeMediaTab === 'video' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Đường dẫn Video (YouTube, Google Drive, hoặc file MP4)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="Ví dụ: https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                        className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#0284c7] focus:border-[#a7dff6] outline-none font-medium"
                      />
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={() => setVideoUrl('')}
                          className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 cursor-pointer"
                        >
                          Xóa video
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Hỗ trợ: YouTube video, YouTube Shorts, Google Drive video hoặc link direct .mp4
                    </p>
                  </div>

                  {/* Video Live Preview */}
                  {videoUrl.trim() && (
                    <div className="p-3 bg-white rounded-2xl border border-gray-200 space-y-2">
                      <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                        <Play className="w-3.5 h-3.5 text-[#0284c7]" /> Xem trước video sẽ hiển thị:
                      </span>

                      {ytEmbed ? (
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                          <iframe
                            src={ytEmbed}
                            title="YouTube Preview"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        </div>
                      ) : driveEmbed ? (
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                          <iframe
                            src={driveEmbed}
                            title="Google Drive Video Preview"
                            allow="autoplay"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        </div>
                      ) : isDirectVideo ? (
                        <video
                          src={sanitizeUrl(videoUrl)}
                          controls
                          className="w-full max-h-56 rounded-xl bg-black"
                        />
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-700">
                            <VideoIcon className="w-4 h-4 text-[#0284c7]" />
                            <span className="font-semibold truncate max-w-xs">{videoUrl}</span>
                          </div>
                          <a
                            href={sanitizeUrl(videoUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-white border border-gray-200 text-xs font-bold text-blue-600 rounded-lg flex items-center gap-1 hover:bg-blue-50"
                          >
                            <span>Mở liên kết</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LIÊN KẾT (LINK WEB / TÀI LIỆU / BIỂU MẪU) */}
              {activeMediaTab === 'link' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Đường dẫn liên kết (URL)
                    </label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/... hoặc trang web liên kết"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#0284c7] focus:border-[#a7dff6] outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Tiêu đề hoặc nhãn liên kết (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="Ví dụ: Bấm để điền đơn khảo sát, Tải tài liệu hướng dẫn..."
                      className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#0284c7] focus:border-[#a7dff6] outline-none"
                    />
                  </div>

                  {linkUrl.trim() && (
                    <div className="p-3 bg-white rounded-2xl border border-gray-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#d7effb] text-[#0284c7] border border-[#a7dff6] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {linkTitle.trim() || extractDomain(linkUrl)}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{linkUrl}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkUrl('');
                          setLinkTitle('');
                        }}
                        className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold shrink-0 cursor-pointer"
                      >
                        Xóa link
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Modal Footer */}
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
                className="px-6 py-2.5 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-sky-200 transition-all cursor-pointer flex items-center gap-2"
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
