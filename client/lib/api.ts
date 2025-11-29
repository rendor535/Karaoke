
export const api = {
  login: async (email: string, password: string) => {
    const res = await fetch("http://localhost:5159/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  register: async (email: string, password: string) => {
    const res = await fetch("http://localhost:5159/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  }
};
