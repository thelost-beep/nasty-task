import { BadgeCheck } from 'lucide-react';

interface VerificationBadgeProps {
    size?: number;
    className?: string;
}

export function VerificationBadge({ size = 16, className = "" }: VerificationBadgeProps) {
    return (
        <div className={`inline-flex items-center justify-center ${className}`}>
            <div className="relative flex items-center justify-center">
                {/* Outer glow/shadow */}
                <div className="absolute inset-0 bg-blue-400/20 blur-[2px] rounded-full scale-110" />

                {/* The Badge */}
                <BadgeCheck
                    size={size}
                    className="text-[#1D9BF0] fill-white relative z-10 drop-shadow-sm"
                    strokeWidth={2.5}
                />
            </div>
        </div>
    );
}
