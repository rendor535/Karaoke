"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import Pitchfinder from "pitchfinder";

import { LyricsOverlay } from "@/components/LyricsOverlay";
import { NotesTimeline } from "@/components/NotesTimeline";
import { SelectPlayerModal } from "@/components/SelectPlayerModal";
import { QueueList } from "@/components/QueueList";

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
      // console.log("🎧 RMS:", rms.toFixed(4));
      // console.log("🎼 raw freq:", freq);

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
      // startMicrophone(); // wyłączam bo nie dziala TODO dodanie mikrofonu
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

  // rozwiazanie na szybko następnej linijki
  const currentMs = currentTime * 1000;
  const nextLineText =
    lyrics.find(l => l.startMs > currentMs)
      ?.words.map(w => w.text).join(" ")
      ?? "";

  if (!session) return <p>Ładowanie LIVE…</p>;
  return (
    <div className="live-page">
      {/* LEWA STRONA – PLAYER */}
      <div className="live-player">
        <h2>{session.name}</h2>

        <div
          ref={playerContainerRef}
          className="player-container"
          style={getBackgroundStyle(currentSong?.song ?? null)}
        >
          {/* VIDEO – tylko jeśli jest MP4 i nie ma błędu */}
          {currentSong?.song.videoPath && !videoError && (
            <video
              ref={videoRef}
              src={buildVideo(currentSong.song) ?? undefined}
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
          <div className="player-overlay">
            {/* TOP INFO */}
            <div>
              {currentSong && (
                <>
                  <div>
                    🎵 {currentSong.song.artist} – {currentSong.song.title}
                  </div>
                  <div>🎤 {currentPlayer?.nick}</div>
                </>
              )}
            </div>
            
            {/* LYRICS */}
            <LyricsOverlay
              currentLine={currentLine}
              nextLineText={nextLineText}
              currentMs={currentMs}
            />

            {/* NOTES */}
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


          </div>

          {/* FULLSCREEN */}
          <button onClick={enterFullscreen} className="fullscreen-btn">
            ⛶
          </button>
        </div>

        {/* INFO POD PLAYEREM */}
        {currentSong && (
          <div className="live-info">
            <strong>{currentSong.song.title}</strong>

            <div>
              {fmt(currentTime)} / {fmt(duration)}
            </div>

            <div style={{ marginTop: 10 }}>
              <div>Debug</div>
              <div>Lyrics: {lyrics.length} linijek</div>
              <div>
                Aktualny czas: {currentTime.toFixed(2)}s (
                {(currentTime * 1000).toFixed(0)}ms)
              </div>

              {lyrics.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 5 }}>
                  Następne:{" "}
                  {lyrics.find(l => l.startMs > currentTime * 1000)
                    ?.words.map(w => w.text)
                    .join(" ") || "brak"}
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

        {/* CONTROLS */}
        {state === "playing" && (
          <div className="live-controls">
            <button onClick={pauseSong}>⏸ STOP</button>
          </div>
        )}

        {state === "paused" && (
          <div className="live-controls">
            <button onClick={resumeSong}>▶ Wznów</button>
            <button onClick={exitSong}>⏹ Wyjdź</button>
          </div>
        )}
      </div>

      {/* PRAWA STRONA – KOLEJKA */}
      <div className="live-queue">
        <QueueList
          queue={session.queue}
          disabled={state === "playing"}
          onSelect={selectSong}
        />
      </div>

      {/* MODAL – WYBÓR GRACZA */}
      {state === "selectingPlayer" && (
        <SelectPlayerModal
          players={session.players}
          onSelect={selectPlayer}
          onCancel={() => {
            setState("idle");
            setCurrentSong(null);
            setLyrics([]);
            setCurrentLine(null);
          }}
        />
      )}
    </div>
  );

}