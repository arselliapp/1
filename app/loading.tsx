export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center">
        {/* دائرة التحميل */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        
        {/* نص التحميل */}
        <p className="text-slate-400 text-lg animate-pulse">
          جاري التحميل...
        </p>
      </div>
    </div>
  )
}

