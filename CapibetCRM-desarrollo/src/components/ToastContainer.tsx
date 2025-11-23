'use client';

import { useToastNotifications } from '@/hooks/useToastNotifications';
import ToastNotification from './ToastNotification';

export default function ToastContainer() {
  const { toasts, settings, removeToast } = useToastNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 pointer-events-none">
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 8}px)`,
            zIndex: 9999 - index
          }}
        >
          <ToastNotification
            notification={toast}
            onClose={() => removeToast(toast.id)}
            duration={settings.duration}
          />
        </div>
      ))}
    </div>
  );
}
