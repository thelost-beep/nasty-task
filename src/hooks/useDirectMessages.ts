import { useState, useEffect, useCallback } from 'react';
import { supabase, Conversation, DirectMessage } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useDirectMessages(conversationId?: string) {
    const { profile } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Fetch all conversations for the current user
    const fetchConversations = useCallback(async () => {
        if (!profile) {
            setConversations([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Get all conversations where user is a participant
            const { data: participations, error: partError } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', profile.id);

            if (partError) throw partError;

            if (!participations || participations.length === 0) {
                setConversations([]);
                setLoading(false);
                return;
            }

            const conversationIds = participations.map(p => p.conversation_id);

            // Fetch conversation details with participants
            const { data: convData, error: convError } = await supabase
                .from('conversations')
                .select(`
          *,
          participants:conversation_participants(
            *,
            user:profiles(*)
          )
        `)
                .in('id', conversationIds)
                .order('updated_at', { ascending: false });

            if (convError) throw convError;

            // Fetch last message for each conversation
            const conversationsWithLastMessage = await Promise.all(
                (convData || []).map(async (conv) => {
                    const { data: lastMsg } = await supabase
                        .from('direct_messages')
                        .select(`*, sender:profiles(*)`)
                        .eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    return { ...conv, last_message: lastMsg };
                })
            );

            setConversations(conversationsWithLastMessage);
        } catch (err) {
            console.error('Error fetching conversations:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [profile]);

    // Fetch messages for a specific conversation
    const fetchMessages = useCallback(async () => {
        if (!conversationId) {
            setMessages([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: msgError } = await supabase
                .from('direct_messages')
                .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(*)
        `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (msgError) throw msgError;
            setMessages(data || []);

            // Mark messages as read
            if (profile) {
                await supabase
                    .from('conversation_participants')
                    .update({ last_read_at: new Date().toISOString() })
                    .eq('conversation_id', conversationId)
                    .eq('user_id', profile.id);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [conversationId, profile]);

    useEffect(() => {
        if (conversationId) {
            fetchMessages();

            // Subscribe to new messages for ACTIVE conversation
            const subscription = supabase
                .channel(`dm_${conversationId}`)
                .on('postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'direct_messages',
                        filter: `conversation_id=eq.${conversationId}`
                    },
                    async (payload) => {
                        const newMessage = payload.new as DirectMessage;

                        // Check if we already have the sender's profile in our current conversation data
                        // This avoids an extra fetch for most messages
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMessage.id)) return prev;

                            // Find the sender in our participant list
                            const currentConv = conversations.find(c => c.id === conversationId);
                            const senderProfile = currentConv?.participants?.find(p => p.user_id === newMessage.sender_id)?.user;

                            if (senderProfile) {
                                return [...prev, { ...newMessage, sender: senderProfile }];
                            }

                            // Fallback to fetching ONLY if not found (should be rare)
                            supabase
                                .from('profiles')
                                .select('*')
                                .eq('id', newMessage.sender_id)
                                .single()
                                .then(({ data: fullProfile }) => {
                                    if (fullProfile) {
                                        setMessages(current => {
                                            if (current.some(m => m.id === newMessage.id && m.sender)) return current;
                                            return current.map(m => m.id === newMessage.id ? { ...m, sender: fullProfile } : m);
                                        });
                                    }
                                });

                            return [...prev, newMessage];
                        });

                        // Immediate list update
                        setConversations(prev => prev.map(conv =>
                            conv.id === conversationId
                                ? { ...conv, updated_at: newMessage.created_at, last_message: newMessage }
                                : conv
                        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        } else {
            fetchConversations();

            // Subscribe to ANY new messages for THIS user to refresh the list
            // Instead of listening to ALL direct_messages, we listen to conversation_participants updates
            // which happen when a message is sent (updated_at of conversation changes)
            if (profile) {
                const listSubscription = supabase
                    .channel(`dm_list_${profile.id}`)
                    .on('postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'conversations'
                        },
                        () => {
                            // Only refresh if the user is in the list view
                            fetchConversations();
                        }
                    )
                    .on('postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'conversation_participants',
                            filter: `user_id=eq.${profile.id}`
                        },
                        () => {
                            // Refresh if user is added to a new conversation
                            fetchConversations();
                        }
                    )
                    .subscribe();

                return () => {
                    listSubscription.unsubscribe();
                };
            }
        }
    }, [conversationId, fetchMessages, fetchConversations, profile]);

    // Start or get existing conversation with another user
    const startConversation = async (otherUserId: string, taskId?: string) => {
        if (!profile) {
            return { data: null, error: new Error('Not authenticated') };
        }

        try {
            // Use the database function to get or create conversation
            const { data, error } = await supabase
                .rpc('get_or_create_conversation', {
                    user1_id: profile.id,
                    user2_id: otherUserId,
                    related_task_id: taskId || null,
                });

            if (error) throw error;
            return { data: data as string, error: null };
        } catch (err) {
            console.error('Error starting conversation:', err);
            return { data: null, error: err as Error };
        }
    };

    // Send a message
    const sendMessage = async (content: string) => {
        if (!profile || !conversationId) {
            return { data: null, error: new Error('Not authenticated or no conversation') };
        }

        const tempId = Math.random().toString(36).substring(7);
        const optimisticMsg: DirectMessage = {
            id: tempId,
            conversation_id: conversationId,
            sender_id: profile.id,
            content,
            is_read: false,
            created_at: new Date().toISOString(),
            sender: profile
        };

        try {
            // Update UI immediately
            setMessages(prev => [...prev.filter(m => m.id !== tempId), optimisticMsg]);

            const { data, error } = await supabase
                .from('direct_messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: profile.id,
                    content,
                })
                .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(*)
        `)
                .single();

            if (error) throw error;

            // Replace optimistic with real
            setMessages(prev => prev.map(m => m.id === tempId ? data : m));

            return { data, error: null };
        } catch (err) {
            console.error('Error sending message:', err);
            // Rollback
            setMessages(prev => prev.filter(m => m.id !== tempId));
            return { data: null, error: err as Error };
        }
    };

    // Get unread count for a conversation
    const getUnreadCount = (convId: string) => {
        const conv = conversations.find(c => c.id === convId);
        if (!conv || !profile) return 0;

        const participant = conv.participants?.find(p => p.user_id === profile.id);
        if (!participant) return 0;

        // Count messages after last_read_at from other users
        // This is a simplified version - in production you'd want to query this
        return 0;
    };

    // Get the other participant in a conversation
    const getOtherParticipant = (conv: Conversation) => {
        if (!profile || !conv.participants) return null;
        const other = conv.participants.find(p => p.user_id !== profile.id);
        return other?.user || null;
    };

    return {
        conversations,
        messages,
        loading,
        error,
        startConversation,
        sendMessage,
        getUnreadCount,
        getOtherParticipant,
        refreshConversations: fetchConversations,
        refreshMessages: fetchMessages,
    };
}
