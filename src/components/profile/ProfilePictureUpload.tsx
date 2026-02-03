import { useState } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface ProfilePictureUploadProps {
    currentAvatarUrl?: string;
    onUploadComplete: (url: string) => void;
}

export function ProfilePictureUpload({ currentAvatarUrl, onUploadComplete }: ProfilePictureUploadProps) {
    const { profile } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setUploading(true);

        try {
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('profiles')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(filePath);

            // Update profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id);

            if (updateError) throw updateError;

            onUploadComplete(publicUrl);
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Failed to upload avatar');
            setPreviewUrl(currentAvatarUrl);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative">
                {previewUrl ? (
                    <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-white font-bold text-4xl">
                        {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="hidden"
                        />
                        {uploading ? (
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        ) : (
                            <Camera className="w-8 h-8 text-white" />
                        )}
                    </label>
                </div>
            </div>

            <button
                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
                <Upload size={16} />
            </button>
        </div>
    );
}
