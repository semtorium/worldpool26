/**
 * useLiveStandings
 *
 * Fetches live group standings from /api/tournament every POLL_MS milliseconds.
 * Falls back to the static GROUP_STANDINGS (from tournamentData.ts) when:
 *   - The API hasn't responded yet (first render)
 *   - The API returns no data (tournament not started / error)
 *
 * Usage:
 *   const { standings, live, lastUpdated } = useLiveStandings();
 *
 *   standings   → GroupStandings (same shape as GROUP_STANDINGS)
 *   live        → true if data came from the live API
 *   lastUpdated → Date | null
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { GROUP_STANDINGS } from "@/lib/tournamentData";
import type { GroupStandings } from "@/app/api/tournament/route";

const POLL_MS = 5 * 60_000; // refetch every 5 minutes

interface LiveStandingsResult {
  standings:   GroupStandings;
  live:        boolean;
  lastUpdated: Date | null;
}

export function useLiveStandings(): LiveStandingsResult {
  const [standings,   setStandings]   = useState<GroupStandings>(GROUP_STANDINGS);
  const [live,        setLive]        = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStandings = useCallback(async () => {
    try {
      const res = await fetch("/api/tournament", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();

      if (data.standings && Object.keys(data.standings).length > 0) {
        // Merge: keep static data for groups not yet in API response
        const merged: GroupStandings = { ...GROUP_STANDINGS };
        for (const [group, rows] of Object.entries(data.standings as GroupStandings)) {
          if (rows.length > 0) merged[group] = rows;
        }
        setStandings(merged);
        setLive(data.source === "api" || data.source === "cache");
        setLastUpdated(data.fetchedAt ? new Date(data.fetchedAt as number) : new Date());
      }
    } catch {
      // silently fall back to static data
    }
  }, []);

  useEffect(() => {
    fetchStandings();

    // Poll every 5 minutes
    timerRef.current = setInterval(fetchStandings, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchStandings]);

  return { standings, live, lastUpdated };
}
