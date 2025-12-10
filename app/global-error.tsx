"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const handleFullRefresh = () => {
    // مسح كل الـ cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      })
    }
    
    // مسح localStorage
    try {
      localStorage.clear()
    } catch (e) {}
    
    // مسح sessionStorage
    try {
      sessionStorage.clear()
    } catch (e) {}
    
    // إعادة التحميل
    window.location.href = "/"
  }

  return (
    <html lang="ar" dir="rtl">
      <body style={{
        margin: 0,
        padding: 0,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{ textAlign: "center", padding: "20px", maxWidth: "400px" }}>
          {/* أيقونة */}
          <div style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px"
          }}>
            ⚠️
          </div>

          {/* العنوان */}
          <h1 style={{
            color: "#fff",
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "12px"
          }}>
            حدث خطأ في التطبيق
          </h1>

          {/* الوصف */}
          <p style={{
            color: "#94a3b8",
            fontSize: "16px",
            lineHeight: "1.6",
            marginBottom: "32px"
          }}>
            نعتذر عن هذا الخطأ. يرجى تحديث الصفحة للمتابعة.
          </p>

          {/* الأزرار */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                background: "#10b981",
                color: "#fff",
                border: "none",
                padding: "12px 24px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "transform 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              🔄 حاول مرة أخرى
            </button>

            <button
              onClick={handleFullRefresh}
              style={{
                background: "transparent",
                color: "#94a3b8",
                border: "1px solid #475569",
                padding: "12px 24px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#1e293b"
                e.currentTarget.style.color = "#fff"
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "#94a3b8"
              }}
            >
              🔃 تحديث كامل
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

