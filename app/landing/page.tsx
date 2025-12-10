"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  SendIcon, 
  UsersIcon, 
  BellIcon, 
  ShieldIcon, 
  HeartIcon, 
  PhoneIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  StarIcon
} from "@/components/icons"

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0)

  const features = [
    {
      icon: <SendIcon className="w-8 h-8" />,
      title: "إرسال الطلبات",
      description: "أرسل طلباتك لجهات اتصالك بسهولة - سواء كانت طلب اتصال، رسالة، أو أي نوع آخر من الطلبات",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: <UsersIcon className="w-8 h-8" />,
      title: "إدارة جهات الاتصال",
      description: "أضف أصدقاءك وعائلتك عبر رقم الجوال أو البريد الإلكتروني وتواصل معهم بسهولة",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: <BellIcon className="w-8 h-8" />,
      title: "إشعارات فورية",
      description: "احصل على إشعارات فورية عند وصول طلب جديد أو رد على طلباتك",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: <ShieldIcon className="w-8 h-8" />,
      title: "خصوصية وأمان",
      description: "بياناتك محمية بالكامل ولا يمكن لأحد الوصول إليها إلا أنت",
      color: "from-purple-500 to-pink-600"
    }
  ]

  const requestTypes = [
    { icon: <PhoneIcon className="w-6 h-6" />, label: "طلب اتصال", desc: "اطلب من شخص الاتصال بك" },
    { icon: <MessageSquareIcon className="w-6 h-6" />, label: "طلب رسالة", desc: "اطلب رسالة نصية أو صوتية" },
    { icon: <HeartIcon className="w-6 h-6" />, label: "طلب زيارة", desc: "اطلب زيارة أو لقاء" },
    { icon: <UsersIcon className="w-6 h-6" />, label: "طلب مساعدة", desc: "اطلب مساعدة في أمر ما" },
    { icon: <BellIcon className="w-6 h-6" />, label: "تذكير", desc: "ذكّر شخصاً بأمر مهم" },
  ]

  const steps = [
    { num: "1", title: "سجّل حسابك", desc: "سجل دخولك بحساب Google في ثوانٍ" },
    { num: "2", title: "أضف جهات اتصالك", desc: "ابحث عن أصدقائك وأضفهم" },
    { num: "3", title: "أرسل طلباتك", desc: "اختر نوع الطلب وأرسله" },
    { num: "4", title: "تابع الردود", desc: "احصل على إشعارات فورية" },
  ]

  const testimonials = [
    { name: "أحمد محمد", text: "تطبيق رائع! سهّل علي التواصل مع عائلتي كثيراً", rating: 5 },
    { name: "سارة علي", text: "أفضل طريقة لإرسال الطلبات والتذكيرات", rating: 5 },
    { name: "خالد عبدالله", text: "بسيط وسهل الاستخدام، أنصح به الجميع", rating: 5 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* خلفية متحركة */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* الهيدر */}
      <header className="relative z-10 container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <SendIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              أرسل لي
            </span>
          </div>
          <Link href="/login">
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-2 rounded-full shadow-lg shadow-emerald-500/25 transition-all hover:scale-105">
              ابدأ الآن
            </Button>
          </Link>
        </nav>
      </header>

      {/* القسم الرئيسي */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm">تطبيق التواصل الذكي</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              تواصل مع من تحب
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              بطريقة أسهل
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            أرسل طلباتك لجهات اتصالك واحصل على ردود فورية. سواء كنت تريد اتصالاً، رسالة، أو تذكيراً - كل شيء في مكان واحد.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-6 text-lg rounded-2xl shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 w-full sm:w-auto">
                <SendIcon className="ml-2 w-5 h-5" />
                ابدأ مجاناً
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg rounded-2xl w-full sm:w-auto">
                تعرف على المزيد
              </Button>
            </a>
          </div>

          {/* إحصائيات */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-emerald-400">+500</div>
              <div className="text-slate-500 text-sm">مستخدم نشط</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-teal-400">+2000</div>
              <div className="text-slate-500 text-sm">طلب مُرسل</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-cyan-400">99%</div>
              <div className="text-slate-500 text-sm">رضا المستخدمين</div>
            </div>
          </div>
        </div>
      </section>

      {/* المميزات */}
      <section id="features" className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              مميزات التطبيق
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            كل ما تحتاجه للتواصل مع من تحب في مكان واحد
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className={`bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group ${activeFeature === index ? 'border-emerald-500/50 scale-105' : ''}`}
              onClick={() => setActiveFeature(index)}
            >
              <CardContent className="p-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* أنواع الطلبات */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              أنواع الطلبات
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            اختر نوع الطلب المناسب لاحتياجاتك
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {requestTypes.map((type, index) => (
            <div 
              key={index}
              className="bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col items-center text-center w-40 transition-all hover:scale-105 hover:bg-slate-800"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-3 text-emerald-400">
                {type.icon}
              </div>
              <h4 className="font-bold text-white mb-1">{type.label}</h4>
              <p className="text-xs text-slate-500">{type.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* كيف يعمل */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              كيف يعمل؟
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            أربع خطوات بسيطة للبدء
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center relative">
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/50 to-transparent -z-10" />
              )}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg shadow-emerald-500/25">
                {step.num}
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{step.title}</h4>
              <p className="text-slate-400 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* آراء المستخدمين */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              آراء المستخدمين
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-slate-300 mb-4 leading-relaxed">"{testimonial.text}"</p>
                <div className="text-emerald-400 font-semibold">{testimonial.name}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* دعوة للعمل */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl p-8 md:p-16 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            جاهز للبدء؟
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            انضم إلى آلاف المستخدمين الذين يستخدمون أرسل لي للتواصل مع من يحبون
          </p>
          <Link href="/login">
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-10 py-6 text-lg rounded-2xl shadow-xl shadow-emerald-500/25 transition-all hover:scale-105">
              <SendIcon className="ml-2 w-5 h-5" />
              سجّل الآن مجاناً
            </Button>
          </Link>
        </div>
      </section>

      {/* الفوتر */}
      <footer className="relative z-10 border-t border-slate-800 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <SendIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">أرسل لي</span>
            </div>
            <div className="text-slate-500 text-sm text-center">
              جميع الحقوق محفوظة © {new Date().getFullYear()} - برمجة وتطوير:{" "}
              <a 
                href="https://wa.me/966533221164" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300"
              >
                بدر مونس الشراري أبو غيث
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

