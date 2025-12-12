"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  CheckCircleIcon, ClockIcon, UsersIcon, CalendarIcon,
  PlusIcon, TrashIcon
} from "@/components/icons"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/toast-notification"
import { useLanguage } from "@/contexts/language-context"
import { useTranslations } from "@/lib/translations"

interface TaskItem {
  id: string
  title: string
  is_completed: boolean
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
  created_at: string
  role: string
  type_info: { label: string; emoji: string; color: string }
  items: TaskItem[]
  members: { user_id: string; name: string; avatar?: string; role: string }[]
  progress: number
  total_items: number
  completed_items: number
}

export default function TasksPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams?.get("tab") || "active"
  const { user } = useAuth()
  const { showToast } = useToast()
  const { language } = useLanguage()
  const t = useTranslations(language)

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (user) loadTasks()
  }, [user])

  useEffect(() => {
    const handleNewNotification = () => loadTasks()
    window.addEventListener('newNotification', handleNewNotification)
    return () => window.removeEventListener('newNotification', handleNewNotification)
  }, [user])

  const loadTasks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch("/api/tasks", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (err) {
      console.error("Error loading tasks:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      setDeletingTaskId(taskId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showToast({ title: t.warning, message: t.loginRequired, type: "info" })
        return
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        showToast({ title: t.success, message: t.taskDeleted, type: "success" })
        setTasks(prev => prev.filter(t => t.id !== taskId))
      } else {
        const text = await response.text()
        console.error("Failed to delete task:", text)
        showToast({ title: t.error, message: t.deleteTaskError, type: "error" })
      }
    } catch (err) {
      console.error("Error deleting task:", err)
      showToast({ title: t.error, message: t.unexpectedError, type: "error" })
    } finally {
      setDeletingTaskId(null)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/tasks?tab=${tab}`, { scroll: false })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "daily": return "bg-blue-500"
      case "weekly": return "bg-green-500"
      case "monthly": return "bg-purple-500"
      default: return "bg-gray-500"
    }
  }

  // ترتيب المهام حسب آخر تحديث
  const sortByDate = (a: Task, b: Task) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return dateB - dateA // الأحدث أولاً
  }

  // فلترة المهام
  const filteredTasks = tasks
    .filter(t => {
      const statusMatch = activeTab === "all" || t.status === activeTab
      const typeMatch = typeFilter === "all" || t.task_type === typeFilter
      return statusMatch && typeMatch
    })
    .sort(sortByDate)

  const activeTasks = tasks.filter(t => t.status === "active").sort(sortByDate)
  const completedTasks = tasks.filter(t => t.status === "completed").sort(sortByDate)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${language === "ar" ? "rtl" : "ltr"}`} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            📋 {t.tasksTitle}
            {activeTasks.length > 0 && (
              <Badge variant="secondary">{activeTasks.length} {t.active}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">{t.taskManagement}</p>
        </div>
        <Link href="/tasks/create">
          <Button>
            <PlusIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-4 w-4`} />
            {t.newTaskBtn}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card 
          className={`cursor-pointer transition-all ${typeFilter === "daily" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => setTypeFilter(typeFilter === "daily" ? "all" : "daily")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl">📅</p>
            <p className="text-xl font-bold">{tasks.filter(t => t.task_type === "daily").length}</p>
            <p className="text-xs text-muted-foreground">{t.daily}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${typeFilter === "weekly" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setTypeFilter(typeFilter === "weekly" ? "all" : "weekly")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl">📆</p>
            <p className="text-xl font-bold">{tasks.filter(t => t.task_type === "weekly").length}</p>
            <p className="text-xs text-muted-foreground">{t.weekly}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${typeFilter === "monthly" ? "ring-2 ring-purple-500" : ""}`}
          onClick={() => setTypeFilter(typeFilter === "monthly" ? "all" : "monthly")}
        >
          <CardContent className="p-4 text-center">
            <p className="text-3xl">🗓️</p>
            <p className="text-xl font-bold">{tasks.filter(t => t.task_type === "monthly").length}</p>
            <p className="text-xs text-muted-foreground">{t.monthly}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="active" className="text-sm">
            🔄 {t.active}
            {activeTasks.length > 0 && (
              <Badge className={`${language === "ar" ? "mr-1" : "ml-1"} h-5 min-w-[20px] p-0 justify-center bg-primary`}>{activeTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-sm">
            ✅ {t.completed}
          </TabsTrigger>
          <TabsTrigger value="all" className="text-sm">
            📋 {t.all}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <span className="text-6xl block mb-4">📋</span>
                <p className="text-lg font-medium text-muted-foreground">
                  {activeTab === "active" ? t.noActiveTasks : 
                   activeTab === "completed" ? t.noCompletedTasks : t.noTasks}
                </p>
                <Link href="/tasks/create">
                  <Button className="mt-4">
                    <PlusIcon className={`${language === "ar" ? "ml-1" : "mr-1"} h-4 w-4`} />
                    {t.createTask}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map(task => {
              const canDelete = !task.is_group_task || task.role === "creator" || task.creator_id === user?.id
              return (
                <Link key={task.id} href={`/tasks/${task.id}`}>
                  <Card className={`cursor-pointer hover:shadow-md transition-all text-right ${
                    task.status === "completed" ? "opacity-70" : ""
                  }`}>
                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3 flex-row-reverse">
                        <div className="flex items-center gap-3 flex-row-reverse">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                            task.task_type === "daily" ? "bg-blue-500/20" :
                            task.task_type === "weekly" ? "bg-green-500/20" : "bg-purple-500/20"
                          }`}>
                            {task.type_info.emoji}
                          </div>
                          <div className="text-right">
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap flex-row-reverse">
                              <Badge variant="outline" className={`${getTypeColor(task.task_type)} text-white border-0 text-xs`}>
                                {task.type_info.label}
                              </Badge>
                              {task.is_group_task && (
                                <>
                                  <span className="flex items-center gap-1 flex-row-reverse">
                                    <UsersIcon className="h-3 w-3" />
                                    {task.members.length}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {task.completion_type === "any" ? "👤 أي شخص" : "👥 الجميع"}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-row-reverse">
                          <ClockIcon className="h-4 w-4" />
                          <span>{new Date(task.created_at).toLocaleDateString("ar-SA")}</span>
                          {activeTab === "all" && canDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteTask(task.id)
                              }}
                              disabled={deletingTaskId === task.id}
                            >
                              {deletingTaskId === task.id ? (
                                <span className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <TrashIcon className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1 flex-row-reverse">
                          <span className="text-muted-foreground">التقدم</span>
                          <span className="font-medium">{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" style={{ direction: "ltr" }} />
                        <p className="text-xs text-muted-foreground mt-1 text-right">
                          {task.completed_items} من {task.total_items} مهام
                        </p>
                      </div>

                      {/* Members */}
                      {task.is_group_task && task.members.length > 0 && (
                        <div className="flex items-center gap-2 flex-row-reverse">
                          <span className="text-xs text-muted-foreground">المشاركون:</span>
                          <div className="flex -space-x-2 space-x-reverse">
                            {task.members.slice(0, 5).map((member, i) => (
                              <Avatar key={i} className="h-6 w-6 border-2 border-background">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback className="text-xs">{member.name[0]}</AvatarFallback>
                              </Avatar>
                            ))}
                            {task.members.length > 5 && (
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                +{task.members.length - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

