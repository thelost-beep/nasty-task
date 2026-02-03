import { useState, useEffect } from 'react';
import {
    Users,
    Search,
    CheckCircle,
    XCircle,
    Shield,
    ShieldCheck,
    ArrowLeft
} from 'lucide-react';
import { VerificationBadge } from '../ui/VerificationBadge';
import { supabase, Profile } from '../../lib/supabase';

interface AdminVerificationProps {
    onBack: () => void;
}

export function AdminVerification({ onBack }: AdminVerificationProps) {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleVerification = async (user: Profile) => {
        try {
            setUpdatingId(user.id);
            const { error } = await supabase
                .from('profiles')
                .update({ is_verified: !user.is_verified })
                .eq('id', user.id);

            if (error) throw error;

            setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, is_verified: !u.is_verified } : u
            ));
        } catch (error) {
            console.error('Error updating verification:', error);
            alert('Failed to update verification status. Make sure you have admin rights.');
        } finally {
            setUpdatingId(null);
        }
    };

    const toggleAdmin = async (user: Profile) => {
        try {
            setUpdatingId(user.id);
            const { error } = await supabase
                .from('profiles')
                .update({ is_admin: !user.is_admin })
                .eq('id', user.id);

            if (error) throw error;

            setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, is_admin: !u.is_admin } : u
            ));
        } catch (error) {
            console.error('Error updating admin status:', error);
            alert('Failed to update admin status.');
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-20">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Users className="text-blue-500" />
                            Verification Manager
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Admin panel to manage user verification and roles</p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Users</div>
                    <div className="text-2xl font-black text-blue-600">{users.length}</div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search users by name or username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                />
            </div>

            {/* User List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-20">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No users found matching your search.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 border-2 border-white dark:border-gray-600 shadow-sm">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xl font-bold text-gray-400 capitalize">{user.full_name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none">
                                                {user.full_name}
                                            </h3>
                                            {user.is_verified && (
                                                <VerificationBadge size={16} />
                                            )}
                                            {user.is_admin && (
                                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Verification Toggle */}
                                    <button
                                        onClick={() => toggleVerification(user)}
                                        disabled={updatingId === user.id}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${user.is_verified
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            } disabled:opacity-50`}
                                    >
                                        {user.is_verified ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                        <span className="hidden sm:inline">{user.is_verified ? 'Remove Tick' : 'Assign Tick'}</span>
                                    </button>

                                    {/* Admin Toggle */}
                                    <button
                                        onClick={() => toggleAdmin(user)}
                                        disabled={updatingId === user.id}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${user.is_admin
                                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            } disabled:opacity-50`}
                                    >
                                        {user.is_admin ? <ShieldCheck size={18} /> : <Shield size={18} />}
                                        <span className="hidden sm:inline">{user.is_admin ? 'Revoke Admin' : 'Make Admin'}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center shrink-0">
                        <CheckCircle className="text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-900 dark:text-blue-100">Verification Guidelines</h4>
                        <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mt-1">
                            Assign the Blue Tick to trusted users who have completed multiple tasks with high ratings or verified their physical identity. This builds trust as "Verified Academic Experts".
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
