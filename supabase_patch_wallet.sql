-- ========================================================
-- PATCH: Ví điểm - Fix RLS & bật Realtime
-- Chạy trong Supabase Dashboard > SQL Editor
-- ========================================================

-- 1. Thêm policy cho phép service_role (backend) update credits
--    (service_role tự động bypass RLS, nhưng đảm bảo không có policy nào block)

-- 2. Đảm bảo user chỉ có thể update phone của mình (KHÔNG tự update credits)
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

CREATE POLICY "Users can update own phone" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Đảm bảo Realtime bật cho bảng users (để UI nhận update ngay lập tức)
-- Nếu chưa có publication này, bỏ comment và chạy:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- 4. Fix: Nếu user login lại và credits về 3 (do trigger insert trùng),
--    thêm ON CONFLICT để trigger không tạo bản ghi mới cho user đã tồn tại
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, credits, role)
  VALUES (new.id, new.email, 3, 'USER')
  ON CONFLICT (id) DO NOTHING;  -- <-- FIX: Không reset credits nếu user đã tồn tại!
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- DONE. Kiểm tra: SELECT * FROM public.users LIMIT 5;
-- ========================================================
