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
      const respuesta = await AuthService.login({ username, password });
      AuthService.guardarSesion(respuesta.token, respuesta.usuario);

      const rol = respuesta.usuario.rol;

      if (
        [
          "ADMINISTRADOR",
          "GERENTE_REGIONAL",
          "SUPERVISOR_SUCURSAL",
          "VENDEDOR",
        ].includes(rol)
      ) {
        router.push("/inicio");
      } else if (rol === "CAJERO") {
        router.push("/caja");
      } else if (rol === "BODEGUERO") {
        router.push("/bodega");
      } else if (rol === "REPARTIDOR") {
        router.push("/entregas");
      } else {
        router.push("/inicio");
      }
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
