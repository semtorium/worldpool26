"use client";

import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
  isReady: boolean;
}

export function LoadingScreen({ onDone, isReady }: Props) {
  const [exiting, setExiting] = useState(false);
  const MIN_MS = 1800;

  useEffect(() => {
    const start = Date.now();

    function tryExit() {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_MS - elapsed);
      setTimeout(() => {
        setExiting(true);
        setTimeout(onDone, 550);
      }, wait);
    }

    if (isReady) {
      tryExit();
    }
    // If not ready yet, the second useEffect handles it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  useEffect(() => {
    // Absolute fallback: never block more than 5s
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onDone, 550);
    }, 5000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#050810",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.55s cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: exiting ? "none" : "all",
      }}
    >
      {/* Ambient background — same as site */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: [
          "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(124,58,237,0.13) 0%, transparent 60%)",
          "radial-gradient(ellipse 60% 40% at 80% 110%, rgba(0,255,136,0.07) 0%, transparent 50%)",
        ].join(","),
      }} />

      {/* Pulsing outer ring */}
      <div style={{
        position: "absolute",
        width: 640, height: 640,
        borderRadius: "50%",
        border: "1px solid rgba(0,255,136,0.06)",
        animation: "loadRing1 3s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        width: 440, height: 440,
        borderRadius: "50%",
        border: "1px solid rgba(251,191,36,0.07)",
        animation: "loadRing2 3s ease-in-out infinite 0.4s",
      }} />

      {/* Center content */}
      <div style={{ position: "relative", textAlign: "center", zIndex: 1 }}>
        {/* Logo mark */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 128, height: 128,
          borderRadius: "36px",
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.18)",
          marginBottom: 40,
          boxShadow: "0 0 80px rgba(251,191,36,0.1)",
          animation: "loadLogoPulse 2.5s ease-in-out infinite",
        }}>
          <span style={{ fontSize: 56 }}>🏆</span>
        </div>

        {/* Brand name */}
        <p style={{
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "#fbbf24",
          marginBottom: 8,
        }}>
          WorldPool26
        </p>
        <p style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "0.15em",
          color: "rgba(107,122,154,0.7)",
          textTransform: "uppercase",
          marginBottom: 56,
        }}>
          2026 World Cup
        </p>

        {/* Progress bar */}
        <div style={{
          width: 320,
          height: 4,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 99,
          overflow: "hidden",
          margin: "0 auto",
        }}>
          <div style={{
            height: "100%",
            background: "linear-gradient(90deg, #00ff88, #7c3aed)",
            borderRadius: 99,
            animation: `loadBar ${MIN_MS / 1000 + 0.3}s cubic-bezier(0.4,0,0.6,1) forwards`,
            boxShadow: "0 0 16px rgba(0,255,136,0.6)",
          }} />
        </div>
      </div>

      <style>{`
        @keyframes loadRing1 {
          0%,100% { transform: scale(1);    opacity: 0.5; }
          50%      { transform: scale(1.06); opacity: 1;   }
        }
        @keyframes loadRing2 {
          0%,100% { transform: scale(1);    opacity: 0.4; }
          50%      { transform: scale(1.08); opacity: 0.9; }
        }
        @keyframes loadLogoPulse {
          0%,100% { box-shadow: 0 0 40px rgba(251,191,36,0.10); }
          50%      { box-shadow: 0 0 60px rgba(251,191,36,0.25); }
        }
        @keyframes loadBar {
          0%   { width: 0%; }
          60%  { width: 75%; }
          85%  { width: 90%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
