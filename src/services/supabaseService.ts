import { supabase, SUPABASE_SCHEMA_SQL } from '../supabaseClient';
import { AppState } from '../types';

export interface SyncStatus {
  isConnected: boolean;
  isTableReady: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

const RECORD_ID = 'main_state';
const TABLE_NAME = 'tro_ly_chu_nhiem_data';

// Unique session ID per browser tab/instance to prevent self-echo overwrite loops
export const CLIENT_SESSION_ID =
  'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);

export const supabaseService = {
  // Test connection and table existence
  async checkConnection(): Promise<{ isConnected: boolean; isTableReady: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('id')
        .eq('id', RECORD_ID)
        .maybeSingle();

      if (error) {
        // Table doesn't exist or RLS policy issue
        return {
          isConnected: true,
          isTableReady: false,
          error: error.message || 'Bảng dữ liệu chưa được tạo trong Supabase.',
        };
      }

      return {
        isConnected: true,
        isTableReady: true,
      };
    } catch (err: any) {
      return {
        isConnected: false,
        isTableReady: false,
        error: err.message || 'Không thể kết nối đến máy chủ Supabase.',
      };
    }
  },

  // Fetch state from Supabase
  async loadState(): Promise<{ state: AppState | null; isTableReady: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('data')
        .eq('id', RECORD_ID)
        .maybeSingle();

      if (error) {
        return { state: null, isTableReady: false, error: error.message };
      }

      if (data && data.data) {
        return { state: data.data as AppState, isTableReady: true };
      }

      // Table exists but no record yet
      return { state: null, isTableReady: true };
    } catch (err: any) {
      return { state: null, isTableReady: false, error: err.message };
    }
  },

  // Save state to Supabase
  async saveState(state: AppState): Promise<{ success: boolean; error?: string }> {
    try {
      // Attach sync metadata to identify writer and avoid echo loops
      const payloadWithMeta = {
        ...state,
        _syncMeta: {
          clientId: CLIENT_SESSION_ID,
          timestamp: Date.now(),
        },
      };

      const { error } = await supabase.from(TABLE_NAME).upsert(
        {
          id: RECORD_ID,
          data: payloadWithMeta,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  // Backup academic grades specifically to Supabase
  async createAcademicBackup(
    backup: import('../types').AcademicGradeBackup
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from(TABLE_NAME).upsert(
        {
          id: backup.id,
          data: backup,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Lỗi không xác định khi sao lưu lên Supabase.',
      };
    }
  },

  // Perform safe deletion with prerequisite backup on Supabase
  async deleteMonthlyAcademicGrades(
    backup: import('../types').AcademicGradeBackup,
    updatedState: AppState,
    onProgress?: (step: 'backing_up' | 'deleting') => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Mandatory prerequisite: Backup MUST succeed first
      onProgress?.('backing_up');
      const backupRes = await this.createAcademicBackup(backup);
      if (!backupRes.success) {
        return {
          success: false,
          error: `Không thể tạo bản sao lưu trên Supabase: ${backupRes.error}. Đã dừng thao tác xóa để bảo vệ dữ liệu.`,
        };
      }

      // 2. Save updated state atomically to Supabase
      onProgress?.('deleting');
      const saveRes = await this.saveState(updatedState);
      if (!saveRes.success) {
        return {
          success: false,
          error: `Lỗi khi cập nhật dữ liệu sau xóa lên Supabase: ${saveRes.error}.`,
        };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Lỗi khi xóa bảng điểm trên Supabase.',
      };
    }
  },

  // Subscribe to real-time changes
  subscribe(onRemoteUpdate: (remoteState: AppState) => void) {
    const channel = supabase
      .channel('tro_ly_chu_nhiem_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE_NAME,
          filter: `id=eq.${RECORD_ID}`,
        },
        (payload: any) => {
          const remoteData = payload?.new?.data;
          if (!remoteData) return;

          // CRITICAL: Ignore updates broadcast by our own tab/session!
          // This stops race conditions, infinite loops, and reverting newly edited data.
          if (remoteData._syncMeta?.clientId === CLIENT_SESSION_ID) {
            return;
          }

          onRemoteUpdate(remoteData as AppState);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
