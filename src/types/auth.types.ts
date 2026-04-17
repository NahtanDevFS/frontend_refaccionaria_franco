// src/types/auth.types.ts

export interface LoginDTO {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuario: {
    id_usuario: number;
    id_empleado: number;
    id_sucursal: number;
    username: string;
    nombre_sucursal: string;
    rol: string;
  };
}
