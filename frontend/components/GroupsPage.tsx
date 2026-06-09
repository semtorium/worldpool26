"use client";

import Image from "next/image";
import { useState } from "react";
import { COUNTRIES, GROUPS, getCountriesByGroup, getFlagUrl } from "@/lib/countries";
import { GROUP_STANDINGS, getPts, getGD, sortStandings } from "@/lib/tournamentData";
import { useLang } from "@/lib/LanguageContext";

type InnerTab = "groups" | "bracket" | "table";

// Sort group teams by favoriteRank → pos 1 = likely winner, pos 2 = likely runner-up
function sortedGroupTeams(group: string) {
  return [...getCountriesByGroup(group)].sort((a, b) => a.favoriteRank - b.favoriteRank);
}

function teamAt(group: string, pos: 1 | 2) {
  return sortedGroupTeams(group)[pos - 1];
}

// ── Bracket data ──────────────────────────────────────────────────────────────
type GroupSlot = { kind: "group"; group: string; pos: 1 | 2 };
type ThirdSlot = { kind: "third"; groups: string[] };
type MatchSlot = GroupSlot | ThirdSlot;

interface R32 { id: string; a: MatchSlot; b: MatchSlot }
interface Quadrant { qfLabel: string; r16s: { r16Id: string; r32: [R32, R32] }[] }

const QUADRANTS: Quadrant[] = [
  {
    qfLabel: "QF 1",
    r16s: [
      { r16Id: "R16-M89", r32: [
        { id: "M74", a: { kind: "group", group: "E", pos: 1 }, b: { kind: "third", groups: ["A","B","C","D","F"] } },
        { id: "M77", a: { kind: "group", group: "I", pos: 1 }, b: { kind: "third", groups: ["C","D","F","G","H"] } },
      ]},
      { r16Id: "R16-M90", r32: [
        { id: "M73", a: { kind: "group", group: "A", pos: 2 }, b: { kind: "group", group: "B", pos: 2 } },
        { id: "M75", a: { kind: "group", group: "F", pos: 1 }, b: { kind: "group", group: "C", pos: 2 } },
      ]},
    ],
  },
  {
    qfLabel: "QF 2",
    r16s: [
      { r16Id: "R16-M93", r32: [
        { id: "M83", a: { kind: "group", group: "K", pos: 2 }, b: { kind: "group", group: "L", pos: 2 } },
        { id: "M84", a: { kind: "group", group: "H", pos: 1 }, b: { kind: "group", group: "J", pos: 2 } },
      ]},
      { r16Id: "R16-M94", r32: [
        { id: "M81", a: { kind: "group", group: "D", pos: 1 }, b: { kind: "third", groups: ["B","E","F","I","J"] } },
        { id: "M82", a: { kind: "group", group: "G", pos: 1 }, b: { kind: "third", groups: ["A","E","H","I","J"] } },
      ]},
    ],
  },
  {
    qfLabel: "QF 3",
    r16s: [
      { r16Id: "R16-M91", r32: [
        { id: "M76", a: { kind: "group", group: "C", pos: 1 }, b: { kind: "group", group: "F", pos: 2 } },
        { id: "M78", a: { kind: "group", group: "E", pos: 2 }, b: { kind: "group", group: "I", pos: 2 } },
      ]},
      { r16Id: "R16-M92", r32: [
        { id: "M79", a: { kind: "group", group: "A", pos: 1 }, b: { kind: "third", groups: ["C","E","F","H","I"] } },
        { id: "M80", a: { kind: "group", group: "L", pos: 1 }, b: { kind: "third", groups: ["E","H","I","J","K"] } },
      ]},
    ],
  },
  {
    qfLabel: "QF 4",
    r16s: [
      { r16Id: "R16-M95", r32: [
        { id: "M86", a: { kind: "group", group: "J", pos: 1 }, b: { kind: "group", group: "H", pos: 2 } },
        { id: "M88", a: { kind: "group", group: "D", pos: 2 }, b: { kind: "group", group: "G", pos: 2 } },
      ]},
      { r16Id: "R16-M96", r32: [
        { id: "M85", a: { kind: "group", group: "B", pos: 1 }, b: { kind: "third", groups: ["E","F","G","I","J"] } },
        { id: "M87", a: { kind: "group", group: "K", pos: 1 }, b: { kind: "third", groups: ["D","E","I","J","L"] } },
      ]},
    ],
  },
];

// ── Bracket sub-components ────────────────────────────────────────────────────

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
      <Image src={getFlagUrl(team.flagCode, 40)} alt={team.name}
        width={28} height={18} className="rounded-sm object-cover shrink-0" unoptimized />
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
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#0052FF" }}>
          {q.qfLabel}
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(0,82,255,0.07)", color: "#6b7a9a", border: "1px solid rgba(0,82,255,0.12)" }}>
          → {sfLabel}
        </span>
      </div>
      {q.r16s.map((r16, ri) => (
        <div key={r16.r16Id} className="space-y-1.5">
          <div className="space-y-1">
            {r16.r32.map(m => <R32Card key={m.id} match={m} />)}
          </div>
          <div className="flex items-center gap-2 pl-2">
            <div className="text-[9px]" style={{ color: "#2563EB" }}>↓ winner</div>
            <div className="flex-1 h-px" style={{ background: "rgba(0,82,255,0.2)" }} />
            <div className="text-[9px] font-bold px-2 py-0.5 rounded"
              style={{ background: "rgba(0,82,255,0.1)", color: "#2563EB" }}>
              Round of 16
            </div>
          </div>
          {ri < q.r16s.length - 1 && (
            <div className="h-px mx-2" style={{ background: "rgba(255,255,255,0.04)" }} />
          )}
        </div>
      ))}
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

