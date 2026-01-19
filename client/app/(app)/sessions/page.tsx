"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Session = {
  id: number;
  name: string;
  createdAt: string;
  isActive: boolean;
  playersCount: number;
  songsCount: number;
  owner?: {
    email: string;
  };
};

type EditSession = {
  id: number;
  name: string;
  isActive: boolean;
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
  players: {
    id: number;
    nick: string;
    totalScore: number;
  }[];
};

export default function SessionsPage() {
  const [role, setRole] = useState<"Admin" | "User" | "Superuser" | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"name" | "user" | "both">("both");
  
  // stany modeala dla edytowanej sesji
  const [editSessionId, setEditSessionId] = useState<number | null>(null);
  const [editSession, setEditSession] = useState<EditSession | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedQueueItemId, setSelectedQueueItemId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const me = await api.me();
    setRole(me.role);

    const data = await api.getSessions();
    setSessions(data);
  }
  // przyciski edycji i usuwania
  function filterSessions(): Session[] {
    if (role !== "Admin") return sessions;

    const q = search.toLowerCase();

    return sessions.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q);
      const userMatch = s.owner?.email.toLowerCase().includes(q) ?? false;

      if (mode === "name") return nameMatch;
      if (mode === "user") return userMatch;
      return nameMatch || userMatch;
    });
  }

  async function activateSession(id: number) {
    await api.activateSession(id);
    await load();
  }
  async function removeSession(id: number) {
    if (!confirm("Usunąć sesję?")) return;
    await api.deleteSession(id);
    await load();
  }

  // Otwarcie modala edycji
  async function openEditSession(id: number) {
    setEditSessionId(id);
    setEditLoading(true);
    // setSelectedQueueItemId(null);

    const data = await api.getSession(id);
    setEditSession({
      ...data,
      queue: data.queue ?? [],
      players: data.players ?? [],
    });

    setEditLoading(false);
  }
  async function AddSession() {
    const name = prompt("Nazwa sesji");
    if (!name) return;

    await api.createSession(name);
    await load();
  }

  async function changeName() {
    if (editSessionId === null) return;
    const newName = prompt("Nowa nazwa sesji");
    if (!newName) return;
    await api.updateSessionName(editSessionId, newName);
    await openEditSession(editSessionId);
    await load();
  }


  const visible = filterSessions();

  return (
    <div className="sessions-page">
      <h1>Sesje</h1>
      <button className="add-session-btn" onClick={AddSession}>Dodaj sesję</button>
      {role === "Admin" && (
        <div className="sessions-toolbar">
          <input
            placeholder="Szukaj..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="both">Użytkownik lub nazwa</option>
            <option value="user">Użytkownik</option>
            <option value="name">Nazwa</option>
          </select>

        </div>
      )}


      <div>
        {visible.map((s) => (
          <div key={s.id} className="session-row">
            <div className="session-name">{s.name}</div>
            <div className="session-meta">{s.songsCount} piosenek</div>
            <div className="session-meta">{s.playersCount} graczy</div>
            <div className="session-date">
              {new Date(s.createdAt).toLocaleString()}
            </div>

            <div className="session-actions">
              <button onClick={() => openEditSession(s.id)}>Edytuj</button>

              <button
                className="primary"
                disabled={s.isActive}
                onClick={() => activateSession(s.id)}
              >
                {s.isActive ? "Aktywna" : "Dodaj do aktywnych"}
              </button>

              <button className="danger" onClick={() => removeSession(s.id)}>
                Usuń
              </button>
            </div>
          </div>
        ))}
      </div>
      {editSessionId !== null && editSession && (
      <div className="session-modal-overlay">
        <div className="session-modal">

          {/* LEWA – KOLEJKA */}
          <div className="session-column">
            <h3>Kolejka</h3>

            <div className="queue-actions">
              <button
                disabled={!selectedQueueItemId}
                onClick={async () => {
                  if (selectedQueueItemId === null) return;
                  await api.moveQueueItem(selectedQueueItemId, "up");
                  await openEditSession(editSession.id);
                }}
              >
                ⬆️
              </button>

              <button
                disabled={!selectedQueueItemId}
                onClick={async () => {
                  if (selectedQueueItemId === null) return;
                  await api.moveQueueItem(selectedQueueItemId, "down");
                  await openEditSession(editSession.id);
                }}
              >
                ⬇️
              </button>

              <button className="primary" onClick={changeName}>
                Zmień nazwę
              </button>
            </div>

            {editSession.queue.length === 0 && (
              <p>Brak piosenek</p>
            )}

            {editSession.queue.map((q) => (
              <div key={q.id} className="queue-row">
                <input
                  type="radio"
                  name="queueSelect"
                  checked={selectedQueueItemId === q.id}
                  onChange={() => setSelectedQueueItemId(q.id)}
                />

                <div style={{ width: 180 }}>
                  {q.song.title}
                </div>

                <div style={{ width: 180 }}>
                  {q.song.artist}
                </div>

                <button className="danger" 
                  onClick={() => {
                    if (!confirm("Usunąć piosenkę z kolejki?")) return;
                    api
                      .deleteQueueItem(q.id)
                      .then(() => openEditSession(editSession.id));
                  }}
                >
                  Usuń
                </button>
              </div>
            ))}
          </div>

          {/* PRAWA – GRACZE */}
          <div className="session-column">
            <h3>Gracze</h3>

            {editSession.players.length === 0 && (
              <p>Brak graczy</p>
            )}

            {editSession.players.map((p) => (
              <div key={p.id} className="player-row">
                <div style={{ width: 180 }}>{p.nick}</div>
                <div style={{ width: 80 }}>{p.totalScore}</div>

                <button className="danger" 
                  onClick={() => {
                    if (!confirm("Usunąć gracza?")) return;
                    api
                      .deleteSessionPlayer(p.id)
                      .then(() => openEditSession(editSession.id));
                  }}
                >
                  Usuń
                </button>
              </div>
            ))}

            <button
              onClick={async () => {
                const nick = prompt("Nick gracza");
                if (!nick) return;
                await api.addPlayer(editSession.id, nick);
                await openEditSession(editSession.id);
              }}
            >
              Dodaj gracza
            </button>

            <div className="session-modal-footer">
              <button onClick={() => setEditSessionId(null)}>
                OK
              </button>
            </div>
          </div>

        </div>
      </div>
    )}

    </div>
  );
}
