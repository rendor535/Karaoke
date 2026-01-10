"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

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
};

type LyricLine = {
  startMs: number;
  words: LyricWord[];
};

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
        console.log("📝 Załadowano lyrics:", parsedLyrics.length, "linijek");
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

    console.log("🎬 VIDEO SRC =", url);
    return url;
  }

  function buildAudio(song: SongMedia) {
    if (!song.audioPath) return null;

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5159";

    const url = `${backendUrl}/files/${song.folderName}/${song.audioPath}`;
    console.log("🔊 AUDIO SRC =", url);
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
                    {currentLine.words.map((w, i) => (
                      <RenderWord
                        key={i}
                        word={w}
                        currentMs={currentTime * 1000}
                      />
                    ))}
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
              <div>Lyrics: {lyrics.length} linijek</div>
              <div>Aktualny czas: {currentTime.toFixed(2)}s ({(currentTime * 1000).toFixed(0)}ms)</div>
              {lyrics.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 5 }}>
                  Następne: {lyrics.find(l => l.startMs > currentTime * 1000)?.words.map(w => w.text).join(" ") || "brak"}
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