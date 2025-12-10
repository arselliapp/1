"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function PWAUpdateNotifier() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg)

      // التحقق من التحديثات كل 60 ثانية
      setInterval(() => {
        reg.update()
      }, 60000)

      // الاستماع لحدث التحديث
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true)
            }
          })
        }
      })
    })

    // الاستماع لرسائل من Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_AVAILABLE') {
        setShowUpdate(true)
      }
    })
  }, [])

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // إعادة تحميل الصفحة عند التفعيل
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }
  }

  if (!showUpdate) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <Card className="p-4 shadow-lg border-2 border-green-500/20 bg-background">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">
            🔄
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">تحديث متوفر</h3>
            <p className="text-sm text-muted-foreground">
              يتوفر إصدار جديد من التطبيق. قم بالتحديث للحصول على أحدث الميزات.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleUpdate} className="flex-1 bg-green-500 hover:bg-green-600">
            تحديث الآن
          </Button>
          <Button onClick={() => setShowUpdate(false)} variant="outline">
            لاحقاً
          </Button>
        </div>
      </Card>
    </div>
  )
}
