import {
  Home,
  Plus,
  MessageCircle,
  User,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Star,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ currentPage, onNavigate, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { profile, signOut } = useAuth();

  const navigationItems = [
    { id: 'feed', label: 'Task Feed', icon: Home, color: 'text-blue-600' },
    { id: 'post', label: 'Post Task', icon: Plus, color: 'text-green-600' },
    { id: 'my-tasks', label: 'My Tasks', icon: TrendingUp, color: 'text-purple-600' },
    { id: 'messages', label: 'Messages', icon: MessageCircle, color: 'text-orange-600' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-red-600' },
    { id: 'profile', label: 'Profile', icon: User, color: 'text-indigo-600' },
    ...(profile?.is_admin ? [{ id: 'admin-verification', label: 'Verifications', icon: ShieldCheck, color: 'text-cyan-600' }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 shadow-sm ${isCollapsed ? 'w-20' : 'w-72'
      } hidden md:flex flex-col h-screen fixed top-0 left-0 z-40`}>
      {/* Header - Minimalist */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">NT</span>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">NastyTask</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">NT</span>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="mt-4 w-full flex justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600"
          >
            <Menu size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Profile Section - Minimalist */}
      {profile && (
        <div className={`p-4 border-b border-gray-100 dark:border-gray-700 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className="flex items-center space-x-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-600 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-700 dark:text-gray-200 font-semibold text-base">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {profile.full_name}
                </p>
                <div className="flex items-center space-x-1">
                  <Star size={12} strokeWidth={2.5} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {profile.rating.toFixed(1)} • {profile.completed_tasks} tasks
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation - Minimalist */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={2.5}
                    className={`flex-shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}
                  />
                  {!isCollapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - Minimalist */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg transition-colors ${currentPage === 'settings'
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
        >
          <Settings size={18} strokeWidth={2.5} />
          {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
        </button>

        <button
          onClick={handleSignOut}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors`}
        >
          <LogOut size={18} strokeWidth={2.5} />
          {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
  );
}