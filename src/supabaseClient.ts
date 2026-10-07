import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://sohuavueougdlsqerwuk.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_2BcotajR597WKnTP9G0wrg_N8oBj1PM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
};

// SQL script that user can run in Supabase SQL Editor
export const SUPABASE_SCHEMA_SQL = `-- Chạy đoạn mã này trong Supabase > SQL Editor > New query > Run
-- 1. Tạo bảng lưu trữ dữ liệu Trợ lý chủ nhiệm
CREATE TABLE IF NOT EXISTS public.tro_ly_chu_nhiem_data (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Kích hoạt RLS (Row Level Security) và cho phép truy cập
ALTER TABLE public.tro_ly_chu_nhiem_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access" ON public.tro_ly_chu_nhiem_data;
CREATE POLICY "Public full access"
ON public.tro_ly_chu_nhiem_data
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Bật Realtime để đồng bộ trực tiếp giữa các thiết bị/trình duyệt
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tro_ly_chu_nhiem_data'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tro_ly_chu_nhiem_data;
  END IF;
END $$;
`;
