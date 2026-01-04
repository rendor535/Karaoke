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
  queue: {
    id: number;
    position: number;
    song: {
      id: number;
      title: string;
      artist: string;
      language: string;
    };
  }[];
};


type Player = {
  id: number;
  nick: string;
};

type QueueItem = {
  id: number;
  position: number;
  song: {
    id: number;
    title: string;
    artist: string;
    language: string;
  };
};
export default function LivePage() {
  const { sessionId } = useParams();
  const id = Number(sessionId);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [state, setState] = useState<LiveState>("idle");

  const [currentSong, setCurrentSong] = useState<QueueItem | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const data = await api.getSession(id);
    setSession({
      ...data,
      queue: data.queue ?? [],
      players: data.players ?? [],
    });
  }

  function selectSong(item: QueueItem) {
    if (state === "playing") return;
    setCurrentSong(item);
    setState("selectingPlayer");
  }

  function selectPlayer(player: Player) {
    setCurrentPlayer(player);
    setState("playing");
  }

  function stopSong() {
    setState("idle");
    setCurrentSong(null);
    setCurrentPlayer(null);
  }

  function pauseSong() {
    setState("paused");
  }

  function resumeSong() {
    setState("playing");
  }

  function exitSong() {
    if (state !== "paused") return;
    setState("idle");
    setCurrentSong(null);
    setCurrentPlayer(null);
  }

  const playerRef = useRef<HTMLDivElement>(null);
  function enterFullscreen() {
    if (!playerRef.current) return;
    if (playerRef.current.requestFullscreen) {
      playerRef.current.requestFullscreen();
    }
  }
  if (!session) return <p>Ładowanie LIVE…</p>;

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* LEWA STRONA – PLAYER */}
      <div style={{ flex: 2, padding: 20 }}>
        <h2>{session.name}</h2>

        {/* PLAYER VIDEO */}
        <div
          ref={playerRef}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            background: "#000",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {state === "playing" && currentSong ? (
            <div style={{ textAlign: "center" }}>
              <div>
                🎵 {currentSong.song.artist} – {currentSong.song.title}
              </div>
              <div>🎤 {currentPlayer?.nick}</div>
              <div>(tu będzie video / audio)</div>
            </div>
          ) : (
            <div>Wybierz utwór z kolejki</div>
          )}

          {/* FULLSCREEN */}
          <button
            onClick={enterFullscreen}
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
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
            <div>00:00 / 03:30</div>
            <div style={{ marginTop: 10 }}>
              <em>[lyrics placeholder]</em>
            </div>
          </div>
        )}

        {state === "playing" && (
          <button onClick={stopSong} style={{ marginTop: 20 }}>
            ⏹ STOP & wyjdź
          </button>
        )}
      </div>

      {/* PRAWA STRONA – KOLEJKA */}
      <div
        style={{
          flex: 1,
          borderLeft: "1px solid #ccc",
          padding: 20,
        }}
      >
        <h3>Kolejka</h3>

        {session.queue.map((q) => (
          <div
            key={q.id}
            style={{
              padding: 8,
              cursor: state === "playing" ? "not-allowed" : "pointer",
              opacity: state === "playing" ? 0.5 : 1,
              borderBottom: "1px solid #eee",
            }}
            onClick={() => selectSong(q)}
          >
            {q.position}. 🎵 {q.song.artist} – {q.song.title}
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