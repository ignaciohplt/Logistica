"use client";

import { useEffect, useState } from "react";

const USER = "admin";
const PASS = "Himetal2026!";

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const [logged, setLogged] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("logistica_login");
    if (saved === "ok") setLogged(true);
  }, []);

  function login(e: React.FormEvent) {
    e.preventDefault();

    if (user === USER && pass === PASS) {
      localStorage.setItem("logistica_login", "ok");
      setLogged(true);
      setError("");
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  }

  function logout() {
    localStorage.removeItem("logistica_login");
    setLogged(false);
  }

  if (logged) {
    return (
      <>
        <div style={{ position: "fixed", top: 15, right: 15, zIndex: 9999 }}>
          <button
            onClick={logout}
            style={{
              background: "#111827",
              color: "white",
              border: "none",
              padding: "10px 14px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cerrar sesión
          </button>
        </div>

        {children}
      </>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        padding: 20,
      }}
    >
      <form
        onSubmit={login}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          padding: 30,
          borderRadius: 18,
          boxShadow: "0 20px 50px rgba(0,0,0,.25)",
        }}
      >
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Logística Pro</h1>
        <p style={{ color: "#64748b", marginBottom: 25 }}>
          Ingresá para acceder al panel
        </p>

        <label>Usuario</label>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 6,
            marginBottom: 16,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
          }}
        />

        <label>Contraseña</label>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 6,
            marginBottom: 16,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
          }}
        />

        {error && (
          <p style={{ color: "#dc2626", marginBottom: 14 }}>{error}</p>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 13,
            borderRadius: 10,
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}