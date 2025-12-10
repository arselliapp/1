export function Footer() {
  const whatsappNumber = "966533221164" // رقم الجوال بصيغة دولية (بدون +)
  const whatsappMessage = "مرحباً، أريد الاستفسار عن تطبيق أرسل لي"
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`

  return (
    <footer className="w-full bg-slate-900/50 border-t border-slate-800 py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="text-center text-slate-400 text-sm">
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
