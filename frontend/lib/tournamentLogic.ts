/**
 * tournamentLogic.ts
 *
 * Resolves bracket slot labels ("1E", "2A", "3rd A/B/C/D/F")
 * into real team name + flagCode once the group stage results are in.
 *
 * Design:
 *   resolveSlot(label, standings?)
 *     - No standings arg  → reads static GROUP_STANDINGS (Seviye 1: manual updates)
 *     - With standings arg → reads dynamic live standings (Seviye 2: API feed)
 *
 * Label formats:
 *   "1E"           → winner of Group E
 *   "2A"           → runner-up of Group A
 *   "3rd A/B/C/D/F"→ best 3rd-place from one of those groups (complex, see below)
 *   "TBD"          → match not yet scheduled / always unknown
 */

import { COUNTRIES } from "@/lib/countries";
import {
  GROUP_STANDINGS,
  getPts, getGD, sortStandings,
  type TeamStanding,
} from "@/lib/tournamentData";
import type { MatchSlot } from "@/lib/tournamentSchedule";

// ── Helpers ───────────────────────────────────────────────────────────────────

const cById = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));

/** Sort a group's standings and break ties by favouriteRank */
function sortGroup(raw: TeamStanding[]): TeamStanding[] {
  return sortStandings(raw).sort((a, b) => {
    if (getPts(a) !== getPts(b)) return 0;      // pts already handled by sortStandings
    if (getGD(a)  !== getGD(b))  return 0;
    if (a.gf      !== b.gf)      return 0;
    return (cById[a.countryId]?.favoriteRank ?? 99)
         - (cById[b.countryId]?.favoriteRank ?? 99);
  });
}

/** A group is "complete" when every team has played all 3 group matches */
function isComplete(standings: TeamStanding[]): boolean {
  return standings.length === 4 && standings.every(s => s.p === 3);
}

// ── 3rd-place placement matrix ────────────────────────────────────────────────
//
// FIFA 2026 has 12 groups → 12 third-place teams → best 8 advance.
// The specific slot each qualifying 3rd-place team fills depends on which
// 8 groups produced the advancing third-place teams, per FIFA's predetermined
// placement matrix (published before the tournament).
//
// PLACEHOLDER: Once FIFA publishes the 2026 matrix, populate THIRD_PLACE_MATRIX.
//
// Key = sorted string of groups whose 3rd-place teams advanced  (e.g. "ABCDEFGH")
// Value = map from slot-group-pool (as it appears in R32 labels) → which group's 3rd fills it
//
// Example entry (hypothetical, do NOT use for real):
//   "ABCDEFGH": {
//     "A/B/C/D/F": "A",
//     "C/D/F/G/H": "B",
//     ...
//   }
//
// Until the matrix is published, 3rd-place slots remain as their label text.
const THIRD_PLACE_MATRIX: Record<string, Record<string, string>> = {
  // TODO: fill in once FIFA publishes the 2026 placement table
};

/**
 * Resolve a 3rd-place slot like "3rd A/B/C/D/F".
 * Returns the resolved MatchSlot if possible, or the original label if not yet known.
 */
