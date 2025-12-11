// Service Worker للإشعارات - يعمل حتى والتطبيق مغلق

// استقبال رسائل Push
self.addEventListener('push', function(event) {
  console.log('🔔 Push notification received!');
  
  let notificationData = {
    title: 'إشعار جديد',
    body: 'لديك إشعار جديد',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'notification-' + Date.now(),
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url: '/dashboard'
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : true,
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
      console.error('Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
      actions: notificationData.actions,
      dir: 'rtl',
      lang: 'ar'
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

