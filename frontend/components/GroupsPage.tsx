"use client";

import Image from "next/image";
import { useState, createContext, useContext } from "react";
import { COUNTRIES, GROUPS, getFlagUrl } from "@/lib/countries";
import { GROUP_STANDINGS, getPts, getGD, sortStandings, type TeamStanding } from "@/lib/tournamentData";
import {
  MatchData, MatchSlot, BracketRow,
  R32_MATCHES, R32_ROWS,
  R16_ROWS, QF_ROWS, SF_ROW,
  FINAL_MATCH, THIRD_MATCH,
} from "@/lib/tournamentSchedule";
import { useLang } from "@/lib/LanguageContext";
import type { Translations } from "@/lib/i18n";
import { resolveSlot } from "@/lib/tournamentLogic";
import { useLiveStandings } from "@/lib/useLiveStandings";
import type { GroupStandings } from "@/app/api/tournament/route";

type StageTab  = "GE" | "R32" | "R16" | "QF" | "SF" | "F";
type ViewMode  = "table" | "split" | "bracket" | "r32bracket" | "trophy";

// ── Standings context (avoids prop drilling to MatchCard / group lists) ────────
const StandingsCtx = createContext<GroupStandings>(GROUP_STANDINGS);
const useStandings = () => useContext(StandingsCtx);

/** Which view modes are available per stage (order = icon order) */
const STAGE_MODES: Record<StageTab, ViewMode[]> = {
  GE:  ["table", "split"],
  R32: ["split", "r32bracket"],
  R16: ["bracket"],
  QF:  ["bracket"],
  SF:  ["bracket"],
  F:   ["trophy"],
};

/** Default view mode when entering a stage */
const DEFAULT_MODE: Record<StageTab, ViewMode> = {
  GE:  "table",
  R32: "split",
  R16: "bracket",
  QF:  "bracket",
  SF:  "bracket",
  F:   "trophy",
};

// ── Date localization ─────────────────────────────────────────────────────────

const DAY_ABBR: Record<string, string[]> = {
  en: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  tr: ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"],
  es: ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"],
  zh: ["日","一","二","三","四","五","六"],
  ar: ["أح","إث","ثل","أر","خم","جم","سب"],
  ko: ["일","월","화","수","목","금","토"],
};

const MONTH_ABBR: Record<string, Record<string, string>> = {
  en: { Jun:"Jun", Jul:"Jul" },
  tr: { Jun:"Haz", Jul:"Tem" },
  es: { Jun:"Jun", Jul:"Jul" },
  zh: { Jun:"6月",  Jul:"7月" },
  ar: { Jun:"يون", Jul:"يول" },
  ko: { Jun:"6월",  Jul:"7월" },
};

const MONTH_IDX: Record<string, number> = {
  Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
};

function fmtDate(dateStr: string, time: string, lang: string): string {
  const [mon, day] = dateStr.split(" ");
  const d   = new Date(2026, MONTH_IDX[mon], parseInt(day));
  const da  = (DAY_ABBR[lang]   ?? DAY_ABBR.en)[d.getDay()];
  const ma  = ((MONTH_ABBR[lang] ?? MONTH_ABBR.en)[mon]) ?? mon;
  return `${parseInt(day)} ${ma} ${da} · ${time}`;
}

// ── Group standings helpers ───────────────────────────────────────────────────

const cById = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));

function sortGroup(raw: TeamStanding[]) {
  return sortStandings(raw).sort((a, b) => {
    if (getPts(a) !== getPts(b) || getGD(a) !== getGD(b) || a.gf !== b.gf) return 0;
    return (cById[a.countryId]?.favoriteRank ?? 99) - (cById[b.countryId]?.favoriteRank ?? 99);
  });
}

// ── Left column: compact standings (R32 tab) ──────────────────────────────────

