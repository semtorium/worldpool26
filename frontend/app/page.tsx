"use client";

import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from "react";
import { useReadContract, useAccount } from "wagmi";
import { Navbar, type Tab }              from "@/components/Navbar";
import { NationsCupPage }                from "@/components/NationsCupPage";
import { GroupsPage }                    from "@/components/GroupsPage";
import { TopScorerPage }                 from "@/components/TopScorerPage";
import { LeaderboardPage }               from "@/components/LeaderboardPage";
import { ActivityPage }                  from "@/components/ActivityPage";
import { PrizeCounter }                  from "@/components/PrizeCounter";
import { LoadingScreen }                 from "@/components/LoadingScreen";
import { TermsModal }                    from "@/components/TermsModal";
import { NationsCupWinnerModal }         from "@/components/NationsCupWinnerModal";
import { TopScorerWinnerModal }          from "@/components/TopScorerWinnerModal";
import { MaintenanceBanner }             from "@/components/MaintenanceBanner";
import { EliminationSummaryModal }       from "@/components/EliminationSummaryModal";
import { ABI }                           from "@/lib/abi";
import { CONTRACT_ADDRESS }              from "@/lib/config";

// Namespace all localStorage keys by contract address so redeployments reset them automatically
const ELIM_SNAPSHOT_KEY = `wp26_elim_snapshot_${CONTRACT_ADDRESS}`;
const NC_CLAIMED_KEY    = (addr: string) => `nc_claimed_${CONTRACT_ADDRESS}_${addr}`;
const TS_CLAIMED_KEY    = (addr: string) => `ts_claimed_${CONTRACT_ADDRESS}_${addr}`;

const STORAGE_KEY = "wp26_active_tab";

