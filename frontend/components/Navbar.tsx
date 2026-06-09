"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAccount, useConnect } from "wagmi";
import { LangSwitcher } from "./LangSwitcher";
import { ProfileDrawer } from "./ProfileDrawer";
import { UsernameModal } from "./UsernameModal";
import { useLang } from "@/lib/LanguageContext";
import { useUsername } from "@/lib/useUsername";
import { shortenAddress } from "@/lib/config";
import { Wallet, ChevronDown } from "lucide-react";

export type Tab = "nations" | "scorer" | "groups" | "leaderboard" | "activity";

interface NavbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

function AddressAvatar({ address }: { address: string }) {
  const colors = [
    ["#0052FF", "#2563EB"],
    ["#f59e0b", "#ef4444"],
    ["#3b82f6", "#2563EB"],
    ["#10b981", "#06b6d4"],
  ];
  const idx    = parseInt(address.slice(2, 4), 16) % colors.length;
  const [c1, c2] = colors[idx];
  return (
    <div className="w-8 h-8 rounded-xl shrink-0"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
  );
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors }  = useConnect();
  const login = () => connect({ connector: connectors[0] });
  const { t }                    = useLang();
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const didPromptRef = useRef(false);

  const { username } = useUsername(address);

  // Show username modal once per session when wallet connects and no username set
  useEffect(() => {
    if (isConnected && address && !didPromptRef.current) {
      // Small delay so the wallet connect animation settles
      const t = setTimeout(() => {
        const stored = localStorage.getItem(`wp26_uname_${address.toLowerCase()}`);
        if (stored === null) {
          // Never set (not even skipped) → prompt
          setShowUsernameModal(true);
        }
        didPromptRef.current = true;
      }, 600);
      return () => clearTimeout(t);
    }
    if (!isConnected) {
      didPromptRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: "nations",     label: t.tab_nations,     emoji: "🌍" },
    { id: "scorer",      label: t.tab_scorer,      emoji: "⚽" },
    { id: "groups",      label: t.tab_groups,      emoji: "📋" },
    { id: "leaderboard", label: t.tab_leaderboard, emoji: "🏆" },
    { id: "activity",    label: t.tab_activity,    emoji: "📡" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full"
        style={{ background: "rgba(6,9,20,0.75)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,82,255,0.18)", touchAction: "manipulation" }}>
        <div className="max-w-7xl mx-auto px-4">

          {/* Top Row */}
          <div className="flex items-center justify-between h-16 gap-3">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 no-underline"
              style={{ textDecoration: "none" }}>
              <span className="font-black text-white tracking-tight"
                style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: "clamp(0.9rem,3vw,1.05rem)" }}>
                <span style={{ color: "#60A5FA" }}>World</span>Pool
                <span style={{ color: "rgba(255,255,255,0.42)", fontWeight: 700 }}> 26</span>
              </span>
            </Link>

            {/* Right: Lang + Wallet/Profile */}
            <div className="flex items-center gap-2 shrink-0">
              <LangSwitcher />

              {isConnected && address ? (
                /* Profile Button */
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                  style={{ background: "rgba(0,82,255,0.07)", border: "1px solid rgba(0,82,255,0.18)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(0,82,255,0.40)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(0,82,255,0.18)")}>
                  <AddressAvatar address={address} />
                  <span className="text-sm font-semibold text-white hidden sm:block max-w-[120px] truncate"
                    style={{ fontFamily: username ? "inherit" : "monospace" }}>
                    {username || shortenAddress(address)}
                  </span>
                  <ChevronDown size={14} style={{ color: "#6b7a9a" }} />
                </button>
              ) : (
                /* Connect Button — opens AGW native modal */
                <button
                  onClick={() => login()}
                  className="btn-neon flex items-center gap-2 text-sm px-4 py-2">
                  <Wallet size={15} />
                  <span className="hidden sm:block">{t.connect}</span>
                </button>
              )}
            </div>
          </div>

          {/* Tabs — floating dock */}
          <div className="flex justify-center pb-3">
            <nav
              className="flex items-center p-1 gap-0.5 rounded-2xl"
              style={{
                background: "rgba(6,9,25,0.70)",
                border: "1px solid rgba(0,82,255,0.14)",
                backdropFilter: "blur(14px)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className="nav-dock-btn relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200"
                    data-active={isActive ? "true" : "false"}
                    style={isActive ? {
                      background: "linear-gradient(135deg, #0052FF 0%, #2563EB 100%)",
                      color: "#fff",
                      boxShadow: "0 0 20px rgba(0,82,255,0.35), 0 2px 10px rgba(0,0,0,0.45)",
                      border: "1px solid rgba(0,82,255,0.50)",
                      textShadow: "0 0 12px rgba(96,165,250,0.5)",
                      cursor: "pointer",
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                    } : {
                      color: "rgba(255,255,255,0.38)",
                      border: "1px solid transparent",
                      cursor: "pointer",
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    <span className="text-base leading-none">{tab.emoji}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                    {isActive && (
                      <span
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{
                          background: "linear-gradient(135deg, rgba(0,82,255,0.18), rgba(37,99,235,0.10))",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Profile Drawer */}
      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSetUsername={() => { setDrawerOpen(false); setShowUsernameModal(true); }}
      />

      {/* Username Modal — shown once on first connect */}
      {showUsernameModal && address && (
        <UsernameModal
          address={address}
          onDone={() => setShowUsernameModal(false)}
        />
      )}
    </>
  );
}
