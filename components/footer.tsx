"use client"

import { usePathname } from "next/navigation"

export function Footer() {
  const pathname = usePathname()
  const whatsappNumber = "966533221164"
  const whatsappMessage = "مرحباً، أريد الاستفسار عن تطبيق أرسل لي"
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`

  // إظهار الفوتر في الصفحة الرئيسية فقط
  const isHomePage = pathname === "/dashboard" || pathname === "/"

  if (!isHomePage) {
    return null
  }

  return (
    <footer className="w-full bg-slate-900/80 border-t border-slate-700 py-3 
                       fixed bottom-16 md:bottom-0 left-0 right-0 z-30
                       md:relative md:mt-auto backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="text-center text-slate-400 text-xs md:text-sm">
          <p>
            جميع الحقوق محفوظة © {new Date().getFullYear()} - برمجة وتطوير:{" "}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 transition-colors font-semibold"
            >
              بدر مونس الشراري أبو غيث
            </a>
            {" "}- جوال:{" "}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              0533221164
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
