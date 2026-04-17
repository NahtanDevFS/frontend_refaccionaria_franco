import { LoginDTO, AuthResponse } from "../types/auth.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const AuthService = {
  async login(credenciales: LoginDTO): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credenciales),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.mensaje || "Credenciales inválidas");
    }

    return response.json();
  },

  guardarSesion(token: string, usuario: any) {
    // Guardamos el token en una cookie para que el Middleware de Next.js lo pueda leer
    document.cookie = `token=${token}; path=/; max-age=1800; samesite=strict`;
    // Guardamos los datos del usuario en localStorage para usarlos en la UI (nombre, rol, sucursal, etc.)
    localStorage.setItem("usuario", JSON.stringify(usuario));
  },

  cerrarSesion() {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    localStorage.removeItem("usuario");
  },
};
