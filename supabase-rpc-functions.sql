-- حذف الدوال القديمة
DROP FUNCTION IF EXISTS search_user_by_phone(TEXT);
DROP FUNCTION IF EXISTS search_user_by_id(UUID);

-- دالة البحث عن مستخدم برقم الجوال (تعيد الاسم ورقم الجوال)
CREATE OR REPLACE FUNCTION search_user_by_phone(input_phone_number TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone_number TEXT,
  avatar_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'مستخدم')::TEXT as full_name,
    COALESCE(au.raw_user_meta_data->>'phone_number', '')::TEXT as phone_number,
    COALESCE(au.raw_user_meta_data->>'avatar_url', '')::TEXT as avatar_url
  FROM auth.users au
  WHERE au.raw_user_meta_data->>'phone_number' = input_phone_number
  LIMIT 1;
END;
$$;

-- دالة البحث عن مستخدم بالـ ID (للاستخدام في صفحة جهات الاتصال)
CREATE OR REPLACE FUNCTION search_user_by_id(user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone_number TEXT,
  avatar_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'مستخدم')::TEXT as full_name,
    COALESCE(au.raw_user_meta_data->>'phone_number', '')::TEXT as phone_number,
    COALESCE(au.raw_user_meta_data->>'avatar_url', '')::TEXT as avatar_url
  FROM auth.users au
  WHERE au.id = user_id
  LIMIT 1;
END;
$$;
