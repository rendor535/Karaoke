"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type ActiveSession = {
  id: number;
  name: string;
  createdAt: string;
  startedAt: string | null;
  owner: {
    email: string;
  };
  playersCount: number;
  songsCount: number;
};

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await api.getActiveSessions();
    setSessions(data);
    setLoading(false);
  }

  async function deactivate(id: number) {
    if (!confirm("Dezaktywować sesję?")) return;
    await api.disableSession(id);
    await load();
  }

  return (
    <div>
      <h1>Aktywne sesje</h1>

      {loading && <p>Ładowanie...</p>}

      {sessions.length === 0 && !loading && (
        <p>Brak aktywnych sesji</p>
      )}

      {sessions.map((s) => (
        <div
          key={s.id}
          style={{
            display: "flex",
            gap: 20,
            padding: 10,
            borderBottom: "1px solid #ccc",
            alignItems: "center",
          }}
        >
          <div style={{ width: 200 }}>{s.name}</div>
          <div style={{ width: 200 }}>{s.owner.email}</div>
          <div style={{ width: 160 }}>
            {new Date(s.createdAt).toLocaleString()}
          </div>
          <div style={{ width: 160 }}>
            {s.startedAt
              ? new Date(s.startedAt).toLocaleString()
              : "-"}
          </div>
          <div style={{ width: 80 }}>
            {s.playersCount} gr.
          </div>
          <div style={{ width: 80 }}>
            {s.songsCount} utw.
          </div>

          <button onClick={() => deactivate(s.id)}>
            Deactivate
          </button>

            <button onClick={() => router.push(`/live/${s.id}`)}>
            🎤 Śpiewaj
            </button>
        </div>
      ))}
    </div>
  );
}
