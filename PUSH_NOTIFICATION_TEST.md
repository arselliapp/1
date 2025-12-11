# اختبار الإشعارات Push بعد النشر

## الخطوات المطلوبة بعد نشر Vercel:

### 1. مسح Service Worker القديم
1. افتح الموقع في المتصفح
2. اضغط F12 لفتح DevTools
3. اذهب إلى تبويب **Application** (أو **التطبيقات**)
4. من القائمة الجانبية، اختر **Service Workers**
5. ابحث عن `push-sw.js` واضغط **Unregister**
6. اذهب إلى **Storage** > **Clear site data** > اضغط **Clear site data**

### 2. إعادة تحميل الموقع
1. أعد تحميل الصفحة (Ctrl+R أو F5)
2. اسمح بالإشعارات عندما يطلب المتصفح
3. تأكد من ظهور رسالة `✅ Push notifications enabled successfully!` في Console

### 3. اختبار الإشعارات
افتح Console (F12 > Console) ونفّذ هذا الكود:

```javascript
// الحصول على التوكن
const token = localStorage.getItem('arselli-auth-token');
const tokenObj = JSON.parse(token);
const accessToken = tokenObj.access_token;

// إرسال إشعار اختبار
fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${accessToken}` 
  },
  body: JSON.stringify({
    userId: 'f19f4cef-45cf-4ace-99ae-8be5889e3838', // ضع userId الخاص بك
    title: 'Test Closed Browser',
    body: 'This should work even when browser is closed',
    url: '/dashboard'
  })
})
.then(r => r.json())
.then(result => {
  console.log('✅ Result:', result);
  if (result.success) {
    console.log(`✅ Sent ${result.sent} of ${result.total} notifications`);
  }
})
.catch(err => {
  console.error('❌ Error:', err);
});
```

### 4. اختبار مع المتصفح مغلق
1. **أغلق المتصفح تماماً** (أو أغلق التبويب)
2. انتظر 10-20 ثانية
3. افتح المتصفح مرة أخرى
4. يجب أن ترى إشعار "Test Closed Browser"

### 5. التحقق من Service Worker
1. افتح DevTools > Application > Service Workers
2. تأكد أن `push-sw.js` في حالة **"activated and is running"**
3. إذا لم يكن نشطاً، أعد تحميل الصفحة

## ملاحظات مهمة:

- **Chrome**: Service Worker يعمل حتى عندما يكون المتصفح مغلقاً
- **Firefox**: قد يحتاج المتصفح أن يكون مثبتاً كـ PWA
- **Edge**: يعمل مثل Chrome

## إذا لم يصل الإشعار:

1. تحقق من إعدادات المتصفح:
   - Settings > Privacy and security > Site settings > Notifications
   - تأكد أن الموقع مسموح له بالإشعارات

2. تحقق من VAPID keys في Vercel:
   - Settings > Environment Variables
   - تأكد أن `NEXT_PUBLIC_VAPID_PUBLIC_KEY` و `VAPID_PRIVATE_KEY` موجودة وصحيحة

3. تحقق من Console في Service Worker:
   - DevTools > Application > Service Workers > push-sw.js > Console
   - يجب أن ترى `🔔 Push notification received!` عند وصول الإشعار

4. تحقق من Logs في Vercel:
   - اذهب إلى Vercel Dashboard > Deployments > Latest > Functions
   - تحقق من logs لـ `/api/notifications/send`

## التغييرات التي تمت:

1. ✅ تغيير `requireInteraction` من `true` إلى `false` - يسمح بالإشعارات في الخلفية
2. ✅ إضافة logging إضافي للتشخيص
3. ✅ تحسين معالجة الأخطاء

