import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Clock3, MessageCircleMore, Sparkles, X } from 'lucide-react';

function ComingSoonContent({ monument, onClose, onExploreAvailable, standalone }) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-[#c4a06a]/35 bg-[#17120d] px-4 pb-4 pt-5 text-center shadow-[0_24px_90px_rgba(0,0,0,0.65)] sm:rounded-[2rem] sm:px-8 sm:pb-8 sm:pt-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(196,160,106,0.22),transparent_70%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-5 top-16 select-none font-serif text-6xl text-[#c4a06a]/[0.06]"
        aria-hidden="true"
      >
        𓂀 𓋹
      </div>
      <div
        className="pointer-events-none absolute -left-4 bottom-16 select-none font-serif text-6xl text-[#c4a06a]/[0.06]"
        aria-hidden="true"
      >
        𓆣 𓇳
      </div>

      {!standalone && (
        <button
          ref={onClose?.buttonRef}
          type="button"
          onClick={onClose?.handler}
          className="absolute left-2 top-2 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#d9c6a4] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9b875] sm:left-4 sm:top-4"
          aria-label="إغلاق نافذة قريبًا"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}

      <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-[#c4a06a]/40 bg-[#c4a06a]/10 shadow-[0_0_35px_rgba(196,160,106,0.18)] sm:mb-5 sm:h-20 sm:w-20">
        <div className="absolute inset-2 rounded-full border border-dashed border-[#c4a06a]/35 motion-safe:animate-[spin_18s_linear_infinite]" aria-hidden="true" />
        <Clock3 className="h-7 w-7 text-[#e1bd77] sm:h-9 sm:w-9" strokeWidth={1.6} aria-hidden="true" />
        <Sparkles className="absolute -right-1 top-0 h-4 w-4 text-[#f0d59d] sm:h-5 sm:w-5" aria-hidden="true" />
      </div>

      <span className="inline-flex min-h-7 items-center rounded-full border border-[#c4a06a]/35 bg-[#c4a06a]/10 px-3 text-[11px] font-bold tracking-wide text-[#e6c98f] sm:min-h-8 sm:px-4 sm:text-xs">
        قريبًا في حكاوي
      </span>

      <h2 id="coming-soon-title" className="mt-3 text-xl font-black leading-tight text-[#fff1d8] sm:mt-4 sm:text-3xl">
        بنحضّر صوت {monument?.builder || 'الشخصية'} من قلب التاريخ
      </h2>
      <p id="coming-soon-description" className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#d9c6a4] sm:mt-3 sm:text-base sm:leading-7">
        لسه بنجهّز حكاية {monument?.display_name || 'الأثر'} وصوتها بعناية، علشان تقابلك بالشكل اللي يليق بيها.
      </p>

      <div className="mt-5 grid gap-2.5 sm:mt-7 sm:grid-cols-2 sm:gap-3">
        <button
          type="button"
          onClick={onExploreAvailable}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c4a06a] px-4 text-sm font-black text-[#17120d] transition-colors hover:bg-[#d9b875] active:bg-[#b48e55] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d9a2] sm:min-h-12 sm:px-5"
        >
          <MessageCircleMore className="h-5 w-5" aria-hidden="true" />
          <span>جرّب شخصية متاحة</span>
        </button>
        <button
          type="button"
          onClick={onClose?.handler}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#c4a06a]/35 bg-white/[0.03] px-4 text-sm font-bold text-[#ead9ba] transition-colors hover:bg-[#c4a06a]/10 hover:text-white active:bg-[#c4a06a]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d9b875] sm:min-h-12 sm:px-5"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
          <span>{standalone ? 'العودة للمعالم' : 'خلّيني أستكشف'}</span>
        </button>
      </div>
    </div>
  );
}

export default function ComingSoonCharacter({
  monument,
  isOpen = true,
  onClose,
  onExploreAvailable,
  standalone = false,
}) {
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen || standalone) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose, standalone]);

  if (!isOpen) return null;

  const closeAction = { handler: onClose, buttonRef: closeButtonRef };

  if (standalone) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(196,160,106,0.12),transparent_45%),#0b0a08] p-4" dir="rtl">
        <div className="w-full max-w-lg animate-scale-in motion-reduce:animate-none">
          <ComingSoonContent
            monument={monument}
            onClose={closeAction}
            onExploreAvailable={onExploreAvailable}
            standalone
          />
        </div>
      </div>
    );
  }

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[1000] flex h-[100dvh] items-start justify-center overflow-y-auto overscroll-contain bg-black/75 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coming-soon-title"
      aria-describedby="coming-soon-description"
      dir="rtl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="my-auto w-full max-w-lg animate-scale-in motion-reduce:animate-none">
        <ComingSoonContent
          monument={monument}
          onClose={closeAction}
          onExploreAvailable={onExploreAvailable}
          standalone={false}
        />
      </div>
    </div>,
    document.body,
  );
}

