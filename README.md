# أرسل لي - Arselli

تطبيق للتواصل وإرسال الطلبات بين المستخدمين.

## التقنيات المستخدمة

- **Next.js 14** - إطار عمل React
- **Supabase** - قاعدة البيانات والمصادقة
- **Tailwind CSS** - التصميم
- **Radix UI** - مكونات واجهة المستخدم
- **Web Push** - إشعارات الويب

## التشغيل المحلي

```bash
# تثبيت الاعتماديات
npm install

# تشغيل خادم التطوير
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) في المتصفح.

## متغيرات البيئة

أنشئ ملف `.env.local` وأضف:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

## النشر على Vercel

1. ارفع المشروع على GitHub
2. اذهب إلى [vercel.com](https://vercel.com)
3. اربط المستودع
4. أضف متغيرات البيئة
5. انشر!

## الميزات

- ✅ تسجيل دخول عبر Google
- ✅ إرسال واستقبال الطلبات
- ✅ إدارة جهات الاتصال
- ✅ إشعارات فورية
- ✅ تطبيق PWA (قابل للتثبيت)
- ✅ واجهة عربية RTL