// ── Groups grid sub-tab ───────────────────────────────────────────────────────

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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
                  style={{ background: "linear-gradient(135deg,rgba(0,82,255,0.2),rgba(0,82,255,0.2))", border: "1px solid rgba(0,82,255,0.2)", color: "#0052FF" }}>
                  {group}
                </div>
                <span className="font-black text-white">Group {group}</span>
              </div>
              <div className="space-y-2">
                {teams.map((team, idx) => (
                  <div key={team.id} className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold w-4 text-right shrink-0"
                      style={{ color: idx < 2 ? "#0052FF" : "#6b7a9a" }}>
                      {idx + 1}
                    </span>
                    <Image src={getFlagUrl(team.flagCode, 80)} alt={team.name}
                      width={28} height={19} className="rounded-sm object-cover shrink-0" unoptimized />
                    <span className="text-sm font-semibold text-white truncate">{team.name}</span>
                  </div>
                ))}
              </div>
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
      <div className="flex flex-wrap items-center gap-3 justify-center text-[11px]" style={{ color: "#6b7a9a" }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#0052FF" }} />
          Team = most likely finalist of that group by pre-tournament odds
        </span>
        <span>·</span>
        <span>3rd place pairings confirmed after group stage ends (June 27)</span>
      </div>
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
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px flex-1" style={{ background: "rgba(37,99,235,0.2)" }} />
          <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: "rgba(37,99,235,0.08)", color: "#2563EB", border: "1px solid rgba(37,99,235,0.2)" }}>
            Semi-Final 2 Path
          </span>
          <div className="h-px flex-1" style={{ background: "rgba(37,99,235,0.2)" }} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuadrantCard q={QUADRANTS[2]} sfLabel="SF 2" />
          <QuadrantCard q={QUADRANTS[3]} sfLabel="SF 2" />
        </div>
      </div>
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

// ── Table (standings) sub-tab ─────────────────────────────────────────────────

