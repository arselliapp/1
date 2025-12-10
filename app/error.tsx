"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // تسجيل الخطأ
    console.error("App Error:", error)
  }, [error])

  const handleRefresh = () => {
    // مسح الـ cache وإعادة التحميل
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      })
    }
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="text-center max-w-md">
        {/* أيقونة الخطأ */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg 
            className="w-12 h-12 text-red-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>

        {/* العنوان */}
        <h1 className="text-2xl font-bold text-white mb-3">
          عذراً، حدث خطأ! 😔
        </h1>

        {/* الوصف */}
        <p className="text-slate-400 mb-8 leading-relaxed">
          واجهنا مشكلة غير متوقعة. لا تقلق، يمكنك المحاولة مرة أخرى.
        </p>

        {/* الأزرار */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => reset()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105"
          >
            🔄 حاول مرة أخرى
          </Button>
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 px-6 py-3 rounded-xl font-medium transition-all duration-200"
          >
            🔃 تحديث الصفحة
          </Button>
        </div>

        {/* رابط الصفحة الرئيسية */}
        <div className="mt-6">
          <a 
            href="/"
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← العودة للصفحة الرئيسية
          </a>
        </div>
      </div>
    </div>
  )
}

