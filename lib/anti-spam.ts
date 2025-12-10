// نظام حماية من الـ spam والحسابات الوهمية

interface RateLimitEntry {
  count: number
  firstAttempt: number
  blocked: boolean
}

// تخزين مؤقت للطلبات (في الإنتاج استخدم Redis)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * التحقق من معدل الطلبات (Rate Limiting)
 * @param identifier معرف فريد (IP أو user ID)
 * @param maxRequests الحد الأقصى للطلبات
 * @param windowMs النافذة الزمنية بالميلي ثانية
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60000 // دقيقة واحدة
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // إذا لم يكن هناك سجل سابق
  if (!entry) {
    rateLimitStore.set(identifier, {
      count: 1,
      firstAttempt: now,
      blocked: false
    })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  // إذا انتهت النافذة الزمنية، إعادة تعيين العداد
  if (now - entry.firstAttempt > windowMs) {
    rateLimitStore.set(identifier, {
      count: 1,
      firstAttempt: now,
      blocked: false
    })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  // إذا كان محظوراً
  if (entry.blocked) {
    return { allowed: false, remaining: 0 }
  }

  // زيادة العداد
  entry.count++

  // إذا تجاوز الحد الأقصى
  if (entry.count > maxRequests) {
    entry.blocked = true
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: maxRequests - entry.count }
}

/**
 * التحقق من صحة البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  // قائمة بريد مؤقت شائعة
  const tempEmailDomains = [
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email',
    'temp-mail.org',
    'getnada.com'
  ]

  if (!emailRegex.test(email)) {
    return false
  }

  const domain = email.split('@')[1].toLowerCase()
  return !tempEmailDomains.includes(domain)
}

/**
 * التحقق من صحة رقم الجوال
 */
export function isValidPhoneNumber(phone: string): boolean {
  // إزالة المسافات والرموز
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  // التحقق من أن الرقم يبدأ بـ + أو 00 ويحتوي على 10-15 رقم
  const phoneRegex = /^(\+|00)?[0-9]{10,15}$/
  
  return phoneRegex.test(cleanPhone)
}

/**
 * كشف الأنماط المشبوهة في النصوص
 */
export function detectSpamPatterns(text: string): boolean {
  const spamKeywords = [
    'click here',
    'buy now',
    'limited offer',
    'free money',
    'winner',
    'congratulations',
    'viagra',
    'casino',
    'lottery'
  ]

  const lowerText = text.toLowerCase()
  
  // التحقق من الكلمات المفتاحية
  const hasSpamKeywords = spamKeywords.some(keyword => lowerText.includes(keyword))
  
  // التحقق من الروابط المتعددة
  const urlCount = (text.match(/https?:\/\//g) || []).length
  const hasTooManyLinks = urlCount > 3

  // التحقق من الأحرف الكبيرة الزائدة
  const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length
  const hasTooManyUpperCase = upperCaseRatio > 0.5 && text.length > 10

  return hasSpamKeywords || hasTooManyLinks || hasTooManyUpperCase
}

/**
 * تنظيف المخزن المؤقت (يجب تشغيله دورياً)
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  const maxAge = 3600000 // ساعة واحدة

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstAttempt > maxAge) {
      rateLimitStore.delete(key)
    }
  }
}

// تنظيف تلقائي كل ساعة
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 3600000)
}
