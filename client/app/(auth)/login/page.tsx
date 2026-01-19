"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AuthPage() {
  const router = useRouter();

  // LOGIN
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // REGISTER
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("User");
  const [regError, setRegError] = useState("");

  const login = async () => {
    setLoginError("");
    try {
      await api.login(loginEmail, loginPassword);
      router.push("/home");
    } catch {
      setLoginError("Nieprawidłowy email lub hasło");
    }
  };

  const register = async () => {
    setRegError("");
    try {
      await api.register(regEmail, regPassword, regRole);
      router.push("/home");
    } catch (e: any) {
      setRegError(e.message ?? "Błąd rejestracji");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* LOGIN */}
        <div className="auth-section">
          <h2 className="auth-title">Logowanie</h2>

          <input
            className="auth-input"
            placeholder="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />

          <input
            className="auth-input"
            type="password"
            placeholder="hasło"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />

          <button className="auth-button" onClick={login}>
            Zaloguj
          </button>

          {loginError && <div className="auth-error">{loginError}</div>}
        </div>

        <div className="auth-divider" />

        {/* REGISTER */}
        <div className="auth-section">
          <h2 className="auth-title">Rejestracja</h2>

          <input
            className="auth-input"
            placeholder="email"
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
          />

          <input
            className="auth-input"
            type="password"
            placeholder="hasło"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
          />

          <select
            className="auth-select"
            value={regRole}
            onChange={(e) => setRegRole(e.target.value)}
          >
            <option value="User">User</option>
            <option value="SuperUser">SuperUser</option>
            <option value="Admin">Admin</option>
          </select>

          <button className="auth-button" onClick={register}>
            Zarejestruj się
          </button>

          {regError && <div className="auth-error">{regError}</div>}
        </div>

      </div>
    </div>

  );
}
