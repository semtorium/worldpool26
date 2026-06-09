/**
 * tournamentData.ts
 * Group-stage standings for the 2026 FIFA World Cup.
 *
 * Update p/w/d/l/gf/ga as matches are played.
 * pts  = w*3 + d   (computed)
 * gd   = gf - ga   (computed)
 *
 * countryId references COUNTRIES array in countries.ts.
 * Sorted at runtime by pts → gd → gf → favoriteRank (stable pre-tournament order).
 */

export interface TeamStanding {
  countryId: number;
  p:  number; // Played
  w:  number; // Won
  d:  number; // Drawn
  l:  number; // Lost
  gf: number; // Goals For
  ga: number; // Goals Against
}

export const getPts = (s: TeamStanding) => s.w * 3 + s.d;
export const getGD  = (s: TeamStanding) => s.gf - s.ga;

// Sort: Pts desc → GD desc → GF desc → (caller handles favoriteRank tiebreak)
export function sortStandings(standings: TeamStanding[]): TeamStanding[] {
  return [...standings].sort((a, b) => {
    const dp = getPts(b) - getPts(a); if (dp !== 0) return dp;
    const dg = getGD(b)  - getGD(a);  if (dg !== 0) return dg;
    return b.gf - a.gf;
  });
}

// ── 12 Groups · 48 Teams · all initialised to 0 ──────────────────────────────
// Update these values as the tournament progresses.

export const GROUP_STANDINGS: Record<string, TeamStanding[]> = {
  // Group A — MEX · RSA · KOR · CZE
  A: [
    { countryId:  1, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Mexico
    { countryId:  2, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // South Africa
    { countryId:  3, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // South Korea
    { countryId:  4, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Czech Republic
  ],
  // Group B — CAN · BIH · QAT · SUI
  B: [
    { countryId:  5, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Canada
    { countryId:  6, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Bosnia-Herz.
    { countryId:  7, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Qatar
    { countryId:  8, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Switzerland
  ],
  // Group C — BRA · MAR · HAI · SCO
  C: [
    { countryId:  9, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Brazil
    { countryId: 10, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Morocco
    { countryId: 11, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Haiti
    { countryId: 12, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Scotland
  ],
  // Group D — USA · PAR · AUS · TUR
  D: [
    { countryId: 13, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // United States
    { countryId: 14, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Paraguay
    { countryId: 15, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Australia
    { countryId: 16, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Turkey
  ],
  // Group E — GER · CUW · CIV · ECU
  E: [
    { countryId: 17, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Germany
    { countryId: 18, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Curaçao
    { countryId: 19, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Ivory Coast
    { countryId: 20, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Ecuador
  ],
  // Group F — NED · JPN · SWE · TUN
  F: [
    { countryId: 21, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Netherlands
    { countryId: 22, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Japan
    { countryId: 23, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Sweden
    { countryId: 24, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Tunisia
  ],
  // Group G — BEL · EGY · IRN · NZL
  G: [
    { countryId: 25, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Belgium
    { countryId: 26, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Egypt
    { countryId: 27, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Iran
    { countryId: 28, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // New Zealand
  ],
  // Group H — ESP · CPV · URU · KSA
  H: [
    { countryId: 29, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Spain
    { countryId: 30, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Cape Verde
    { countryId: 31, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Saudi Arabia
    { countryId: 32, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Uruguay
  ],
  // Group I — FRA · NOR · SEN · IRQ
  I: [
    { countryId: 33, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // France
    { countryId: 34, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Senegal
    { countryId: 35, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Iraq
    { countryId: 36, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Norway
  ],
  // Group J — ARG · ALG · AUT · JOR
  J: [
    { countryId: 37, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Argentina
    { countryId: 38, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Algeria
    { countryId: 39, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Austria
    { countryId: 40, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Jordan
  ],
  // Group K — POR · COD · UZB · COL
  K: [
    { countryId: 41, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Portugal
    { countryId: 42, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // DR Congo
    { countryId: 43, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Uzbekistan
    { countryId: 44, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Colombia
  ],
  // Group L — ENG · CRO · GHA · PAN
  L: [
    { countryId: 45, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // England
    { countryId: 46, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Croatia
    { countryId: 47, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Ghana
    { countryId: 48, p:0, w:0, d:0, l:0, gf:0, ga:0 }, // Panama
  ],
};
