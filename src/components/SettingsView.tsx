import React, { useState, useRef, useEffect } from 'react';
import {
  Sliders,
  Scale,
  BookOpen,
  Database,
  Plus,
  Trash2,
  Edit2,
  Save,
  Download,
  Upload,
  AlertOctagon,
  Sparkles,
  Lock,
  Cloud,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { AppConfig, AppState, ConductThresholds, DisciplineType, Rule } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { generateId } from '../utils/helpers';
import { SyncStatus } from '../services/supabaseService';
import { DEFAULT_INITIAL_STATE } from '../defaultData';

interface SettingsViewProps {
  state: AppState;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
  onResetData: () => void;
  onClearAllData: () => void;
  onImportBackup: (backupState: AppState) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  syncStatus?: SyncStatus;
  onOpenSupabaseModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  onUpdateConfig,
  onResetData,
  onClearAllData,
  onImportBackup,
  onShowToast,
  syncStatus,
  onOpenSupabaseModal,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'rules' | 'subjects' | 'data'>('general');

  // General settings state
  const [appName, setAppName] = useState(state.config.appName);
  const [className, setClassName] = useState(state.config.className);
  const [schoolYear, setSchoolYear] = useState(state.config.schoolYear);
  const [teacherName, setTeacherName] = useState(state.config.teacherName);
  const [teacherPassword, setTeacherPassword] = useState(state.config.teacherPassword);

  // Conduct thresholds state
  const [goodScore, setGoodScore] = useState(state.config.conductThresholds.good);
  const [fairScore, setFairScore] = useState(state.config.conductThresholds.fair);
  const [avgScore, setAvgScore] = useState(state.config.conductThresholds.average);

  // Rule modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<Rule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [rulePoints, setRulePoints] = useState(2);
  const [ruleType, setRuleType] = useState<DisciplineType>('minus');

  // Subjects state
  const [newSubject, setNewSubject] = useState('');

  // Confirmation modals
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isRestoreRulesConfirmOpen, setIsRestoreRulesConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const backupInputRef = useRef<HTMLInputElement>(null);

  // Keep form states in sync if state.config updates
  useEffect(() => {
    setAppName(state.config.appName);
    setClassName(state.config.className);
    setSchoolYear(state.config.schoolYear);
    setTeacherName(state.config.teacherName);
    setTeacherPassword(state.config.teacherPassword);
    setGoodScore(state.config.conductThresholds?.good ?? 0);
    setFairScore(state.config.conductThresholds?.fair ?? -5);
    setAvgScore(state.config.conductThresholds?.average ?? -10);
  }, [state.config]);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      appName: appName.trim(),
      className: className.trim(),
      schoolYear: schoolYear.trim(),
      teacherName: teacherName.trim(),
      teacherPassword: teacherPassword.trim() || 'admin',
    });
    onShowToast('Đã lưu thông tin cấu hình chung');
  };

  const handleSaveConductThresholds = () => {
    const thresholds: ConductThresholds = {
      good: Number(goodScore) || 0,
      fair: Number(fairScore) || -5,
      average: Number(avgScore) || -10,
    };
    onUpdateConfig({ conductThresholds: thresholds });
    onShowToast('Đã cập nhật tiêu chí Hạnh kiểm');
  };

  const handleOpenAddRule = () => {
    setRuleToEdit(null);
    setRuleName('');
    setRulePoints(2);
    setRuleType('minus');
    setIsRuleModalOpen(true);
  };

  const handleOpenEditRule = (r: Rule) => {
    setRuleToEdit(r);
    setRuleName(r.name);
    setRulePoints(r.points);
    setRuleType(r.type);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = ruleName.trim();
    if (!cleanName) return;

    const pointsNum = Math.max(1, Number(rulePoints) || 1);
    let updatedRules = [...state.config.rules];
    if (ruleToEdit) {
      updatedRules = updatedRules.map((r) =>
        r.id === ruleToEdit.id
          ? { ...r, name: cleanName, points: pointsNum, type: ruleType }
          : r
      );
    } else {
      updatedRules.push({
        id: generateId(),
        name: cleanName,
        points: pointsNum,
        type: ruleType,
      });
    }

    onUpdateConfig({ rules: updatedRules });
    setIsRuleModalOpen(false);
    onShowToast(`Đã lưu quy tắc thi đua: ${cleanName}`);
  };

  const handleDeleteRule = (id: string) => {
    const updated = state.config.rules.filter((r) => r.id !== id);
    onUpdateConfig({ rules: updated });
    setRuleToDelete(null);
    onShowToast('Đã xóa quy tắc thi đua');
  };

  const handleRestoreDefaultRules = () => {
    const defaultRules = DEFAULT_INITIAL_STATE.config.rules;
    onUpdateConfig({ rules: defaultRules });
    setIsRestoreRulesConfirmOpen(false);
    onShowToast('Đã khôi phục bộ quy tắc thi đua chuẩn (11 quy tắc cộng/trừ điểm)');
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSubject.trim();
    if (!clean) return;
    if (state.config.subjects.includes(clean)) {
      onShowToast('Môn học này đã có trong danh sách', 'error');
      return;
    }
    const updated = [...state.config.subjects, clean];
    onUpdateConfig({ subjects: updated });
    setNewSubject('');
    onShowToast('Đã thêm môn học mới');
  };

  const handleDeleteSubject = (index: number) => {
    const updated = state.config.subjects.filter((_, i) => i !== index);
    onUpdateConfig({ subjects: updated });
    onShowToast('Đã xóa môn học');
  };

  const handleExportBackupJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Sao_luu_So_Chu_Nhiem_${state.config.className}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('Đã tải xuống file sao lưu hệ thống');
  };

  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.config && parsed.students) {
          onImportBackup(parsed);
          onShowToast('Đã khôi phục dữ liệu từ file sao lưu');
        } else {
          onShowToast('File sao lưu không hợp lệ', 'error');
        }
      } catch (err) {
        onShowToast('Lỗi đọc file JSON', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        {/* Settings Navigation Sidebar */}
        <div className="w-full md:w-60 bg-gray-50/70 border-r border-gray-100 shrink-0 flex flex-row md:flex-col overflow-x-auto p-2 gap-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-left font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Cài đặt chung</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-3 text-left font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Quy tắc thi đua</span>
          </button>

          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-3 text-left font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'subjects'
                ? 'bg-blue-50 text-blue-700 shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Môn học</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-3 text-left font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'data'
                ? 'bg-red-50 text-red-700 shadow-xs'
                : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Dữ liệu hệ thống</span>
          </button>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 p-6 sm:p-8">
          {/* TAB 1: CÀI ĐẶT CHUNG */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-5">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                Thông tin chung của Lớp &amp; Sổ
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tên ứng dụng
                  </label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tên lớp
                  </label>
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Năm học
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Giáo viên chủ nhiệm
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Mật khẩu đăng nhập quản lý (Giáo viên)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="Mật khẩu giáo viên..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Dùng mật khẩu này để đăng nhập vào chế độ Quản lý GVCN.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu thông tin</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: QUY TẮC THI ĐUA */}
          {activeTab === 'rules' && (
            <div className="space-y-8">
              {/* Rules List */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Bảng quy tắc điểm thi đua
                    </h3>
                    <p className="text-xs text-gray-400">
                      Các lỗi trừ điểm nề nếp và khen thưởng cộng điểm ({state.config.rules.length} quy tắc)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRestoreRulesConfirmOpen(true)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Nạp lại 11 quy tắc thi đua tiêu chuẩn của nhà trường"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                      <span>Quy tắc chuẩn</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddRule}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm quy tắc</span>
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 font-bold text-gray-600">Tên sự việc</th>
                        <th className="px-4 py-3 font-bold text-gray-600 text-center w-28">
                          Điểm
                        </th>
                        <th className="px-4 py-3 font-bold text-gray-600 text-center w-24">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {state.config.rules.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                r.type === 'plus'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {r.type === 'plus' ? `+${r.points}` : `-${r.points}`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditRule(r)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRuleToDelete(r.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Conduct Thresholds */}
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    Tiêu chí Đánh giá Hạnh kiểm theo điểm thi đua
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cài đặt ngưỡng điểm tối thiểu (tổng điểm thi đua) để đạt mức xếp loại
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center shadow-2xs">
                    <p className="font-bold text-emerald-700 text-xs uppercase mb-1">
                      Hạnh kiểm TỐT
                    </p>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                      Từ{' '}
                      <input
                        type="number"
                        value={goodScore}
                        onChange={(e) => setGoodScore(Number(e.target.value))}
                        className="w-16 px-1.5 py-1 text-center font-bold border border-emerald-300 rounded-lg outline-none"
                      />{' '}
                      điểm
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-200 text-center shadow-2xs">
                    <p className="font-bold text-blue-700 text-xs uppercase mb-1">
                      Hạnh kiểm KHÁ
                    </p>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                      Từ{' '}
                      <input
                        type="number"
                        value={fairScore}
                        onChange={(e) => setFairScore(Number(e.target.value))}
                        className="w-16 px-1.5 py-1 text-center font-bold border border-blue-300 rounded-lg outline-none"
                      />{' '}
                      điểm
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 text-center shadow-2xs">
                    <p className="font-bold text-amber-700 text-xs uppercase mb-1">
                      Hạnh kiểm TRUNG BÌNH
                    </p>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                      Từ{' '}
                      <input
                        type="number"
                        value={avgScore}
                        onChange={(e) => setAvgScore(Number(e.target.value))}
                        className="w-16 px-1.5 py-1 text-center font-bold border border-amber-300 rounded-lg outline-none"
                      />{' '}
                      điểm
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-gray-500 italic">
                    * Điểm dưới ngưỡng Trung Bình sẽ tự động xếp loại Yếu.
                  </p>
                  <button
                    onClick={handleSaveConductThresholds}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    Lưu tiêu chí Hạnh kiểm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MÔN HỌC */}
          {activeTab === 'subjects' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                Danh sách Môn học trong sổ điểm
              </h3>

              <form onSubmit={handleAddSubject} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Nhập tên môn học mới..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm môn</span>
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-2">
                {state.config.subjects.map((sub, idx) => (
                  <div
                    key={sub}
                    className="bg-blue-50 text-blue-800 font-bold px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-blue-100 flex items-center gap-2 shadow-2xs"
                  >
                    <span>{sub}</span>
                    <button
                      onClick={() => handleDeleteSubject(idx)}
                      className="text-blue-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Xóa môn này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DỮ LIỆU HỆ THỐNG */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Supabase Cloud Sync Section */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        Đồng bộ Đám mây Supabase
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                            syncStatus?.isTableReady
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {syncStatus?.isTableReady ? 'Đã kích hoạt' : 'Cần cấu hình SQL'}
                        </span>
                      </h4>
                      <p className="text-xs text-gray-500">
                        Lưu trữ và đồng bộ hóa danh sách lớp, điểm số, hạnh kiểm trực tiếp lên Supabase
                      </p>
                    </div>
                  </div>

                  {onOpenSupabaseModal && (
                    <button
                      onClick={onOpenSupabaseModal}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Mở bảng điều khiển Supabase</span>
                    </button>
                  )}
                </div>

                <div className="text-xs text-emerald-900 bg-white/80 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <span>
                    Trạng thái kết nối:{' '}
                    <strong>
                      {syncStatus?.isTableReady
                        ? `Trực tuyến • Lần đồng bộ gần nhất: ${syncStatus?.lastSyncedAt || 'Vừa xong'}`
                        : 'Chưa tạo bảng tro_ly_chu_nhiem_data trên Supabase'}
                    </strong>
                  </span>
                  {syncStatus?.isTableReady && (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tự động đồng bộ
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-base font-bold text-red-600 border-b border-red-100 pb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-red-600" /> Quản lý Dữ liệu Nội bộ &amp; Sao lưu
              </h3>

              <div className="bg-red-50/60 border border-red-200 rounded-2xl p-5 space-y-4">
                <p className="text-xs text-red-800 font-medium leading-relaxed">
                  Sao lưu dữ liệu trước khi thực hiện các thao tác đặt lại để đảm bảo không mất mát thông tin học sinh.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Backup JSON */}
                  <button
                    onClick={handleExportBackupJson}
                    className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>Tải file sao lưu (JSON)</span>
                  </button>

                  {/* Restore JSON */}
                  <button
                    onClick={() => backupInputRef.current?.click()}
                    className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Khôi phục từ file JSON</span>
                  </button>
                  <input
                    type="file"
                    ref={backupInputRef}
                    accept=".json"
                    className="hidden"
                    onChange={handleImportBackupJson}
                  />

                  {/* Reset to Mock */}
                  <button
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Tạo lại dữ liệu mẫu 8A3</span>
                  </button>

                  {/* Clear all */}
                  <button
                    onClick={() => setIsClearConfirmOpen(true)}
                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2.5 transition-colors cursor-pointer shadow-md hover:shadow-red-200"
                  >
                    <AlertOctagon className="w-4 h-4" />
                    <span>Xóa TOÀN BỘ dữ liệu</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm">
                {ruleToEdit ? 'Chỉnh sửa quy tắc' : 'Thêm quy tắc thi đua'}
              </h3>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên sự việc
                </label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="Ví dụ: Dọn vệ sinh lớp tốt..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Loại quy tắc
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuleType('minus')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      ruleType === 'minus'
                        ? 'bg-red-50 text-red-700 border-red-400 ring-2 ring-red-200'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    Lỗi (Trừ điểm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRuleType('plus')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      ruleType === 'plus'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-400 ring-2 ring-emerald-200'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    Thưởng (Cộng điểm)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mức điểm
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={rulePoints}
                  onChange={(e) => setRulePoints(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Lưu quy tắc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Tạo lại dữ liệu mẫu"
        message="Thao tác này sẽ thay thế dữ liệu hiện tại bằng dữ liệu lớp 8A3 mẫu. Bạn có chắc chắn muốn thực hiện?"
        confirmText="Tạo dữ liệu mẫu"
        onConfirm={() => {
          onResetData();
          setIsResetConfirmOpen(false);
          onShowToast('Đã khôi phục dữ liệu mẫu 8A3');
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      <ConfirmModal
        isOpen={isClearConfirmOpen}
        title="Xóa toàn bộ dữ liệu"
        message="CẢNH BÁO: Thao tác này sẽ xóa sạch danh sách học sinh, điểm danh, điểm số và thông báo. Không thể hoàn tác!"
        confirmText="Xóa sạch toàn bộ"
        onConfirm={() => {
          onClearAllData();
          setIsClearConfirmOpen(false);
          onShowToast('Đã xóa sạch dữ liệu hệ thống');
        }}
        onCancel={() => setIsClearConfirmOpen(false)}
      />

      <ConfirmModal
        isOpen={!!ruleToDelete}
        title="Xóa quy tắc thi đua"
        message="Bạn có chắc chắn muốn xóa quy tắc này?"
        confirmText="Xóa quy tắc"
        onConfirm={() => ruleToDelete && handleDeleteRule(ruleToDelete)}
        onCancel={() => setRuleToDelete(null)}
      />

      <ConfirmModal
        isOpen={isRestoreRulesConfirmOpen}
        title="Khôi phục quy tắc thi đua chuẩn"
        message="Bạn có muốn đặt lại danh sách quy tắc thi đua về bộ quy tắc chuẩn của trường (gồm 11 lỗi trừ điểm và cộng điểm khen thưởng)?"
        confirmText="Khôi phục quy tắc chuẩn"
        onConfirm={handleRestoreDefaultRules}
        onCancel={() => setIsRestoreRulesConfirmOpen(false)}
      />
    </div>
  );
};
