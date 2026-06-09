"use client";

import Image from "next/image";
import { useState } from "react";
import { COUNTRIES, GROUPS, getCountriesByGroup, getFlagUrl } from "@/lib/countries";
import { GROUP_STANDINGS, getPts, getGD, sortStandings } from "@/lib/tournamentData";
import {
  MatchData, MatchSlot, BracketRow,
  R32_ROWS, R16_ROWS, QF_ROWS, SF_ROW,
  SF_MATCHES, FINAL_MATCH, THIRD_MATCH,
} from "@/lib/tournamentSchedule";
import { useLang } from "@/lib/LanguageContext";

type InnerTab = "groups" | "bracket" | "table";
type StageTab = "GE" | "R32" | "R16" | "QF" | "SF" | "F";

const STAGE_TABS: { id: StageTab; label: string }[] = [
  { id: "GE",  label: "GE"  },
  { id: "R32", label: "R32" },
  { id: "R16", label: "R16" },
  { id: "QF",  label: "QF"  },
  { id: "SF",  label: "SF"  },
  { id: "F",   label: "F"   },
];

// ── Shared sub-components ─────────────────────────────────────────────────────

function sortedGroupTeams(group: string) {
  return [...getCountriesByGroup(group)].sort((a, b) => a.favoriteRank - b.favoriteRank);
}
function teamAt(group: string, pos: 1 | 2) { return sortedGroupTeams(group)[pos - 1]; }

/** Circular avatar — flag if known, grey ring if TBD */
function SlotAvatar({ slot }: { slot: MatchSlot }) {
  if (slot.flagCode) {
    return (
      <Image src={getFlagUrl(slot.flagCode, 40)} alt={slot.label}
        width={26} height={18} className="rounded-[4px] object-cover shrink-0" unoptimized />
    );
  }
  const isTbd = slot.label === "TBD";
  return (
    <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
      style={{ background: "#0d1526", border: `1px solid ${isTbd ? "#1f2d4a" : "#2a3a5c"}` }}>
      {!isTbd && (
        <span className="text-[7px] font-black leading-none" style={{ color: "#3d5280" }}>
          {slot.label.slice(0, 2)}
        </span>
      )}
    </div>
  );
}

