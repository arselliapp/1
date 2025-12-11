// Service Worker للإشعارات - يعمل حتى والتطبيق مغلق

// استقبال رسائل Push
self.addEventListener('push', function(event) {
  console.log('🔔 Push notification received!', event);
  console.log('🔔 Event data:', event.data ? 'Has data' : 'No data');
  
  let notificationData = {
    title: 'إشعار جديد',
    body: 'لديك إشعار جديد',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'notification-' + Date.now(),
    requireInteraction: false, // تغيير إلى false للسماح بالإشعارات في الخلفية
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard'
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('🔔 Parsed push data:', data);
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: false, // false للسماح بالإشعارات في الخلفية
        vibrate: [200, 100, 200],
        data: {
          url: data.data?.url || '/dashboard',
          ...data.data
        },
        actions: [
          {
            action: 'open',
            title: 'فتح',
            icon: '/icon-64x64.png'
          },
          {
            action: 'close',
            title: 'إغلاق',
            icon: '/icon-64x64.png'
          }
        ]
      };
    } catch (e) {
      console.error('❌ Error parsing push data:', e);
      // إذا فشل parsing، استخدم البيانات النصية
      if (event.data.text) {
        try {
          const textData = JSON.parse(event.data.text());
          notificationData.title = textData.title || notificationData.title;
          notificationData.body = textData.body || notificationData.body;
        } catch (e2) {
          console.error('❌ Error parsing text data:', e2);
        }
      }
    }
  }

  console.log('🔔 Showing notification:', notificationData.title, notificationData.body);

  const notificationPromise = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    vibrate: notificationData.vibrate,
    data: notificationData.data,
    actions: notificationData.actions,
    dir: 'rtl',
    lang: 'ar',
    silent: false, // تأكد من أن الصوت يعمل
    sound: '/notification.mp3' // إذا كان لديك ملف صوتي
  });

  event.waitUntil(
    notificationPromise.then(() => {
      console.log('✅ Notification shown successfully');
    }).catch((error) => {
      console.error('❌ Error showing notification:', error);
    })
  );
});

// عند الضغط على الإشعار
self.addEventListener('notificationclick', function(event) {
  console.log('🖱️ Notification clicked!', event);
  
  event.notification.close();
  
  // إذا ضغط على زر "إغلاق"
  if (event.action === 'close') {
    return;
  }
  
  // الحصول على الرابط من بيانات الإشعار
  const url = event.notification.data?.url || '/dashboard';
  const fullUrl = self.location.origin + url;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // البحث عن نافذة مفتوحة
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // إذا النافذة موجودة، ركز عليها وانتقل للرابط
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: url
          });
          return client.focus();
        }
      }
      // إذا ما في نافذة مفتوحة، افتح واحدة جديدة
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// عند إغلاق الإشعار
self.addEventListener('notificationclose', function(event) {
  console.log('❌ Notification closed');
});

// استقبال رسائل من الصفحة
self.addEventListener('message', function(event) {
  console.log('📨 Message received in SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// تفعيل Service Worker
self.addEventListener('activate', function(event) {
  console.log('✅ Push Service Worker activated');
  event.waitUntil(clients.claim());
});

// تثبيت Service Worker
self.addEventListener('install', function(event) {
  console.log('📦 Push Service Worker installed');
  self.skipWaiting();
});

