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

    if (!phone_number) {
      return NextResponse.json({ error: "رقم الجوال مطلوب" }, { status: 400 })
    }

    // تطبيع رقم الجوال
    const normalizedPhone = normalizePhoneNumber(phone_number)

    // إنشاء admin client للتحقق
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
      console.error("Error fetching users:", error)
      return NextResponse.json({ error: "خطأ في التحقق" }, { status: 500 })
    }

    // البحث عن تكرار الرقم (مع استثناء المستخدم الحالي)
    // نقارن الأرقام بعد تطبيعها
    const duplicateUser = authUsers.users.find((u) => {
      if (u.id === user_id) return false
      const existingPhone = u.user_metadata?.phone_number
      if (!existingPhone) return false
      return normalizePhoneNumber(existingPhone) === normalizedPhone
    })

    if (duplicateUser) {
      return NextResponse.json({
        exists: true,
        message: "رقم الجوال مسجل مسبقاً بحساب آخر"
      })
    }

    return NextResponse.json({ exists: false })
  } catch (err) {
    console.error("Error checking phone:", err)
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 })
  }
}

