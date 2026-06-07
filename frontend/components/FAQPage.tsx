"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

interface FAQSection {
  title: string;
  emoji: string;
  color: string;
  items: FAQItem[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    title: "About WorldPool26",
    emoji: "🌍",
    color: "#00ff88",
    items: [
      {
        q: "What is WorldPool26?",
        a: "WorldPool26 is a Web3 prediction platform built on Base for the 2026 FIFA World Cup. It has two games: the Nations Cup, where you mint country NFTs and win if your country becomes champion, and Top Scorer, where you vote for the player you think will score the most goals. Both pools are funded by participants and paid out to winners automatically via smart contract.",
      },
      {
        q: "Which blockchain does it run on?",
        a: "WorldPool26 runs on Base, an EVM-compatible Ethereum Layer 2 blockchain built by Coinbase. Transactions are fast, cheap, and settled on Ethereum. You can connect with any standard EVM wallet — MetaMask, Coinbase Wallet, Rabby, or any injected wallet.",
      },
      {
        q: "Is WorldPool26 safe to use?",
        a: "The smart contract is deployed on-chain and all logic is transparent and verifiable. Prize pools are locked in the contract and can only be distributed by the finalization functions. No one — including the dev — can withdraw the prize pools before the tournament ends. The contract does include a dev fee (20% on each mint/ticket goes to dev wallet instantly; 5% fee at settlement) which is disclosed upfront.",
      },
      {
        q: "Is this gambling?",
        a: "WorldPool26 is designed as an entertainment platform for football fans — not a gambling service. You're minting digital collectibles (NFTs) and voting on a real-world sporting event. That said, there is a financial element: you spend ETH and may or may not receive a return. Participate only with what you're comfortable losing.",
      },
    ],
  },
  {
    title: "Nations Cup",
    emoji: "🏆",
    color: "#fbbf24",
    items: [
      {
        q: "How does the Nations Cup work?",
        a: (
          <>
            <p>Each of the 48 countries competing in the 2026 World Cup has its own NFT on the platform. You mint NFTs for whichever countries you believe will go far.</p>
            <p className="mt-2">When the tournament ends, the smart contract owner calls <strong>finalizeNationsCup</strong> with the winning country ID. All holders of that country's NFT split <strong>95% of the total Nations Cup prize pool</strong> — proportional to how many NFTs they hold versus the total supply of that country.</p>
            <p className="mt-2">Example: If France wins and 1,000 France NFTs exist, and you hold 5 of them, you receive 0.5% of the prize pool.</p>
          </>
        ),
      },
      {
        q: "Is there a limit to how many NFTs I can mint?",
        a: "No. There is no per-wallet mint limit. You can mint as many NFTs as you like for any country. The system is pro-rata — the more you hold relative to total supply, the bigger your share. But since anyone else can also mint more, the percentage is not fixed until the tournament ends.",
      },
      {
        q: "What happens when a country gets eliminated?",
        a: "When a country is eliminated from the tournament, it gets marked on-chain via eliminateCountries(). The NFT card shows an 'Eliminated' badge. However, the main prize pool is ONE pool — eliminations do not redistribute funds. The entire pool accumulates throughout the tournament and only flows to the champion's NFT holders at the end.",
      },
      {
        q: "How is my Nations Cup payout calculated?",
        a: (
          <>
            <p>Your reward = <strong>(your NFTs of winning country ÷ total supply of winning country) × 95% of total Nations Cup pool</strong>.</p>
            <p className="mt-2">The 95% is the winner share — 5% is a protocol fee taken at settlement. The dev also takes 20% of each mint upfront (before it enters the pool), so the pool you see is already after that deduction.</p>
          </>
        ),
      },
      {
        q: "When can I claim my Nations Cup reward?",
        a: "You can claim immediately after the tournament is finalized on-chain. A winner modal will appear on your next visit if you hold winning NFTs. Unclaimed rewards remain in the contract for 30 days — after that the owner can withdraw them. Make sure to claim within 30 days of the tournament ending.",
      },
      {
        q: "Can I trade my country NFTs?",
        a: "Yes. Country NFTs are standard ERC-1155 tokens and will be visible on OpenSea (Base is supported). After the tournament starts and minting closes, you can buy and sell them on secondary markets. The value of a country's NFT typically rises as it advances in the tournament.",
      },
    ],
  },
  {
    title: "Top Scorer",
    emoji: "⚽",
    color: "#8b5cf6",
    items: [
      {
        q: "How does the Top Scorer pool work?",
        a: "You buy voting tickets (0.0018 ETH each). Each ticket gives you 1 vote. You vote for the player you think will be the tournament's top scorer. When the tournament ends and the top scorer is announced on-chain, everyone who voted for the correct player splits 95% of the Top Scorer prize pool — proportional to how many votes they cast for the winner.",
      },
      {
        q: "Can I split my votes across multiple players?",
        a: "Yes. Each ticket equals one vote and you can vote for different players in separate transactions. If you have 10 tickets, you could cast 7 votes for Mbappé and 3 for Haaland across two separate vote transactions.",
      },
      {
        q: "What if I buy tickets but never vote?",
        a: "After the Top Scorer is finalized, if you have unused (unvoted) tickets, you can call refundUnusedTickets() and get back 80% of what you paid per unused ticket. The 20% dev fee is non-refundable since it was taken at purchase.",
      },
      {
        q: "What if no one voted for the actual top scorer?",
        a: "If the winning player has zero votes (either no one voted for them, or the player is not in the list), no one can claim rewards. The prize pool sits in the contract for 30 days, after which the owner can withdraw it. The contract owner can also finalize with any string — including a write-in name not on the default list.",
      },
      {
        q: "How is my Top Scorer payout calculated?",
        a: (
          <>
            <p>Your reward = <strong>(your votes for winner ÷ total votes for winner) × 95% of Top Scorer pool at finalization</strong>.</p>
            <p className="mt-2">Note: the pool at finalization excludes the ETH reserved for unused ticket refunds, so only the 'active' portion is distributed.</p>
          </>
        ),
      },
    ],
  },
  {
    title: "Pricing & Fees",
    emoji: "💰",
    color: "#00ff88",
    items: [
      {
        q: "How much does it cost?",
        a: (
          <ul className="space-y-1 list-none">
            <li>🌍 <strong>Country NFT mint:</strong> 0.0022 ETH each</li>
            <li>🎟️ <strong>Top Scorer ticket:</strong> 0.0018 ETH each</li>
            <li>Plus a small Base gas fee (typically under $0.01) per transaction.</li>
          </ul>
        ),
      },
      {
        q: "Where does the fee go?",
        a: (
          <>
            <p><strong>At purchase:</strong> 80% goes into the prize pool, 20% goes instantly to the dev wallet.</p>
            <p className="mt-2"><strong>At settlement:</strong> 95% of the pool goes to winners, 5% is a protocol fee to the dev.</p>
            <p className="mt-2">This structure funds ongoing development and keeps the platform running for future tournaments.</p>
          </>
        ),
      },
      {
        q: "What happens to unclaimed prizes?",
        a: "If a winner does not claim within 30 days after finalization, the owner can call withdrawUnclaimedNationsCup() or withdrawUnclaimedTopScorer() to recover those funds. Always claim your rewards within 30 days of the tournament ending.",
      },
    ],
  },
  {
    title: "Wallet & Technical",
    emoji: "🔗",
    color: "#8b5cf6",
    items: [
      {
        q: "Which wallet do I need?",
        a: "Any standard EVM wallet works — MetaMask, Coinbase Wallet, Rabby, or any injected wallet. Simply click 'Connect Wallet' and approve the connection. The admin panel (/admin) also uses standard EIP-6963 wallet discovery.",
      },
      {
        q: "I connected my wallet but nothing is happening. What do I do?",
        a: "Make sure you're on the Base Sepolia Testnet (Chain ID: 84532). The app will attempt to switch networks automatically. If it doesn't, add Base Sepolia manually in your wallet settings: RPC URL https://sepolia.base.org, Chain ID 84532, symbol ETH. Also make sure you have some testnet ETH for gas.",
      },
      {
        q: "What happens to the NFTs after the tournament ends?",
        a: "NFTs remain on-chain forever as collectibles. After the tournament, country cards display a 'Trade on OpenSea' button so you can list or sell them on secondary markets. Winning country NFTs may carry historical value as World Cup memorabilia.",
      },
      {
        q: "Is the contract open source?",
        a: "The frontend is fully open source on GitHub (github.com/semtorium/worldpool26). The smart contract is verified on Basescan, making all logic publicly readable and auditable.",
      },
    ],
  },
];

