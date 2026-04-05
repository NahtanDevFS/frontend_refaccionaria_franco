"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Login.module.css";
import { AuthService } from "@/services/auth.service";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Enviamos credenciales al backend
      const respuesta = await AuthService.login({ username, password });

      // 2. Guardamos token y datos (el backend debe retornar el token en la respuesta)
      // Ajusta 'respuesta.token' según la estructura exacta de tu backend
      AuthService.guardarSesion(respuesta.token, respuesta.usuario);

      // 3. Redirigimos al módulo protegido
      router.push("/ventas/nueva");
    } catch (err: any) {
      setError(err.message || "Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Iniciar Sesión</h1>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={manejarEnvio}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar al Sistema"}
          </button>
        </form>
      </div>
    </div>
  );
}
