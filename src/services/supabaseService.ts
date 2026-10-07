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
      const { error } = await supabase.from(TABLE_NAME).upsert(
        {
          id: RECORD_ID,
          data: state,
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
          if (payload?.new?.data) {
            onRemoteUpdate(payload.new.data as AppState);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
