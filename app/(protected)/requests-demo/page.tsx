"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const scenarios = [
  {
    id: "quick-replies",
    title: "⚡ الردود السريعة",
    description: "أزرار جاهزة للردود المتكررة بنقرة واحدة",
    features: ["شكراً، تم الإضافة ✅", "راح أرد لك لاحقاً ⏰", "آسف، مشغول حالياً 🙏", "رد مخصص"],
    color: "bg-blue-500"
  },
  {
    id: "smart-sort",
    title: "🎯 التصنيف الذكي",
    description: "تصنيف وفرز الطلبات حسب الأولوية والنوع",
    features: ["🔴 عاجل", "🟡 عادي", "🟢 منخفض", "فرز حسب النوع"],
    color: "bg-purple-500"
  },
  {
    id: "bulk-actions",
    title: "📦 الإجراءات المجمعة",
    description: "تحديد متعدد وإجراءات على عدة طلبات",
    features: ["تحديد متعدد", "قبول/رفض المحدد", "رد موحد", "أرشفة"],
    color: "bg-orange-500"
  },
  {
    id: "reminders",
    title: "🔔 التذكيرات",
    description: "تنبيهات للطلبات التي لم ترد عليها",
    features: ["تنبيه بعد 24 ساعة", "تنبيه المُرسل", "إعادة إرسال", "مؤقت الرد"],
    color: "bg-red-500"
  },
  {
    id: "swipe",
    title: "👆 واجهة Swipe",
    description: "اسحب للقبول أو الرفض مثل التطبيقات الحديثة",
    features: ["اسحب يمين = قبول", "اسحب يسار = رفض", "اضغط مطول = رد", "أنيميشن سلس"],
    color: "bg-pink-500"
  },
  {
    id: "stats",
    title: "📊 الإحصائيات",
    description: "تقارير وإحصائيات عن نشاطك",
    features: ["طلبات الأسبوع", "نسبة القبول", "متوسط وقت الرد", "أكثر من راسلك"],
    color: "bg-green-500"
  },
]

export default function RequestsDemoPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🧪 سيناريوهات الطلبات</h1>
        <p className="text-muted-foreground">اختر السيناريو الذي تريد تجربته</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <Link key={scenario.id} href={`/requests-demo/${scenario.id}`}>
            <Card className="h-full hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${scenario.color}`} />
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {scenario.title}
                  </CardTitle>
                </div>
                <CardDescription>{scenario.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {scenario.features.map((feature, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-center pt-4">
        <Link href="/requests" className="text-primary hover:underline">
          ← العودة للطلبات الأصلية
        </Link>
      </div>
    </div>
  )
}

