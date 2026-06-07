export interface Country {
  id: number;
  name: string;
  flagCode: string;
  group: string;
  continent: string;
  favoriteRank: number; // 1 = tournament favourite, 48 = outsider
}

// 2026 FIFA World Cup — Official 48-team lineup
// favoriteRank based on pre-tournament betting odds (May 2026)
// Sources: DraftKings, FanDuel, ESPN — Spain +475, France +500, England +650, Brazil +800, Argentina +900
export const COUNTRIES: Country[] = [
  // ── Tier 1: Contenders ─────────────────────────────────────────
  { id: 29, name: "Spain",           flagCode: "es",     group: "H", continent: "UEFA",     favoriteRank: 1  },
  { id: 33, name: "France",          flagCode: "fr",     group: "I", continent: "UEFA",     favoriteRank: 2  },
  { id: 45, name: "England",         flagCode: "gb-eng", group: "L", continent: "UEFA",     favoriteRank: 3  },
  { id:  9, name: "Brazil",          flagCode: "br",     group: "C", continent: "CONMEBOL", favoriteRank: 4  },
  { id: 37, name: "Argentina",       flagCode: "ar",     group: "J", continent: "CONMEBOL", favoriteRank: 5  },
  { id: 17, name: "Germany",         flagCode: "de",     group: "E", continent: "UEFA",     favoriteRank: 6  },
  { id: 41, name: "Portugal",        flagCode: "pt",     group: "K", continent: "UEFA",     favoriteRank: 7  },
  { id: 21, name: "Netherlands",     flagCode: "nl",     group: "F", continent: "UEFA",     favoriteRank: 8  },

  // ── Tier 2: Dark Horses ────────────────────────────────────────
  { id: 25, name: "Belgium",         flagCode: "be",     group: "G", continent: "UEFA",     favoriteRank: 9  },
  { id: 32, name: "Uruguay",         flagCode: "uy",     group: "H", continent: "CONMEBOL", favoriteRank: 10 },
  { id: 44, name: "Colombia",        flagCode: "co",     group: "K", continent: "CONMEBOL", favoriteRank: 11 },
  { id: 22, name: "Japan",           flagCode: "jp",     group: "F", continent: "AFC",      favoriteRank: 12 },
  { id: 10, name: "Morocco",         flagCode: "ma",     group: "C", continent: "CAF",      favoriteRank: 13 },
  { id: 13, name: "United States",   flagCode: "us",     group: "D", continent: "CONCACAF", favoriteRank: 14 },
  { id: 36, name: "Norway",          flagCode: "no",     group: "I", continent: "UEFA",     favoriteRank: 15 },
  { id: 46, name: "Croatia",         flagCode: "hr",     group: "L", continent: "UEFA",     favoriteRank: 16 },

  // ── Tier 3: Solid Teams ────────────────────────────────────────
  { id:  3, name: "South Korea",     flagCode: "kr",     group: "A", continent: "AFC",      favoriteRank: 17 },
  { id:  8, name: "Switzerland",     flagCode: "ch",     group: "B", continent: "UEFA",     favoriteRank: 18 },
  { id: 16, name: "Turkey",          flagCode: "tr",     group: "D", continent: "UEFA",     favoriteRank: 19 },
  { id: 34, name: "Senegal",         flagCode: "sn",     group: "I", continent: "CAF",      favoriteRank: 20 },
  { id: 20, name: "Ecuador",         flagCode: "ec",     group: "E", continent: "CONMEBOL", favoriteRank: 21 },
  { id:  1, name: "Mexico",          flagCode: "mx",     group: "A", continent: "CONCACAF", favoriteRank: 22 },
  { id: 23, name: "Sweden",          flagCode: "se",     group: "F", continent: "UEFA",     favoriteRank: 23 },
  { id: 39, name: "Austria",         flagCode: "at",     group: "J", continent: "UEFA",     favoriteRank: 24 },

  // ── Tier 4: Competitive ────────────────────────────────────────
  { id:  5, name: "Canada",          flagCode: "ca",     group: "B", continent: "CONCACAF", favoriteRank: 25 },
  { id: 19, name: "Ivory Coast",     flagCode: "ci",     group: "E", continent: "CAF",      favoriteRank: 26 },
  { id: 15, name: "Australia",       flagCode: "au",     group: "D", continent: "AFC",      favoriteRank: 27 },
  { id: 12, name: "Scotland",        flagCode: "gb-sct", group: "C", continent: "UEFA",     favoriteRank: 28 },
  { id:  4, name: "Czech Republic",  flagCode: "cz",     group: "A", continent: "UEFA",     favoriteRank: 29 },
  { id: 14, name: "Paraguay",        flagCode: "py",     group: "D", continent: "CONMEBOL", favoriteRank: 30 },
  { id:  6, name: "Bosnia-Herz.",    flagCode: "ba",     group: "B", continent: "UEFA",     favoriteRank: 31 },
  { id: 38, name: "Algeria",         flagCode: "dz",     group: "J", continent: "CAF",      favoriteRank: 32 },

  // ── Tier 5: Outsiders ──────────────────────────────────────────
  { id: 47, name: "Ghana",           flagCode: "gh",     group: "L", continent: "CAF",      favoriteRank: 33 },
  { id: 42, name: "DR Congo",        flagCode: "cd",     group: "K", continent: "CAF",      favoriteRank: 34 },
  { id: 26, name: "Egypt",           flagCode: "eg",     group: "G", continent: "CAF",      favoriteRank: 35 },
  { id: 24, name: "Tunisia",         flagCode: "tn",     group: "F", continent: "CAF",      favoriteRank: 36 },
  { id: 31, name: "Saudi Arabia",    flagCode: "sa",     group: "H", continent: "AFC",      favoriteRank: 37 },
  { id: 27, name: "Iran",            flagCode: "ir",     group: "G", continent: "AFC",      favoriteRank: 38 },
  { id:  2, name: "South Africa",    flagCode: "za",     group: "A", continent: "CAF",      favoriteRank: 39 },
  { id: 40, name: "Jordan",          flagCode: "jo",     group: "J", continent: "AFC",      favoriteRank: 40 },

  // ── Tier 6: Long Shots ─────────────────────────────────────────
  { id: 30, name: "Cape Verde",      flagCode: "cv",     group: "H", continent: "CAF",      favoriteRank: 41 },
  { id: 43, name: "Uzbekistan",      flagCode: "uz",     group: "K", continent: "AFC",      favoriteRank: 42 },
  { id: 35, name: "Iraq",            flagCode: "iq",     group: "I", continent: "AFC",      favoriteRank: 43 },
  { id: 48, name: "Panama",          flagCode: "pa",     group: "L", continent: "CONCACAF", favoriteRank: 44 },
  { id: 11, name: "Haiti",           flagCode: "ht",     group: "C", continent: "CONCACAF", favoriteRank: 45 },
  { id:  7, name: "Qatar",           flagCode: "qa",     group: "B", continent: "AFC",      favoriteRank: 46 },
  { id: 18, name: "Curaçao",         flagCode: "cw",     group: "E", continent: "CONCACAF", favoriteRank: 47 },
  { id: 28, name: "New Zealand",     flagCode: "nz",     group: "G", continent: "OFC",      favoriteRank: 48 },
];

export const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"] as const;

export function getCountriesByGroup(group: string): Country[] {
  return COUNTRIES.filter(c => c.group === group);
}

export function getFlagUrl(flagCode: string, size = 320): string {
  return `https://flagcdn.com/w${size}/${flagCode}.png`;
}
