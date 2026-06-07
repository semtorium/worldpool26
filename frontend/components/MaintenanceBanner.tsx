"use client";

import { useEffect } from "react";
import { useLang } from "@/lib/LanguageContext";

export function MaintenanceBanner() {
  const { t } = useLang();

  // Lock body scroll while maintenance overlay is visible
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: "rgba(5,8,16,0.97)", backdropFilter: "blur(12px)" }}
    >
      {/* Animated background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            width: 480, height: 480,
            border: "1px solid rgba(251,191,36,0.08)",
            animation: "ping 3s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 320, height: 320,
            border: "1px solid rgba(251,191,36,0.12)",
            animation: "ping 3s cubic-bezier(0,0,0.2,1) infinite 1s",
          }}
        />
      </div>

      {/* Card */}
      <div
        className="glass-card relative text-center max-w-md w-full"
        style={{
          padding: "48px 36px",
          borderColor: "rgba(251,191,36,0.3)",
          boxShadow: "0 0 80px rgba(251,191,36,0.1), 0 0 160px rgba(251,191,36,0.04)",
        }}
      >
        <div className="text-5xl mb-5">🔧</div>

        <h2 className="text-2xl font-black text-white mb-3">
          {t.maint_title}
        </h2>

        <p className="text-sm mb-2" style={{ color: "#6b7a9a", lineHeight: 1.7 }}>
          {t.maint_body}
        </p>
        <p className="text-sm" style={{ color: "#6b7a9a", lineHeight: 1.7 }}>
          {t.maint_safe}
        </p>

        {/* Animated dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: 8, height: 8,
                background: "#fbbf24",
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
