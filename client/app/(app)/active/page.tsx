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
    <div className="active-page">
      <h1>Aktywne sesje</h1>

      {loading && <p>Ładowanie...</p>}

      {sessions.length === 0 && !loading && (
        <p>Brak aktywnych sesji</p>
      )}

      {sessions.map((s) => (
        <div key={s.id} className="active-row">
          <div className="active-name">{s.name}</div>
          <div className="active-owner">{s.owner.email}</div>

          <div className="active-date">
            {new Date(s.createdAt).toLocaleString()}
          </div>

          <div className="active-date">
            {s.startedAt
              ? new Date(s.startedAt).toLocaleString()
              : "-"}
          </div>

          <div className="active-meta">
            {s.playersCount} gr.
          </div>

          <div className="active-meta">
            {s.songsCount} utw.
          </div>

          <div className="active-actions">
            <button
              className="danger"
              onClick={() => deactivate(s.id)}
            >
              Dezaktywuj
            </button>

            <button
              className="primary"
              onClick={() => router.push(`/live/${s.id}`)}
            >
              Śpiewaj
            </button>
          </div>
        </div>
      ))}
    </div>
  );

}
