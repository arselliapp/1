"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/contexts/language-context"
import { 
  SendIcon, 
  UsersIcon, 
  BellIcon, 
  ShieldIcon, 
  HeartIcon, 
  PhoneIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  StarIcon,
  MailIcon,
  CalendarIcon,
  ListTodoIcon
} from "@/components/icons"

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState(0)
  const { language } = useLanguage()

  const content = useMemo(() => {
    if (language === "ar") {
      return {
        appName: "أرسل لي",
        badge: "تطبيق التواصل الذكي",
        heroTitle1: "منصة تواصل اجتماعي",
        heroTitle2: "متكاملة وذكية",
        heroDesc: "تطبيق ويب متكامل يجمع بين نظام طلبات ذكي، محادثات فورية، إدارة تنبيهات ومواعيد، ومهام جماعية - كل ذلك في منصة واحدة حديثة وآمنة.",
        startFree: "ابدأ مجاناً",
        learnMore: "تعرف على المزيد",
        featuresTitle: "مميزات التطبيق",
        featuresSubtitle: "كل ما تحتاجه للتواصل مع من تحب في مكان واحد",
        requestTypesTitle: "أنواع الطلبات",
        requestTypesSubtitle: "اختر نوع الطلب المناسب لاحتياجاتك",
        howItWorksTitle: "كيف يعمل؟",
        howItWorksSubtitle: "أربع خطوات بسيطة للبدء",
        testimonialsTitle: "آراء المستخدمين",
        investmentTitle: "الفرص الاستثمارية",
        investmentSubtitle: "منصة متكاملة جاهزة للتوسع والنمو",
        readyTitle: "جاهز للاستثمار؟",
        readyDesc: "منصة متكاملة جاهزة للنمو والتوسع. تواصل معنا لمناقشة الفرص الاستثمارية",
        tryApp: "جرب التطبيق",
        contactUs: "تواصل معنا",
        contactTitle: "معلومات الاتصال",
        contactSubtitle: "للاستفسارات والفرص الاستثمارية",
        email: "البريد الإلكتروني",
        phone: "رقم الجوال",
        footerDesc: "منصة تواصل اجتماعي متكاملة تجمع بين الطلبات، المحادثات، التنبيهات، والمهام في مكان واحد.",
        footerContact: "معلومات الاتصال",
        footerLinks: "روابط سريعة",
        login: "تسجيل الدخول",
        featuresLink: "المميزات",
        contact: "اتصل بنا",
        copyright: "جميع الحقوق محفوظة",
        developedBy: "برمجة وتطوير",
        developerName: "بدر مونس الشراري أبو غيث",
        businessValue: "💼 القيمة التجارية:",
        features: [
          {
            icon: <SendIcon className="w-8 h-8" />,
            title: "نظام طلبات ذكي",
            description: "منصة متكاملة لإرسال وإدارة الطلبات بأنواع متعددة (اتصال، رسالة، تذكير، اجتماع، دعوة زواج) مع نظام ردود ذكي وتصنيف تلقائي",
            color: "from-emerald-500 to-teal-600",
            businessValue: "فرصة سوقية كبيرة في مجال التواصل الاجتماعي والمناسبات"
          },
          {
            icon: <MessageSquareIcon className="w-8 h-8" />,
            title: "نظام محادثات متقدم",
            description: "نظام دردشة كامل مع رسائل نصية، ردود على الرسائل، حالة القراءة، ومؤشر الكتابة مع إشعارات فورية",
            color: "from-blue-500 to-indigo-600",
            businessValue: "منافسة مباشرة لتطبيقات المراسلة التقليدية"
          },
          {
            icon: <CalendarIcon className="w-8 h-8" />,
            title: "إدارة تنبيهات ومواعيد",
            description: "نظام متكامل لإدارة التنبيهات والمواعيد مع جدولة تلقائية، إشعارات مسبقة، وقبول/رفض الطلبات",
            color: "from-orange-500 to-red-600",
            businessValue: "حل متكامل لإدارة المناسبات والمواعيد الاجتماعية"
          },
          {
            icon: <ListTodoIcon className="w-8 h-8" />,
            title: "نظام مهام جماعية",
            description: "إدارة مهام جماعية مع تتبع التقدم، إشعارات فورية، ومشاركة بين المستخدمين - مثالي للعائلات والفرق",
            color: "from-purple-500 to-pink-600",
            businessValue: "سوق متنامي في مجال إدارة المهام التعاونية"
          },
          {
            icon: <BellIcon className="w-8 h-8" />,
            title: "إشعارات Push متقدمة",
            description: "نظام إشعارات Push متكامل يعمل حتى عند إغلاق التطبيق، مع دعم متصفحات متعددة وتخزين في قاعدة البيانات",
            color: "from-cyan-500 to-blue-600",
            businessValue: "تقنية حديثة تضمن وصول الإشعارات 100%"
          },
          {
            icon: <ShieldIcon className="w-8 h-8" />,
            title: "أمان وخصوصية عالية",
            description: "حماية كاملة للبيانات مع Row Level Security، تشفير الاتصالات، ونظام مصادقة آمن",
            color: "from-violet-500 to-purple-600",
            businessValue: "متوافق مع معايير الأمان العالمية"
          }
        ],
        requestTypes: [
          { icon: <PhoneIcon className="w-6 h-6" />, label: "طلب اتصال", desc: "اطلب من شخص الاتصال بك" },
          { icon: <MessageSquareIcon className="w-6 h-6" />, label: "طلب رسالة", desc: "اطلب رسالة نصية أو صوتية" },
          { icon: <HeartIcon className="w-6 h-6" />, label: "طلب زيارة", desc: "اطلب زيارة أو لقاء" },
          { icon: <UsersIcon className="w-6 h-6" />, label: "طلب مساعدة", desc: "اطلب مساعدة في أمر ما" },
          { icon: <BellIcon className="w-6 h-6" />, label: "تذكير", desc: "ذكّر شخصاً بأمر مهم" },
        ],
        steps: [
          { num: "1", title: "سجّل حسابك", desc: "سجل دخولك بحساب Google في ثوانٍ" },
          { num: "2", title: "أضف جهات اتصالك", desc: "ابحث عن أصدقائك وأضفهم" },
          { num: "3", title: "أرسل طلباتك", desc: "اختر نوع الطلب وأرسله" },
          { num: "4", title: "تابع الردود", desc: "احصل على إشعارات فورية" },
        ],
        testimonials: [
          { name: "أحمد محمد", text: "تطبيق رائع! سهّل علي التواصل مع عائلتي كثيراً", rating: 5 },
          { name: "سارة علي", text: "أفضل طريقة لإرسال الطلبات والتذكيرات", rating: 5 },
          { name: "خالد عبدالله", text: "بسيط وسهل الاستخدام، أنصح به الجميع", rating: 5 },
        ],
        investmentCards: [
          { value: "100%", title: "جاهزية تقنية", desc: "تطبيق كامل ومكتمل بجميع المميزات", color: "from-emerald-500/10 to-teal-500/10", borderColor: "border-emerald-500/20", textColor: "text-emerald-400" },
          { value: "PWA", title: "تطبيق ويب متقدم", desc: "يعمل على جميع الأجهزة بدون تثبيت", color: "from-blue-500/10 to-indigo-500/10", borderColor: "border-blue-500/20", textColor: "text-blue-400" },
          { value: "∞", title: "قابلية التوسع", desc: "بنية تحتية قابلة للتوسع بلا حدود", color: "from-purple-500/10 to-pink-500/10", borderColor: "border-purple-500/20", textColor: "text-purple-400" },
        ]
      }
    } else {
      return {
        appName: "Arselli",
        badge: "Smart Communication Platform",
        heroTitle1: "Integrated Social",
        heroTitle2: "Communication Platform",
        heroDesc: "A comprehensive web application that combines smart request system, instant messaging, reminder and appointment management, and collaborative tasks - all in one modern and secure platform.",
        startFree: "Start Free",
        learnMore: "Learn More",
        featuresTitle: "Platform Features",
        featuresSubtitle: "Everything you need to communicate with your loved ones in one place",
        requestTypesTitle: "Request Types",
        requestTypesSubtitle: "Choose the request type that suits your needs",
        howItWorksTitle: "How It Works?",
        howItWorksSubtitle: "Four simple steps to get started",
        testimonialsTitle: "User Reviews",
        investmentTitle: "Investment Opportunities",
        investmentSubtitle: "An integrated platform ready for expansion and growth",
        readyTitle: "Ready to Invest?",
        readyDesc: "An integrated platform ready for growth and expansion. Contact us to discuss investment opportunities",
        tryApp: "Try the App",
        contactUs: "Contact Us",
        contactTitle: "Contact Information",
        contactSubtitle: "For inquiries and investment opportunities",
        email: "Email",
        phone: "Phone Number",
        footerDesc: "An integrated social communication platform that combines requests, conversations, reminders, and tasks in one place.",
        footerContact: "Contact Information",
        footerLinks: "Quick Links",
        login: "Login",
        featuresLink: "Features",
        contact: "Contact Us",
        copyright: "All rights reserved",
        developedBy: "Developed by",
        developerName: "Badar Mons Al-Sharari Abu Ghaith",
        businessValue: "💼 Business Value:",
        features: [
          {
            icon: <SendIcon className="w-8 h-8" />,
            title: "Smart Request System",
            description: "An integrated platform for sending and managing requests of multiple types (call, message, reminder, meeting, marriage proposal) with smart reply system and automatic categorization",
            color: "from-emerald-500 to-teal-600",
            businessValue: "Large market opportunity in social communication and events"
          },
          {
            icon: <MessageSquareIcon className="w-8 h-8" />,
            title: "Advanced Messaging System",
            description: "Complete chat system with text messages, message replies, read status, and typing indicators with instant notifications",
            color: "from-blue-500 to-indigo-600",
            businessValue: "Direct competition with traditional messaging apps"
          },
          {
            icon: <CalendarIcon className="w-8 h-8" />,
            title: "Reminder & Appointment Management",
            description: "Integrated system for managing reminders and appointments with automatic scheduling, advance notifications, and accept/reject requests",
            color: "from-orange-500 to-red-600",
            businessValue: "Complete solution for managing social events and appointments"
          },
          {
            icon: <ListTodoIcon className="w-8 h-8" />,
            title: "Collaborative Task System",
            description: "Group task management with progress tracking, instant notifications, and user collaboration - perfect for families and teams",
            color: "from-purple-500 to-pink-600",
            businessValue: "Growing market in collaborative task management"
          },
          {
            icon: <BellIcon className="w-8 h-8" />,
            title: "Advanced Push Notifications",
            description: "Integrated Push notification system that works even when the app is closed, with multi-browser support and database storage",
            color: "from-cyan-500 to-blue-600",
            businessValue: "Modern technology ensuring 100% notification delivery"
          },
          {
            icon: <ShieldIcon className="w-8 h-8" />,
            title: "High Security & Privacy",
            description: "Complete data protection with Row Level Security, encrypted communications, and secure authentication system",
            color: "from-violet-500 to-purple-600",
            businessValue: "Compliant with global security standards"
          }
        ],
        requestTypes: [
          { icon: <PhoneIcon className="w-6 h-6" />, label: "Call Request", desc: "Request someone to call you" },
          { icon: <MessageSquareIcon className="w-6 h-6" />, label: "Message Request", desc: "Request a text or voice message" },
          { icon: <HeartIcon className="w-6 h-6" />, label: "Visit Request", desc: "Request a visit or meeting" },
          { icon: <UsersIcon className="w-6 h-6" />, label: "Help Request", desc: "Request help with something" },
          { icon: <BellIcon className="w-6 h-6" />, label: "Reminder", desc: "Remind someone of something important" },
        ],
        steps: [
          { num: "1", title: "Sign Up", desc: "Sign in with your Google account in seconds" },
          { num: "2", title: "Add Contacts", desc: "Search for your friends and add them" },
          { num: "3", title: "Send Requests", desc: "Choose the request type and send it" },
          { num: "4", title: "Track Responses", desc: "Get instant notifications" },
        ],
        testimonials: [
          { name: "Ahmed Mohammed", text: "Great app! Made it much easier to communicate with my family", rating: 5 },
          { name: "Sara Ali", text: "Best way to send requests and reminders", rating: 5 },
          { name: "Khalid Abdullah", text: "Simple and easy to use, I recommend it to everyone", rating: 5 },
        ],
        investmentCards: [
          { value: "100%", title: "Technical Readiness", desc: "Complete application with all features", color: "from-emerald-500/10 to-teal-500/10", borderColor: "border-emerald-500/20", textColor: "text-emerald-400" },
          { value: "PWA", title: "Advanced Web App", desc: "Works on all devices without installation", color: "from-blue-500/10 to-indigo-500/10", borderColor: "border-blue-500/20", textColor: "text-blue-400" },
          { value: "∞", title: "Scalability", desc: "Infrastructure scalable without limits", color: "from-purple-500/10 to-pink-500/10", borderColor: "border-purple-500/20", textColor: "text-purple-400" },
        ]
      }
    }
  }, [language])

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden ${language === "ar" ? "rtl" : "ltr"}`}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <SendIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {content.appName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-2 rounded-full shadow-lg shadow-emerald-500/25 transition-all hover:scale-105">
                {content.startFree}
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm">{content.badge}</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              {content.heroTitle1}
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {content.heroTitle2}
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {content.heroDesc}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-6 text-lg rounded-2xl shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 w-full sm:w-auto">
                <SendIcon className={`${language === "ar" ? "ml-2" : "mr-2"} w-5 h-5`} />
                {content.startFree}
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg rounded-2xl w-full sm:w-auto">
                {content.learnMore}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {content.featuresTitle}
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            {content.featuresSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.features.map((feature, index) => (
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
                <p className="text-slate-400 text-sm leading-relaxed mb-3">{feature.description}</p>
                {feature.businessValue && (
                  <div className="pt-3 border-t border-slate-700/50">
                    <p className="text-xs text-emerald-400 font-semibold">{content.businessValue}</p>
                    <p className="text-xs text-slate-500 mt-1">{feature.businessValue}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Request Types */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {content.requestTypesTitle}
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            {content.requestTypesSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
          {content.requestTypes.map((type, index) => (
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

      {/* How It Works */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {content.howItWorksTitle}
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            {content.howItWorksSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {content.steps.map((step, index) => (
            <div key={index} className="text-center relative">
              {index < content.steps.length - 1 && (
                <div className={`hidden md:block absolute top-8 ${language === "ar" ? "right-0" : "left-0"} w-full h-0.5 bg-gradient-to-r ${language === "ar" ? "from-transparent to-emerald-500/50" : "from-emerald-500/50 to-transparent"} -z-10`} />
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

      {/* Testimonials */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {content.testimonialsTitle}
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {content.testimonials.map((testimonial, index) => (
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

      {/* Investment Opportunities */}
      <section className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {content.investmentTitle}
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            {content.investmentSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {content.investmentCards.map((card, index) => (
            <Card key={index} className={`bg-gradient-to-br ${card.color} ${card.borderColor}`}>
              <CardContent className="p-6 text-center">
                <div className={`text-4xl font-bold ${card.textColor} mb-2`}>{card.value}</div>
                <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
                <p className="text-slate-400 text-sm">{card.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-3xl p-8 md:p-16 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            {content.readyTitle}
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            {content.readyDesc}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-6 text-lg rounded-2xl shadow-xl shadow-emerald-500/25 transition-all hover:scale-105">
                <SendIcon className={`${language === "ar" ? "ml-2" : "mr-2"} w-5 h-5`} />
                {content.tryApp}
              </Button>
            </Link>
            <a href="#contact">
              <Button variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 px-8 py-6 text-lg rounded-2xl">
                <PhoneIcon className={`${language === "ar" ? "ml-2" : "mr-2"} w-5 h-5`} />
                {content.contactUs}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section id="contact" className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {content.contactTitle}
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            {content.contactSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/50 transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <MailIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{content.email}</h3>
              <a 
                href="mailto:Badar2003@gmail.com" 
                className="text-emerald-400 hover:text-emerald-300 text-lg font-semibold break-all"
              >
                Badar2003@gmail.com
              </a>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/50 transition-all">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <PhoneIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{content.phone}</h3>
              <a 
                href="https://wa.me/966533221164" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 text-lg font-semibold"
              >
                +966 53 322 1164
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <SendIcon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">{content.appName}</span>
              </div>
              <p className="text-slate-400 text-sm">
                {content.footerDesc}
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">{content.footerContact}</h4>
              <div className="space-y-3">
                <a 
                  href="mailto:Badar2003@gmail.com" 
                  className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors text-sm"
                >
                  <MailIcon className="w-5 h-5" />
                  Badar2003@gmail.com
                </a>
                <a 
                  href="https://wa.me/966533221164" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-slate-400 hover:text-emerald-400 transition-colors text-sm"
                >
                  <PhoneIcon className="w-5 h-5" />
                  +966 53 322 1164
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">{content.footerLinks}</h4>
              <div className="space-y-2">
                <Link href="/login" className="block text-slate-400 hover:text-emerald-400 transition-colors text-sm">
                  {content.login}
                </Link>
                <a href="#features" className="block text-slate-400 hover:text-emerald-400 transition-colors text-sm">
                  {content.featuresLink}
                </a>
                <a href="#contact" className="block text-slate-400 hover:text-emerald-400 transition-colors text-sm">
                  {content.contact}
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-slate-500 text-sm text-center">
                {content.copyright} © {new Date().getFullYear()} - {content.developedBy}:{" "}
                <a 
                  href="https://wa.me/966533221164" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  {content.developerName}
                </a>
              </div>
              <div className="flex items-center gap-4">
                <a 
                  href="mailto:Badar2003@gmail.com" 
                  className="text-slate-500 hover:text-emerald-400 transition-colors"
                >
                  <MailIcon className="w-5 h-5" />
                </a>
                <a 
                  href="https://wa.me/966533221164" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-emerald-400 transition-colors"
                >
                  <PhoneIcon className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
