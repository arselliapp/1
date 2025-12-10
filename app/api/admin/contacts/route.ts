import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
)

export async function GET() {
  try {
    // جلب جميع جهات الاتصال (تجاوز RLS)
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .schema('public')
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false })

    console.log("Contacts query:", { contacts, contactsError })

    if (contactsError) {
      console.error("Contacts error:", contactsError)
      return NextResponse.json({ error: contactsError.message }, { status: 500 })
    }

    // جلب بيانات المستخدمين
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
    const usersMap = new Map(
      (authData?.users || []).map((u) => [
        u.id,
        {
          email: u.email || "",
          full_name: u.user_metadata?.full_name || u.user_metadata?.name || "مستخدم",
          phone_number: u.user_metadata?.phone_number || "",
          avatar_url: u.user_metadata?.avatar_url
        }
      ])
    )

    // دمج البيانات
    const enrichedContacts = (contacts || []).map((c) => {
      const owner = usersMap.get(c.user_id) || {}
      const contact = usersMap.get(c.contact_user_id) || {}

      return {
        id: c.id,
        owner_id: c.user_id,
        owner_name: owner.full_name || "مستخدم",
        owner_email: owner.email || "",
        owner_phone: owner.phone_number || "",
        contact_id: c.contact_user_id,
        contact_name: contact.full_name || "مستخدم",
        contact_email: contact.email || "",
        contact_phone: contact.phone_number || "",
        contact_avatar: contact.avatar_url,
        status: c.status,
        created_at: c.created_at
      }
    })

    return NextResponse.json({ contacts: enrichedContacts })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()

    const { error } = await supabaseAdmin
      .schema('public')
      .from("contacts")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
