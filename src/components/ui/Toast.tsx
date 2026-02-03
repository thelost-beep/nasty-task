import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const styles = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    const icons = {
        success: <CheckCircle className="text-green-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
    };

    return (
        <div className={`fixed bottom-24 right-4 md:bottom-20 md:right-8 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-fade-in-up ${styles[type]}`}>
            {icons[type]}
            <p className="font-medium">{message}</p>
            <button
                onClick={onClose}
                className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={18} />
            </button>
        </div>
    );
}

// Simple Toast Manager Hook/Provider could be more robust,
// but for this task, a simple component will suffice.
