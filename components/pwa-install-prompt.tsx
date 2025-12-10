"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // التحقق من التثبيت السابق
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // الاستماع لحدث beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // عرض البانر بعد 5 ثوانٍ
      setTimeout(() => {
        const dismissed = localStorage.getItem('pwa-prompt-dismissed')
        if (!dismissed) {
          setShowPrompt(true)
        }
      }, 5000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // التحقق من التثبيت
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowPrompt(false)
      localStorage.removeItem('pwa-prompt-dismissed')
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
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  if (isInstalled || !showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <Card className="p-4 shadow-lg border-2 border-primary/20 bg-background">
        <button
          onClick={handleDismiss}
          className="absolute top-2 left-2 p-1 rounded-full hover:bg-muted"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-2xl">
            📱
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">ثبّت التطبيق</h3>
            <p className="text-sm text-muted-foreground">
              احصل على تجربة أفضل مع التطبيق المثبت على جهازك
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleInstall} className="flex-1">
            تثبيت الآن
          </Button>
          <Button onClick={handleDismiss} variant="outline">
            لاحقاً
          </Button>
        </div>
      </Card>
    </div>
  )
}
