import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, children, title, showClose = true }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handler = (e) => {
        if (e.key === 'Escape' && onClose) onClose();
      };
      window.addEventListener('keydown', handler);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handler);
      };
    }
  }, [isOpen, onClose]);

  // Safety net: always restore overflow when the Modal unmounts,
  // even if it was still "open" (e.g. ConsentScreen disappears after consent).
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={showClose ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-espresso/60 backdrop-blur-sm animate-fade-in" />

      {/* Content */}
      <div
        className="relative bg-sand rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-brown/15"
        onClick={(e) => e.stopPropagation()}
      >
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 text-olive hover:text-espresso transition-colors p-1 rounded-lg"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {title && (
          <h2 className="text-xl font-bold text-espresso mb-4 pe-8">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
