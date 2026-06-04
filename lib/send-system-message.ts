import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Inserts a system event message into the messages thread between two users.
 * System messages are prefixed with "SYSTEM:" and rendered differently in the chat UI.
 * They do NOT trigger new_message notifications (handled by the DB trigger).
 */
export async function sendSystemMessage(
  senderId: string,
  receiverId: string,
  text: string,
): Promise<void> {
  await supabaseAdmin.from('messages').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    content: `SYSTEM:${text}`,
  })
}
