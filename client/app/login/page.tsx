"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const login = async () => {
    const response = await api.login(email, password);
    setMsg(JSON.stringify(response));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Logowanie</h2>
      <input 
        placeholder="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input 
        placeholder="hasło"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button onClick={login}>Zaloguj</button>

      <p>{msg}</p>
    </div>
  );
}
