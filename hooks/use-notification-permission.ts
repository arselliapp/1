import { useEffect } from "react"

export function useNotificationPermission() {
  useEffect(() => {
    // طلب إذن الإشعارات من المستخدم
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("✅ Notification permission granted")
        } else {
          console.log("❌ Notification permission denied")
        }
      })
    }
  }, [])
}
