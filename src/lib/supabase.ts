import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types
export interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  skills: string[];
  rating: number;
  completed_tasks: number;
  status: 'active' | 'deactivated';
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subject: string;
  budget: number;
  deadline: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DELIVERED' | 'DONE';
  visibility: 'public' | 'unlisted';
  owner_id: string;
  accepted_user_id: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
  owner?: Profile;
  accepted_user?: Profile;
  attachments?: {
    id: string;
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
  }[];
}

export interface Message {
  id: string;
  task_id: string;
  sender_id: string;
  content: string;
  file_url: string | null;
  created_at: string;
  sender?: Profile;
}

export interface Rating {
  id: string;
  task_id: string;
  from_user_id: string;
  to_user_id: string;
  stars: number;
  comment: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  task_id: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'task' | 'profile' | 'message';
  target_id: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

// Bidding/Quotation System
export interface Bid {
  id: string;
  task_id: string;
  bidder_id: string;
  proposed_budget: number;
  proposed_deadline: string | null;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
  bidder?: Profile;
  task?: Task;
}

// Comments System
export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  user?: Profile;
  replies?: Comment[];
}

// Direct Messaging System
export interface Conversation {
  id: string;
  task_id: string | null;
  created_at: string;
  updated_at: string;
  participants?: ConversationParticipant[];
  last_message?: DirectMessage;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  user?: Profile;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
}

export async function getUserStats(userId: string) {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('status, budget, accepted_user_id, owner_id')
    .or(`owner_id.eq.${userId},accepted_user_id.eq.${userId}`);

  if (error) throw error;

  const posted = tasks.filter(t => t.owner_id === userId);
  const accepted = tasks.filter(t => t.accepted_user_id === userId);
  const completed = accepted.filter(t => t.status === 'DONE');

  const totalEarned = completed.reduce((sum, t) => sum + (t.budget || 0), 0);
  const totalSpent = posted.filter(t => t.status === 'DONE').reduce((sum, t) => sum + (t.budget || 0), 0);

  return {
    postedCount: posted.length,
    acceptedCount: accepted.length,
    completedCount: completed.length,
    totalEarned,
    totalSpent
  };
}