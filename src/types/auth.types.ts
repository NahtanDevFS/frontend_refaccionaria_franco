export interface LoginDTO {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuario: {
    id_usuario: number;
    id_empleado: number;
    username: string;
    rol: string;
  };
}
