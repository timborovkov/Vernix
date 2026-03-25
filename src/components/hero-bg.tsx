"use client";

/**
 * Animated hero background with subtle radial grid lines
 * using the warm violet accent color. Pure CSS/SVG, no dependencies.
 * Respects prefers-reduced-motion.
 */
export function HeroBg() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Radial gradient glow from center */}
      <div className="absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,oklch(0.55_0.15_290/0.08)_0%,transparent_70%)] motion-reduce:opacity-100" />

      {/* Animated grid lines */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.04] dark:opacity-[0.06]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="hero-grid"
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 64 0 L 0 0 0 64"
              fill="none"
              stroke="oklch(0.55 0.15 290)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>

      {/* Horizontal accent line through center with pulse */}
      <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2">
        <div className="hero-line-pulse mx-auto h-full max-w-2xl bg-gradient-to-r from-transparent via-[oklch(0.55_0.15_290/0.3)] to-transparent motion-reduce:animate-none" />
      </div>
    </div>
  );
}
