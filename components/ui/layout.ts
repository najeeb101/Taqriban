// Symmetric negative inline margins that let a block grow from the 30rem content column of AppShell up to 44rem
// (never wider than the viewport minus gutters). Direction-independent, so it works in RTL. Phones: margin is 0.
export const HERO_BREAKOUT = 'mx-[calc((min(30rem,100vw_-_2rem)_-_min(44rem,100vw_-_2rem))/2)]';

// Same trick for the play screens (question + reveal), which get the full Fermi-like 54rem (about 860px) card.
export const PLAY_BREAKOUT = 'mx-[calc((min(30rem,100vw_-_2rem)_-_min(54rem,100vw_-_2rem))/2)]';

// The admin dashboard gets a wide 64rem column for its tables and tiles.
export const ADMIN_BREAKOUT = 'mx-[calc((min(30rem,100vw_-_2rem)_-_min(64rem,100vw_-_2rem))/2)]';
