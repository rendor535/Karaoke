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
};
