/**
 * tournamentSchedule.ts
 * 2026 FIFA World Cup knockout schedule — all matches from R32 to Final.
 *
 * teamA / teamB:
 *   label    = display text ("1E", "2A", "3A/B/C/D/F", "TBD", or team name when known)
 *   flagCode = ISO flag code once team is known (undefined = TBD)
 *
 * BracketRow = 2 left-side matches that feed into 1 right-side match.
 */

export interface MatchSlot {
  label:     string;
  flagCode?: string;
}

export interface MatchData {
  id:    string;
  date:  string;  // "Jun 28"
  time:  string;  // "22:00"
  a:     MatchSlot;
  b:     MatchSlot;
  note?: string;  // "Final", "3rd Place", etc.
}

export interface BracketRow {
  left1: MatchData;
  left2: MatchData;
  right: MatchData;
}

const TBD: MatchSlot = { label: "TBD" };

// ── Round of 32 ───────────────────────────────────────────────────────────────
export const R32_MATCHES: MatchData[] = [
  // rows that feed → R16-M89, R16-M90, R16-M91, R16-M92
  { id:"M74", date:"Jun 29", time:"23:30", a:{label:"1E"},          b:{label:"3rd A/B/C/D/F"} },
  { id:"M77", date:"Jul 1",  time:"00:00", a:{label:"1I"},          b:{label:"3rd C/D/F/G/H"} },
  { id:"M73", date:"Jun 28", time:"22:00", a:{label:"2A"},          b:{label:"2B"}             },
  { id:"M75", date:"Jun 30", time:"04:00", a:{label:"1F"},          b:{label:"2C"}             },
  { id:"M76", date:"Jun 30", time:"22:00", a:{label:"1C"},          b:{label:"2F"}             },
  { id:"M78", date:"Jul 1",  time:"22:00", a:{label:"2E"},          b:{label:"2I"}             },
  { id:"M79", date:"Jul 1",  time:"04:00", a:{label:"1A"},          b:{label:"3rd C/E/F/H/I"} },
  { id:"M80", date:"Jul 2",  time:"04:00", a:{label:"1L"},          b:{label:"3rd E/H/I/J/K"} },
  // rows that feed → R16-M93, R16-M94, R16-M95, R16-M96
  { id:"M84", date:"Jul 2",  time:"22:00", a:{label:"1H"},          b:{label:"2J"}             },
  { id:"M83", date:"Jul 3",  time:"02:00", a:{label:"2K"},          b:{label:"2L"}             },
  { id:"M81", date:"Jul 2",  time:"00:00", a:{label:"1D"},          b:{label:"3rd B/E/F/I/J"} },
  { id:"M82", date:"Jul 3",  time:"00:00", a:{label:"1G"},          b:{label:"3rd A/E/H/I/J"} },
  { id:"M88", date:"Jul 3",  time:"22:00", a:{label:"2D"},          b:{label:"2G"}             },
  { id:"M86", date:"Jul 4",  time:"04:00", a:{label:"1J"},          b:{label:"2H"}             },
  { id:"M85", date:"Jul 3",  time:"04:00", a:{label:"1B"},          b:{label:"3rd E/F/G/I/J"} },
  { id:"M87", date:"Jul 4",  time:"00:00", a:{label:"1K"},          b:{label:"3rd D/E/I/J/L"} },
];

// ── Round of 16 ───────────────────────────────────────────────────────────────
export const R16_MATCHES: MatchData[] = [
  { id:"R16-M89", date:"Jul 5",  time:"00:00", a:TBD, b:TBD },
  { id:"R16-M90", date:"Jul 4",  time:"20:00", a:TBD, b:TBD },
  { id:"R16-M91", date:"Jul 5",  time:"22:00", a:TBD, b:TBD },
  { id:"R16-M92", date:"Jul 6",  time:"00:00", a:TBD, b:TBD },
  { id:"R16-M93", date:"Jul 6",  time:"22:00", a:TBD, b:TBD },
  { id:"R16-M94", date:"Jul 5",  time:"04:00", a:TBD, b:TBD },
  { id:"R16-M95", date:"Jul 6",  time:"04:00", a:TBD, b:TBD },
  { id:"R16-M96", date:"Jul 7",  time:"00:00", a:TBD, b:TBD },
];

