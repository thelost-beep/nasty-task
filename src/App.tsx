import { useState, Suspense, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNavigation } from './components/layout/MobileNavigation';
import { AuthModal } from './components/auth/AuthModal';
import { TaskFeed } from './components/tasks/TaskFeed';
import { PostTask } from './components/tasks/PostTask';
import { TaskDetail } from './components/tasks/TaskDetail';
import { MyTasks } from './components/tasks/MyTasks';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { ProfilePage } from './components/profile/ProfilePage';
import { SettingsPage } from './components/settings/SettingsPage';
import { UnifiedMessages } from './components/messages/UnifiedMessages';
import { AdminVerification } from './components/admin/AdminVerification';
import { supabase, Task } from './lib/supabase';

// UnifiedMessages handles both task chats and DMs now

function App() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('feed');
  const [showAuth, setShowAuth] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dmRecipientId, setDmRecipientId] = useState<string | null>(null);
  const [dmTaskId, setDmTaskId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Fetch initial user count
    const fetchUserCount = async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        setUserCount(count);
      }
    };

    fetchUserCount();

    // Subscribe to profile changes for real-time count
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => {
          fetchUserCount();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'profiles' },
        () => {
          fetchUserCount();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('resize', checkMobile);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setCurrentPage('task-detail');
  };

  const handleChatClick = (task: Task) => {
    setSelectedTask(task);
    setDmTaskId(task.id);
    setDmRecipientId(null);
    setCurrentPage('messages');
  };

  const handleBackToFeed = () => {
    setSelectedTask(null);
    setCurrentPage('feed');
  };

  const handleStartChat = () => {
    if (selectedTask) {
      setDmTaskId(selectedTask.id);
      setDmRecipientId(null);
      setCurrentPage('messages');
    }
  };

  const handleStartDM = (recipientId: string, taskId?: string) => {
    setDmRecipientId(recipientId);
    setDmTaskId(taskId || null);
    setCurrentPage('messages');
  };

  const handleNavigate = (page: string) => {
    if (page === 'messages' || page === 'feed') {
      setDmTaskId(null);
      setDmRecipientId(null);
      setSelectedUserId(null);
    }
    setCurrentPage(page);
  };

  const handleProfileClick = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentPage('profile');
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-xl">NT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">NastyTask Done</h1>
          <p className="text-gray-600">Loading your experience...</p>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  // Only show landing if we're not loading AND (no user OR no profile)
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden transition-colors">
        {/* Animated Background Shapes */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>

        {/* Header - Enhanced */}
        <div className="glass-dark backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-18 py-4">
              <div className="flex items-center space-x-3 animate-fade-in">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg animate-glow">
                  <span className="text-white font-bold text-sm">NT</span>
                </div>
                <span className="text-2xl font-bold text-white text-shadow">NastyTask Done</span>
              </div>
              <button
                onClick={() => setShowAuth(true)}
                className="btn-primary shadow-xl hover:shadow-2xl"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* Hero Section - Enhanced with Animations */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
          <div className="text-center">
            {/* Animated Logo */}
            <div className="inline-block mb-10 animate-fade-in">
              <div className="w-28 h-28 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform hover:scale-110 hover:rotate-6 transition-all duration-500 animate-bounce-subtle">
                <span className="text-white font-bold text-5xl">NT</span>
              </div>
            </div>

            {/* Main Heading with Gradient Text */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up leading-tight">
              <span className="text-gray-900">NastyTask</span>
              <br />
              <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_auto] animate-shimmer">Done</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up stagger-1 font-medium">
              The social marketplace where academic tasks get
              <span className="text-blue-600 font-bold"> posted</span>,
              <span className="text-purple-600 font-bold"> picked</span>, and
              <span className="text-green-600 font-bold"> finished</span>.
              <br />
              <span className="text-gray-600 text-lg mt-2 block">Connect with talented students, get help, and earn money doing what you love.</span>
            </p>

            {/* User Count Badge */}
            <div className="flex justify-center mb-12 animate-fade-in-up stagger-1">
              <div className="glass px-6 py-3 rounded-2xl flex items-center space-x-3 shadow-lg border-white/40">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br ${i === 1 ? 'from-blue-400 to-blue-600' :
                      i === 2 ? 'from-purple-400 to-purple-600' :
                        'from-indigo-400 to-indigo-600'
                      } flex items-center justify-center text-[10px] text-white font-bold`}>
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900 leading-none">
                    {userCount !== null ? (
                      <span className="text-blue-600 animate-pulse">{userCount.toLocaleString()}+</span>
                    ) : (
                      <span className="text-gray-400">...</span>
                    )} users
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Already Registered</p>
                </div>
                <div className="flex items-center">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="ml-2 text-[10px] font-bold text-green-600 uppercase tracking-widest">Live</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons - Enhanced */}
            <div className="space-y-4 md:space-y-0 md:space-x-6 md:flex md:justify-center animate-fade-in-up stagger-2 mb-16">
              <button
                onClick={() => setShowAuth(true)}
                className="group relative w-full md:w-auto bg-gradient-primary text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Get Started
                  <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>

              <button
                onClick={() => setShowAuth(true)}
                className="w-full md:w-auto border-3 border-blue-500 text-blue-600 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Learn More
              </button>
            </div>

            {/* Feature Cards - Enhanced with Hover Effects */}
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="card group hover-lift animate-fade-in-up stagger-1 p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <span className="text-white text-4xl">📝</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">Post Tasks</h3>
                <p className="text-gray-600 leading-relaxed text-base">Share your academic challenges and find skilled helpers ready to assist you</p>
              </div>

              <div className="card group hover-lift animate-fade-in-up stagger-2 p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <span className="text-white text-4xl">🤝</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">Connect</h3>
                <p className="text-gray-600 leading-relaxed text-base">Match with the right person for each task instantly and collaborate seamlessly</p>
              </div>

              <div className="card group hover-lift animate-fade-in-up stagger-3 p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <span className="text-white text-4xl">✨</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">Get Results</h3>
                <p className="text-gray-600 leading-relaxed text-base">Quality work delivered on time, every time with complete satisfaction</p>
              </div>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
        />
      </div>
    );
  }

  // Main application
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Desktop Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto ${isMobile ? 'pb-16' : isCollapsed ? 'ml-20' : 'ml-72'} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            }
          >
            {currentPage === 'feed' && <TaskFeed onTaskClick={handleTaskClick} onProfileClick={handleProfileClick} />}
            {currentPage === 'post' && (
              <PostTask onSuccess={() => handleNavigate('feed')} />
            )}
            {currentPage === 'my-tasks' && (
              <MyTasks onTaskClick={handleTaskClick} onChatClick={handleChatClick} />
            )}
            {currentPage === 'messages' && (
              <UnifiedMessages
                onBack={() => handleNavigate('feed')}
                initialTaskId={dmTaskId || undefined}
                initialRecipientId={dmRecipientId || undefined}
              />
            )}
            {currentPage === 'notifications' && (
              <NotificationCenter />
            )}
            {currentPage === 'profile' && (
              <ProfilePage
                userId={selectedUserId}
                onBack={() => handleNavigate('feed')}
                onProfileClick={handleProfileClick}
                onTaskClick={handleTaskClick}
              />
            )}
            {currentPage === 'settings' && <SettingsPage />}
            {currentPage === 'task-detail' && selectedTask && (
              <TaskDetail
                task={selectedTask}
                onBack={handleBackToFeed}
                onStartChat={handleStartChat}
                onStartDM={(recipientId) => handleStartDM(recipientId, selectedTask.id)}
                onProfileClick={handleProfileClick}
              />
            )}
            {currentPage === 'admin-verification' && (
              <AdminVerification onBack={() => handleNavigate('feed')} />
            )}
          </Suspense>
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation
        currentPage={currentPage}
        onNavigate={handleNavigate}
        profile={profile || undefined}
      />
    </div >
  );
}

export default App;