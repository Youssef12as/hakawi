export default function AIBadge() {
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-wine text-sand text-xs font-bold rounded-full shadow-md select-none"
      id="ai-badge"
      role="status"
      aria-label="This is an AI character, not a real person"
    >
      <span className="w-1.5 h-1.5 bg-sand rounded-full animate-pulse" />
      <span>ذكاء اصطناعي — ليس شخصًا حقيقيًا</span>
    </div>
  );
}
