"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { WifiOff, Wifi } from "lucide-react"

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowNotification(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showNotification) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <Card className={`p-3 shadow-lg flex items-center gap-2 ${
        isOnline 
          ? 'bg-green-500 text-white' 
          : 'bg-red-500 text-white'
      }`}>
        {isOnline ? (
          <>
            <Wifi className="h-5 w-5" />
            <span className="font-medium">تم الاتصال بالإنترنت</span>
          </>
        ) : (
          <>
            <WifiOff className="h-5 w-5" />
            <span className="font-medium">غير متصل بالإنترنت</span>
          </>
        )}
      </Card>
    </div>
  )
}
