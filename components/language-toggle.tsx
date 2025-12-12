"use client"

import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage()

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      className="border-slate-700 text-slate-300 hover:bg-slate-800 px-4 py-2 rounded-full transition-all"
      title={language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
    >
      {language === "en" ? "عربي" : "English"}
    </Button>
  )
}

