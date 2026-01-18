"use client";

import { RenderWord } from "@/components/RenderWord";

type LyricWord = {
  text: string;
  startMs: number;
  durationMs: number;
  pitch: number;
};

type LyricLine = {
  startMs: number;
  words: LyricWord[];
};

export function LyricsOverlay({
  currentLine,
  nextLineText,
  currentMs,
}: {
  currentLine: LyricLine | null;
  nextLineText: string;
  currentMs: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        paddingBottom: 24,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: "90%",
          padding: "12px 18px",
          borderRadius: 14,
          background: currentLine ? "rgba(0,0,0,0.55)" : "transparent",
          backdropFilter: currentLine ? "blur(6px)" : "none",
          WebkitBackdropFilter: currentLine ? "blur(6px)" : "none",
          textAlign: "center",
          fontSize: 36,
          fontWeight: 800,
          lineHeight: 1.2,
          letterSpacing: 0.2,
          color: "#fff",
          textShadow: "0 2px 10px rgba(0,0,0,0.9)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {currentLine ? (
          <>
            {/* AKTUALNA LINIA */}
            <div>
              {currentLine.words.map((w, i) => (
                <RenderWord
                  key={i}
                  word={w}
                  currentMs={currentMs}
                />
              ))}
            </div>

            {/* NASTĘPNA LINIA */}
            <div
              style={{
                marginTop: 10,
                fontSize: 18,
                fontWeight: 600,
                color: "rgba(255,255,255,0.45)",
                textShadow: "0 2px 8px rgba(0,0,0,0.85)",
              }}
            >
              {nextLineText || "\u00A0"}
            </div>
          </>
        ) : (
          "\u00A0"
        )}
      </div>
    </div>
  );
}
