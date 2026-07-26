import React from 'react';
import { MapPin, Sparkles } from 'lucide-react';

/**
 * CharacterCard — bio + quick-reply topic chips.
 *
 * `chips` is an array of strings (suggested questions).  When provided,
 * they're rendered as buttons that trigger `onChipClick(question)`.
 * If omitted, falls back to no chips (for non-monument contexts).
 */
export default function CharacterCard({
  name,
  location,
  title,
  bio,
  chips = [],
  onChipClick,
}) {
  return (
    <div className="bg-[#111010] border border-[#c4a06a]/20 rounded-2xl p-6 shadow-2xl mx-4 mb-4" id="character-bio-card">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-[#c4a06a] mb-2">{name}</h2>
        <div className="flex items-center justify-center gap-1.5 text-sand/60 text-sm mb-3">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>
        <p className="text-sand/50 text-sm font-medium">{title}</p>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#c4a06a]/20 to-transparent mb-6" />

      {/* Bio */}
      <p className="text-sand/70 text-sm leading-relaxed text-center mb-8 px-2">
        {bio}
      </p>

      {/* Quick topic chips (sent through the RAG pipeline) */}
      {chips.length > 0 && (
        <div className="pt-6 border-t border-[#c4a06a]/10">
          <p className="text-xs text-[#c4a06a]/50 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            ابدأ بهذه الأسئلة
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {chips.map((label, i) => (
              <button
                key={i}
                onClick={() => onChipClick(label)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1815] border border-[#c4a06a]/15 rounded-xl text-sand/80 text-sm font-medium hover:bg-[#c4a06a]/10 hover:border-[#c4a06a]/40 hover:text-[#c4a06a] transition-all duration-300"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
