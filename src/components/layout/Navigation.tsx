import { useState } from 'react';
import { Search, Bell, Plus, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onShowAuth: () => void;
}

export function Navigation({ currentPage, onNavigate, onShowAuth }: NavigationProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setShowMobileMenu(false);
  };

  const navItems = [
    { id: 'feed', label: 'Feed', icon: Search },
    { id: 'post', label: 'Post Task', icon: Plus },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => onNavigate('feed')}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NT</span>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                NastyTask
              </span>
            </button>
          </div>

          {/* Desktop Navigation */}
          {user && profile && (
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
              
              <div className="flex items-center space-x-3 border-l border-gray-200 pl-6">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
                  <p className="text-xs text-gray-500">@{profile.username}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Sign out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Auth Buttons (when not logged in) */}
          {!user && (
            <button
              onClick={onShowAuth}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
            >
              Get Started
            </button>
          )}

          {/* Mobile Menu Button */}
          {user && profile && (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden text-gray-600 hover:text-blue-600"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          )}
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && user && profile && (
          <div className="md:hidden border-t border-gray-200">
            <div className="py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
                  <p className="text-xs text-gray-500">@{profile.username}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={20} />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}