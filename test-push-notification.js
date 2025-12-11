// سكريبت اختبار الإشعارات Push
// انسخ هذا الكود والصقه في Console (F12 > Console)

(async function testPushNotification() {
  try {
    // 1. الحصول على التوكن
    const token = localStorage.getItem('arselli-auth-token');
    if (!token) {
      console.error('❌ Token not found. Please log in first.');
      return;
    }

    const tokenObj = JSON.parse(token);
    const accessToken = tokenObj.access_token;

    if (!accessToken) {
      console.error('❌ Access token not found in token object');
      return;
    }

    console.log('✅ Token found');

    // 2. الحصول على userId من التوكن (أو استخدم userId الخاص بك)
    // يمكنك استخراج userId من التوكن أو استخدامه مباشرة
    const userId = prompt('Enter your userId (or press Cancel to use default):') || 'f19f4cef-45cf-4ace-99ae-8be5889e3838';

    // 3. إرسال إشعار اختبار
    console.log('📤 Sending test notification...');
    
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${accessToken}` 
      },
      body: JSON.stringify({
        userId: userId,
        title: 'Test Push Notification',
        body: 'This is a test notification. If you see this, push notifications are working!',
        url: '/dashboard',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Notification sent successfully!');
      console.log(`✅ Sent ${result.sent} of ${result.total} notifications`);
      console.log('📱 Now close the browser completely and wait 10-20 seconds, then reopen it.');
      console.log('📱 You should see the notification even when the browser was closed.');
    } else {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();

