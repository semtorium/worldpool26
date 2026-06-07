"use client";

import { useState } from "react";
import Image from "next/image";
import { type Country } from "@/lib/countries";
import { CountryMintModal } from "./CountryMintModal";

interface CountryCardProps {
  country: Country;
  isWinner?: boolean;
  isEliminated?: boolean;
  mintClosed?: boolean;
  openSeaUrl?: string;
}

export function CountryCard({ country, isWinner, isEliminated, mintClosed, openSeaUrl }: CountryCardProps) {
  const [hovered, setHovered]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const nftImageSrc = `/nfts/${country.id}-${country.id}.png`;

  // Hover → preload the modal NFT image so it's ready when user clicks
  const handleMouseEnter = () => {
    setHovered(true);
    const img = new window.Image();
    img.src = `/nfts/${country.id}.png`;
  };

  return (
    <>
      {modalOpen && (
        <CountryMintModal
          country={country}
          isWinner={isWinner}
          isEliminated={isEliminated}
          mintClosed={mintClosed}
          openSeaUrl={openSeaUrl}
          onClose={() => setModalOpen(false)}
        />
      )}

      <div
        className="flag-card"
        onClick={() => setModalOpen(true)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
        style={{
          cursor: "pointer",
          opacity: isEliminated ? 0.35 : 1,
          filter: isEliminated ? "grayscale(0.8)" : "none",
        }}
      >
        {/* NFT / Flag Image */}
        <Image
          src={nftImageSrc}
          alt={country.name}
          fill
          className="object-cover transition-transform duration-300"
          style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
          unoptimized
        />

        <div className="overlay" />

        {/* Winner badge */}
        {isWinner && (
          <div className="absolute top-2 left-2 right-2 flex justify-center">
            <span className="text-xs font-black px-2 py-1 rounded-full"
              style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)", color: "#fbbf24" }}>
              🏆
            </span>
          </div>
        )}

        {/* Eliminated badge */}
        {isEliminated && (
          <div className="absolute top-2 left-2 right-2 flex justify-center">
            <span className="text-xs font-black px-2 py-1 rounded-full"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }}>
              ✕
            </span>
          </div>
        )}

        {/* Country name — always visible at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="text-white font-bold text-sm leading-tight truncate text-center"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
            {country.name}
          </p>
        </div>

        {/* Hover hint */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,255,136,0.06)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s",
            borderRadius: "inherit",
            pointerEvents: "none",
          }}
        />
      </div>
    </>
  );
}
