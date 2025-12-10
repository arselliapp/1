-- إضافة عمود type إلى جدول requests إذا لم يكن موجوداً
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'callback' CHECK (type IN ('whatsapp', 'x', 'snapchat', 'marriage', 'meeting', 'callback', 'reminder'));

-- تحديث الصفوف الموجودة لديها NULL في عمود type
UPDATE requests SET type = 'callback' WHERE type IS NULL;