export default function Home() {
  const [activeTab, setActiveTab]       = useState<Tab>("nations");
  // Tabs that have been visited at least once → keep mounted (display:none) to avoid re-loading images
  const [mountedTabs, setMountedTabs]   = useState<Set<Tab>>(new Set(["nations"]));
  const [appReady, setAppReady]         = useState(false);
  const [showLoader, setShowLoader]     = useState(true);
  const [showTerms, setShowTerms]       = useState(false);
  const [showNcWinner, setShowNcWinner] = useState(false);
  const [showTsWinner, setShowTsWinner] = useState(false);
  const [elimSummaryIds, setElimSummaryIds] = useState<number[]>([]);

  const { address } = useAccount();

  // Render-time claimed checks — re-evaluates when address loads (fixes modal reappearing after claim)
  const isNcClaimed = useMemo(() => {
    const addr = address?.toLowerCase() ?? "";
    return addr ? localStorage.getItem(NC_CLAIMED_KEY(addr)) === "true" : false;
  }, [address]);
  const isTsClaimed = useMemo(() => {
    const addr = address?.toLowerCase() ?? "";
    return addr ? localStorage.getItem(TS_CLAIMED_KEY(addr)) === "true" : false;
  }, [address]);

  // Keep address accessible inside effects without adding it as a dependency
  const addressRef = useRef(address);
  addressRef.current = address;
  // Ensures modal init logic runs only once after data is ready
  const modalInitRef = useRef(false);

  // Prefetch main NC pool (controls loading screen)
  const { data: poolData } = useReadContract({
    address: CONTRACT_ADDRESS, abi: ABI, functionName: "nationsCupPoolBalance",
  });

  // Finalization state
  const { data: ncFinalized }      = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "tournamentFinalized" });
  const { data: tsFinalized }      = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "topScorerFinalized" });
  const { data: winningCountryId } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "winningCountryId" });
  const { data: finalTopScorer }   = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "finalTopScorer" });
  const { data: maintenanceMode }     = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "maintenanceMode", query: { refetchInterval: 15_000 } });
  const { data: eliminationStatus }   = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: "getAllEliminationStatus", query: { refetchInterval: 30_000 } });

  const isDataReady = poolData !== undefined;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Tab | null;
    const valid: Tab[] = ["nations", "groups", "scorer", "leaderboard", "activity"];
    if (saved && valid.includes(saved)) {
      setActiveTab(saved);
      setMountedTabs(prev => new Set([...prev, saved]));
    }
  }, []);

  // Decide which winner modals to show — runs ONCE after data is ready.
  // Using addressRef so we don't re-trigger this when wallet connects/changes.
  useEffect(() => {
    if (!appReady || modalInitRef.current) return;
    if (ncFinalized === undefined || tsFinalized === undefined) return;

    modalInitRef.current = true;
    const addr = addressRef.current?.toLowerCase() ?? "";
    const ncClaimed = addr ? localStorage.getItem(NC_CLAIMED_KEY(addr)) === "true" : false;
    const tsClaimed = addr ? localStorage.getItem(TS_CLAIMED_KEY(addr)) === "true" : false;

    if (ncFinalized && !ncClaimed) {
      setShowNcWinner(true);
    } else if (tsFinalized && !tsClaimed) {
      setShowTsWinner(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appReady, ncFinalized, tsFinalized]);

  // Check for newly eliminated countries since last visit
  useEffect(() => {
    if (!appReady || !eliminationStatus) return;
    const currentElimIds = Array.from(eliminationStatus as unknown as boolean[])
      .map((v, i) => (v ? i : -1))
      .filter(i => i > 0);
    if (currentElimIds.length === 0) return;

    const stored = localStorage.getItem(ELIM_SNAPSHOT_KEY);
    const lastSeen: number[] = stored ? JSON.parse(stored) : [];
    const newIds = currentElimIds.filter(id => !lastSeen.includes(id));

    if (newIds.length > 0) {
      setElimSummaryIds(newIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appReady, eliminationStatus]);

  // When NC modal closes, check if TS should follow
  const handleNcClose = useCallback(() => {
    setShowNcWinner(false);
    const addr = address?.toLowerCase() ?? "";
    const tsClaimed = addr && localStorage.getItem(TS_CLAIMED_KEY(addr)) === "true";
    if (tsFinalized && !tsClaimed) {
      setShowTsWinner(true);
    }
  }, [tsFinalized, address]);

  const handleLoadDone = useCallback(() => {
    setShowLoader(false);
    const accepted = localStorage.getItem("tos_accepted") === "true";
    if (accepted) {
      setAppReady(true);
    } else {
      setShowTerms(true);
    }
  }, []);

  const handleTermsAccept = useCallback(() => {
    setShowTerms(false);
    setAppReady(true);
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setMountedTabs(prev => (prev.has(tab) ? prev : new Set([...prev, tab])));
    localStorage.setItem(STORAGE_KEY, tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Helper: returns CSS to hide/show a tab without unmounting it
  const tabStyle = (tab: Tab): CSSProperties =>
    activeTab === tab ? {} : { display: "none" };

  return (
    <>
      {!!maintenanceMode && <MaintenanceBanner />}
      {elimSummaryIds.length > 0 && !maintenanceMode && (
        <EliminationSummaryModal
          newlyEliminatedIds={elimSummaryIds}
          onClose={() => {
            const allElim = Array.from(eliminationStatus as unknown as boolean[])
              .map((v, i) => (v ? i : -1))
              .filter(i => i > 0);
            localStorage.setItem(ELIM_SNAPSHOT_KEY, JSON.stringify(allElim));
            setElimSummaryIds([]);
          }}
        />
      )}
      {showLoader && (
        <LoadingScreen isReady={isDataReady} onDone={handleLoadDone} />
      )}
      {showTerms && (
        <TermsModal onAccept={handleTermsAccept} />
      )}
      {showNcWinner && ncFinalized && winningCountryId !== undefined && !isNcClaimed && (
        <NationsCupWinnerModal
          winningCountryId={Number(winningCountryId)}
          onClose={handleNcClose}
          onClaimed={handleNcClose}
        />
      )}
      {showTsWinner && tsFinalized && finalTopScorer && !isTsClaimed && (
        <TopScorerWinnerModal
          winnerName={finalTopScorer as string}
          onClose={() => setShowTsWinner(false)}
          onClaimed={() => setShowTsWinner(false)}
        />
      )}
      <div className="min-h-screen" style={{ visibility: appReady ? "visible" : "hidden" }}>
        <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
        <PrizeCounter activeTab={activeTab} />
        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Tabs are mounted on first visit and kept in the DOM (display:none) after that.
              This prevents NFT images and other assets from re-loading on every tab switch. */}
          {mountedTabs.has("nations")     && <div style={tabStyle("nations")}><NationsCupPage /></div>}
          {mountedTabs.has("groups")      && <div style={tabStyle("groups")}><GroupsPage /></div>}
          {mountedTabs.has("scorer")      && <div style={tabStyle("scorer")}><TopScorerPage /></div>}
          {mountedTabs.has("leaderboard") && <div style={tabStyle("leaderboard")}><LeaderboardPage /></div>}
          {mountedTabs.has("activity")    && <div style={tabStyle("activity")}><ActivityPage /></div>}
        </main>
      </div>
    </>
  );
}
