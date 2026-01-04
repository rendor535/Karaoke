const API_URL = process.env.NEXT_PUBLIC_API_URL;
console.log("API_URL =", API_URL);
console.log("API_URL RUNTIME =", process.env.NEXT_PUBLIC_API_URL);

export const api = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // ważne, jeśli backend ustawia cookie
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error("Login failed");
    }

    return;
  },

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    if (!res.ok) {
      throw new Error("Register failed");
    }

    return res.json();
  },

  // pobierz dane zalogowanego użytkownika
  async me() {
    const res = await fetch(`${API_URL}/user/me`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },
  
  // pobierz sesje użytkownika
  async getSessions(page = 1, pageSize = 50) {
    const res = await fetch(
      `${API_URL}/session?page=${page}&pageSize=${pageSize}`,
      { credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to load sessions");
    return res.json();
  },


  async getSongs(params: {
    q?: string;
    searchBy?: "all" | "title" | "artist";
    language?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();

    if (params.q) query.append("q", params.q);
    if (params.searchBy) query.append("searchBy", params.searchBy);
    if (params.language) query.append("language", params.language);
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));

    const res = await fetch(`${API_URL}/song?${query.toString()}`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to fetch songs");
    return res.json(); // { data, page, limit, total, totalPages }
  },

  async deleteSong(id: number) {
    const res = await fetch(`${API_URL}/song/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
  },

  async addSongToSession(sessionId: number, songId: number) {
    const res = await fetch(
      `${API_URL}/session/${sessionId}/add-song`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(songId),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
  },

  async activateSession(id: number) {
    const res = await fetch(`${API_URL}/session/${id}/activate`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Activate failed");
  },

  async deleteSession(id: number) {
    const res = await fetch(`${API_URL}/session/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Delete failed");
  },

  async getSession(id: number) {
    const res = await fetch(`${API_URL}/session/${id}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Get session failed");
    return res.json();
  },

  async deleteQueueItem(id: number) {
    const res = await fetch(`${API_URL}/sessionQueueItem/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Delete queue item failed");
  },

  async addPlayer(sessionId: number, nick: string) {
    const res = await fetch(
      `${API_URL}/session/${sessionId}/add-player`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(nick),
      }
    );
    if (!res.ok) throw new Error("Add player failed");
  },

  async deleteSessionPlayer(id: number) {
    const res = await fetch(`${API_URL}/sessionPlayer/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Delete player failed");
  },

  async moveQueueItem(id: number, direction: "up" | "down") {
    const res = await fetch(
      `${API_URL}/session-queue-item/${id}/move`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(direction),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
  },

  async createSession(name: string) {
    const res = await fetch(`${API_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
    return res.json();
  },

  async updateSessionName(id: number, name: string) {
    const res = await fetch(`${API_URL}/session/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json();
  },

  async getActiveSessions() {
    const res = await fetch(`${API_URL}/session/active`, {
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json();
  },

  async disableSession(id: number) {
    const res = await fetch(`${API_URL}/session/${id}/disable`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }
  },

  async getQueueItem(id: number) {
    const res = await fetch(
      `${API_URL}/session-queue-item/${id}`,
      { credentials: "include" }
    );
    if (!res.ok) throw new Error("Failed to load queue item");
    return res.json();
  }

};