"use client";

import Image from "next/image";
import { useState } from "react";
import { COUNTRIES, GROUPS, getCountriesByGroup, getFlagUrl } from "@/lib/countries";
import { useLang } from "@/lib/LanguageContext";

type InnerTab = "groups" | "bracket";

// Sort group teams by favoriteRank → pos 1 = likely winner, pos 2 = likely runner-up
function sortedGroupTeams(group: string) {
  return [...getCountriesByGroup(group)].sort((a, b) => a.favoriteRank - b.favoriteRank);
}

function teamAt(group: string, pos: 1 | 2) {
  return sortedGroupTeams(group)[pos - 1];
}

// ── Bracket data ──────────────────────────────────────────────────────────────
// Source: FIFA WC 2026 official draw + Wikipedia knockout stage
// R32 match IDs are official match numbers (M73–M88)
// Organised into 4 quadrants, each feeding one QF then one SF then the Final

type GroupSlot = { kind: "group"; group: string; pos: 1 | 2 };
type ThirdSlot = { kind: "third"; groups: string[] };
type MatchSlot = GroupSlot | ThirdSlot;

interface R32 { id: string; a: MatchSlot; b: MatchSlot }
interface Quadrant { qfLabel: string; r16s: { r16Id: string; r32: [R32, R32] }[] }

const QUADRANTS: Quadrant[] = [
  // ── QF 1 path → SF 1 ─────────────────────────────────────────
  {
    qfLabel: "QF 1",
    r16s: [
      {
        r16Id: "R16-M89",
        r32: [
          { id: "M74", a: { kind: "group", group: "E", pos: 1 }, b: { kind: "third", groups: ["A","B","C","D","F"] } },
          { id: "M77", a: { kind: "group", group: "I", pos: 1 }, b: { kind: "third", groups: ["C","D","F","G","H"] } },
        ],
      },
      {
        r16Id: "R16-M90",
        r32: [
          { id: "M73", a: { kind: "group", group: "A", pos: 2 }, b: { kind: "group", group: "B", pos: 2 } },
          { id: "M75", a: { kind: "group", group: "F", pos: 1 }, b: { kind: "group", group: "C", pos: 2 } },
        ],
      },
    ],
  },
  // ── QF 2 path → SF 1 ─────────────────────────────────────────
  {
    qfLabel: "QF 2",
    r16s: [
      {
        r16Id: "R16-M93",
        r32: [
          { id: "M83", a: { kind: "group", group: "K", pos: 2 }, b: { kind: "group", group: "L", pos: 2 } },
          { id: "M84", a: { kind: "group", group: "H", pos: 1 }, b: { kind: "group", group: "J", pos: 2 } },
        ],
      },
      {
        r16Id: "R16-M94",
        r32: [
          { id: "M81", a: { kind: "group", group: "D", pos: 1 }, b: { kind: "third", groups: ["B","E","F","I","J"] } },
          { id: "M82", a: { kind: "group", group: "G", pos: 1 }, b: { kind: "third", groups: ["A","E","H","I","J"] } },
        ],
      },
    ],
  },
  // ── QF 3 path → SF 2 ─────────────────────────────────────────
  {
    qfLabel: "QF 3",
    r16s: [
      {
        r16Id: "R16-M91",
        r32: [
          { id: "M76", a: { kind: "group", group: "C", pos: 1 }, b: { kind: "group", group: "F", pos: 2 } },
          { id: "M78", a: { kind: "group", group: "E", pos: 2 }, b: { kind: "group", group: "I", pos: 2 } },
        ],
      },
      {
        r16Id: "R16-M92",
        r32: [
          { id: "M79", a: { kind: "group", group: "A", pos: 1 }, b: { kind: "third", groups: ["C","E","F","H","I"] } },
          { id: "M80", a: { kind: "group", group: "L", pos: 1 }, b: { kind: "third", groups: ["E","H","I","J","K"] } },
        ],
      },
    ],
  },
  // ── QF 4 path → SF 2 ─────────────────────────────────────────
  {
    qfLabel: "QF 4",
    r16s: [
      {
        r16Id: "R16-M95",
        r32: [
          { id: "M86", a: { kind: "group", group: "J", pos: 1 }, b: { kind: "group", group: "H", pos: 2 } },
          { id: "M88", a: { kind: "group", group: "D", pos: 2 }, b: { kind: "group", group: "G", pos: 2 } },
        ],
      },
      {
        r16Id: "R16-M96",
        r32: [
          { id: "M85", a: { kind: "group", group: "B", pos: 1 }, b: { kind: "third", groups: ["E","F","G","I","J"] } },
          { id: "M87", a: { kind: "group", group: "K", pos: 1 }, b: { kind: "third", groups: ["D","E","I","J","L"] } },
        ],
      },
    ],
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SlotTeam({ slot }: { slot: MatchSlot }) {
  if (slot.kind === "third") {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0 w-7 h-[18px] rounded-sm flex items-center justify-center text-[9px] font-black"
          style={{ background: "rgba(255,255,255,0.07)", color: "#6b7a9a", border: "1px solid rgba(255,255,255,0.08)" }}>
          3rd
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-white leading-tight">Best 3rd Place</p>
          <p className="text-[9px] leading-tight truncate" style={{ color: "#6b7a9a" }}>
            Groups {slot.groups.join("/")}
          </p>
        </div>
      </div>
    );
  }

  const team = teamAt(slot.group, slot.pos);
  const posLabel = slot.pos === 1 ? "Winner" : "Runner-up";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Image
        src={getFlagUrl(team.flagCode, 40)} alt={team.name}
        width={28} height={18} className="rounded-sm object-cover shrink-0" unoptimized
      />
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-white leading-tight truncate">{team.name}</p>
        <p className="text-[9px] leading-tight" style={{ color: "#6b7a9a" }}>
          Group {slot.group} · {posLabel}
        </p>
      </div>
    </div>
  );
}

