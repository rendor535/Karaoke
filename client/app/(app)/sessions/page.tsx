"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Session = {
  id: number;
  name: string;
  createdAt: string;
  owner?: {
    email: string;
  };
  queue: any[];
};

export default function SessionsPage() {
  const [role, setRole] = useState<"Admin" | "User" | "Superuser" | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"name" | "user" | "both">("both");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    // rola tylko do UI
    const me = await api.me();
    setRole(me.role);

    // JEDEN endpoint, ZAWSZE
    const data = await api.getSessions();
    setSessions(data);
  }

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
            <div style={{ width: 150 }}>
              {s.queue.length} piosenek
            </div>
            <div style={{ width: 200 }}>
              {new Date(s.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
