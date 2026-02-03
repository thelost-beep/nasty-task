import { useState, useEffect } from 'react';
import { supabase, Message } from '../lib/supabase';

export function useChat(taskId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;

    fetchMessages();

    // Subscribe to real-time messages
    const subscription = supabase
      .channel(`task_chat_${taskId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Check if we already have the message (optimistic update)
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev;

            // Fetch full message with sender details
            // We still need to fetch sender info because useChat doesn't have the full profile list
            // but we can optimize it by checking if it's the current user first.
            supabase
              .from('messages')
              .select(`*, sender:profiles!messages_sender_id_fkey(*)`)
              .eq('id', newMessage.id)
              .single()
              .then(({ data: fullMsg }) => {
                if (fullMsg) {
                  setMessages(current => {
                    const exists = current.some(m => m.id === fullMsg.id);
                    if (exists) return current;
                    return [...current, fullMsg];
                  });
                }
              });

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [taskId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, fileUrl?: string) => {
    const tempId = Math.random().toString(36).substring(7);
    let optimisticMsg: Message | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profileData) throw new Error('Profile not found');

      // Create optimistic message
      optimisticMsg = {
        id: tempId,
        task_id: taskId,
        sender_id: profileData.id,
        content,
        file_url: fileUrl || null,
        created_at: new Date().toISOString(),
        sender: profileData
      };

      // Update UI immediately (Instant feel)
      setMessages(prev => [...prev.filter(m => m.id !== tempId), optimisticMsg!]);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          task_id: taskId,
          sender_id: profileData.id,
          content,
          file_url: fileUrl || null,
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(*)
        `)
        .single();

      if (error) throw error;

      // Replace optimistic message with real one from server
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));

      return { data, error: null };
    } catch (error) {
      console.error('Error sending message:', error);
      // Rollback on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      return { data: null, error };
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    refreshMessages: fetchMessages,
  };
}