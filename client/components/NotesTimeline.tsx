"use client";

type Note = {
  startMs: number;
  durationMs: number;
  pitch: number;
};

function pitchToY(
  pitch: number,
  minPitch: number,
  maxPitch: number
) {
  if (minPitch === maxPitch) return 50;

  const t = (pitch - minPitch) / (maxPitch - minPitch);
  return 100 - t * 100; // 0–100%
}

function snapPitchRangeToC(minPitch: number, maxPitch: number) {
  const OCTAVE = 12;

  const snappedMin = Math.floor(minPitch / OCTAVE) * OCTAVE;
  const snappedMax = Math.ceil((maxPitch + 1) / OCTAVE) * OCTAVE;

  return {
    minPitch: snappedMin,
    maxPitch: snappedMax,
  };
}

export function NotesTimeline({
  notes,
  currentMs,
  micPitch,
}: {
  notes: Note[];
  currentMs: number;
  micPitch: number | null;
}) {
  const VIEW_MS = 20000;
  const PX_PER_MS = 0.6;
  const NOTE_HEIGHT_PERCENT = 14;

  const visibleNotes = notes.filter(
    n =>
      n.startMs - currentMs < VIEW_MS &&
      n.startMs + n.durationMs - currentMs > -VIEW_MS * 0.2
  );

  if (visibleNotes.length === 0) return null;

  const pitches = visibleNotes
    .map(n => n.pitch)
    .filter(Number.isFinite);

  if (pitches.length === 0) return null;

  const realMin = Math.min(...pitches);
  const realMax = Math.max(...pitches);

  const { minPitch, maxPitch } =
    snapPitchRangeToC(realMin, realMax);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "rgba(255,255,255,0.08)",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* LINIA TERAZ */}
      <div
        style={{
          position: "absolute",
          left: "20%",
          top: 0,
          bottom: 0,
          width: 2,
          background: "rgba(255,255,255,0.35)",
          boxShadow: "0 0 10px rgba(255,255,255,0.35)",
        }}
      />

      {visibleNotes.map((n, i) => {
        const leftMs = n.startMs - currentMs;
        const widthPx = Math.max(4, n.durationMs * PX_PER_MS);
        const yPercent = pitchToY(n.pitch, minPitch, maxPitch);

        const isActive =
          currentMs >= n.startMs &&
          currentMs <= n.startMs + n.durationMs;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `calc(20% + ${leftMs * PX_PER_MS}px)`,
              top: `calc(${yPercent}% - ${NOTE_HEIGHT_PERCENT / 2}%)`,
              width: widthPx,
              height: `${NOTE_HEIGHT_PERCENT}%`,
              borderRadius: 999,
              background: isActive
                ? "rgba(255,215,79,0.95)"
                : "rgba(200,200,200,0.55)",
              boxShadow: isActive
                ? "0 0 12px rgba(255,215,79,0.85)"
                : "none",
              transition: "background 60ms linear",
            }}
          />
        );
      })}

      {micPitch !== null && (
        <div
          style={{
            position: "absolute",
            left: "20%",
            top: `${pitchToY(
              micPitch,
              minPitch,
              maxPitch
            )}%`,
            transform: "translate(-50%, -50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "red",
            boxShadow: "0 0 12px rgba(255,0,0,0.9)",
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
