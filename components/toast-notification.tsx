"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { CheckCircleIcon, XCircleIcon, BellIcon } from "@/components/icons"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { ...toast, id }])

    // إخفاء تلقائي بعد 5 ثواني
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* عرض الإشعارات */}
      <div className="fixed bottom-24 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:w-96 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const bgColors = {
    success: "bg-gradient-to-r from-emerald-500 to-green-500",
    error: "bg-gradient-to-r from-red-500 to-pink-500",
    info: "bg-gradient-to-r from-blue-500 to-purple-500",
  }

  const icons = {
    success: <CheckCircleIcon className="w-6 h-6 text-white" />,
    error: <XCircleIcon className="w-6 h-6 text-white" />,
    info: <BellIcon className="w-6 h-6 text-white" />,
  }

  return (
    <div
      className={`${bgColors[toast.type]} rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-300 cursor-pointer hover:scale-[1.02] transition-transform`}
      onClick={onClose}
    >
      <div className="flex items-start gap-3">
        {/* الأيقونة */}
        <div className="flex-shrink-0 mt-0.5">
          {icons[toast.type]}
        </div>

        {/* المحتوى */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-base">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-white/90 text-sm mt-1 leading-relaxed">
              {toast.message}
            </p>
          )}
          
          {/* زر الإجراء */}
          {toast.action && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toast.action?.onClick()
                onClose()
              }}
              className="mt-3 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* زر الإغلاق */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}
