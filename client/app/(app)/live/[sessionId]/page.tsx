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



type LyricLine = {
  startMs: number;
  text: string;
};

export default function LivePage() {
  const { sessionId } = useParams();
  const id = Number(sessionId);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [state, setState] = useState<LiveState>("idle");
  
  const [currentSong, setCurrentSong] = useState<QueueItem | null>(null);
  
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // not used yet
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLine, setCurrentLine] = useState("");

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

    const fullItem = await api.getQueueItem(item.id);
    setVideoError(null);
    setCurrentSong(fullItem); // ⬅️ TU JUŻ JEST videoPath
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
  }


  function enterFullscreen() {
    videoRef.current?.requestFullscreen();
  }

  function buildCover(song: SongMedia) {
    if (!song.coverPath) return null;

    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5159";

    return `${backendUrl}/files/${song.folderName}/${song.coverPath}`;
  }
  // video + audio
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

  // lyrics
  // parser
  function parseUltraStar(txt: string): LyricLine[] {
    return txt
      .split("\n")
      .filter(l => l.startsWith(":"))
      .map(l => {
        // : 45 3 52 To
        const parts = l.split(" ");
        const start = Number(parts[1]);
        const text = parts.slice(4).join(" ").trim();

        return {
          startMs: start * 10,
          text,
        };
      });
  }
  if (!session) return <p>Ładowanie LIVE…</p>;
  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* LEWA STRONA – PLAYER */}
      <div style={{ flex: 2, padding: 20 }}>
        <h2>{session.name}</h2>

        <div
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

            {/* LYRICS PLACEHOLDER */}
            <div style={{ textAlign: "center", fontSize: 24 }}>
              {currentLine || "♪ ♪ ♪"}
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
              <em>[lyrics placeholder]</em>
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