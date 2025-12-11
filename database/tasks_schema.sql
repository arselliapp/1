-- =====================================================
-- نظام المهام - Arselli App
-- =====================================================

-- جدول المهام الرئيسية
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(20) NOT NULL CHECK (task_type IN ('daily', 'weekly', 'monthly')),
    is_group_task BOOLEAN DEFAULT FALSE,
    completion_type VARCHAR(10) DEFAULT 'all' CHECK (completion_type IN ('all', 'any')), -- all = الجميع، any = أي شخص
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة العمود للجدول الموجود (للتحديث)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='completion_type') THEN
        ALTER TABLE tasks ADD COLUMN completion_type VARCHAR(10) DEFAULT 'all' CHECK (completion_type IN ('all', 'any'));
    END IF;
END $$;

-- جدول تعيينات المهام (المشاركين في المهمة)
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- جدول عناصر/طلبات المهمة
CREATE TABLE IF NOT EXISTS task_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID, -- إذا كان null يعني للجميع
    order_index INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول تتبع إكمال العناصر (للمهام الجماعية)
CREATE TABLE IF NOT EXISTS task_item_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_item_id UUID REFERENCES task_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_item_id, user_id)
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_items_task ON task_items(task_id);

-- تعطيل RLS مؤقتاً للتطوير
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_item_completions DISABLE ROW LEVEL SECURITY;

-- دالة للتحقق من اكتمال المهمة
CREATE OR REPLACE FUNCTION check_task_completion(p_task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    is_group BOOLEAN;
    total_members INTEGER;
BEGIN
    -- جلب معلومات المهمة
    SELECT is_group_task INTO is_group FROM tasks WHERE id = p_task_id;
    
    IF is_group THEN
        -- للمهام الجماعية: كل عنصر يجب أن يكمله كل المشاركين
        SELECT COUNT(*) INTO total_members FROM task_assignments WHERE task_id = p_task_id;
        SELECT COUNT(*) INTO total_items FROM task_items WHERE task_id = p_task_id;
        
        SELECT COUNT(DISTINCT ti.id) INTO completed_items
        FROM task_items ti
        WHERE ti.task_id = p_task_id
        AND (
            SELECT COUNT(*) FROM task_item_completions tic 
            WHERE tic.task_item_id = ti.id
        ) >= total_members;
        
        RETURN completed_items >= total_items AND total_items > 0;
    ELSE
        -- للمهام الفردية: كل العناصر يجب أن تكتمل
        SELECT COUNT(*) INTO total_items FROM task_items WHERE task_id = p_task_id;
        SELECT COUNT(*) INTO completed_items FROM task_items WHERE task_id = p_task_id AND is_completed = TRUE;
        
        RETURN completed_items >= total_items AND total_items > 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