function resolveThirdPlace(
  label: string,
  standings: typeof GROUP_STANDINGS,
): MatchSlot {
  // Parse "3rd A/B/C/D/F" → pool = ["A","B","C","D","F"]
  const m = label.match(/^3rd\s+([A-L/]+)$/);
  if (!m) return { label };

  const pool = m[1].split("/");

  // Check if ALL 12 groups have finished (needed to rank all 3rd-place teams)
  const allGroups = Object.keys(standings);
  const allComplete = allGroups.every(g => isComplete(standings[g] ?? []));
  if (!allComplete) return { label }; // group stage still running

  // Rank all 3rd-place teams across all groups
  const thirds: { group: string; standing: TeamStanding; pts: number; gd: number }[] = [];
  for (const g of allGroups) {
    const sorted = sortGroup(standings[g] ?? []);
    if (sorted[2]) {
      thirds.push({
        group: g,
        standing: sorted[2],
        pts: getPts(sorted[2]),
        gd:  getGD(sorted[2]),
      });
    }
  }

  // Sort all thirds: pts desc → gd desc → gf desc → favoriteRank asc
  thirds.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd  !== b.gd)  return b.gd  - a.gd;
    if (a.standing.gf !== b.standing.gf) return b.standing.gf - a.standing.gf;
    return (cById[a.standing.countryId]?.favoriteRank ?? 99)
         - (cById[b.standing.countryId]?.favoriteRank ?? 99);
  });

  // Best 8 qualifying 3rd-place teams
  const qualifying8 = thirds.slice(0, 8).map(x => x.group).sort().join("");

  // Look up FIFA matrix
  const matrix = THIRD_PLACE_MATRIX[qualifying8];
  if (!matrix) {
    // Matrix not set → best we can do: find the highest-ranked 3rd-place
    // team that came from one of the pool groups
    const best = thirds.find(x => pool.includes(x.group));
    if (best) {
      const team = cById[best.standing.countryId];
      if (team) return { label: team.name, flagCode: team.flagCode };
    }
    return { label };
  }

  const poolKey = pool.join("/");
  const fromGroup = matrix[poolKey];
  if (!fromGroup) return { label };

  const sorted = sortGroup(standings[fromGroup] ?? []);
  const team   = sorted[2] ? cById[sorted[2].countryId] : null;
  return team ? { label: team.name, flagCode: team.flagCode } : { label };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * resolveSlot
 *
 * Converts a bracket slot label into a MatchSlot with real team data.
 *
 * @param label    Raw slot label from tournamentSchedule.ts ("1E", "2A", "TBD", ...)
 * @param standings  Optional — pass live standings for Seviye 2 (API-fed).
 *                   Defaults to the static GROUP_STANDINGS (Seviye 1).
 */
export function resolveSlot(
  label: string,
  standings: typeof GROUP_STANDINGS = GROUP_STANDINGS,
): MatchSlot {
  // Always-unknown
  if (label === "TBD") return { label: "TBD" };

  // ── "1E" → winner of Group E ─────────────────────────────────────────────
  const winnerMatch = label.match(/^1([A-L])$/);
  if (winnerMatch) {
    const group = winnerMatch[1];
    const raw   = standings[group] ?? [];
    if (isComplete(raw)) {
      const team = cById[sortGroup(raw)[0]?.countryId ?? -1];
      if (team) return { label: team.name, flagCode: team.flagCode };
    }
    return { label }; // group not done yet → keep label ("1E")
  }

  // ── "2A" → runner-up of Group A ──────────────────────────────────────────
  const runnerMatch = label.match(/^2([A-L])$/);
  if (runnerMatch) {
    const group = runnerMatch[1];
    const raw   = standings[group] ?? [];
    if (isComplete(raw)) {
      const team = cById[sortGroup(raw)[1]?.countryId ?? -1];
      if (team) return { label: team.name, flagCode: team.flagCode };
    }
    return { label };
  }

  // ── "3rd A/B/C/D/F" → best 3rd from pool ────────────────────────────────
  if (label.startsWith("3rd")) {
    return resolveThirdPlace(label, standings);
  }

  // Already a real team name or unknown format → pass through
  return { label };
}

/**
 * resolveMatch — convenience: resolves both slots of a match at once.
 * Returns a new MatchData with resolved a and b slots (originals untouched).
 */
export function resolveMatch<T extends { a: MatchSlot; b: MatchSlot }>(
  match: T,
  standings: typeof GROUP_STANDINGS = GROUP_STANDINGS,
): T {
  return {
    ...match,
    a: resolveSlot(match.a.label, standings),
    b: resolveSlot(match.b.label, standings),
  };
}
