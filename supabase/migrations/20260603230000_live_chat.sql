-- Live Chat System Migration
-- Tables: chat_conversations, chat_messages

-- 1. Create chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  specialist_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  subject TEXT NOT NULL DEFAULT 'Support Chat',
  last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'specialist')),
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_client_account_id ON public.chat_conversations(client_account_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_specialist_id ON public.chat_conversations(specialist_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- 4. Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for chat_conversations
-- Specialists (authenticated users with user_profiles) can see all conversations
DROP POLICY IF EXISTS "specialists_manage_conversations" ON public.chat_conversations;
CREATE POLICY "specialists_manage_conversations"
ON public.chat_conversations
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow anon (client portal uses anon key with client auth) to access their own conversations
DROP POLICY IF EXISTS "clients_view_own_conversations" ON public.chat_conversations;
CREATE POLICY "clients_view_own_conversations"
ON public.chat_conversations
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "clients_insert_conversations" ON public.chat_conversations;
CREATE POLICY "clients_insert_conversations"
ON public.chat_conversations
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "clients_update_conversations" ON public.chat_conversations;
CREATE POLICY "clients_update_conversations"
ON public.chat_conversations
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 6. RLS Policies for chat_messages
DROP POLICY IF EXISTS "specialists_manage_messages" ON public.chat_messages;
CREATE POLICY "specialists_manage_messages"
ON public.chat_messages
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "clients_view_messages" ON public.chat_messages;
CREATE POLICY "clients_view_messages"
ON public.chat_messages
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "clients_insert_messages" ON public.chat_messages;
CREATE POLICY "clients_insert_messages"
ON public.chat_messages
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "clients_update_messages" ON public.chat_messages;
CREATE POLICY "clients_update_messages"
ON public.chat_messages
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 7. Function to update conversation last_message_at on new message
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_chat_message ON public.chat_messages;
CREATE TRIGGER on_new_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- 8. Enable Realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
