import { useEffect, useRef, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Task } from '../../lib/supabase';
import { useTasks } from '../../hooks/useTasks';
import { TaskCard } from './TaskCard';
import { TaskSkeleton } from './TaskSkeleton';

interface TaskFeedProps {
  onTaskClick: (task: Task) => void;
  onProfileClick?: (userId: string) => void;
}

export function TaskFeed({ onTaskClick, onProfileClick }: TaskFeedProps) {
  const {
    tasks,
    loading,
    hasMore,
    filters,
    sort,
    setFilters,
    setSort,
    loadMore
  } = useTasks();

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const observer = useRef<IntersectionObserver>();
  const lastTaskRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    if (loading) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });

    if (lastTaskRef.current) {
      observer.current.observe(lastTaskRef.current);
    }

    return () => observer.current?.disconnect();
  }, [loading, hasMore, loadMore]);

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, setFilters]);

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'Computer Science', 'English', 'History', 'Economics'
  ];

  const sortOptions = [
    { field: 'created_at', order: 'desc', label: 'Newest First' },
    { field: 'created_at', order: 'asc', label: 'Oldest First' },
    { field: 'budget', order: 'desc', label: 'Highest Budget' },
    { field: 'budget', order: 'asc', label: 'Lowest Budget' },
    { field: 'deadline', order: 'asc', label: 'Due Soon' },
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Search and Filters - Enhanced with Glassmorphism */}
      <div className="glass rounded-2xl shadow-lg border border-white/50 p-6 mb-8 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search - Enhanced */}
          <div className="flex-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search tasks by title, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input w-full pl-12 pr-4 py-3.5 rounded-full shadow-sm hover:shadow-md transition-shadow border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filter Toggle - Enhanced */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-all duration-300 transform hover:-translate-y-0.5 ${showFilters
              ? 'bg-gradient-primary text-white shadow-md'
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 shadow-sm hover:shadow-md'
              }`}
          >
            <Filter size={20} />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {/* Sort - Enhanced */}
          <select
            value={`${sort.field}-${sort.order}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSort({ field: field as any, order: order as any });
            }}
            className="input px-4 py-3.5 font-medium shadow-sm hover:shadow-md cursor-pointer"
          >
            {sortOptions.map((option) => (
              <option key={`${option.field}-${option.order}`} value={`${option.field}-${option.order}`}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Expanded Filters - Animated Slide-Down */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-down">
            {/* Subject Filter */}
            <div className="animate-fade-in-up stagger-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📚 Subject
              </label>
              <select
                value={filters.subject || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value || undefined }))}
                className="input text-sm"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget Range */}
            <div className="animate-fade-in-up stagger-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                💰 Min Budget
              </label>
              <input
                type="number"
                placeholder="₹0"
                value={filters.minBudget || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  minBudget: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                className="input text-sm"
              />
            </div>

            <div className="animate-fade-in-up stagger-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                💵 Max Budget
              </label>
              <input
                type="number"
                placeholder="₹1000"
                value={filters.maxBudget || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  maxBudget: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                className="input text-sm"
              />
            </div>

            {/* Deadline Filter */}
            <div className="animate-fade-in-up stagger-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📅 Due Before
              </label>
              <input
                type="date"
                value={filters.deadline || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, deadline: e.target.value || undefined }))}
                className="input text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Task Feed - Enhanced with Staggered Animations */}
      <div className="space-y-6">
        {tasks.length === 0 && !loading ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-subtle">
              <Search className="text-blue-500" size={36} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No tasks found</h3>
            <p className="text-gray-500 text-lg mb-6">Try adjusting your search or filters</p>
            <div className="inline-flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
              <span>Waiting for new opportunities...</span>
            </div>
          </div>
        ) : (
          <>
            {tasks.map((task, index) => (
              <div
                key={task.id}
                ref={index === tasks.length - 1 ? lastTaskRef : null}
                style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }}
              >
                <TaskCard
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onProfileClick={onProfileClick}
                />
              </div>
            ))}

            {loading && (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <TaskSkeleton key={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}