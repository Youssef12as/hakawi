import { Mic, Square } from 'lucide-react';

export default function RecordButton({ isRecording, onToggle, disabled }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Pulse ring behind button when recording */}
      {isRecording && (
        <div className="absolute w-28 h-28 rounded-full bg-red-500/20 animate-ping" />
      )}

      <button
        onClick={onToggle}
        disabled={disabled}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-500 z-10
          ${isRecording
            ? 'bg-red-600 hover:bg-red-700 scale-110'
            : 'bg-wine hover:bg-wine/90 hover:scale-105'
          }
          text-sand shadow-xl
          disabled:opacity-50 disabled:cursor-not-allowed
          active:scale-95
        `}
        aria-label={isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
        id="record-btn"
      >
        {isRecording ? (
          <Square className="w-8 h-8" fill="currentColor" />
        ) : (
          <Mic className="w-10 h-10" />
        )}
      </button>
    </div>
  );
}
