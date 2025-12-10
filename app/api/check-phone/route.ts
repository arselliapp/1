import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// تحويل الأرقام العربية إلى إنجليزية
function normalizePhoneNumber(phone: string): string {
  const arabicNumerals = '٠١٢٣٤٥٦٧٨٩'
  const englishNumerals = '0123456789'
  
  let normalized = phone
  for (let i = 0; i < arabicNumerals.length; i++) {
    normalized = normalized.replace(new RegExp(arabicNumerals[i], 'g'), englishNumerals[i])
  }
  
  // إزالة أي مسافات أو رموز
  return normalized.replace(/[\s\-\(\)]/g, '').trim()
}

export async function POST(request: Request) {
  try {
    const { phone_number, user_id } = await request.json()

    console.log("📱 Checking phone:", phone_number, "for user:", user_id)

    if (!phone_number) {
      return NextResponse.json({ error: "رقم الجوال مطلوب" }, { status: 400 })
    }

    // تطبيع رقم الجوال
    const normalizedPhone = normalizePhoneNumber(phone_number)
    console.log("📱 Normalized phone:", normalizedPhone)

    // التحقق من وجود المفاتيح
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Missing Supabase credentials")
      // إذا لم تكن المفاتيح موجودة، نسمح بالمتابعة (لكن نسجل تحذير)
      return NextResponse.json({ exists: false, warning: "Could not verify" })
    }

    // إنشاء admin client للتحقق
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // البحث عن مستخدمين لديهم نفس رقم الجوال
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error("❌ Error fetching users:", error)
      return NextResponse.json({ error: "خطأ في التحقق" }, { status: 500 })
    }

    console.log("👥 Total users found:", authUsers.users.length)

    // البحث عن تكرار الرقم (مع استثناء المستخدم الحالي)
    // نقارن الأرقام بعد تطبيعها
    const duplicateUser = authUsers.users.find((u) => {
      if (u.id === user_id) return false
      const existingPhone = u.user_metadata?.phone_number
      if (!existingPhone) return false
      const normalizedExisting = normalizePhoneNumber(existingPhone)
      const isMatch = normalizedExisting === normalizedPhone
      if (isMatch) {
        console.log("⚠️ Found duplicate! User:", u.email, "Phone:", existingPhone)
      }
      return isMatch
    })

    if (duplicateUser) {
      console.log("❌ Phone already exists for another user")
      return NextResponse.json({
        exists: true,
        message: "رقم الجوال مسجل مسبقاً بحساب آخر"
      })
    }

    console.log("✅ Phone is available")
    return NextResponse.json({ exists: false })
  } catch (err) {
    console.error("❌ Error checking phone:", err)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}