function TableView() {
  const { t } = useLang();
  const [selectedGroup, setSelectedGroup] = useState<string>("A");

  // Build id → country lookup
  const countryById = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));

  // Sorted standings for selected group (tiebreak: favoriteRank)
  const rawRows = GROUP_STANDINGS[selectedGroup] ?? [];
  const sorted  = sortStandings(rawRows).sort((a, b) => {
    // secondary tiebreak: if pts/gd/gf all equal → favoriteRank
    const pa = getPts(a), pb = getPts(b);
    const gda = getGD(a), gdb = getGD(b);
    if (pa !== pb || gda !== gdb || a.gf !== b.gf) return 0; // already sorted by sortStandings
    return (countryById[a.countryId]?.favoriteRank ?? 99) - (countryById[b.countryId]?.favoriteRank ?? 99);
  });

  const allZero = sorted.every(r => r.p === 0);

  return (
    <div className="space-y-4">

      {/* Group selector — horizontal scroll pills */}
      <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-1.5 min-w-max px-0.5">
          {GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className="w-9 h-9 rounded-xl text-sm font-black transition-all shrink-0"
              style={selectedGroup === g
                ? { background: "linear-gradient(135deg,#0052FF,#2563EB)", color: "#fff", boxShadow: "0 0 16px rgba(0,82,255,0.35)", border: "1px solid rgba(0,82,255,0.5)" }
                : { background: "rgba(255,255,255,0.03)", color: "#6b7a9a", border: "1px solid rgba(255,255,255,0.07)" }
              }
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div className="glass-card overflow-hidden" style={{ padding: 0 }}>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,82,255,0.04)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(0,82,255,0.25),rgba(37,99,235,0.15))", border: "1px solid rgba(0,82,255,0.3)", color: "#60A5FA" }}>
            {selectedGroup}
          </div>
          <span className="font-black text-white text-sm">{t.tbl_group} {selectedGroup}</span>
          {!allZero && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-bold" style={{ color: "#10b981" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        {/* Column headers */}
        <div className="grid px-4 py-2"
          style={{
            gridTemplateColumns: "24px 1fr 32px 28px 28px 28px 36px 36px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.015)",
          }}>
          <span className="text-[10px] font-bold" style={{ color: "#6b7a9a" }}></span>
          <span className="text-[10px] font-bold" style={{ color: "#6b7a9a" }}></span>
          <span className="text-[10px] font-bold text-center" style={{ color: "#6b7a9a" }}>{t.tbl_p}</span>
          <span className="text-[10px] font-bold text-center" style={{ color: "#6b7a9a" }}>{t.tbl_w}</span>
          <span className="text-[10px] font-bold text-center" style={{ color: "#6b7a9a" }}>{t.tbl_d}</span>
          <span className="text-[10px] font-bold text-center" style={{ color: "#6b7a9a" }}>{t.tbl_l}</span>
          <span className="text-[10px] font-bold text-center" style={{ color: "#6b7a9a" }}>{t.tbl_gd}</span>
          <span className="text-[10px] font-bold text-center" style={{ color: "#fbbf24" }}>{t.tbl_pts}</span>
        </div>

        {/* Rows */}
        {sorted.map((row, idx) => {
          const country = countryById[row.countryId];
          if (!country) return null;
          const pts  = getPts(row);
          const gd   = getGD(row);
          const isQ1 = idx === 0; // 1st place
          const isQ2 = idx === 1; // 2nd place
          const isQ3 = idx === 2; // 3rd (may qualify as best 3rd)

          let rowBg = "transparent";
          let leftAccent = "transparent";
          if (isQ1) { rowBg = "rgba(0,82,255,0.055)"; leftAccent = "#0052FF"; }
          else if (isQ2) { rowBg = "rgba(0,82,255,0.030)"; leftAccent = "#2563EB"; }
          else if (isQ3) { rowBg = "rgba(251,191,36,0.025)"; leftAccent = "rgba(251,191,36,0.4)"; }

          return (
            <div
              key={row.countryId}
              className="grid items-center px-4 py-3 transition-colors relative"
              style={{
                gridTemplateColumns: "24px 1fr 32px 28px 28px 28px 36px 36px",
                background: rowBg,
                borderBottom: idx < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isQ1 ? "rgba(0,82,255,0.09)" : isQ2 ? "rgba(0,82,255,0.06)" : isQ3 ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.02)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = rowBg; }}
            >
              {/* Left qualifying accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r"
                style={{ background: leftAccent }} />

              {/* Rank */}
              <span className="text-xs font-black text-center shrink-0"
                style={{ color: isQ1 ? "#60A5FA" : isQ2 ? "#7dd3fc" : isQ3 ? "#fcd34d" : "#6b7a9a" }}>
                {idx + 1}
              </span>

              {/* Flag + Name */}
              <div className="flex items-center gap-2 min-w-0">
                <Image
                  src={getFlagUrl(country.flagCode, 40)} alt={country.name}
                  width={24} height={16} className="rounded-[3px] object-cover shrink-0" unoptimized
                />
                <span className="text-sm font-semibold text-white truncate leading-tight">
                  {country.name}
                </span>
              </div>

              {/* Stats */}
              <span className="text-xs font-bold text-center" style={{ color: "#9ca3af" }}>{row.p}</span>
              <span className="text-xs font-bold text-center" style={{ color: row.w > 0 ? "#4ade80" : "#9ca3af" }}>{row.w}</span>
              <span className="text-xs font-bold text-center" style={{ color: row.d > 0 ? "#facc15" : "#9ca3af" }}>{row.d}</span>
              <span className="text-xs font-bold text-center" style={{ color: row.l > 0 ? "#f87171" : "#9ca3af" }}>{row.l}</span>
              <span className="text-xs font-bold text-center"
                style={{ color: gd > 0 ? "#4ade80" : gd < 0 ? "#f87171" : "#9ca3af" }}>
                {gd > 0 ? `+${gd}` : gd}
              </span>
              <span className="text-sm font-black text-center"
                style={{ color: isQ1 || isQ2 ? "#f0f4ff" : "#9ca3af" }}>
                {pts}
              </span>
            </div>
          );
        })}

        {/* Qualifying legend */}
        <div className="px-4 py-3 space-y-1.5"
          style={{ background: "rgba(255,255,255,0.01)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 rounded-full" style={{ background: "#0052FF" }} />
            <span className="text-[10px]" style={{ color: "#6b7a9a" }}>{t.tbl_qualifies}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3.5 rounded-full" style={{ background: "rgba(251,191,36,0.6)" }} />
            <span className="text-[10px]" style={{ color: "#6b7a9a" }}>{t.tbl_third}</span>
          </div>
        </div>
      </div>

      {/* Info note */}
      <p className="text-center text-xs" style={{ color: "rgba(107,122,154,0.55)" }}>
        {allZero ? t.tbl_not_started : t.tbl_live_note}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GroupsPage() {
  const { t } = useLang();
  const [innerTab, setInnerTab] = useState<InnerTab>("groups");

  const TABS: { id: InnerTab; label: string }[] = [
    { id: "groups",  label: "Groups"    },
    { id: "table",   label: t.tbl_tab   },
    { id: "bracket", label: "Bracket"   },
  ];

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
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setInnerTab(tab.id)}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
              style={innerTab === tab.id
                ? { background: "rgba(0,82,255,0.12)", color: "#0052FF", border: "1px solid rgba(0,82,255,0.25)" }
                : { color: "#6b7a9a", border: "1px solid transparent" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {innerTab === "groups"  && <GroupsGrid />}
      {innerTab === "table"   && <TableView />}
      {innerTab === "bracket" && <BracketView />}
    </div>
  );
}
