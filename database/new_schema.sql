-- =====================================================
-- تطبيق "وصّل" - قاعدة البيانات الجديدة
-- =====================================================
-- ملاحظة: لا تمسح الجداول السابقة، هذا يضيف جداول جديدة فقط

-- 1. جدول المحادثات
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_preview TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. جدول المشاركين في المحادثة
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_typing BOOLEAN DEFAULT FALSE,
    typing_updated_at TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    UNIQUE(conversation_id, user_id)
);

-- 3. جدول الرسائل
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'
);

-- إضافة عمود الرد للجدول الموجود (للتحديث)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='reply_to_id') THEN
        ALTER TABLE messages ADD COLUMN reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. جدول حالة قراءة الرسائل
CREATE TABLE IF NOT EXISTS message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- 5. جدول التنبيهات/المواعيد
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    reminder_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(300),
    remind_before_hours INTEGER[] DEFAULT '{1, 24}',
    status VARCHAR(20) DEFAULT 'pending',
    response_message TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    linked_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. جدول إشعارات التذكير المجدولة
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    notification_type VARCHAR(20) DEFAULT 'reminder',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. جدول حالة الاتصال
CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID PRIMARY KEY,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- الفهارس لتحسين الأداء
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reminders_recipient_id ON reminders(recipient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sender_id ON reminders(sender_id);
CREATE INDEX IF NOT EXISTS idx_reminders_event_date ON reminders(event_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_online ON user_presence(is_online);

-- =====================================================
-- Functions مساعدة
-- =====================================================

-- البحث عن محادثة موجودة بين شخصين أو إنشاء جديدة
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    existing_conversation_id UUID;
    new_conversation_id UUID;
BEGIN
    -- البحث عن محادثة موجودة
    SELECT cp1.conversation_id INTO existing_conversation_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = user1_id AND cp2.user_id = user2_id
    LIMIT 1;
    
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;
    
    -- إنشاء محادثة جديدة
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO new_conversation_id;
    
    -- إضافة المشاركين
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
        (new_conversation_id, user1_id),
        (new_conversation_id, user2_id);
    
    RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث حالة القراءة
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- إضافة سجلات القراءة
    INSERT INTO message_reads (message_id, user_id)
    SELECT m.id, p_user_id
    FROM messages m
    WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND NOT EXISTS (
        SELECT 1 FROM message_reads mr 
        WHERE mr.message_id = m.id AND mr.user_id = p_user_id
    );
    
    -- تصفير عداد غير المقروءة
    UPDATE conversation_participants
    SET 
        unread_count = 0,
        last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Triggers للتحديث التلقائي
-- =====================================================

-- دالة تحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger للمحادثات
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger للرسائل
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger للتنبيهات
DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- تحديث المحادثة عند إضافة رسالة
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET 
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    -- زيادة عداد الرسائل غير المقروءة
    UPDATE conversation_participants
    SET unread_count = unread_count + 1
    WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_on_new_message();

-- =====================================================
-- RLS Policies (Row Level Security)
-- =====================================================

-- تفعيل RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert their participant record" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view their reminders" ON reminders;
DROP POLICY IF EXISTS "Users can create reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update their reminders" ON reminders;
DROP POLICY IF EXISTS "Users can view presence" ON user_presence;
DROP POLICY IF EXISTS "Users can manage their presence" ON user_presence;
DROP POLICY IF EXISTS "Users can view message reads" ON message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;
DROP POLICY IF EXISTS "Users can view scheduled notifications" ON scheduled_notifications;

-- سياسات المحادثات
CREATE POLICY "Users can view their conversations" ON conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = conversations.id
            AND user_id = auth.uid()
        )
    );

-- سياسات المشاركين
CREATE POLICY "Users can view conversation participants" ON conversation_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own participant record" ON conversation_participants FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their participant record" ON conversation_participants FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- سياسات الرسائل
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages" ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- سياسات قراءة الرسائل
CREATE POLICY "Users can view message reads" ON message_reads FOR SELECT
    USING (true);

CREATE POLICY "Users can mark messages as read" ON message_reads FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- سياسات التنبيهات
CREATE POLICY "Users can view their reminders" ON reminders FOR SELECT
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can create reminders" ON reminders FOR INSERT
    WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their reminders" ON reminders FOR UPDATE
    USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- سياسات الإشعارات المجدولة
CREATE POLICY "Users can view scheduled notifications" ON scheduled_notifications FOR SELECT
    USING (user_id = auth.uid());

-- سياسات الحضور
CREATE POLICY "Users can view presence" ON user_presence FOR SELECT
    USING (true);

CREATE POLICY "Users can manage their presence" ON user_presence FOR ALL
    USING (user_id = auth.uid());

-- =====================================================
-- جدول اشتراكات الإشعارات Push
-- =====================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    subscription JSONB NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- تعطيل RLS
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- منح الصلاحيات للـ service_role
-- =====================================================
GRANT ALL ON conversations TO service_role;
GRANT ALL ON conversation_participants TO service_role;
GRANT ALL ON messages TO service_role;
GRANT ALL ON message_reads TO service_role;
GRANT ALL ON reminders TO service_role;
GRANT ALL ON scheduled_notifications TO service_role;
GRANT ALL ON user_presence TO service_role;

-- منح صلاحيات للمستخدمين المصادق عليهم
GRANT SELECT, INSERT ON conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO authenticated;
GRANT SELECT, INSERT ON messages TO authenticated;
GRANT SELECT, INSERT ON message_reads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON reminders TO authenticated;
GRANT SELECT ON scheduled_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_presence TO authenticated;

-- =====================================================
-- تم بنجاح! ✅
-- =====================================================
