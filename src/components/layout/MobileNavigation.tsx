import {
  Home,
  Plus,
  MessageCircle,
  User,
  Bell
} from 'lucide-react';
import { Profile } from '../../lib/supabase';

interface MobileNavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  profile?: Profile;
}

export function MobileNavigation({ currentPage, onNavigate, profile }: MobileNavigationProps) {
  const navigationItems = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'post', label: 'Post', icon: Plus },
    { id: 'messages', label: 'Chats', icon: MessageCircle },
    { id: 'notifications', label: 'Alerts', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-gray-200 z-50 pb-safe">
      <div className="grid grid-cols-5 h-16 md:h-20">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const isProfile = item.id === 'profile';

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${isActive
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <div className={`p-1 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-50 scale-110 shadow-sm' : ''
                }`}>
                {isProfile && profile?.avatar_url ? (
                  <div className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}>
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="p-0.5">
                    <Icon size={20} className={isActive ? 'animate-bounce-subtle' : ''} />
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-60'
                }`}>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-transparent"></div>
    </div>
  );
}