function R32Card({ match }: { match: R32 }) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="px-3 py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <SlotTeam slot={match.a} />
      </div>
      <div className="px-3 flex items-center gap-1 py-0.5">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
        <span className="text-[8px] font-black tracking-widest" style={{ color: "#6b7a9a" }}>VS</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
      <div className="px-3 py-1.5">
        <SlotTeam slot={match.b} />
      </div>
    </div>
  );
}

function QuadrantCard({ q, sfLabel }: { q: Quadrant; sfLabel: string }) {
  return (
    <div className="glass-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#00ff88" }}>
          {q.qfLabel}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(0,255,136,0.07)", color: "#6b7a9a", border: "1px solid rgba(0,255,136,0.12)" }}>
          → {sfLabel}
        </span>
      </div>

      {q.r16s.map((r16, ri) => (
        <div key={r16.r16Id} className="space-y-1.5">
          {/* R32 matches */}
          <div className="space-y-1">
            {r16.r32.map(m => <R32Card key={m.id} match={m} />)}
          </div>
          {/* R16 arrow */}
          <div className="flex items-center gap-2 pl-2">
            <div className="text-[9px]" style={{ color: "#7c3aed" }}>↓ winner</div>
            <div className="flex-1 h-px" style={{ background: "rgba(124,58,237,0.2)" }} />
            <div className="text-[9px] font-bold px-2 py-0.5 rounded"
              style={{ background: "rgba(124,58,237,0.1)", color: "#8b5cf6" }}>
              Round of 16
            </div>
          </div>
          {ri < q.r16s.length - 1 && (
            <div className="h-px mx-2" style={{ background: "rgba(255,255,255,0.04)" }} />
          )}
        </div>
      ))}

      {/* QF arrow */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px" style={{ background: "rgba(251,191,36,0.2)" }} />
        <div className="text-[9px] font-bold px-2 py-0.5 rounded"
          style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24" }}>
          Quarterfinal
        </div>
        <div className="flex-1 h-px" style={{ background: "rgba(251,191,36,0.2)" }} />
      </div>
    </div>
  );
}

// ── Groups sub-tab ────────────────────────────────────────────────────────────

