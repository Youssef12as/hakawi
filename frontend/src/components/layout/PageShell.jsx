export default function PageShell({ children, className = '' }) {
  return (
    <div
      className={`pt-16 min-h-screen bg-[#0e0b08] text-[#f0e0c8] ${className}`}
      style={{
        background: 'radial-gradient(ellipse at center top, #17120c 0%, #0e0b08 80%)',
      }}
    >
      {children}
    </div>
  );
}
