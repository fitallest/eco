-- Bảng lưu trữ thông tin người dùng bổ sung (mở rộng từ auth.users của Supabase)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  credits INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kích hoạt Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Người dùng có thể xem thông tin của chính mình
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Người dùng có thể cập nhật thông tin của chính mình (vd: số điện thoại)
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Policy: Admin có toàn quyền trên bảng users
CREATE POLICY "Admins have full access to users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Trigger tự động tạo bản ghi public.users khi có user mới đăng ký
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, credits, role)
  VALUES (new.id, new.email, 3, 'USER');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Bảng yêu cầu nạp điểm / nâng cấp gói
CREATE TABLE public.upgrade_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kích hoạt RLS
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Người dùng có thể xem yêu cầu của chính họ
CREATE POLICY "Users can view own requests" ON public.upgrade_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Người dùng có thể tạo yêu cầu mới
CREATE POLICY "Users can insert own requests" ON public.upgrade_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admin có toàn quyền trên bảng upgrade_requests
CREATE POLICY "Admins have full access to requests" ON public.upgrade_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Bật Realtime cho bảng users để ví điểm cập nhật realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