function GroupsGrid() {
  const { t } = useLang();

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1 pb-2">
        <p className="text-sm" style={{ color: "#6b7a9a" }}>
          {t.grp_hosts} · {t.grp_format_note}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {GROUPS.map((group) => {
          const teams = sortedGroupTeams(group);
          return (
            <div key={group} className="glass-card p-4 space-y-3">
              {/* Group header */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
                  style={{ background: "linear-gradient(135deg,rgba(0,255,136,0.2),rgba(124,58,237,0.2))", border: "1px solid rgba(0,255,136,0.2)", color: "#00ff88" }}>
                  {group}
                </div>
                <span className="font-black text-white">Group {group}</span>
              </div>

              {/* Teams */}
              <div className="space-y-2">
                {teams.map((team, idx) => (
                  <div key={team.id} className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold w-4 text-right shrink-0"
                      style={{ color: idx < 2 ? "#00ff88" : "#6b7a9a" }}>
                      {idx + 1}
                    </span>
                    <Image src={getFlagUrl(team.flagCode, 80)} alt={team.name}
                      width={28} height={19} className="rounded-sm object-cover shrink-0" unoptimized />
                    <span className="text-sm font-semibold text-white truncate">{team.name}</span>
                  </div>
                ))}
              </div>

              {/* Qualifying note */}
              <p className="text-[10px]" style={{ color: "#6b7a9a" }}>
                Top 2 advance · 3rd place may qualify as best 3rd
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Bracket sub-tab ───────────────────────────────────────────────────────────

function BracketView() {
  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 justify-center text-[11px]"
        style={{ color: "#6b7a9a" }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#00ff88" }} />
          Team = most likely finalist of that group by pre-tournament odds
        </span>
        <span>·</span>
        <span>3rd place pairings confirmed after group stage ends (June 27)</span>
      </div>

      {/* SF 1 path — QF1 + QF2 */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px flex-1" style={{ background: "rgba(251,191,36,0.15)" }} />
          <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
            Semi-Final 1 Path
          </span>
          <div className="h-px flex-1" style={{ background: "rgba(251,191,36,0.15)" }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuadrantCard q={QUADRANTS[0]} sfLabel="SF 1" />
          <QuadrantCard q={QUADRANTS[1]} sfLabel="SF 1" />
        </div>
      </div>

      {/* SF 2 path — QF3 + QF4 */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px flex-1" style={{ background: "rgba(139,92,246,0.2)" }} />
          <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: "rgba(139,92,246,0.08)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}>
            Semi-Final 2 Path
          </span>
          <div className="h-px flex-1" style={{ background: "rgba(139,92,246,0.2)" }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuadrantCard q={QUADRANTS[2]} sfLabel="SF 2" />
          <QuadrantCard q={QUADRANTS[3]} sfLabel="SF 2" />
        </div>
      </div>

      {/* Final */}
      <div className="glass-card p-5 text-center"
        style={{ borderColor: "rgba(251,191,36,0.25)", boxShadow: "0 0 40px rgba(251,191,36,0.06)" }}>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#fbbf24" }}>
          🏆 Final
        </p>
        <p className="font-bold text-white">SF 1 Winner vs SF 2 Winner</p>
        <p className="text-xs mt-1" style={{ color: "#6b7a9a" }}>
          MetLife Stadium, East Rutherford · July 19, 2026
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GroupsPage() {
  const { t } = useLang();
  const [innerTab, setInnerTab] = useState<InnerTab>("groups");

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-white">{t.grp_title}</h1>
        <p className="text-sm" style={{ color: "#6b7a9a" }}>{t.grp_sub}</p>
      </div>

      {/* Inner tabs */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {(["groups", "bracket"] as InnerTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setInnerTab(tab)}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
              style={innerTab === tab
                ? { background: "rgba(0,255,136,0.12)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.25)" }
                : { color: "#6b7a9a", border: "1px solid transparent" }
              }
            >
              {tab === "groups" ? "Groups" : "Bracket"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {innerTab === "groups"   && <GroupsGrid />}
      {innerTab === "bracket"  && <BracketView />}
    </div>
  );
}
