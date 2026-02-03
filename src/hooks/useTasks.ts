import { useState, useEffect, useCallback } from 'react';
import { supabase, Task } from '../lib/supabase';

interface TaskFilters {
  subject?: string;
  minBudget?: number;
  maxBudget?: number;
  deadline?: string;
  search?: string;
}

interface TaskSort {
  field: 'created_at' | 'budget' | 'deadline';
  order: 'asc' | 'desc';
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [sort, setSort] = useState<TaskSort>({ field: 'created_at', order: 'desc' });

  const fetchTasks = useCallback(async (offset = 0, limit = 20, reset = false, userProfile?: any) => {
    try {
      setLoading(true);

      let query = supabase
        .from('tasks')
        .select(`
          *,
          owner:profiles!tasks_owner_id_fkey(*),
          accepted_user:profiles!tasks_accepted_user_id_fkey(*)
        `)
        .eq('visibility', 'public')
        .eq('status', 'OPEN') // Only show OPEN tasks in feed
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters.subject) {
        query = query.ilike('subject', `%${filters.subject}%`);
      }
      if (filters.minBudget) {
        query = query.gte('budget', filters.minBudget);
      }
      if (filters.maxBudget) {
        query = query.lte('budget', filters.maxBudget);
      }
      if (filters.deadline) {
        query = query.lte('deadline', filters.deadline);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Default sort by created_at
      query = query.order(sort.field, { ascending: sort.order === 'asc' });

      const { data, error } = await query;

      if (error) throw error;

      // Apply skill-based matching if user has skills
      let processedTasks = data || [];
      if (userProfile?.skills && userProfile.skills.length > 0) {
        processedTasks = processedTasks.map(task => {
          // Calculate relevance score based on skill matching
          const taskSubject = task.subject?.toLowerCase() || '';
          const taskTitle = task.title?.toLowerCase() || '';
          const taskDescription = task.description?.toLowerCase() || '';

          let matchScore = 0;
          userProfile.skills.forEach((skill: string) => {
            const skillLower = skill.toLowerCase();
            if (taskSubject.includes(skillLower)) matchScore += 3;
            if (taskTitle.includes(skillLower)) matchScore += 2;
            if (taskDescription.includes(skillLower)) matchScore += 1;
          });

          return { ...task, matchScore };
        });

        // Sort by match score (higher first), then by creation date
        processedTasks.sort((a: any, b: any) => {
          if (b.matchScore !== a.matchScore) {
            return b.matchScore - a.matchScore;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }

      if (reset) {
        setTasks(processedTasks);
      } else {
        setTasks(prev => [...prev, ...processedTasks]);
      }

      setHasMore((data?.length || 0) === limit);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, sort]);

  useEffect(() => {
    fetchTasks(0, 20, true);
  }, [fetchTasks]);

  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('tasks')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as Task, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;

            // If task is no longer OPEN, remove it from the feed
            if (updatedTask.status !== 'OPEN') {
              setTasks(prev => prev.filter(task => task.id !== updatedTask.id));
            } else {
              // Otherwise update the existing task
              setTasks(prev =>
                prev.map(task =>
                  task.id === updatedTask.id ? { ...task, ...updatedTask } : task
                )
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchTasks(tasks.length);
    }
  };

  const refreshTasks = () => {
    fetchTasks(0, 20, true);
  };

  const createTask = async (taskData: {
    title: string;
    description: string;
    subject: string;
    budget: number;
    deadline: string;
    visibility?: 'public' | 'unlisted';
    file_url?: string;
    owner_id: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select(`
          *,
          owner:profiles!tasks_owner_id_fkey(*),
          accepted_user:profiles!tasks_accepted_user_id_fkey(*)
        `)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const acceptTask = async (taskId: string, acceptedUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          accepted_user_id: acceptedUserId,
          status: 'IN_PROGRESS'
        })
        .eq('id', taskId)
        .eq('status', 'OPEN')
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  return {
    tasks,
    loading,
    hasMore,
    filters,
    sort,
    setFilters,
    setSort,
    loadMore,
    refreshTasks,
    createTask,
    acceptTask,
    updateTaskStatus,
    deleteTask,
  };
}