function AccordionItem({ item, isOpen, onToggle, accentColor }: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: isOpen ? `rgba(${accentColor === "#00ff88" ? "0,255,136" : accentColor === "#fbbf24" ? "251,191,36" : "139,92,246"},0.04)` : "rgba(255,255,255,0.015)",
        border: `1px solid ${isOpen ? accentColor + "33" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-4 text-left"
      >
        <span className="font-bold text-white text-sm leading-snug">{item.q}</span>
        <ChevronDown
          size={18}
          style={{
            color: isOpen ? accentColor : "#6b7a9a",
            flexShrink: 0,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.25s ease, color 0.2s ease",
          }}
        />
      </button>

      <div
        style={{
          maxHeight: isOpen ? "600px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div
          className="px-4 pb-4 text-sm leading-relaxed space-y-1"
          style={{ color: "rgba(180,190,210,0.85)", borderTop: `1px solid rgba(255,255,255,0.05)`, paddingTop: "12px" }}
        >
          {item.a}
        </div>
      </div>
    </div>
  );
}

export function FAQPage() {
  const [openKey, setOpenKey] = useState<string | null>("0-0");

  const toggle = (key: string) => setOpenKey(prev => prev === key ? null : key);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="text-center pt-2 pb-4">
        <div
          className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full"
          style={{ background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.18)" }}
        >
          <span className="text-xs font-black tracking-widest uppercase" style={{ color: "#00ff88" }}>
            Help Center
          </span>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Frequently Asked Questions</h1>
        <p className="text-sm" style={{ color: "#6b7a9a" }}>
          Everything you need to know about WorldPool26 and the 2026 FIFA World Cup prediction games.
        </p>
      </div>

      {/* Sections */}
      {FAQ_SECTIONS.map((section, si) => (
        <div key={si}>
          {/* Section header */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
              style={{ background: `${section.color}18`, border: `1px solid ${section.color}33` }}
            >
              {section.emoji}
            </div>
            <h2 className="font-black text-white text-base tracking-wide">{section.title}</h2>
            <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${section.color}33, transparent)` }} />
          </div>

          {/* Accordion items */}
          <div className="space-y-2">
            {section.items.map((item, ii) => {
              const key = `${si}-${ii}`;
              return (
                <AccordionItem
                  key={key}
                  item={item}
                  isOpen={openKey === key}
                  onToggle={() => toggle(key)}
                  accentColor={section.color}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Footer CTA */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: "rgba(0,255,136,0.04)",
          border: "1px solid rgba(0,255,136,0.15)",
        }}
      >
        <p className="text-sm font-semibold text-white mb-1">Still have questions?</p>
        <p className="text-xs" style={{ color: "#6b7a9a" }}>
          Join the community or reach out via{" "}
          <a
            href="https://x.com/worldpool26"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold"
            style={{ color: "#00ff88" }}
          >
            X (Twitter)
          </a>{" "}
          — we're happy to help.
        </p>
      </div>
    </div>
  );
}
