"use client";

type LyricWord = {
  text: string;
  startMs: number;
  durationMs: number;
  pitch: number;
};

function getFillPercent(word: LyricWord, currentMs: number) {
  const elapsed = currentMs - word.startMs;
  if (elapsed <= 0) return 0;
  if (elapsed >= word.durationMs) return 1;
  return elapsed / word.durationMs;
}

export function RenderWord({
  word,
  currentMs,
}: {
  word: LyricWord;
  currentMs: number;
}) {
  const fill = getFillPercent(word, currentMs);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        marginRight: 6,
      }}
    >
      {/* tło */}
      <span style={{ color: "#fff", opacity: 0.35 }}>
        {word.text}
      </span>

      {/* wypełnienie */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          color: "#ffd54f",
          whiteSpace: "nowrap",
          overflow: "hidden",
          width: `${fill * 100}%`,
          transition: "width 50ms linear",
        }}
      >
        {word.text}
      </span>
    </span>
  );
}
