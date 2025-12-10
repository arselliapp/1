"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // التحقق من التثبيت السابق
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // التحقق من iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    // إذا كان iOS ولم يتم التثبيت، اعرض الرسالة
    if (isIOSDevice) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 2000)
      return () => clearTimeout(timer)
    }

    // الاستماع لحدث beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // عرض البانر بعد 2 ثانية (إجباري)
      setTimeout(() => {
        setShowPrompt(true)
      }, 2000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // التحقق من التثبيت
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA installed')
      setIsInstalled(true)
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-slate-800 border-slate-700 p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
        <div className="text-center">
          {/* الأيقونة */}
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg">
            📲
          </div>

          {/* العنوان */}
          <h3 className="text-white text-xl font-bold mb-2">
            أضف التطبيق للشاشة الرئيسية
          </h3>

          {/* الوصف */}
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            للحصول على تجربة أفضل وإشعارات فورية، أضف التطبيق إلى شاشتك الرئيسية
          </p>

          {isIOS ? (
            // تعليمات iOS
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-xl p-4 text-right">
                <p className="text-white text-sm mb-3">📱 خطوات الإضافة على iPhone/iPad:</p>
                <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
                  <li>اضغط على زر المشاركة <span className="text-blue-400">⬆️</span></li>
                  <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
                  <li>اضغط "إضافة"</li>
                </ol>
              </div>
              <Button
                onClick={() => setShowPrompt(false)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3"
              >
                ✅ فهمت، سأضيفه الآن
              </Button>
            </div>
          ) : (
            // زر التثبيت لـ Android/Desktop
            <Button
              onClick={handleInstall}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 text-lg font-medium"
            >
              📲 تثبيت التطبيق
            </Button>
          )}

          {/* المميزات */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-xl mb-1">⚡</div>
              <p className="text-slate-400 text-xs">أسرع</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-xl mb-1">🔔</div>
              <p className="text-slate-400 text-xs">إشعارات</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2">
              <div className="text-xl mb-1">📴</div>
              <p className="text-slate-400 text-xs">بدون نت</p>
            </div>
          </div>

          {/* ملاحظة */}
          <p className="text-slate-500 text-xs mt-4">
            التطبيق مجاني ولا يحتاج مساحة كبيرة
          </p>
        </div>
      </Card>
    </div>
  )
}
