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
  Queue: {
    id: number;
    position: number;
    Song: {
      id: number;
      title: string;
      artist: string;
      language: string;
    };
  }[];
  Players: {
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

    const data = await api.getSession(id);
    setEditSession(data);

    setEditLoading(false);
  }

  const visible = filterSessions();

  return (
    <div>
      <h1>Sesje</h1>

      {role === "Admin" && (
        <div style={{ marginBottom: 20 }}>
          <input
            placeholder="Szukaj..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
          >
            <option value="both">Użytkownik lub nazwa</option>
            <option value="user">Użytkownik</option>
            <option value="name">Nazwa</option>
          </select>
        </div>
      )}

      <div>
        {visible.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              gap: 20,
              padding: 10,
              borderBottom: "1px solid #ccc",
            }}
          >
            <div style={{ width: 200 }}>{s.name}</div>
            <div style={{ width: 120 }}>
              {s.songsCount} piosenek
            </div>
            <div style={{ width: 120 }}>
              {s.playersCount} graczy
            </div>
            <div style={{ width: 200 }}>
              {new Date(s.createdAt).toLocaleString()}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => openEditSession(s.id)}>
              Edytuj
            </button>

            <button
              disabled={s.isActive}
              onClick={() => activateSession(s.id)}
            >
              {s.isActive ? "Aktywna" : "Dodaj do aktywnych"}
            </button>

            <button onClick={() => removeSession(s.id)}>
              Usuń
            </button>
          </div>

          </div>
        ))}
      </div>
      {editSessionId !== null && editSession && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              minWidth: 900,
              display: "flex",
              gap: 20,
            }}
          >
            {/* LEWA – KOLEJKA */}
            <div style={{ flex: 1 }}>
              <h3>Kolejka</h3>
              {/* tutaj lista Queue + strzałki góra/dół */}
            </div>

            {/* PRAWA – GRACZE */}
            <div style={{ flex: 1 }}>
              <h3>Gracze</h3>
              {/* tutaj Players + Dodaj / Usuń */}
            </div>

            {/* DÓŁ */}
            <div style={{ position: "absolute", bottom: 20, right: 20 }}>
              <button onClick={() => setEditSessionId(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
