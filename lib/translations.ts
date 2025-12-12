export const translations = {
  ar: {
    // Navigation
    home: "الرئيسية",
    chat: "المحادثات",
    reminders: "التنبيهات",
    tasks: "المهام",
    contacts: "جهات الاتصال",
    admin: "لوحة التحكم",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",
    
    // Dashboard
    dashboard: "لوحة التحكم",
    conversations: "المحادثات",
    unreadMessages: "رسائل غير مقروءة",
    remindersCount: "التنبيهات",
    pendingReminders: "تنبيهات معلقة",
    tasksCount: "المهام",
    activeTasks: "مهام نشطة",
    errorLoadingUser: "خطأ: لم يتم تحميل بيانات المستخدم.",
    
    // Dashboard Quick Actions
    quickActions: "إجراءات سريعة",
    newChat: "دردشة جديدة",
    newChatDesc: "ابدأ محادثة مع جهة اتصال",
    sendReminder: "إرسال تنبيه",
    sendReminderDesc: "أرسل دعوة أو تذكير",
    addContact: "إضافة جهة اتصال",
    addContactDesc: "أضف جهة اتصال جديدة",
    newTask: "مهمة جديدة",
    newTaskDesc: "أنشئ مهمة جديدة",
    activeTasksDesc: "لديك {count} مهمة نشطة",
    
    // Common
    error: "خطأ",
    loading: "جاري التحميل...",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    add: "إضافة",
    search: "بحث",
    filter: "تصفية",
    noResults: "لا توجد نتائج",
    confirm: "تأكيد",
    close: "إغلاق",
  },
  en: {
    // Navigation
    home: "Home",
    chat: "Chat",
    reminders: "Reminders",
    tasks: "Tasks",
    contacts: "Contacts",
    admin: "Admin",
    settings: "Settings",
    logout: "Logout",
    
    // Dashboard
    dashboard: "Dashboard",
    conversations: "Conversations",
    unreadMessages: "Unread Messages",
    remindersCount: "Reminders",
    pendingReminders: "Pending Reminders",
    tasksCount: "Tasks",
    activeTasks: "Active Tasks",
    errorLoadingUser: "Error: User data could not be loaded.",
    
    // Dashboard Quick Actions
    quickActions: "Quick Actions",
    newChat: "New Chat",
    newChatDesc: "Start a conversation with a contact",
    sendReminder: "Send Reminder",
    sendReminderDesc: "Send an invitation or reminder",
    addContact: "Add Contact",
    addContactDesc: "Add a new contact",
    newTask: "New Task",
    newTaskDesc: "Create a new task",
    activeTasksDesc: "You have {count} active tasks",
    
    // Common
    error: "Error",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    filter: "Filter",
    noResults: "No results",
    confirm: "Confirm",
    close: "Close",
  }
}

export function useTranslations(language: "en" | "ar") {
  return translations[language]
}

