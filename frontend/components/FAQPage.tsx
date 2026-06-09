"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { getFaqSections, type FaqItem } from "@/lib/faqContent";

/** Accent background helper — maps hex colour to a dim rgba tint */
function dimBg(hex: string) {
  if (hex === "#0052FF") return "rgba(0,82,255,0.04)";
  if (hex === "#fbbf24") return "rgba(251,191,36,0.04)";
  return "rgba(37,99,235,0.04)";
}
function dimBorder(hex: string) {
  if (hex === "#0052FF") return "rgba(0,82,255,0.15)";
  if (hex === "#fbbf24") return "rgba(251,191,36,0.25)";
  return "rgba(37,99,235,0.25)";
}

function AccordionItem({ item, isOpen, onToggle, accentColor }: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: isOpen ? dimBg(accentColor) : "rgba(255,255,255,0.015)",
        border: `1px solid ${isOpen ? dimBorder(accentColor) : "rgba(255,255,255,0.06)"}`,
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
          maxHeight: isOpen ? "800px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div
          className="px-4 pb-4 text-sm leading-relaxed whitespace-pre-line"
          style={{
            color: "rgba(180,190,210,0.85)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "12px",
          }}
        >
          {item.a}
        </div>
      </div>
    </div>
  );
}

export function FAQPage() {
  const { t, lang } = useLang();
  const [openKey, setOpenKey] = useState<string | null>("0-0");
  const sections = getFaqSections(lang);

  const toggle = (key: string) => setOpenKey(prev => prev === key ? null : key);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="text-center pt-2 pb-4">
        <div
          className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full"
          style={{ background: "rgba(0,82,255,0.07)", border: "1px solid rgba(0,82,255,0.18)" }}
        >
          <span className="text-xs font-black tracking-widest uppercase" style={{ color: "#0052FF" }}>
            {t.faq_badge}
          </span>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">{t.faq_title}</h1>
        <p className="text-sm" style={{ color: "#6b7a9a" }}>
          {t.faq_subtitle}
        </p>
      </div>

      {/* Sections */}
      {sections.map((section, si) => (
        <div key={si}>
          {/* Section header */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
              style={{
                background: `${section.color}18`,
                border: `1px solid ${section.color}33`,
              }}
            >
              {section.emoji}
            </div>
            <h2 className="font-black text-white text-base tracking-wide">
              {t[section.titleKey as keyof typeof t] ?? section.titleKey}
            </h2>
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
          background: "rgba(0,82,255,0.04)",
          border: "1px solid rgba(0,82,255,0.15)",
        }}
      >
        <p className="text-sm font-semibold text-white mb-1">{t.faq_cta_title}</p>
        <p className="text-xs" style={{ color: "#6b7a9a" }}>
          {t.faq_cta_body.split("{link}")[0]}
          <a
            href="https://x.com/worldpool26"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold"
            style={{ color: "#0052FF" }}
          >
            X (Twitter)
          </a>
          {t.faq_cta_body.split("{link}")[1]}
        </p>
      </div>
    </div>
  );
}
