/* eslint-disable @next/next/no-img-element */
/**
 * Animated wallpaper behind every /login tree, built from the Match & CO. brand package's own homepage hero
 * (10_Website/index.html): the two gradient ribbons, the four soft orbs and the Match Bot, now drifting.
 * Styles live in app/matchco.css (.mc-wallpaper). Decoration only: aria-hidden, no pointer events,
 * transform-only motion, still under prefers-reduced-motion.
 */
export function LoginWallpaper() {
  return (
    <div className="mc-wallpaper" aria-hidden>
      <svg className="mc-ribbons" viewBox="0 0 900 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mc-rib1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#A78BFA" stopOpacity="0" />
            <stop offset=".35" stopColor="#A78BFA" stopOpacity=".22" />
            <stop offset=".7" stopColor="#FF6B8B" stopOpacity=".18" />
            <stop offset="1" stopColor="#FFB17A" stopOpacity=".25" />
          </linearGradient>
          <linearGradient id="mc-rib2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FFB17A" stopOpacity="0" />
            <stop offset=".5" stopColor="#FF6B8B" stopOpacity=".12" />
            <stop offset="1" stopColor="#FFB17A" stopOpacity=".28" />
          </linearGradient>
        </defs>
        <path className="mc-rib mc-rib-a" d="M0,420 C180,330 320,520 520,400 C700,290 780,180 900,140 L900,260 C790,300 720,420 540,500 C340,590 200,450 0,520 Z" fill="url(#mc-rib1)" />
        <path className="mc-rib mc-rib-b" d="M80,560 C260,470 420,600 600,480 C740,390 820,320 900,300 L900,360 C820,380 760,470 620,540 C440,630 280,520 80,600 Z" fill="url(#mc-rib2)" />
      </svg>
      <span className="mc-orb mc-orb-a" />
      <span className="mc-orb mc-orb-b" />
      <span className="mc-orb mc-orb-c" />
      <span className="mc-orb mc-orb-d" />
      <img className="mc-bot" src="/brand/matchco/matchbot-happy.svg" alt="" />
    </div>
  );
}
