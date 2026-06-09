/**
 * /api/tournament
 *
 * Server-side proxy for football-data.org standings API.
 *
 * - Caches the last response for CACHE_MS (5 min) to avoid rate-limit hits.
 * - Returns { standings: GroupStandings } in the same shape as GROUP_STANDINGS
 *   from tournamentData.ts so the frontend can drop it in directly.
 * - Returns { standings: null } if the API is unavailable or data not yet
 *   seeded (e.g., tournament hasn't started).
 *
 * Environment variable required (server-side only, NOT NEXT_PUBLIC_):
 *   FOOTBALL_DATA_API_KEY=<your token>
 *
 * Also set this in Vercel → Project Settings → Environment Variables.
 */

import { NextResponse } from "next/server";
import type { TeamStanding } from "@/lib/tournamentData";

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY  = process.env.FOOTBALL_DATA_API_KEY ?? "";
const BASE_URL = "https://api.football-data.org/v4";
const CACHE_MS = 5 * 60_000; // 5 minutes

// ── Team name / TLA → our internal countryId ─────────────────────────────────
// football-data.org may use different names or 3-letter codes than FIFA.
// Add alternative spellings as needed.

const TLA_TO_ID: Record<string, number> = {
  MEX:  1, RSA:  2, KOR:  3, CZE:  4, CAN:  5,
  BIH:  6, QAT:  7, SUI:  8, BRA:  9, MAR: 10,
  HAI: 11, SCO: 12, USA: 13, PAR: 14, AUS: 15,
  TUR: 16, GER: 17, CUW: 18, CIV: 19, ECU: 20,
  NED: 21, JPN: 22, SWE: 23, TUN: 24, BEL: 25,
  EGY: 26, IRN: 27, NZL: 28, ESP: 29, CPV: 30,
  KSA: 31, URU: 32, FRA: 33, SEN: 34, IRQ: 35,
  NOR: 36, ARG: 37, ALG: 38, AUT: 39, JOR: 40,
  POR: 41, COD: 42, UZB: 43, COL: 44, ENG: 45,
  CRO: 46, GHA: 47, PAN: 48,
  // ISO / alternative codes football-data.org may use
  SAU: 31, ZAF:  2, PRY: 14, CZK: 4,
};

const NAME_TO_ID: Record<string, number> = {
  "mexico": 1,
  "south africa": 2,
  "korea republic": 3, "south korea": 3, "republic of korea": 3,
  "czechia": 4, "czech republic": 4,
  "canada": 5,
  "bosnia and herzegovina": 6, "bosnia-herzegovina": 6, "bosnia & herzegovina": 6,
  "qatar": 7,
  "switzerland": 8,
  "brazil": 9,
  "morocco": 10,
  "haiti": 11,
  "scotland": 12,
  "united states": 13, "usa": 13, "united states of america": 13,
  "paraguay": 14,
  "australia": 15,
  "turkey": 16, "türkiye": 16,
  "germany": 17,
  "curaçao": 18, "curacao": 18,
  "côte d'ivoire": 19, "ivory coast": 19, "cote d'ivoire": 19,
  "ecuador": 20,
  "netherlands": 21,
  "japan": 22,
  "sweden": 23,
  "tunisia": 24,
  "belgium": 25,
  "egypt": 26,
  "iran": 27, "iran (islamic republic of)": 27,
  "new zealand": 28,
  "spain": 29,
  "cape verde": 30,
  "saudi arabia": 31,
  "uruguay": 32,
  "france": 33,
  "senegal": 34,
  "iraq": 35,
  "norway": 36,
  "argentina": 37,
  "algeria": 38,
  "austria": 39,
  "jordan": 40,
  "portugal": 41,
  "dr congo": 42, "congo dr": 42,
  "democratic republic of the congo": 42,
  "congo, the democratic republic of the": 42,
  "uzbekistan": 43,
  "colombia": 44,
  "england": 45,
  "croatia": 46,
  "ghana": 47,
  "panama": 48,
};

function resolveTeamId(tla: string, name: string): number {
  // Try TLA first (most reliable)
  const byTla = TLA_TO_ID[tla?.toUpperCase()];
  if (byTla) return byTla;
  // Fallback: normalised name lookup
  const byName = NAME_TO_ID[name?.toLowerCase().trim()];
  if (byName) return byName;
  console.warn("[tournament/route] Unknown team:", tla, name);
  return 0;
}

// ── Response type ─────────────────────────────────────────────────────────────

export type GroupStandings = Record<string, TeamStanding[]>;

export interface TournamentResponse {
  standings: GroupStandings | null;
  fetchedAt:  number | null;       // epoch ms
  source:     "api" | "cache" | "fallback";
}

// ── In-memory server cache ────────────────────────────────────────────────────
// (resets on cold start / redeployment — that's fine)

let cached: { standings: GroupStandings; ts: number } | null = null;

// ── Transform football-data.org → our format ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformStandings(apiData: any): GroupStandings {
  const result: GroupStandings = {};

  for (const standing of apiData?.standings ?? []) {
    // We only want GROUP_STAGE entries
    if (standing.stage !== "GROUP_STAGE") continue;

    // "GROUP_A" → "A", "GROUP_B" → "B", etc.
    const letter = (standing.group as string | undefined)?.replace("GROUP_", "");
    if (!letter || !/^[A-L]$/.test(letter)) continue;

    result[letter] = [];

    for (const row of standing.table ?? []) {
      const id = resolveTeamId(row.team?.tla, row.team?.name);
      if (!id) continue;

      result[letter].push({
        countryId: id,
        p:  row.playedGames   ?? 0,
        w:  row.won           ?? 0,
        d:  row.draw          ?? 0,
        l:  row.lost          ?? 0,
        gf: row.goalsFor      ?? 0,
        ga: row.goalsAgainst  ?? 0,
      });
    }
  }

  return result;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse<TournamentResponse>> {
  // Serve from cache if fresh
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return NextResponse.json({
      standings: cached.standings,
      fetchedAt: cached.ts,
      source: "cache",
    });
  }

  if (!API_KEY) {
    console.error("[tournament/route] FOOTBALL_DATA_API_KEY not set");
    return NextResponse.json({ standings: null, fetchedAt: null, source: "fallback" });
  }

  try {
    const res = await fetch(`${BASE_URL}/competitions/WC/standings`, {
      headers: { "X-Auth-Token": API_KEY },
      // Next.js fetch cache: revalidate every 5 min (belt+suspenders)
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error(`[tournament/route] API error ${res.status}: ${await res.text()}`);
      // If we have stale cache, return it rather than nothing
      if (cached) {
        return NextResponse.json({
          standings: cached.standings,
          fetchedAt: cached.ts,
          source: "cache",
        });
      }
      return NextResponse.json({ standings: null, fetchedAt: null, source: "fallback" });
    }

    const json = await res.json();
    const standings = transformStandings(json);

    // Only store in cache if we got actual data
    if (Object.keys(standings).length > 0) {
      cached = { standings, ts: Date.now() };
    }

    return NextResponse.json({
      standings: Object.keys(standings).length > 0 ? standings : null,
      fetchedAt: Date.now(),
      source: "api",
    });
  } catch (err) {
    console.error("[tournament/route] fetch failed:", err);
    if (cached) {
      return NextResponse.json({ standings: cached.standings, fetchedAt: cached.ts, source: "cache" });
    }
    return NextResponse.json({ standings: null, fetchedAt: null, source: "fallback" });
  }
}
