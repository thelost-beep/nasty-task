import { useState, useEffect } from 'react';
import { Star, Briefcase, CheckCircle, TrendingUp, Edit, ArrowLeft } from 'lucide-react';
import { VerificationBadge } from '../ui/VerificationBadge';
import { useAuth } from '../../hooks/useAuth';
import { supabase, Task, Profile, getUserStats } from '../../lib/supabase';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import { TaskCard } from '../tasks/TaskCard';
import { ActivityFeed } from './ActivityFeed';
import { Toast, ToastType } from '../ui/Toast';

type TabType = 'posts' | 'accepted' | 'activity';

interface ProfilePageProps {
  userId?: string | null;
  onBack?: () => void;
  onProfileClick?: (userId: string) => void;
  onTaskClick?: (task: Task) => void;
}

export function ProfilePage({ userId, onBack, onProfileClick, onTaskClick }: ProfilePageProps) {
  const { profile: currentUser, updateProfile } = useAuth();

  // Determine if we are viewing our own profile
  const isOwnProfile = !userId || userId === currentUser?.id;

  const [displayProfile, setDisplayProfile] = useState<Profile | null>(isOwnProfile ? currentUser : null);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [acceptedTasks, setAcceptedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [userStats, setUserStats] = useState({
    postedCount: 0,
    acceptedCount: 0,
    completedCount: 0,
    totalEarned: 0,
    totalSpent: 0
  });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (isOwnProfile) {
      setDisplayProfile(currentUser);
      setEditedBio(currentUser?.bio || '');
    } else if (userId) {
      fetchUserProfile(userId);
    }
  }, [userId, currentUser, isOwnProfile]);

  useEffect(() => {
    if (displayProfile) {
      fetchTasks();
      fetchStats();
    }
  }, [displayProfile?.id]);

  const fetchUserProfile = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDisplayProfile(data);
      setEditedBio(data.bio || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchStats = async () => {
    if (!displayProfile) return;
    try {
      const stats = await getUserStats(displayProfile.id);
      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTasks = async () => {
    if (!displayProfile) return;

    try {
      setLoading(true);

      // Fetch tasks posted by user
      const { data: posted } = await supabase
        .from('tasks')
        .select(`*, owner:profiles!tasks_owner_id_fkey(*), accepted_user:profiles!tasks_accepted_user_id_fkey(*)`)
        .eq('owner_id', displayProfile.id)
        .order('created_at', { ascending: false });

      // Fetch tasks accepted by user
      const { data: accepted } = await supabase
        .from('tasks')
        .select(`*, owner:profiles!tasks_owner_id_fkey(*), accepted_user:profiles!tasks_accepted_user_id_fkey(*)`)
        .eq('accepted_user_id', displayProfile.id)
        .order('created_at', { ascending: false });

      setMyTasks(posted || []);
      setAcceptedTasks(accepted || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async () => {
    window.location.reload();
  };

  const handleSaveBio = async () => {
    if (!isOwnProfile) return;
    try {
      const { error } = await updateProfile({ bio: editedBio });
      if (error) throw error;
      setToast({ message: 'Bio updated successfully!', type: 'success' });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating bio:', error);
      setToast({ message: error.message || 'Failed to update bio', type: 'error' });
    }
  };

  if (!displayProfile) {
    return <div className="text-center py-12">Loading profile...</div>;
  }

  const stats = {
    posted: myTasks.length,
    completed: myTasks.filter(t => t.status === 'DONE').length,
    accepted: acceptedTasks.length,
    rating: displayProfile.rating || 0,
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20">
      {/* Back Button (if viewing other profile) */}
      {!isOwnProfile && onBack && (
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors font-medium"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
      )}

      {/* Profile Header - Instagram Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>

        <div className="relative flex flex-col md:flex-row gap-8 mt-4">
          {/* Avatar */}
          <div className="flex justify-center md:justify-start">
            {isOwnProfile ? (
              <ProfilePictureUpload
                currentAvatarUrl={displayProfile.avatar_url || undefined}
                onUploadComplete={handleAvatarUpload}
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                {displayProfile.avatar_url ? (
                  <img
                    src={displayProfile.avatar_url}
                    alt={displayProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-gray-400 font-bold">
                    {displayProfile.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-gray-900">{displayProfile.full_name}</h1>
                  {displayProfile.is_verified && (
                    <VerificationBadge size={22} className="mt-1" />
                  )}
                </div>
                <span className="text-gray-500 font-medium">@{displayProfile.username}</span>
              </div>

              {!isOwnProfile && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onProfileClick?.(displayProfile.id)}
                    className="btn-primary py-2 px-6"
                  >
                    Contact
                  </button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{userStats.postedCount}</div>
                <div className="text-sm text-gray-500">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{userStats.acceptedCount}</div>
                <div className="text-sm text-gray-500">Accepted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{userStats.completedCount}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <div className="text-2xl font-bold text-gray-900">{displayProfile.rating?.toFixed(1) || '0.0'}</div>
                </div>
                <div className="text-sm text-gray-500">Rating</div>
              </div>
              {isOwnProfile && (
                <div className="text-center bg-green-50 p-2 rounded-lg -mt-2">
                  <div className="text-2xl font-bold text-green-600">₹{userStats.totalEarned}</div>
                  <div className="text-sm text-green-700">Earnings</div>
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="mb-4">
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                    className="input w-full"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveBio} className="btn-primary text-sm">
                      Save
                    </button>
                    <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-gray-700 flex-1 whitespace-pre-wrap">{displayProfile.bio || (isOwnProfile ? 'No bio yet. Click edit to add one!' : 'No bio available.')}</p>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded-full transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Skills */}
            {displayProfile.skills && displayProfile.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {displayProfile.skills.map((skill: string) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-blue-100/50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'posts'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Briefcase size={20} />
            My Posts ({stats.posted})
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'accepted'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <CheckCircle size={20} />
            Accepted ({stats.accepted})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'activity'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <TrendingUp size={20} />
            Activity
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'posts' && (
                <div className="space-y-4">
                  {myTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No tasks posted yet</p>
                    </div>
                  ) : (
                    myTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick?.(task)}
                        onProfileClick={onProfileClick}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'accepted' && (
                <div className="space-y-4">
                  {acceptedTasks.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No tasks accepted yet</p>
                    </div>
                  ) : (
                    acceptedTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick?.(task)}
                        onProfileClick={onProfileClick}
                      />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <ActivityFeed userId={displayProfile.id} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}