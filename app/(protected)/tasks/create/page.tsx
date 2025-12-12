"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowRightIcon, PlusIcon, XCircleIcon, UsersIcon, SearchIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"
import { useLanguage } from "@/contexts/language-context"
import { useTranslations } from "@/lib/translations"

interface Contact {
  id: string
  name: string
  avatar?: string
  phone?: string
}

interface TaskItem {
  id: string
  title: string
  assigned_to?: string
}

export default function CreateTaskPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { language } = useLanguage()
  const t = useTranslations(language)
  
  const TASK_TYPES = [
    { id: "daily", label: t.daily, emoji: "📅", description: language === "ar" ? "مهام تتكرر يومياً" : "Tasks that repeat daily" },
    { id: "weekly", label: t.weekly, emoji: "📆", description: language === "ar" ? "مهام تتكرر أسبوعياً" : "Tasks that repeat weekly" },
    { id: "monthly", label: t.monthly, emoji: "🗓️", description: language === "ar" ? "مهام تتكرر شهرياً" : "Tasks that repeat monthly" },
  ]

  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // حالة النموذج
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [taskType, setTaskType] = useState<string>("daily")
  const [isGroupTask, setIsGroupTask] = useState(false)
  const [completionType, setCompletionType] = useState<"all" | "any">("all") // الجميع أو أي شخص
  const [selectedMembers, setSelectedMembers] = useState<Contact[]>([])
  const [items, setItems] = useState<TaskItem[]>([{ id: "1", title: "" }])
  const [dueDate, setDueDate] = useState("")

  useEffect(() => {
    if (user) loadContacts()
  }, [user])

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("contact_user_id")
        .eq("user_id", user?.id)
        .eq("status", "accepted")

      if (error) return

      const contactIds = data?.map(c => c.contact_user_id) || []
      const contactsList: Contact[] = []

      await Promise.all(
        contactIds.map(async (id) => {
          const { data: userData } = await supabase.rpc("search_user_by_id", { input_user_id: id })
          if (userData && userData.length > 0) {
            contactsList.push({
              id,
              name: userData[0].full_name || (language === "ar" ? "مستخدم" : "User"),
              avatar: userData[0].avatar_url,
              phone: userData[0].phone_number
            })
          }
        })
      )

      setContacts(contactsList)
    } catch (err) {
      console.error("Error:", err)
    }
  }

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), title: "" }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, title: string) => {
    setItems(items.map(item => item.id === id ? { ...item, title } : item))
  }

  const toggleMember = (contact: Contact) => {
    if (selectedMembers.find(m => m.id === contact.id)) {
      setSelectedMembers(selectedMembers.filter(m => m.id !== contact.id))
    } else {
      setSelectedMembers([...selectedMembers, contact])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showToast({ title: `⚠️ ${t.warning}`, message: t.enterTaskTitle, type: "error" })
      return
    }

    const validItems = items.filter(item => item.title.trim())
    if (validItems.length === 0) {
      showToast({ title: `⚠️ ${t.warning}`, message: t.addAtLeastOne, type: "error" })
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast({ title: `⚠️ ${t.warning}`, message: t.loginRequired, type: "error" })
        return
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          task_type: taskType,
          is_group_task: isGroupTask && selectedMembers.length > 0,
          completion_type: completionType,
          member_ids: selectedMembers.map(m => m.id),
          items: validItems.map(item => ({ title: item.title.trim() })),
          due_date: dueDate || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        showToast({
          title: `✅ ${t.success}`,
          message: t.taskCreated,
          type: "success"
        })
        router.push(`/tasks/${data.task.id}`)
      } else {
        const data = await response.json()
        if (data.details?.includes("tasks_schema.sql")) {
          showToast({ 
            title: `⚠️ ${t.warning}`, 
            message: language === "ar" ? "يجب تشغيل SQL في Supabase لتفعيل نظام المهام" : "SQL must be run in Supabase to enable the tasks system", 
            type: "error" 
          })
        } else {
          showToast({ title: `❌ ${t.error}`, message: data.error || t.error, type: "error" })
        }
      }
    } catch (err) {
      console.error("Error:", err)
      showToast({ title: `❌ ${t.error}`, message: t.unexpectedError, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  return (
    <div className={`space-y-6 ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRightIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">📝 {t.newTaskTitle}</h1>
          <p className="text-muted-foreground text-sm">{t.newTaskDesc}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* نوع المهمة */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 {t.taskType}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {TASK_TYPES.map(type => (
                <div
                  key={type.id}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                    taskType === type.id
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted hover:border-muted-foreground/30"
                  }`}
                  onClick={() => setTaskType(type.id)}
                >
                  <span className="text-3xl block mb-2">{type.emoji}</span>
                  <p className="font-medium text-sm">{type.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* معلومات المهمة */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📝 {t.taskInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">{t.taskTitle}</Label>
              <Input
                id="title"
                placeholder={t.taskExample}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">{t.taskDescription}</Label>
              <Textarea
                id="description"
                placeholder={t.taskDescriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="dueDate">{t.dueDate}</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </CardContent>
        </Card>

        {/* المهام الفرعية */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>✅ {t.subTasks}</span>
              <Badge variant="secondary">{items.filter(i => i.title.trim()).length} {t.taskItems}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="text-muted-foreground w-6">{index + 1}.</span>
                <Input
                  placeholder={t.enterTask}
                  value={item.title}
                  onChange={(e) => updateItem(item.id, e.target.value)}
                />
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                  >
                    <XCircleIcon className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addItem} className="w-full">
              <PlusIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-4 w-4`} />
              {t.addSubTask}
            </Button>
          </CardContent>
        </Card>

        {/* مهمة جماعية */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              {t.groupTask}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={isGroupTask}
                onCheckedChange={(checked) => setIsGroupTask(!!checked)}
              />
              <div>
                <p className="font-medium">{t.enableGroupTask}</p>
                <p className="text-xs text-muted-foreground">
                  {t.shareWithContacts}
                </p>
              </div>
            </label>

            {isGroupTask && (
              <>
                {/* نوع الإنجاز */}
                <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                  <p className="font-medium text-sm">🎯 {t.completionType}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        completionType === "all"
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-background hover:border-muted-foreground/30"
                      }`}
                      onClick={() => setCompletionType("all")}
                    >
                      <span className="text-2xl block mb-1">👥</span>
                      <p className="font-medium text-sm">{t.everyone}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.everyoneDesc}
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        completionType === "any"
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-background hover:border-muted-foreground/30"
                      }`}
                      onClick={() => setCompletionType("any")}
                    >
                      <span className="text-2xl block mb-1">👤</span>
                      <p className="font-medium text-sm">{t.anyone}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.anyoneDesc}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {isGroupTask && (
              <>
                {/* المشاركون المحددون */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                    {selectedMembers.map(member => (
                      <Badge
                        key={member.id}
                        variant="secondary"
                        className="flex items-center gap-2 pr-1 cursor-pointer"
                        onClick={() => toggleMember(member)}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="text-xs">{member.name[0]}</AvatarFallback>
                        </Avatar>
                        {member.name}
                        <XCircleIcon className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* البحث واختيار المشاركين */}
                <div className="relative">
                  <SearchIcon className={`absolute ${language === "ar" ? "right-3" : "left-3"} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                  <Input
                    placeholder={t.searchContacts}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={language === "ar" ? "pr-10" : "pl-10"}
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredContacts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">
                      {t.noContacts}
                    </p>
                  ) : (
                    filteredContacts.map(contact => {
                      const isSelected = selectedMembers.some(m => m.id === contact.id)
                      return (
                        <div
                          key={contact.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                          }`}
                          onClick={() => toggleMember(contact)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground/50"
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={contact.avatar} />
                            <AvatarFallback>{contact.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.phone}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* زر الإنشاء */}
        <Button
          type="submit"
          className="w-full h-12 text-lg"
          disabled={loading || !title.trim() || items.filter(i => i.title.trim()).length === 0}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <PlusIcon className={`${language === "ar" ? "ml-2" : "mr-2"} h-5 w-5`} />
              {t.createTask}
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

