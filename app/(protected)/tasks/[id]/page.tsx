"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowRightIcon, UsersIcon, CheckCircleIcon, CalendarIcon } from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"

interface TaskItem {
  id: string
  title: string
  description?: string
  is_completed: boolean
  completed_by?: string
  completed_at?: string
  completions: { user_id: string; completed_at: string }[]
  my_completion?: { user_id: string; completed_at: string }
}

interface Task {
  id: string
  creator_id: string
  title: string
  description?: string
  task_type: "daily" | "weekly" | "monthly"
  is_group_task: boolean
  completion_type?: "all" | "any"
  status: "active" | "completed"
  due_date?: string
  completed_at?: string
  created_at: string
  role: string
  type_info: { label: string; emoji: string }
  items: TaskItem[]
  members: { user_id: string; name: string; avatar?: string; role: string }[]
  progress: number
  total_items: number
  completed_items: number
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params?.id as string
  const { user } = useAuth()
  const { showToast } = useToast()

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingItem, setProcessingItem] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    if (user && taskId) loadTask()
  }, [user, taskId])

  useEffect(() => {
    const handleNewNotification = () => loadTask()
    window.addEventListener('newNotification', handleNewNotification)
    
    // تحديث تلقائي كل 5 ثواني للمهام الجماعية
    const interval = setInterval(() => {
      if (task?.is_group_task && task?.status === "active") {
        loadTask()
      }
    }, 5000)
    
    return () => {
      window.removeEventListener('newNotification', handleNewNotification)
      clearInterval(interval)
    }
  }, [user, taskId, task?.is_group_task, task?.status])

  const loadTask = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/tasks", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const foundTask = data.tasks?.find((t: Task) => t.id === taskId)
        setTask(foundTask || null)
      }
    } catch (err) {
      console.error("Error loading task:", err)
    } finally {
      setLoading(false)
    }
  }

  const toggleItemCompletion = async (itemId: string, currentlyCompleted: boolean) => {
    if (!task) return
    setProcessingItem(itemId)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/tasks/${taskId}/complete-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          item_id: itemId,
          completed: !currentlyCompleted
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // إذا اكتملت المهمة بالكامل
        if (data.task_completed) {
          setShowCelebration(true)
          showToast({
            title: "🎉 مبروك!",
            message: "تم إنجاز المهمة بالكامل",
            type: "success"
          })
        } else {
          showToast({
            title: currentlyCompleted ? "↩️ تم التراجع" : "✅ تم الإنجاز",
            message: currentlyCompleted ? "تم إلغاء التنفيذ" : "تم تحديد المهمة كمنفذة",
            type: "success"
          })
        }
        
        loadTask()
      }
    } catch (err) {
      console.error("Error:", err)
      showToast({ title: "❌ خطأ", message: "حدث خطأ", type: "error" })
    } finally {
      setProcessingItem(null)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "daily": return "bg-blue-500"
      case "weekly": return "bg-green-500"
      case "monthly": return "bg-purple-500"
      default: return "bg-gray-500"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">المهمة غير موجودة</p>
        <Button className="mt-4" onClick={() => router.push("/tasks")}>
          العودة للمهام
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* شاشة الاحتفال */}
      {showCelebration && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowCelebration(false)}
        >
          <div className="text-center animate-in zoom-in-50 duration-500">
            <div className="text-9xl mb-6 animate-bounce">🎉</div>
            <h1 className="text-4xl font-bold text-white mb-4">مبروك!</h1>
            <p className="text-xl text-white/80 mb-2">تم إنجاز المهمة بنجاح</p>
            <p className="text-lg text-primary font-semibold">{task.title}</p>
            <div className="mt-8 flex gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => {
                  setShowCelebration(false)
                  router.push("/tasks")
                }}
              >
                العودة للمهام
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setShowCelebration(false)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/tasks")}>
          <ArrowRightIcon className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <Badge className={`${getTypeColor(task.task_type)} text-white`}>
              {task.type_info.emoji} {task.type_info.label}
            </Badge>
          </div>
          {task.description && (
            <p className="text-muted-foreground text-sm mt-1">{task.description}</p>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <Card className={task.status === "completed" ? "border-green-500 bg-green-500/10" : ""}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {task.status === "completed" ? (
                <Badge className="bg-green-500">✅ مكتملة</Badge>
              ) : (
                <Badge className="bg-amber-500">🔄 نشطة</Badge>
              )}
              {task.is_group_task && (
                <Badge variant="outline">
                  <UsersIcon className="ml-1 h-3 w-3" />
                  جماعية ({task.members.length} مشارك)
                </Badge>
              )}
            </div>
            <div className="text-left">
              <span className="text-3xl font-bold text-primary">{task.progress}%</span>
            </div>
          </div>
          <div className="relative h-4 mb-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className="absolute top-0 right-0 h-full bg-gradient-to-l from-primary to-primary/70 transition-all duration-500 rounded-full"
              style={{ width: `${task.progress}%` }}
            />
            {task.progress > 0 && task.progress < 100 && (
              <div 
                className="absolute top-0 h-full w-1 bg-white/50 animate-pulse"
                style={{ right: `${task.progress}%`, transform: "translateX(50%)" }}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{task.completed_items} من {task.total_items} مهام مكتملة</span>
            {task.is_group_task && task.status === "active" && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                تحديث تلقائي
              </span>
            )}
          </div>
          {task.is_group_task && (
            <div className="mt-3 p-2 bg-muted/50 rounded-lg flex items-center gap-2 text-sm">
              <span>نوع الإنجاز:</span>
              <Badge variant="secondary">
                {task.completion_type === "any" ? "👤 أي شخص يكفي" : "👥 الجميع مطلوب"}
              </Badge>
            </div>
          )}
          {task.due_date && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              الاستحقاق: {formatDate(task.due_date)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      {task.is_group_task && task.members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              المشاركون ({task.members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {task.members.map(member => (
                <div key={member.user_id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{member.name}</span>
                  {member.role === "owner" && (
                    <Badge variant="secondary" className="text-xs">المنشئ</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">✅ المهام الفرعية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {task.items.map((item, index) => {
            const isMyCompleted = task.is_group_task ? !!item.my_completion : item.is_completed
            const isProcessing = processingItem === item.id
            const completionCount = item.completions?.length || 0
            const totalMembers = task.members.length
            const isFullyCompleted = task.is_group_task 
              ? completionCount >= totalMembers 
              : item.is_completed

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isFullyCompleted 
                    ? "bg-green-500/10 border-green-500/50" 
                    : "bg-muted/50 border-transparent"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Checkbox
                        checked={isMyCompleted}
                        onCheckedChange={() => toggleItemCompletion(item.id, isMyCompleted)}
                        disabled={task.status === "completed"}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isFullyCompleted ? "line-through text-muted-foreground" : ""}`}>
                      {index + 1}. {item.title}
                    </p>
                    
                    {/* للمهام الجماعية: عرض من أكمل */}
                    {task.is_group_task && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          {completionCount} من {totalMembers} أنجزوا هذه المهمة
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {task.members.map(member => {
                            const hasCompleted = item.completions?.some(c => c.user_id === member.user_id)
                            return (
                              <div
                                key={member.user_id}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                  hasCompleted ? "bg-green-500/20 text-green-600" : "bg-muted"
                                }`}
                              >
                                {hasCompleted && <CheckCircleIcon className="h-3 w-3" />}
                                {member.name.split(" ")[0]}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {isFullyCompleted && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

