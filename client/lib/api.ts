const API_URL = process.env.NEXT_PUBLIC_API_URL;
console.log("API_URL =", API_URL);
console.log("API_URL RUNTIME =", process.env.NEXT_PUBLIC_API_URL);

export const api = {
  async login(email: string, password: string) {
    const res = await fetch(`http://localhost:5159/auth/login`, {
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
  async getSessions() {
    const res = await fetch(`${API_URL}/session?page=1&pageSize=50`, {
      credentials: "include",
    });
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
};