/** Single match card — date header + two team rows */
function MatchCard({ m }: { m: MatchData }) {
  const isTbdA = m.a.label === "TBD";
  const isTbdB = m.b.label === "TBD";
  return (
    <div className="space-y-1.5">
      {/* Date / note header */}
      <div className="flex items-center gap-1.5 px-0.5">
        {m.note && (
          <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ background: "rgba(251,191,36,0.13)", color: "#fbbf24" }}>
            {m.note}
          </span>
        )}
        <span className="text-[10px] font-medium" style={{ color: "#3d5280" }}>
          {m.date} · {m.time}
        </span>
      </div>
      {/* Card */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "#0b1427", border: "1px solid #1a2a45" }}>
        {/* Team A */}
        <div className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderBottom: "1px solid #111e35" }}>
          <SlotAvatar slot={m.a} />
          <span className="text-[12px] font-semibold leading-tight truncate"
            style={{ color: isTbdA ? "#1f2d4a" : "#c8d6f0" }}>
            {isTbdA ? "TBD" : m.a.label}
          </span>
        </div>
        {/* Team B */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <SlotAvatar slot={m.b} />
          <span className="text-[12px] font-semibold leading-tight truncate"
            style={{ color: isTbdB ? "#1f2d4a" : "#c8d6f0" }}>
            {isTbdB ? "TBD" : m.b.label}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Two matches on left → one match on right, with CSS bracket connector */
function BracketUnit({ row }: { row: BracketRow }) {
  return (
    <div className="flex items-center gap-0" style={{ minHeight: 160 }}>

      {/* LEFT: two match cards stacked */}
      <div className="flex-1 space-y-3 min-w-0">
        <MatchCard m={row.left1} />
        <MatchCard m={row.left2} />
      </div>

      {/* CONNECTOR — pure CSS bracket */}
      <div className="shrink-0 relative self-stretch" style={{ width: 22 }}>
        {/* Top horizontal arm */}
        <div className="absolute" style={{
          top: "25%", right: 0, left: 0,
          height: 1, background: "#1a2a45",
        }} />
        {/* Bottom horizontal arm */}
        <div className="absolute" style={{
          bottom: "25%", right: 0, left: 0,
          height: 1, background: "#1a2a45",
        }} />
        {/* Vertical spine */}
        <div className="absolute" style={{
          top: "25%", bottom: "25%", right: 0,
          width: 1, background: "#1a2a45",
        }} />
        {/* Mid output line */}
        <div className="absolute" style={{
          top: "calc(50% - 0.5px)", left: 0, right: 0,
          height: 1, background: "#1a2a45",
        }} />
      </div>

      {/* RIGHT: next-round match, vertically centered */}
      <div className="flex items-center" style={{ width: "44%", minWidth: 0 }}>
        <div className="w-full"><MatchCard m={row.right} /></div>
      </div>
    </div>
  );
}

// ── Stage views ───────────────────────────────────────────────────────────────

/** GE — compact group standings with mini table */
function GEView() {
  const { t } = useLang();
  const countryById = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));

  return (
    <div className="space-y-3">
      {GROUPS.map(group => {
        const raw    = GROUP_STANDINGS[group] ?? [];
        const sorted = sortStandings(raw).sort((a, b) => {
          if (getPts(a) !== getPts(b) || getGD(a) !== getGD(b) || a.gf !== b.gf) return 0;
          return (countryById[a.countryId]?.favoriteRank ?? 99) - (countryById[b.countryId]?.favoriteRank ?? 99);
        });

        return (
          <div key={group} className="rounded-2xl overflow-hidden"
            style={{ background: "#0b1427", border: "1px solid #1a2a45" }}>
            {/* Group header */}
            <div className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: "#0d1830", borderBottom: "1px solid #1a2a45" }}>
              <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black"
                style={{ background: "#0f2050", color: "#4d7aff", border: "1px solid #1a3a80" }}>
                {group}
              </span>
              <span className="text-xs font-black text-white">Group {group}</span>
              {/* Column headers aligned right */}
              <div className="ml-auto flex items-center gap-3 text-[9px] font-bold"
                style={{ color: "#2a3a5c" }}>
                <span className="w-5 text-center">{t.tbl_p}</span>
                <span className="w-5 text-center">{t.tbl_w}</span>
                <span className="w-5 text-center">{t.tbl_gd}</span>
                <span className="w-6 text-center" style={{ color: "#fbbf24" }}>{t.tbl_pts}</span>
              </div>
            </div>

            {/* Team rows */}
            {sorted.map((row, idx) => {
              const c = countryById[row.countryId];
              if (!c) return null;
              const pts = getPts(row);
              const gd  = getGD(row);
              return (
                <div key={row.countryId}
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{
                    borderBottom: idx < 3 ? "1px solid #0e1c33" : undefined,
                    background:   idx < 2 ? "rgba(0,82,255,0.03)" : undefined,
                  }}>
                  {/* Rank dot */}
                  <div className="w-1 h-5 rounded-full shrink-0"
                    style={{ background: idx === 0 ? "#0052FF" : idx === 1 ? "#1d4ed8" : "transparent" }} />
                  {/* Flag */}
                  <Image src={getFlagUrl(c.flagCode, 40)} alt={c.name}
                    width={22} height={15} className="rounded-[3px] object-cover shrink-0" unoptimized />
                  {/* Name */}
                  <span className="text-xs font-semibold flex-1 truncate"
                    style={{ color: idx < 2 ? "#c8d6f0" : "#4d5e7a" }}>
                    {c.name}
                  </span>
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[11px] font-bold"
                    style={{ color: "#4d5e7a" }}>
                    <span className="w-5 text-center">{row.p}</span>
                    <span className="w-5 text-center" style={{ color: row.w > 0 ? "#4ade80" : undefined }}>{row.w}</span>
                    <span className="w-5 text-center" style={{ color: gd > 0 ? "#4ade80" : gd < 0 ? "#f87171" : undefined }}>
                      {gd > 0 ? `+${gd}` : gd}
                    </span>
                    <span className="w-6 text-center font-black"
                      style={{ color: idx < 2 ? "#d1d5db" : "#3d5280" }}>
                      {pts}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Generic bracket stage view — takes an array of BracketRows */
function BracketStageView({ rows, divider }: { rows: BracketRow[]; divider?: number }) {
  // divider splits rows into two half-bracket sections (SF1 path / SF2 path)
  const half = divider ?? rows.length;
  return (
    <div className="space-y-5">
      {/* First half */}
      {rows.slice(0, half).map((row, i) => (
        <div key={row.left1.id}>
          <BracketUnit row={row} />
          {i < half - 1 && (
            <div className="h-px mt-5" style={{ background: "#0e1c33" }} />
          )}
        </div>
      ))}

      {/* Section divider (SF1 / SF2 path separator) */}
      {divider && divider < rows.length && (
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px" style={{ background: "#0e1c33" }} />
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: "#0d1830", color: "#2a3a5c", border: "1px solid #1a2a45" }}>
            ·  ·  ·
          </span>
          <div className="flex-1 h-px" style={{ background: "#0e1c33" }} />
        </div>
      )}

      {/* Second half */}
      {divider && rows.slice(half).map((row, i) => (
        <div key={row.left1.id}>
          <BracketUnit row={row} />
          {i < rows.length - half - 1 && (
            <div className="h-px mt-5" style={{ background: "#0e1c33" }} />
          )}
        </div>
      ))}
    </div>
  );
}

/** SF view: two SF matches → Final, plus 3rd place */
function SFView() {
  return (
    <div className="space-y-6">
      {/* SF → Final bracket */}
      <BracketUnit row={SF_ROW} />

      {/* 3rd place match */}
      <div className="h-px" style={{ background: "#0e1c33" }} />
      <div className="flex items-start gap-3">
        <div className="flex-[0.9] min-w-0">
          <MatchCard m={THIRD_MATCH} />
        </div>
        <div className="flex-[1.1] min-w-0">
          <div className="rounded-xl flex items-center justify-center py-8 text-center"
            style={{ background: "#0b1427", border: "1px dashed #1a2a45" }}>
            <p className="text-xs font-bold" style={{ color: "#2a3a5c" }}>
              Losers of both SF matches
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** F (Final) view: final + 3rd place side by side */
function FinalView() {
  return (
    <div className="space-y-5">
      {/* Trophy header */}
      <div className="text-center py-4">
        <p className="text-2xl font-black text-white">🏆</p>
        <p className="text-xs font-bold mt-1" style={{ color: "#4d5e7a" }}>
          MetLife Stadium, East Rutherford · Jul 19, 2026
        </p>
      </div>

      {/* Final */}
      <MatchCard m={FINAL_MATCH} />

      {/* 3rd place divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "#0e1c33" }} />
        <span className="text-[10px] font-bold" style={{ color: "#2a3a5c" }}>3rd Place</span>
        <div className="flex-1 h-px" style={{ background: "#0e1c33" }} />
      </div>

      {/* 3rd place match */}
      <MatchCard m={THIRD_MATCH} />
    </div>
  );
}

// ── Bracket tab (with stage sub-navigation) ───────────────────────────────────

function BracketView() {
  const [stage, setStage] = useState<StageTab>("R32");

  return (
    <div className="space-y-5">
      {/* Stage tab bar — matches the screenshot pill bar */}
      <div className="overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center gap-1 p-1 rounded-2xl min-w-max"
          style={{ background: "#090f1e", border: "1px solid #141e34" }}>
          {STAGE_TABS.map(tab => {
            const active = stage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStage(tab.id)}
                className="px-4 py-2 rounded-xl text-sm font-black transition-all"
                style={active ? {
                  background: "linear-gradient(135deg,#0052FF,#1d4ed8)",
                  color: "#fff",
                  boxShadow: "0 0 14px rgba(0,82,255,0.4)",
                  border: "1px solid rgba(0,82,255,0.5)",
                } : {
                  color: "#2a3a5c",
                  border: "1px solid transparent",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage content */}
      <div>
        {stage === "GE"  && <GEView />}
        {stage === "R32" && <BracketStageView rows={R32_ROWS} divider={4} />}
        {stage === "R16" && <BracketStageView rows={R16_ROWS} divider={2} />}
        {stage === "QF"  && <BracketStageView rows={QF_ROWS}  />}
        {stage === "SF"  && <SFView />}
        {stage === "F"   && <FinalView />}
      </div>
    </div>
  );
}

// ── Groups grid sub-tab ───────────────────────────────────────────────────────

function GroupsGrid() {
  const { t } = useLang();
  return (
    <div className="space-y-4">
      <p className="text-center text-sm" style={{ color: "#4d5e7a" }}>
        {t.grp_hosts} · {t.grp_format_note}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {GROUPS.map(group => {
          const teams = sortedGroupTeams(group);
          return (
            <div key={group} className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
                  style={{ background: "rgba(0,82,255,0.12)", border: "1px solid rgba(0,82,255,0.2)", color: "#4d7aff" }}>
                  {group}
                </div>
                <span className="font-black text-white">Group {group}</span>
              </div>
              <div className="space-y-2">
                {teams.map((team, idx) => (
                  <div key={team.id} className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold w-4 text-right shrink-0"
                      style={{ color: idx < 2 ? "#4d7aff" : "#3d5280" }}>
                      {idx + 1}
                    </span>
                    <Image src={getFlagUrl(team.flagCode, 80)} alt={team.name}
                      width={28} height={19} className="rounded-sm object-cover shrink-0" unoptimized />
                    <span className="text-sm font-semibold text-white truncate">{team.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px]" style={{ color: "#3d5280" }}>
                Top 2 advance · best 3rd may qualify
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Table (standings) sub-tab ─────────────────────────────────────────────────

function TableView() {
  const { t } = useLang();
  const [selected, setSelected] = useState("A");
  const countryById = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));

  const rawRows = GROUP_STANDINGS[selected] ?? [];
  const sorted  = sortStandings(rawRows).sort((a, b) => {
    const [pa, pb] = [getPts(a), getPts(b)];
    const [gda, gdb] = [getGD(a), getGD(b)];
    if (pa !== pb || gda !== gdb || a.gf !== b.gf) return 0;
    return (countryById[a.countryId]?.favoriteRank ?? 99) - (countryById[b.countryId]?.favoriteRank ?? 99);
  });
  const allZero = sorted.every(r => r.p === 0);

  return (
    <div className="space-y-4">
      {/* Group selector */}
      <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-1.5 min-w-max">
          {GROUPS.map(g => (
            <button key={g} onClick={() => setSelected(g)}
              className="w-9 h-9 rounded-xl text-sm font-black transition-all shrink-0"
              style={selected === g
                ? { background: "linear-gradient(135deg,#0052FF,#1d4ed8)", color: "#fff", boxShadow: "0 0 14px rgba(0,82,255,0.35)", border: "1px solid rgba(0,82,255,0.5)" }
                : { background: "rgba(255,255,255,0.03)", color: "#3d5280", border: "1px solid #141e34" }
              }>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0b1427", border: "1px solid #1a2a45" }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid #1a2a45", background: "#0d1830" }}>
          <span className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
            style={{ background: "#0f2050", color: "#4d7aff", border: "1px solid #1a3a80" }}>
            {selected}
          </span>
          <span className="font-black text-white text-sm">{t.tbl_group} {selected}</span>
          {!allZero && (
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "#10b981" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE
            </span>
          )}
        </div>

        {/* Column labels */}
        <div className="grid px-4 py-2"
          style={{ gridTemplateColumns: "20px 1fr 32px 26px 26px 26px 34px 34px", borderBottom: "1px solid #0e1c33", background: "#0a1220" }}>
          <span /><span />
          {[t.tbl_p, t.tbl_w, t.tbl_d, t.tbl_l, t.tbl_gd].map(h => (
            <span key={h} className="text-[10px] font-bold text-center" style={{ color: "#2a3a5c" }}>{h}</span>
          ))}
          <span className="text-[10px] font-bold text-center" style={{ color: "#fbbf24" }}>{t.tbl_pts}</span>
        </div>

        {/* Rows */}
        {sorted.map((row, idx) => {
          const c   = countryById[row.countryId];
          if (!c) return null;
          const pts = getPts(row);
          const gd  = getGD(row);
          const bg  = idx === 0 ? "rgba(0,82,255,0.07)" : idx === 1 ? "rgba(0,82,255,0.04)" : idx === 2 ? "rgba(251,191,36,0.025)" : "transparent";
          const accent = idx === 0 ? "#0052FF" : idx === 1 ? "#1d4ed8" : idx === 2 ? "rgba(251,191,36,0.5)" : "transparent";

          return (
            <div key={row.countryId} className="grid items-center px-4 py-3 relative"
              style={{ gridTemplateColumns: "20px 1fr 32px 26px 26px 26px 34px 34px", background: bg, borderBottom: idx < 3 ? "1px solid #0e1c33" : undefined }}>
              <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r" style={{ background: accent }} />
              <span className="text-[11px] font-black text-center" style={{ color: idx < 2 ? "#4d7aff" : idx === 2 ? "#fcd34d" : "#2a3a5c" }}>{idx + 1}</span>
              <div className="flex items-center gap-2 min-w-0">
                <Image src={getFlagUrl(c.flagCode, 40)} alt={c.name} width={22} height={15} className="rounded-[3px] object-cover shrink-0" unoptimized />
                <span className="text-xs font-semibold truncate" style={{ color: idx < 2 ? "#c8d6f0" : "#4d5e7a" }}>{c.name}</span>
              </div>
              <span className="text-[11px] font-bold text-center" style={{ color: "#3d5280" }}>{row.p}</span>
              <span className="text-[11px] font-bold text-center" style={{ color: row.w > 0 ? "#4ade80" : "#3d5280" }}>{row.w}</span>
              <span className="text-[11px] font-bold text-center" style={{ color: row.d > 0 ? "#facc15" : "#3d5280" }}>{row.d}</span>
              <span className="text-[11px] font-bold text-center" style={{ color: row.l > 0 ? "#f87171" : "#3d5280" }}>{row.l}</span>
              <span className="text-[11px] font-bold text-center" style={{ color: gd > 0 ? "#4ade80" : gd < 0 ? "#f87171" : "#3d5280" }}>{gd > 0 ? `+${gd}` : gd}</span>
              <span className="text-sm font-black text-center" style={{ color: idx < 2 ? "#e2e8f0" : "#3d5280" }}>{pts}</span>
            </div>
          );
        })}

        {/* Legend */}
        <div className="px-4 py-3 space-y-1" style={{ background: "#080f1e", borderTop: "1px solid #0e1c33" }}>
          <div className="flex items-center gap-2"><div className="w-0.5 h-3 rounded-full" style={{ background: "#0052FF" }} /><span className="text-[10px]" style={{ color: "#2a3a5c" }}>{t.tbl_qualifies}</span></div>
          <div className="flex items-center gap-2"><div className="w-0.5 h-3 rounded-full" style={{ background: "rgba(251,191,36,0.5)" }} /><span className="text-[10px]" style={{ color: "#2a3a5c" }}>{t.tbl_third}</span></div>
        </div>
      </div>

      <p className="text-center text-xs" style={{ color: "#1a2a45" }}>
        {allZero ? t.tbl_not_started : t.tbl_live_note}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GroupsPage() {
  const { t } = useLang();
  const [innerTab, setInnerTab] = useState<InnerTab>("bracket");

  const TABS: { id: InnerTab; label: string }[] = [
    { id: "groups",  label: "Groups"   },
    { id: "table",   label: t.tbl_tab  },
    { id: "bracket", label: "Bracket"  },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-white">{t.grp_title}</h1>
        <p className="text-sm" style={{ color: "#4d5e7a" }}>{t.grp_sub}</p>
      </div>

      {/* Inner tabs */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setInnerTab(tab.id)}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-all"
              style={innerTab === tab.id
                ? { background: "rgba(0,82,255,0.12)", color: "#4d7aff", border: "1px solid rgba(0,82,255,0.25)" }
                : { color: "#3d5280", border: "1px solid transparent" }
              }>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {innerTab === "groups"  && <GroupsGrid />}
      {innerTab === "table"   && <TableView />}
      {innerTab === "bracket" && <BracketView />}
    </div>
  );
}
