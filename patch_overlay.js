const fs = require('fs');
const text = fs.readFileSync('frontend/src/pages/map/MonumentChat.jsx', 'utf8');

const regex = /export default function MonumentChat\(\{ overrideSlug, initialContext \}\) \{/;
const newSignature = "export default function MonumentChat({ overrideSlug, initialContext, isOverlay }) {";

let updated = text.replace(regex, newSignature);

// The main return
const returnStr = `return (
    <PageShell className="bg-espresso/5">
      <div
        className="h-[calc(100vh-4rem)] grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden"
        style={{ background: 'radial-gradient(circle at center, #111010 0%, #0b0a08 100%)' }}
      >`;

const newReturnStr = `
  const Wrapper = isOverlay ? 'div' : PageShell;
  const wrapperProps = isOverlay ? { className: 'w-full h-full bg-[#111010]' } : { className: 'bg-espresso/5' };
  const innerClass = isOverlay 
    ? 'h-full grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden'
    : 'h-[calc(100vh-4rem)] grid lg:grid-cols-[1.15fr_0.85fr] animate-slide-in-end overflow-hidden';

  return (
    <Wrapper {...wrapperProps}>
      <div
        className={innerClass}
        style={{ background: 'radial-gradient(circle at center, #111010 0%, #0b0a08 100%)' }}
      >`;

updated = updated.replace(returnStr, newReturnStr);

// The closing tags
// Find the last </PageShell>
const lastPageShellIdx = updated.lastIndexOf('</PageShell>');
if (lastPageShellIdx !== -1) {
    updated = updated.substring(0, lastPageShellIdx) + '</Wrapper>' + updated.substring(lastPageShellIdx + '</PageShell>'.length);
}

// The loading state PageShell
const loadingStr = `<PageShell className="bg-espresso/5">
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center">`;
const newLoadingStr = `<Wrapper {...wrapperProps}>
        <div className={isOverlay ? "h-full flex items-center justify-center" : "h-[calc(100vh-4rem)] flex items-center justify-center"}>`;

updated = updated.replace(loadingStr, newLoadingStr);
updated = updated.replace('</PageShell>', '</Wrapper>'); // replaces the first one (loading)

fs.writeFileSync('frontend/src/pages/map/MonumentChat.jsx', updated);
console.log("Patched Overlay successfully.");
