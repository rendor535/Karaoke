"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Pitchfinder from "pitchfinder";

type LiveState = "idle" | "selectingPlayer" | "playing" | "paused";

type LiveSession = {
  id: number;
  name: string;
  isActive: boolean;
  players: {
    id: number;
    nick: string;
    totalScore: number;
  }[];
  queue: QueueItem[];
};

type Player = {
  id: number;
  nick: string;
};

type QueueItem = {
  id: number;
  position: number;
  song: SongMedia;
};

type SongMedia = {
  id: number;
  title: string;
  artist: string;
  language: string;
  coverPath?: string | null | undefined;
  folderName: string;
  audioPath?: string | null;
  txtPath: string | null;
  videoPath: string | null;
};

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

type Note = {
  startMs: number;
  durationMs: number;
  pitch: number;
};

// spłaszczanie linijek do nutek
function flattenNotes(lines: LyricLine[]): Note[] {
  return lines.flatMap(line =>
    line.words.map(w => ({
      startMs: w.startMs,
      durationMs: w.durationMs,
      pitch: w.pitch,
    }))
  );
}


export default function LivePage() {
  const { sessionId } = useParams();
  const id = Number(sessionId);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [state, setState] = useState<LiveState>("idle");
  
  const [currentSong, setCurrentSong] = useState<QueueItem | null>(null);
  
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [videoError, setVideoError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLine, setCurrentLine] = useState<LyricLine | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  // stany do mikrofonu (z poradnika)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const [micPitch, setMicPitch] = useState<number | null>(null);
  const [micFreq, setMicFreq] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedPitchRef = useRef<number | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [currentSong]);

  useEffect(() => {
    const currentMs = currentTime * 1000;

    let active: LyricLine | null = null;

    for (const line of lyrics) {
      if (currentMs >= line.startMs) {
        active = line;
      } else {
        break;
      }
    }

    setCurrentLine(active);
  }, [currentTime, lyrics]);

  // listener fullscreen change
  useEffect(() => {
    const onFsChange = () => {
      const isFs = document.fullscreenElement === playerContainerRef.current;
      playerContainerRef.current?.style.setProperty(
        "aspect-ratio",
        isFs ? "auto" : "16 / 9"
      );
    };

    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // 60fps tick podczas grania
  useEffect(() => {
    if (state !== "playing") return;

    const tick = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state]);


  // mikrofon i pitch detection
  function hzToUltrastarPitch(freq: number) {
    // UltraStar: 0 = C4 = 261.63 Hz
    const C4 = 261.63;
    return Math.round(12 * Math.log2(freq / C4));
  }
  function listenPitch() {
    const analyser = analyserRef.current;
    const detector = detectorRef.current;

    if (!analyser || !detector) return;

    const buffer = new Float32Array(analyser.fftSize);

    const tick = () => {
      analyser.getFloatTimeDomainData(buffer);

      const freq = detector(buffer); // Hz lub null

      // debug 
      const rms = Math.sqrt(
        buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length
      );
      console.log("🎧 RMS:", rms.toFixed(4));
      console.log("🎼 raw freq:", freq);

      const alpha = 0.25;

      if (
        typeof freq === "number" &&
        freq >= 80 &&
        freq <= 400 &&
        rms >= 0.02
      ) {
        const pitch = hzToUltrastarPitch(freq);

        if (smoothedPitchRef.current === null) {
          smoothedPitchRef.current = pitch;
        } else {
          smoothedPitchRef.current =
            alpha * pitch + (1 - alpha) * smoothedPitchRef.current;
        }
        setMicFreq(freq);
        setMicPitch(Math.round(smoothedPitchRef.current));
      } 
      else {
        setMicFreq(null);
        setMicPitch(null);
      }
    };
    tick();
  }
  //debug
  function ultrastarPitchToNote(pitch: number) {
    // UltraStar: 0 = C4
    const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    const noteIndex = ((pitch % 12) + 12) % 12;
    const octave = 4 + Math.floor(pitch / 12);

    return `${NOTE_NAMES[noteIndex]}${octave}`;
  }

  async function startMicrophone() {

    if (audioCtxRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    });

    const audioCtx = new AudioContext();

    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();

    analyser.fftSize = 4096;

    source.connect(analyser);

    const detector = Pitchfinder.YIN({
      sampleRate: audioCtx.sampleRate,
      threshold: 0.1,
      probabilityThreshold: 0.1,
    });

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    micStreamRef.current = stream;
    detectorRef.current = detector;

    listenPitch();
  }

  async function load() { 
    const data = await api.getSession(id);
    setSession({
      ...data,
      queue: data.queue ?? [],
      players: data.players ?? [],
    });
  }

  async function selectSong(item: QueueItem) {
    if (state === "playing") return;

    // Zatrzymaj i wyczyść poprzedni playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    setVideoError(null);
    setCurrentTime(0);
    setDuration(0);

    // pobierz pełny queue item
    const fullItem = await api.getQueueItem(item.id);
    setCurrentSong(fullItem);
    
    // Załaduj lyrics PRZED pokazaniem modala wyboru gracza
    if (fullItem.song.txtPath) {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5159";

        const res = await fetch(
          `${backendUrl}/files/${fullItem.song.folderName}/${fullItem.song.txtPath}`
        );

        const txt = await res.text();
        const parsedLyrics = parseUltraStarWords(txt);
        setNotes(flattenNotes(parsedLyrics));
        // console.log("📝 Załadowano lyrics:", parsedLyrics.length, "linijek");
        setLyrics(parsedLyrics);
      } catch (err) {
        console.error("❌ Błąd ładowania lyrics:", err);
        setLyrics([]);
      }
    } else {
      console.log("⚠️ Brak txtPath dla tej piosenki");
      setLyrics([]);
    }

    setState("selectingPlayer");
  }


  function selectPlayer(player: Player) {
    setCurrentPlayer(player);
    setState("playing");

    setTimeout(() => {
      audioRef.current?.play();
      videoRef.current?.play();
      startMicrophone();
    }, 0);
  }

  function pauseSong() {
    audioRef.current?.pause();
    videoRef.current?.pause();
    setState("paused");
  }
  function resumeSong() {
    audioRef.current?.play();
    videoRef.current?.play();
    setState("playing");
  }

  function exitSong() {
    if (state !== "paused") return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    setVideoError(null);
    setState("idle");
    setCurrentSong(null);
    setCurrentPlayer(null);
    setLyrics([]);
    setCurrentLine(null);
    setCurrentTime(0);
    setDuration(0);
  }


  function enterFullscreen() {
    const el = playerContainerRef.current;
    if (!el) return;

    if (document.fullscreenElement === el) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }

  function buildCover(song: SongMedia) {
    if (!song.coverPath) return null;

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5159";

    return `${backendUrl}/files/${song.folderName}/${song.coverPath}`;
  }

  function buildVideo(song: SongMedia) {
    if (!song.videoPath) return null;

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5159";

    const url = `${backendUrl}/files/${song.folderName}/${song.videoPath}`;

    return url;
  }

  function buildAudio(song: SongMedia) {
    if (!song.audioPath) return null;

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5159";

    const url = `${backendUrl}/files/${song.folderName}/${song.audioPath}`;
    return url;
  }

  function getBackgroundStyle(song: SongMedia | null): React.CSSProperties {
    const base: React.CSSProperties = {
      backgroundColor: "#594b63ff",
    };

    if (!song) return base;

    if (song.coverPath && song.folderName) {
      const cover = buildCover(song);
      if (cover) {
        return {
          ...base,
          backgroundImage: `url(${cover})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        };
      }
    }

    return base;
  }

  function fmt(sec: number) {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  function parseUltraStarWords(txt: string): LyricLine[] {
    const offsetMs = 0; // stały offset, na razie 0
    const lines = txt.split("\n");

    let bpm = 120;
    let gap = 0;

    for (const l of lines) {
      if (l.startsWith("#BPM:")) bpm = Number(l.split(":")[1].replace(",", "."));
      if (l.startsWith("#GAP:")) gap = Number(l.split(":")[1].replace(",", "."));
    }

    const tickMs = 60000 / (bpm * 4);
    const result: LyricLine[] = [];

    let currentWords: LyricWord[] = [];
    let lineStartMs = 0;

    for (const l of lines) {
      if (l.startsWith(":") || l.startsWith("*")) {
        const parts = l.trim().split(/\s+/);

        const tick = Number(parts[1]);
        const length = Number(parts[2]);
        const pitch = Number(parts[3]);
        const text = parts.slice(4).join(" ").replace("~", "");

        const startMs = gap + tick * tickMs - offsetMs;
        const durationMs = length * tickMs - offsetMs;

        if (!currentWords.length) {
          lineStartMs = startMs;
        }

        currentWords.push({
          text,
          startMs,
          durationMs,
          pitch,
        });
      }

      if (l.startsWith("-") || l === "E") {
        if (currentWords.length) {
          result.push({
            startMs: lineStartMs,
            words: currentWords,
          });
        }

        currentWords = [];
      }
    }

    return result;
  }

  // kolorowanie lini
  function getFillPercent(
    word: LyricWord,
    currentMs: number
  ) {
    const elapsed = currentMs - word.startMs;
    if (elapsed <= 0) return 0;
    if (elapsed >= word.durationMs) return 1;
    return elapsed / word.durationMs;
  }

  // renderowanie słowa
  function RenderWord({
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
        {/* tło – biały tekst */}
        <span style={{ color: "#fff", opacity: 0.35 }}>
          {word.text}
        </span>

        {/* wypełnienie – animowane */}
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

  function pitchToY(
    pitch: number,
    minPitch: number,
    maxPitch: number
  ) {
    if (minPitch === maxPitch) return 50;

    const t = (pitch - minPitch) / (maxPitch - minPitch);
    return 100 - t * 100; // 0–100%
  }


  function snapPitchRangeToC(minPitch: number, maxPitch: number) { // skala po oktawach
    const OCTAVE = 12;

    const snappedMin =
      Math.floor(minPitch / OCTAVE) * OCTAVE;

    const snappedMax =
      Math.ceil((maxPitch + 1) / OCTAVE) * OCTAVE;

    return {
      minPitch: snappedMin,
      maxPitch: snappedMax,
    };
  }

  function NotesTimeline({
    notes,
    currentMs,
    micPitch
  }: {
    notes: Note[];
    currentMs: number;
    micPitch: number | null;
  }) {
    const VIEW_MS = 20000;
    const PX_PER_MS = 0.60;
    const HEIGHT = 100;
    
    const visibleNotes = notes.filter(
      n =>
        n.startMs - currentMs < VIEW_MS &&
        n.startMs + n.durationMs - currentMs > -VIEW_MS * 0.2
    );

    // const pitches = visibleNotes.map(n => n.pitch);
    const pitches = visibleNotes.map(n => n.pitch).filter(Number.isFinite);
    if (pitches.length === 0) return null;
    
    const realMin = Math.min(...pitches);
    const realMax = Math.max(...pitches);

    const { minPitch, maxPitch } =
      snapPitchRangeToC(realMin, realMax);

    if (visibleNotes.length === 0) return null;

    const NOTE_HEIGHT_PERCENT = 14; // % wysokości toru
    const micY =
      micPitch !== null
        ? pitchToY(micPitch, minPitch, maxPitch)
        : null;

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
            boxShadow: "0 0 10px rgba(255,255,255,0.35)",
            top: 0,
            bottom: 0,
            width: 2,
            background: "rgba(255,255,255,0.35)",
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
                borderRadius: "999px",
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
            left: "20%",               // NA LINII TERAZ
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

  // rozwiazanie na szybko następnej linijki
  const currentMs = currentTime * 1000;
  const nextLineText =
    lyrics.find(l => l.startMs > currentMs)
      ?.words.map(w => w.text).join(" ")
      ?? "";

  if (!session) return <p>Ładowanie LIVE…</p>;
  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* LEWA STRONA – PLAYER */}
      <div style={{ flex: 2, padding: 20 }}>
        <h2>{session.name}</h2>
        
        <div
          ref={playerContainerRef}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            color: "#fff",
            overflow: "hidden",
            ...getBackgroundStyle(currentSong?.song ?? null),
          }}
        >
          {/* VIDEO – tylko jeśli jest MP4 i nie ma błędu */}
          {currentSong?.song.videoPath && !videoError && (
            <video
              ref={videoRef}
              src={buildVideo(currentSong.song) ?? undefined}
              style={{
                filter: "brightness(0.6)",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                position: "absolute",
                inset: 0,
              }}
              controls={false}
              onError={(e) => {
                const err = e.currentTarget.error;
                let msg = "Unknown video error";

                if (err) {
                  if (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                    msg = "Unsupported video format (AVI etc.)";
                  } else if (err.code === MediaError.MEDIA_ERR_DECODE) {
                    msg = "Decode error";
                  }
                }

                console.warn("🎬 VIDEO FALLBACK:", msg);
                setVideoError(msg);
              }}
            />
          )}

          {/* AUDIO */}
          {currentSong && (
            <audio
              ref={audioRef}
              src={buildAudio(currentSong.song) ?? undefined}
              preload="auto"
            />
          )}

          {/* OVERLAY */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 16,
              pointerEvents: "none",
            }}
          >
            {/* TOP INFO */}
            <div>
              {currentSong && (
                <>
                  <div>🎵 {currentSong.song.artist} – {currentSong.song.title}</div>
                  <div>🎤 {currentPlayer?.nick}</div>
                </>
              )}
            </div>
            <div
              style={{
                height: "50%",
                minHeight: 160,
                maxHeight: 360,
                display: "flex",
                alignItems: "center",
              }}
            >
              <NotesTimeline
                notes={notes}
                currentMs={currentMs}
                micPitch={micPitch}
              />
            </div>
            {/* LYRICS */}
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
                  <div>
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
                  </div>
                ) : (
                  "\u00A0"
                )}
              </div>
            </div>

          </div>

          {/* FULLSCREEN */}
          <button
            onClick={enterFullscreen}
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              zIndex: 10,
            }}
          >
            ⛶
          </button>
        </div>

        {/* INFO POD PLAYEREM */}
        {currentSong && (
          <div>
            <strong>
              {currentSong.song.title}
            </strong>
            <div>
              {fmt(currentTime)} / {fmt(duration)}
            </div>
            <div style={{ marginTop: 10 }}>
              <div>Debug</div>
              <div>Lyrics: {lyrics.length} linijek</div>
              <div>Aktualny czas: {currentTime.toFixed(2)}s ({(currentTime * 1000).toFixed(0)}ms)</div>
              {lyrics.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 5 }}>
                  Następne: {lyrics.find(l => l.startMs > currentTime * 1000)?.words.map(w => w.text).join(" ") || "brak"}
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                🎤 Mic pitch:{" "}
                {micPitch !== null
                  ? `${micPitch} (${ultrastarPitchToNote(micPitch)})`
                  : "—"}
              </div>
              {micFreq !== null && (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  🎧 {micFreq.toFixed(1)} Hz
                </div>
              )}
            </div>
          </div>
        )}

        {state === "playing" && (
          <button onClick={pauseSong}>⏸ STOP</button>
        )}

        {state === "paused" && (
          <>
            <button onClick={resumeSong}>▶ Wznów</button>
            <button onClick={exitSong}>⏹ Wyjdź</button>
          </>
        )}
      </div>

      {/* PRAWA STRONA – KOLEJKA */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        <h3>Kolejka</h3>
        {session.queue.map((q) => (
          <div
            key={q.id}
            onClick={() => selectSong(q)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 8,
              cursor: state === "playing" ? "not-allowed" : "pointer",
              opacity: state === "playing" ? 0.5 : 1,
              borderBottom: "1px solid #eee",
            }}
          >
            {/* COVER */}
            <div style={{ width: 50 }}>
              {q.song.coverPath ? (
                <img
                  src={buildCover(q.song)!}
                  style={{ width: 50 }}
                />
              ) : (
                <div
                  style={{
                    width: 50,
                    height: 50,
                    background: "#ccc",
                  }}
                />
              )}
            </div>

            {/* META */}
            <div>
              <div>
                {q.position}. {q.song.artist}
              </div>
              <div style={{ fontSize: 12 }}>
                {q.song.title}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL – WYBÓR GRACZA */}
      {state === "selectingPlayer" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ background: "#fff", padding: 20 }}>
            <h3>Wybierz gracza</h3>

            {session.players.map((p) => (
              <button
                key={p.id}
                style={{ display: "block", margin: 5 }}
                onClick={() => selectPlayer(p)}
              >
                {p.nick}
              </button>
            ))}

            <button
              onClick={() => {
                setState("idle");
                setCurrentSong(null);
                setLyrics([]);
                setCurrentLine(null);
              }}
            >
              Anuluj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}