// ── Quarterfinals ─────────────────────────────────────────────────────────────
export const QF_MATCHES: MatchData[] = [
  { id:"QF1", date:"Jul 9",  time:"23:00", a:TBD, b:TBD },
  { id:"QF2", date:"Jul 10", time:"23:00", a:TBD, b:TBD },
  { id:"QF3", date:"Jul 9",  time:"19:00", a:TBD, b:TBD },
  { id:"QF4", date:"Jul 12", time:"00:00", a:TBD, b:TBD },
];

// ── Semifinals ────────────────────────────────────────────────────────────────
export const SF_MATCHES: MatchData[] = [
  { id:"SF1", date:"Jul 14", time:"22:00", a:TBD, b:TBD },
  { id:"SF2", date:"Jul 15", time:"22:00", a:TBD, b:TBD },
];

// ── Final & 3rd place ─────────────────────────────────────────────────────────
export const FINAL_MATCH: MatchData  = { id:"Final", date:"Jul 19", time:"22:00", a:TBD, b:TBD, note:"🏆 Final"     };
export const THIRD_MATCH: MatchData  = { id:"3P",    date:"Jul 19", time:"00:00", a:TBD, b:TBD, note:"3rd Place"   };

// ── Bracket rows (pairs that feed into next round) ────────────────────────────

export const R32_ROWS: BracketRow[] = [
  { left1: R32_MATCHES[0],  left2: R32_MATCHES[1],  right: R16_MATCHES[0] }, // M74+M77  → M89
  { left1: R32_MATCHES[2],  left2: R32_MATCHES[3],  right: R16_MATCHES[1] }, // M73+M75  → M90
  { left1: R32_MATCHES[4],  left2: R32_MATCHES[5],  right: R16_MATCHES[2] }, // M76+M78  → M91
  { left1: R32_MATCHES[6],  left2: R32_MATCHES[7],  right: R16_MATCHES[3] }, // M79+M80  → M92
  { left1: R32_MATCHES[8],  left2: R32_MATCHES[9],  right: R16_MATCHES[4] }, // M84+M83  → M93
  { left1: R32_MATCHES[10], left2: R32_MATCHES[11], right: R16_MATCHES[5] }, // M81+M82  → M94
  { left1: R32_MATCHES[12], left2: R32_MATCHES[13], right: R16_MATCHES[6] }, // M88+M86  → M95
  { left1: R32_MATCHES[14], left2: R32_MATCHES[15], right: R16_MATCHES[7] }, // M85+M87  → M96
];

export const R16_ROWS: BracketRow[] = [
  { left1: R16_MATCHES[0], left2: R16_MATCHES[1], right: QF_MATCHES[0] }, // M89+M90 → QF1
  { left1: R16_MATCHES[2], left2: R16_MATCHES[3], right: QF_MATCHES[2] }, // M91+M92 → QF3
  { left1: R16_MATCHES[4], left2: R16_MATCHES[5], right: QF_MATCHES[1] }, // M93+M94 → QF2
  { left1: R16_MATCHES[6], left2: R16_MATCHES[7], right: QF_MATCHES[3] }, // M95+M96 → QF4
];

export const QF_ROWS: BracketRow[] = [
  { left1: QF_MATCHES[0], left2: QF_MATCHES[1], right: SF_MATCHES[0] }, // QF1+QF2 → SF1
  { left1: QF_MATCHES[2], left2: QF_MATCHES[3], right: SF_MATCHES[1] }, // QF3+QF4 → SF2
];

export const SF_ROW: BracketRow = {
  left1: SF_MATCHES[0],
  left2: SF_MATCHES[1],
  right: FINAL_MATCH,
};
