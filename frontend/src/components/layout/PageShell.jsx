export default function PageShell({ children, className = '' }) {
  return (
    <div className={`pt-16 min-h-screen ${className}`}>
      {children}
    </div>
  );
}
