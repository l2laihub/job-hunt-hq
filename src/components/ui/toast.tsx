import React from 'react';
import { cn } from '@/src/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useUIStore, type Toast as ToastType } from '@/src/stores/ui';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const styles = {
  success: 'border-green-800 bg-green-900/20',
  error: 'border-red-800 bg-red-900/20',
  warning: 'border-yellow-800 bg-yellow-900/20',
  info: 'border-blue-800 bg-blue-900/20',
};

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'animate-slide-in',
        styles[toast.type]
      )}
      role="alert"
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-gray-400 mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-500 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};
