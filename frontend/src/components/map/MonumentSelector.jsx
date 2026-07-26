import { MapPin, ChevronLeft, Landmark } from 'lucide-react';

/**
 * MonumentSelector — shown after the user picks a governorate.
 * Displays a scrollable grid of monument cards.  Clicking a card opens the
 * chat for that monument's historical character.
 */
export default function MonumentSelector({
  governorate,
  monuments,
  onSelectMonument,
  onBack,
}) {
  return (
    <div className="h-full flex flex-col bg-[#0b0a08] animate-slide-in-end">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#c4a06a]/20 flex-shrink-0 bg-espresso/50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sand/60 hover:text-[#c4a06a] transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          رجوع للخريطة
        </button>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#c4a06a]" />
          <span className="text-sand/70 text-sm font-bold">{governorate.name}</span>
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-[#c4a06a] mb-1">اختر الأثر</h2>
        <p className="text-sand/40 text-sm">
          {monuments.length} معالم في {governorate.name}
        </p>
      </div>

      {/* Monument grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {monuments.map((monument) => (
            <button
              key={monument.key}
              onClick={() => onSelectMonument(monument)}
              className="group text-right p-5 bg-[#111010] border border-[#c4a06a]/15 rounded-2xl hover:border-[#c4a06a]/50 hover:bg-[#c4a06a]/5 transition-all duration-300 active:scale-[0.98]"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#c4a06a]/10 border border-[#c4a06a]/20 flex items-center justify-center group-hover:bg-[#c4a06a]/20 transition-colors">
                  <Landmark className="w-5 h-5 text-[#c4a06a]/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sand font-bold text-base mb-0.5 truncate">
                    {monument.display_name}
                  </h3>
                  <p className="text-[#c4a06a]/60 text-xs font-medium mb-2">
                    {monument.builder}
                  </p>
                  <p className="text-sand/40 text-xs leading-relaxed line-clamp-2">
                    {monument.bio}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
