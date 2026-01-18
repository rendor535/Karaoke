"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Song = {
  id: number;
  title: string;
  artist: string;
  language: string;
  coverPath: string | null;
  folderName: string;
};

type Session = {
  id: number;
  name: string;
  createdAt: string;
  playersCount: number;
  songsCount: number;
};

export default function SongsPage() {
  const router = useRouter();

  const [role, setRole] = useState<"Admin" | "User" | "Superuser" | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("");
  const [searchBy, setSearchBy] = useState<"all" | "title" | "artist">("all");
  const [loading, setLoading] = useState(false);

  const [modalSongId, setModalSongId] = useState<number | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Set<number>>(new Set());
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load(params?: {
    q?: string;
    language?: string;
    searchBy?: "all" | "title" | "artist";
  }) {
    setLoading(true);

    const me = await api.me();
    setRole(me.role);

    const res = await api.getSongs({
      q: params?.q,
      language: params?.language,
      searchBy: params?.searchBy,
      limit: 50,
    });

    setSongs(res.data ?? []);
    setLoading(false);
  }

 function buildCover(song: Song) {
    if (!song.coverPath) return null;
    // Użyj pełnego URL backendu
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5159";
    const path = `${backendUrl}/files/${song.folderName}/${song.coverPath}`;
    console.log("🖼️ Cover path for", song.title, ":", path);
    return path;
  }
  async function removeSong(id: number) {
    if (!confirm("Usunąć utwór?")) return;
    await api.deleteSong(id);
    await load();
  }

  async function openAddToSessionModal(songId: number) {
    setModalSongId(songId);
    setSelectedSessions(new Set());

    const data = await api.getSessions();
    setSessions(data);
  }
  
return (
  <div className="songs-page">
    <h1>Utwory</h1>

    <div className="songs-actions">
      <button
        disabled={role === "User"}
        onClick={() => router.push("/songs/upload")}
      >
        Dodaj utwór do bazy
      </button>
    </div>

    <div className="filters">
      <select value={searchBy} onChange={(e) => setSearchBy(e.target.value as any)}>
        <option value="all">Nazwa lub artysta</option>
        <option value="title">Nazwa</option>
        <option value="artist">Artysta</option>
      </select>

      <input placeholder="Szukaj..." value={q} onChange={(e) => setQ(e.target.value)} />
      <button onClick={() => load({ q, searchBy })}>Szukaj</button>
    </div>

    <div className="filters">
      <input
        placeholder="Język (pl, en)"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      />
      <button onClick={() => load({ language })}>Szukaj po języku</button>
    </div>

    {songs.map((s) => (
      <div key={s.id} className="song-row">
        <div className="song-cover">
          {s.coverPath ? (
            <img src={buildCover(s)!} alt={s.title} />
          ) : (
            "brak"
          )}
        </div>

        <div className="song-meta">
          <div className="song-meta-title">{s.title}</div>
          <div className="song-meta-artist">{s.artist}</div>
        </div>

        <div className="song-lang">{s.language}</div>

        <div className="song-actions">
          <button onClick={() => openAddToSessionModal(s.id)}>
            Dodaj do sesji
          </button>

          {(role === "Admin" || role === "Superuser") && (
            <button className="danger" onClick={() => removeSong(s.id)}>
              Usuń
            </button>
          )}
        </div>
      </div>
    ))}

    {modalSongId !== null && (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Dodaj utwór do sesji</h3>

          {sessions.map((s) => (
            <div key={s.id} className="session-row">
              <input
                type="checkbox"
                checked={selectedSessions.has(s.id)}
                onChange={() => {
                  setSelectedSessions((prev) => {
                    const next = new Set(prev);
                    next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                    return next;
                  });
                }}
              />
              <div style={{ width: 160 }}>{s.name}</div>
              <div>{s.songsCount} utw.</div>
              <div>{s.playersCount} gr.</div>
              <div>{new Date(s.createdAt).toLocaleDateString()}</div>
            </div>
          ))}

          <div className="modal-actions">
            <button onClick={() => setModalSongId(null)}>Anuluj</button>
            <button
              className="primary"
              disabled={selectedSessions.size === 0 || modalLoading}
              onClick={async () => {
                if (!modalSongId) return;
                setModalLoading(true);
                for (const sessionId of selectedSessions) {
                  await api.addSongToSession(sessionId, modalSongId);
                }
                setModalLoading(false);
                setModalSongId(null);
              }}
            >
              Zatwierdź
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );

}
