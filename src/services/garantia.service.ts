// src/services/garantia.service.ts
import {
  CrearGarantiaDTO,
  ResolverGarantiaDTO,
  GarantiaPendiente,
} from "../types/garantia.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Función auxiliar sencilla para leer cookies en el cliente (Igual que en VentaService)
function obtenerToken(): string {
  if (typeof document === "undefined") return ""; // Prevención para SSR en Next.js
  const match = document.cookie.match(new RegExp("(^| )token=([^;]+)"));
  if (match) return match[2];
  return "";
}

export const GarantiaService = {
  async crearGarantia(
    payload: CrearGarantiaDTO,
  ): Promise<{ id_garantia: number }> {
    const token = obtenerToken();
    const res = await fetch(`${API_URL}/garantias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al registrar la garantía");
    return data.data;
  },

  async obtenerPendientes(id_sucursal: number): Promise<GarantiaPendiente[]> {
    const token = obtenerToken();
    const res = await fetch(
      `${API_URL}/garantias/sucursal/${id_sucursal}/pendientes`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al obtener pendientes");
    return data.data;
  },

  async resolverGarantia(payload: ResolverGarantiaDTO): Promise<void> {
    const token = obtenerToken();
    const res = await fetch(`${API_URL}/garantias/resolver`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al resolver la garantía");
    return data.data;
  },
};
