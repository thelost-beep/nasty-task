import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Bell, Lock, User, Palette, Save, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';

interface NotificationSettings {
    taskUpdates: boolean;
    newBids: boolean;
    messages: boolean;
    marketing: boolean;
}

interface PrivacySettings {
    showEmail: boolean;
    showProfile: boolean;
    allowMessages: boolean;
}

export function SettingsPage() {
    const { profile } = useAuth();
    const { theme, setTheme } = useTheme();
    const [notifications, setNotifications] = useState<NotificationSettings>(() => {
        const saved = localStorage.getItem('notifications');
        return saved ? JSON.parse(saved) : {
            taskUpdates: true,
            newBids: true,
            messages: true,
            marketing: false,
        };
    });
    const [privacy, setPrivacy] = useState<PrivacySettings>(() => {
        const saved = localStorage.getItem('privacy');
        return saved ? JSON.parse(saved) : {
            showEmail: false,
            showProfile: true,
            allowMessages: true,
        };
    });
    const [saved, setSaved] = useState(false);

    // Auto-save when settings change
    useEffect(() => {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }, [notifications]);

    useEffect(() => {
        localStorage.setItem('privacy', JSON.stringify(privacy));
    }, [privacy]);

    const handleSaveSettings = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <SettingsIcon size={32} />
                    Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account preferences and settings</p>
            </div>

            <div className="space-y-6">
                {/* Theme Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                        <Palette className="text-blue-600 dark:text-blue-400" size={24} />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Appearance</h2>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Theme
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => setTheme('light')}
                                className={`p-4 rounded-lg border-2 transition-all ${theme === 'light'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Light</div>
                                {theme === 'light' && <Check className="w-4 h-4 text-blue-600 mx-auto mt-1" />}
                            </button>

                            <button
                                onClick={() => setTheme('dark')}
                                className={`p-4 rounded-lg border-2 transition-all ${theme === 'dark'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Moon className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Dark</div>
                                {theme === 'dark' && <Check className="w-4 h-4 text-blue-600 mx-auto mt-1" />}
                            </button>

                            <button
                                onClick={() => setTheme('auto')}
                                className={`p-4 rounded-lg border-2 transition-all ${theme === 'auto'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <div className="flex justify-center mb-2">
                                    <Sun className="w-4 h-4 text-yellow-500" />
                                    <Moon className="w-4 h-4 text-indigo-500" />
                                </div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">Auto</div>
                                {theme === 'auto' && <Check className="w-4 h-4 text-blue-600 mx-auto mt-1" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="text-blue-600 dark:text-blue-400" size={24} />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notifications</h2>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Task Updates</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Get notified about task status changes</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.taskUpdates}
                                onChange={(e) => setNotifications({ ...notifications, taskUpdates: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">New Bids</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Get notified when someone bids on your task</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.newBids}
                                onChange={(e) => setNotifications({ ...notifications, newBids: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Messages</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Get notified about new messages</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.messages}
                                onChange={(e) => setNotifications({ ...notifications, messages: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Marketing</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Receive updates about new features</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={notifications.marketing}
                                onChange={(e) => setNotifications({ ...notifications, marketing: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                    </div>
                </div>

                {/* Privacy Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="text-blue-600 dark:text-blue-400" size={24} />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Privacy</h2>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Show Email</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Display your email on your profile</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={privacy.showEmail}
                                onChange={(e) => setPrivacy({ ...privacy, showEmail: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Public Profile</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Make your profile visible to everyone</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={privacy.showProfile}
                                onChange={(e) => setPrivacy({ ...privacy, showProfile: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Allow Direct Messages</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Let other users send you messages</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={privacy.allowMessages}
                                onChange={(e) => setPrivacy({ ...privacy, allowMessages: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </label>
                    </div>
                </div>

                {/* Account Info */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                        <User className="text-blue-600 dark:text-blue-400" size={24} />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account Information</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400">Username</span>
                            <span className="font-medium text-gray-900 dark:text-white">@{profile?.username}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <span className="text-gray-600 dark:text-gray-400">Member Since</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Save Confirmation */}
                {saved && (
                    <div className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
                        <Check size={20} />
                        Settings saved automatically!
                    </div>
                )}

                {/* Manual Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSaveSettings}
                        className="btn-primary px-8 py-3 text-lg"
                    >
                        <Save size={20} className="mr-2" />
                        Save All Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