function CompactGroupList({ t }: { t: Translations }) {
  const standings = useStandings();
  return (
    <div className="space-y-2 pr-1">
      {GROUPS.map(group => {
        const sorted = sortGroup(standings[group] ?? []);
        return (
          <div key={group} className="rounded-xl overflow-hidden"
            style={{ background: "#0b1427", border: "1px solid #1a2a45" }}>

            {/* Group header */}
            <div className="flex items-center justify-between px-3 py-1.5"
              style={{ background: "#090f1e", borderBottom: "1px solid #141e34" }}>
              <span className="text-[11px] font-black text-white">
                {t.tbl_group} {group}
              </span>
              <span className="text-[10px] font-bold" style={{ color: "#3d5280" }}>
                {t.tbl_pts}
              </span>
            </div>

            {/* Team rows */}
            {sorted.map((row, idx) => {
              const c = cById[row.countryId];
              if (!c) return null;
              return (
                <div key={row.countryId}
                  className="flex items-center gap-1.5 px-2.5 py-[7px]"
                  style={{ borderBottom: idx < 3 ? "1px solid #0d1828" : undefined }}>
                  <span className="w-3.5 text-[10px] font-bold text-center shrink-0"
                    style={{ color: idx < 2 ? "#4d7aff" : "#2a3a5c" }}>
                    {idx + 1}
                  </span>
                  <Image src={getFlagUrl(c.flagCode, 40)} alt={c.name}
                    width={18} height={12} className="rounded-[2px] object-cover shrink-0" unoptimized />
                  <span className="text-[11px] font-semibold flex-1 truncate"
                    style={{ color: idx < 2 ? "#b8c8e8" : "#3d5280" }}>
                    {c.name}
                  </span>
                  <span className="text-[11px] font-black shrink-0 w-4 text-center"
                    style={{ color: idx < 2 ? "#e2e8f0" : "#2a3a5c" }}>
                    {getPts(row)}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Left column: full standings (GE tab) ──────────────────────────────────────

function FullGroupList({ t }: { t: Translations }) {
  const standings = useStandings();
  const cols = [t.tbl_p, t.tbl_w, t.tbl_d, t.tbl_l, t.tbl_gd, t.tbl_pts];
  return (
    <div className="space-y-2 pr-1">
      {GROUPS.map(group => {
        const sorted = sortGroup(standings[group] ?? []);
        return (
          <div key={group} className="rounded-xl overflow-hidden"
            style={{ background: "#0b1427", border: "1px solid #1a2a45" }}>

            {/* Group header */}
            <div className="flex items-center gap-1 px-2.5 py-1.5"
              style={{ background: "#090f1e", borderBottom: "1px solid #141e34" }}>
              <span className="text-[11px] font-black text-white flex-1 truncate">
                {t.tbl_group} {group}
              </span>
              {cols.map((h, i) => (
                <span key={i} className="text-[8px] font-bold text-center shrink-0"
                  style={{ width: 13, color: i === cols.length - 1 ? "#fbbf24" : "#2a3a5c" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Team rows */}
            {sorted.map((row, idx) => {
              const c   = cById[row.countryId];
              if (!c) return null;
              const pts = getPts(row);
              const gd  = getGD(row);
              return (
                <div key={row.countryId}
                  className="flex items-center gap-1 px-2 py-[7px]"
                  style={{ borderBottom: idx < 3 ? "1px solid #0d1828" : undefined }}>
                  <span className="w-3 text-[9px] font-bold text-center shrink-0"
                    style={{ color: idx < 2 ? "#4d7aff" : "#2a3a5c" }}>
                    {idx + 1}
                  </span>
                  <Image src={getFlagUrl(c.flagCode, 40)} alt={c.name}
                    width={16} height={11} className="rounded-[2px] object-cover shrink-0" unoptimized />
                  <span className="text-[9px] font-semibold flex-1 truncate min-w-0"
                    style={{ color: idx < 2 ? "#b8c8e8" : "#3d5280" }}>
                    {c.name}
                  </span>
                  {/* P W D L GD Pts */}
                  <span className="text-[8px] font-bold text-center shrink-0" style={{ width:13, color:"#3d5280" }}>{row.p}</span>
                  <span className="text-[8px] font-bold text-center shrink-0" style={{ width:13, color: row.w > 0 ? "#4ade80" : "#3d5280" }}>{row.w}</span>
                  <span className="text-[8px] font-bold text-center shrink-0" style={{ width:13, color: row.d > 0 ? "#facc15" : "#3d5280" }}>{row.d}</span>
                  <span className="text-[8px] font-bold text-center shrink-0" style={{ width:13, color: row.l > 0 ? "#f87171" : "#3d5280" }}>{row.l}</span>
                  <span className="text-[8px] font-bold text-center shrink-0" style={{ width:13, color: gd > 0 ? "#4ade80" : gd < 0 ? "#f87171" : "#3d5280" }}>
                    {gd > 0 ? `+${gd}` : gd}
                  </span>
                  <span className="text-[9px] font-black text-center shrink-0"
                    style={{ width:13, color: idx < 2 ? "#e2e8f0" : "#2a3a5c" }}>
                    {pts}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Right column: R32 match schedule ─────────────────────────────────────────

// Group R32 matches by date (preserving insertion order)
const R32_BY_DATE: { date: string; matches: MatchData[] }[] = [];
{
  const idx: Record<string, number> = {};
  for (const m of R32_MATCHES) {
    if (idx[m.date] === undefined) { idx[m.date] = R32_BY_DATE.length; R32_BY_DATE.push({ date: m.date, matches: [] }); }
    R32_BY_DATE[idx[m.date]].matches.push(m);
  }
}

function ScheduleCard({ m, lang }: { m: MatchData; lang: string }) {
  const standings = useStandings();
  const slotA = resolveSlot(m.a.label, standings);
  const slotB = resolveSlot(m.b.label, standings);
  const resolvedA = !!slotA.flagCode;
  const resolvedB = !!slotB.flagCode;
  return (
    <div className="rounded-xl overflow-hidden mb-2"
      style={{ background: "#0b1427", border: "1px solid #1a2a45" }}>
      {/* Date header */}
      <div className="px-3 py-1 text-[9px] font-bold"
        style={{ background: "#090f1e", color: "#2a3a5c", borderBottom: "1px solid #141e34" }}>
        {fmtDate(m.date, m.time, lang)}
      </div>
      {/* Team A */}
      <div className="flex items-center gap-2 px-3 py-[8px]"
        style={{ borderBottom: "1px solid #0d1828" }}>
        {resolvedA
          ? <Image src={getFlagUrl(slotA.flagCode!, 40)} alt={slotA.label}
              width={16} height={11} className="rounded-[2px] object-cover shrink-0" unoptimized />
          : <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#1a2a45" }} />
        }
        <span className="text-[11px] font-semibold truncate"
          style={{ color: resolvedA ? "#c8d6f0" : "#5a7299" }}>
          {slotA.label}
        </span>
      </div>
      {/* Team B */}
      <div className="flex items-center gap-2 px-3 py-[8px]">
        {resolvedB
          ? <Image src={getFlagUrl(slotB.flagCode!, 40)} alt={slotB.label}
              width={16} height={11} className="rounded-[2px] object-cover shrink-0" unoptimized />
          : <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#1a2a45" }} />
        }
        <span className="text-[11px] font-semibold truncate"
          style={{ color: resolvedB ? "#c8d6f0" : "#5a7299" }}>
          {slotB.label}
        </span>
      </div>
    </div>
  );
}

function R32Schedule({ lang }: { lang: string }) {
  return (
    <div className="pl-1">
      {R32_BY_DATE.map(({ matches }) =>
        matches.map(m => <ScheduleCard key={m.id} m={m} lang={lang} />)
      )}
    </div>
  );
}

// ── Split view wrapper ────────────────────────────────────────────────────────

function SplitView({ full, t, lang }: {
  full: boolean;
  t: Translations;
  lang: string;
}) {
  return (
    <div className="flex gap-2" style={{ height: "clamp(460px, 64vh, 700px)" }}>
      {/* Left: standings */}
      <div className="overflow-y-auto" style={{ flex: "0 0 46%", scrollbarWidth: "none" }}>
        {full ? <FullGroupList t={t} /> : <CompactGroupList t={t} />}
      </div>
      {/* Right: R32 match schedule */}
      <div className="overflow-y-auto flex-1 min-w-0" style={{ scrollbarWidth: "none" }}>
        <R32Schedule lang={lang} />
      </div>
    </div>
  );
}

// ── Bracket components ────────────────────────────────────────────────────────

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

function MatchCard({ m, lang }: { m: MatchData; lang: string }) {
  // Resolve slot labels → real team using live standings
  const standings = useStandings();
  const slotA = resolveSlot(m.a.label, standings);
  const slotB = resolveSlot(m.b.label, standings);
  const isTbdA = slotA.label === "TBD";
  const isTbdB = slotB.label === "TBD";
  // A slot is "resolved" (real team known) when it has a flagCode
  const resolvedA = !!slotA.flagCode;
  const resolvedB = !!slotB.flagCode;
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
          {fmtDate(m.date, m.time, lang)}
        </span>
      </div>
      {/* Card */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "#0b1427", border: "1px solid #1a2a45" }}>
        <div className="flex items-center gap-2 px-3 py-2.5"
          style={{ borderBottom: "1px solid #111e35" }}>
          <SlotAvatar slot={slotA} />
          <span className="text-[12px] font-semibold leading-tight truncate"
            style={{ color: isTbdA ? "#1f2d4a" : resolvedA ? "#ffffff" : "#c8d6f0" }}>
            {isTbdA ? "TBD" : slotA.label}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <SlotAvatar slot={slotB} />
          <span className="text-[12px] font-semibold leading-tight truncate"
            style={{ color: isTbdB ? "#1f2d4a" : resolvedB ? "#ffffff" : "#c8d6f0" }}>
            {isTbdB ? "TBD" : slotB.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function BracketUnit({ row, lang }: { row: BracketRow; lang: string }) {
  return (
    <div className="flex items-center gap-0" style={{ minHeight: 160 }}>
      {/* Left: two match cards */}
      <div className="flex-1 space-y-3 min-w-0">
        <MatchCard m={row.left1} lang={lang} />
        <MatchCard m={row.left2} lang={lang} />
      </div>

      {/* CSS bracket connector */}
      <div className="shrink-0 relative self-stretch" style={{ width: 22 }}>
        <div className="absolute" style={{ top:"25%", right:0, left:0, height:1, background:"#1a2a45" }} />
        <div className="absolute" style={{ bottom:"25%", right:0, left:0, height:1, background:"#1a2a45" }} />
        <div className="absolute" style={{ top:"25%", bottom:"25%", right:0, width:1, background:"#1a2a45" }} />
        <div className="absolute" style={{ top:"calc(50% - 0.5px)", left:0, right:0, height:1, background:"#1a2a45" }} />
      </div>

      {/* Right: next-round match */}
      <div className="flex items-center" style={{ width:"44%", minWidth:0 }}>
        <div className="w-full"><MatchCard m={row.right} lang={lang} /></div>
      </div>
    </div>
  );
}

function BracketStageView({ rows, divider, lang }: {
  rows: BracketRow[];
  divider?: number;
  lang: string;
}) {
  const half = divider ?? rows.length;
  return (
    <div className="space-y-5">
      {rows.slice(0, half).map((row, i) => (
        <div key={row.left1.id}>
          <BracketUnit row={row} lang={lang} />
          {i < half - 1 && <div className="h-px mt-5" style={{ background: "#0e1c33" }} />}
        </div>
      ))}

      {divider && divider < rows.length && (
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px" style={{ background: "#0e1c33" }} />
          <span className="text-[10px] font-black px-3 py-1 rounded-full"
            style={{ background: "#0d1830", color: "#2a3a5c", border: "1px solid #1a2a45" }}>
            ·  ·  ·
          </span>
          <div className="flex-1 h-px" style={{ background: "#0e1c33" }} />
        </div>
      )}

      {divider && rows.slice(half).map((row, i) => (
        <div key={row.left1.id}>
          <BracketUnit row={row} lang={lang} />
          {i < rows.length - half - 1 && <div className="h-px mt-5" style={{ background: "#0e1c33" }} />}
        </div>
      ))}
    </div>
  );
}

function SFView({ lang }: { lang: string }) {
  const { t } = useLang();
  return (
    <div className="space-y-6">
      <BracketUnit row={SF_ROW} lang={lang} />
      <div className="h-px" style={{ background: "#0e1c33" }} />
      <div className="space-y-1.5 opacity-60">
        <div className="px-0.5">
          <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ background: "rgba(251,191,36,0.13)", color: "#fbbf24" }}>
            {t.stg_third_place}
          </span>
        </div>
        <MatchCard m={THIRD_MATCH} lang={lang} />
      </div>
    </div>
  );
}

function FinalView({ lang }: { lang: string }) {
  const { t } = useLang();
  return (
    <div className="space-y-5">
      <div className="text-center py-3">
        <p className="text-3xl">🏆</p>
        <p className="text-xs font-bold mt-1" style={{ color: "#4d5e7a" }}>
          {t.stg_final_venue}
        </p>
      </div>
      <MatchCard m={FINAL_MATCH} lang={lang} />
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "#0e1c33" }} />
        <span className="text-[10px] font-bold" style={{ color: "#2a3a5c" }}>{t.stg_third_place}</span>
        <div className="flex-1 h-px" style={{ background: "#0e1c33" }} />
      </div>
      <MatchCard m={THIRD_MATCH} lang={lang} />
    </div>
  );
}

// ── View mode icons (inline SVG, no external deps) ───────────────────────────

function IconList() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
      <rect x="0" y="0"  width="18" height="2.5" rx="1.25" fill="currentColor"/>
      <rect x="0" y="5.75" width="18" height="2.5" rx="1.25" fill="currentColor"/>
      <rect x="0" y="11.5" width="18" height="2.5" rx="1.25" fill="currentColor"/>
    </svg>
  );
}

function IconSplit() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
      {/* Left panel lines */}
      <rect x="0"  y="0"    width="8" height="2" rx="1" fill="currentColor"/>
      <rect x="0"  y="4.5"  width="8" height="2" rx="1" fill="currentColor"/>
      <rect x="0"  y="9"    width="8" height="2" rx="1" fill="currentColor"/>
      <rect x="0"  y="13.5" width="5" height="2" rx="1" fill="currentColor" opacity="0.5"/>
      {/* Divider */}
      <rect x="9.5" y="0" width="1" height="15" rx="0.5" fill="currentColor" opacity="0.3"/>
      {/* Right panel lines */}
      <rect x="12" y="0"    width="8" height="2" rx="1" fill="currentColor"/>
      <rect x="12" y="4.5"  width="8" height="2" rx="1" fill="currentColor"/>
      <rect x="12" y="9"    width="5" height="2" rx="1" fill="currentColor" opacity="0.5"/>
    </svg>
  );
}

function IconBracket() {
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
      {/* Left top match */}
      <rect x="0" y="1"  width="7" height="1.8" rx="0.9" fill="currentColor"/>
      <rect x="0" y="4"  width="7" height="1.8" rx="0.9" fill="currentColor"/>
      {/* Left bottom match */}
      <rect x="0" y="10" width="7" height="1.8" rx="0.9" fill="currentColor"/>
      <rect x="0" y="13" width="7" height="1.8" rx="0.9" fill="currentColor"/>
      {/* Top bracket arm */}
      <rect x="7"   y="1.9"  width="3"   height="1"   rx="0.5" fill="currentColor" opacity="0.5"/>
      <rect x="9.5" y="1.9"  width="1"   height="6.2" rx="0.5" fill="currentColor" opacity="0.5"/>
      <rect x="7"   y="13"   width="3"   height="1"   rx="0.5" fill="currentColor" opacity="0.5"/>
      <rect x="9.5" y="7.1"  width="3.5" height="1"   rx="0.5" fill="currentColor" opacity="0.5"/>
      {/* Right result */}
      <rect x="13" y="6.3" width="7" height="1.8" rx="0.9" fill="currentColor"/>
    </svg>
  );
}

function IconTrophy() {
  return <span style={{ fontSize: 15, lineHeight: 1 }}>🏆</span>;
}

const MODE_ICONS: Record<ViewMode, React.ReactNode> = {
  table:     <IconList />,
  split:     <IconSplit />,
  bracket:   <IconBracket />,
  r32bracket:<IconBracket />,
  trophy:    <IconTrophy />,
};

// ── Mode selector bar ─────────────────────────────────────────────────────────

function ModeBar({
  modes, active, onChange,
}: {
  modes: ViewMode[];
  active: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  if (modes.length <= 1) return null; // single-mode stages: hide bar

  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-1 p-1 rounded-2xl"
        style={{ background: "#090f1e", border: "1px solid #141e34" }}>
        {modes.map(mode => {
          const isActive = mode === active;
          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              className="flex items-center justify-center rounded-xl transition-all"
              style={{
                width: 42, height: 36,
                background: isActive ? "#0d1e42" : "transparent",
                color: isActive ? "#4d88ff" : "#2a3a5c",
                border: isActive ? "1px solid #1a3a80" : "1px solid transparent",
                boxShadow: isActive ? "0 0 10px rgba(0,82,255,0.2)" : undefined,
              }}
            >
              {MODE_ICONS[mode]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GroupsPage() {
  const { t, lang } = useLang();
  const [stage,    setStage]    = useState<StageTab>("R32");
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_MODE["R32"]);
  const { standings, live, lastUpdated } = useLiveStandings();

  function handleStageChange(s: StageTab) {
    setStage(s);
    setViewMode(DEFAULT_MODE[s]); // reset view mode to default for new stage
  }

  const STAGE_TABS: { id: StageTab; label: string }[] = [
    { id: "GE",  label: t.stg_ge  },
    { id: "R32", label: t.stg_r32 },
    { id: "R16", label: t.stg_r16 },
    { id: "QF",  label: t.stg_qf  },
    { id: "SF",  label: t.stg_sf  },
    { id: "F",   label: t.stg_f   },
  ];

  return (
    <StandingsCtx.Provider value={standings}>
    <div className="space-y-3">
      {/* Header */}
      <div className="text-center space-y-0.5">
        <h1 className="text-xl font-black text-white">{t.grp_title}</h1>
        <p className="text-sm" style={{ color: "#4d5e7a" }}>{t.grp_sub}</p>
        {/* Live data indicator */}
        {live && lastUpdated && (
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold" style={{ color: "#10b981" }}>
              {t.live_label} · {lastUpdated.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
            </span>
          </div>
        )}
      </div>

      {/* Stage tabs */}
      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex items-center gap-1 p-1 rounded-2xl min-w-max"
          style={{ background: "#090f1e", border: "1px solid #141e34" }}>
          {STAGE_TABS.map(tab => {
            const active = stage === tab.id;
            return (
              <button key={tab.id} onClick={() => handleStageChange(tab.id)}
                className="px-4 py-2 rounded-xl text-sm font-black transition-all"
                style={active ? {
                  background: "linear-gradient(135deg,#0052FF,#1d4ed8)",
                  color: "#fff",
                  boxShadow: "0 0 14px rgba(0,82,255,0.4)",
                  border: "1px solid rgba(0,82,255,0.5)",
                } : {
                  color: "#2a3a5c",
                  border: "1px solid transparent",
                }}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* View mode icon bar — only shows when stage has 2+ modes */}
      <ModeBar
        modes={STAGE_MODES[stage]}
        active={viewMode}
        onChange={setViewMode}
      />

      {/* ── Content: (stage + viewMode) → render ── */}

      {/* GE: full standings table OR split with R32 schedule */}
      {stage === "GE" && viewMode === "table" && (
        <FullGroupList t={t} />
      )}
      {stage === "GE" && viewMode === "split" && (
        <SplitView full={true} t={t} lang={lang} />
      )}

      {/* R32: split (compact + schedule) OR R32 bracket tree */}
      {stage === "R32" && viewMode === "split" && (
        <SplitView full={false} t={t} lang={lang} />
      )}
      {stage === "R32" && viewMode === "r32bracket" && (
        <BracketStageView rows={R32_ROWS} divider={4} lang={lang} />
      )}

      {/* R16, QF, SF — bracket only */}
      {stage === "R16" && <BracketStageView rows={R16_ROWS} divider={2} lang={lang} />}
      {stage === "QF"  && <BracketStageView rows={QF_ROWS}              lang={lang} />}
      {stage === "SF"  && <SFView  lang={lang} />}
      {stage === "F"   && <FinalView lang={lang} />}
    </div>
    </StandingsCtx.Provider>
  );
}
