// Confetti — a one-shot burst of small pieces from the top-centre of the nearest `relative overflow-hidden` parent.
// Pure CSS (keyframes `confetti` in globals.css); positions are deterministic so renders stay pure. Render it only when
// motion is allowed (see prefersReducedMotion in ./motion).
const COLOURS = ['var(--sand)', '#ffffff', 'var(--tier-green)', 'var(--tier-yellow)', 'var(--tier-orange)'];
const PIECES = 26;

export function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/3 flex h-0 justify-center">
      {Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.35;
        const dist = 110 + ((i * 53) % 90);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 60;
        return (
          <span
            key={i}
            className="absolute block h-2.5 w-1.5 rounded-[2px]"
            style={
              {
                background: COLOURS[i % COLOURS.length],
                '--dx': `${dx.toFixed(0)}px`,
                '--dy': `${dy.toFixed(0)}px`,
                '--rot': `${(i * 97) % 540}deg`,
                animation: `confetti 1.5s cubic-bezier(0.15, 0.7, 0.3, 1) ${(i % 5) * 40}ms both`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
