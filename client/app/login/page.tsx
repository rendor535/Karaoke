"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async () => {
    setError("");
    try {
      await api.login(email, password);
      router.push("/home"); // HOME
    } catch {
      setError("Nieprawidłowe dane logowania");
    }
    return; 
  };

  return (
    <div className="p-20 max-w-md">
      <h2 className="text-xl mb-4">Logowanie</h2>

      <input
        className="border p-2 w-full mb-2"
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-4"
        placeholder="hasło"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="bg-black text-white px-4 py-2" onClick={login}>
        Zaloguj
      </button>

      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
}
