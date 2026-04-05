import { RendimientoEmpleado } from "../types/meta.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const MetaService = {
  // En tu backend debes tener una ruta GET /api/metas/rendimiento que haga el JOIN
  // entre la tabla meta_venta y la sumatoria de tabla venta del mes en curso.
  async obtenerRendimientoMensual(): Promise<RendimientoEmpleado[]> {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];

    const response = await fetch(`${API_URL}/metas/rendimiento`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Error al obtener el rendimiento");
    }

    return response.json();
  },
};
