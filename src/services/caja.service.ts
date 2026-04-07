// src/services/caja.service.ts
import {
  OrdenPendienteCaja,
  ResumenCaja,
  RegistrarPagoDTO,
  RegistrarArqueoDTO,
} from "../types/caja.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function obtenerToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )token=([^;]+)"));
  if (match) return match[2];
  return "";
}

export const CajaService = {
  async obtenerPendientes(): Promise<OrdenPendienteCaja[]> {
    const token = obtenerToken();
    const res = await fetch(`${API_URL}/caja/pendientes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al obtener pendientes");
    return data.data;
  },

  async registrarPago(payload: RegistrarPagoDTO): Promise<void> {
    const token = obtenerToken();
    const res = await fetch(`${API_URL}/caja/cobrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al registrar el pago");
  },

  async obtenerResumen(): Promise<ResumenCaja[]> {
    const token = obtenerToken();
    const res = await fetch(`${API_URL}/caja/resumen`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al obtener resumen de caja");
    return data.data;
  },

  async registrarArqueo(
    payload: RegistrarArqueoDTO,
  ): Promise<{ id_arqueo: number }> {
    const token = obtenerToken();
    const res = await fetch(`${API_URL}/caja/arqueo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al registrar arqueo");
    return data.data;
  },
};
