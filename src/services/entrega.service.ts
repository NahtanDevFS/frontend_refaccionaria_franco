// src/services/entrega.service.ts
import {
  PedidoDomicilio,
  MarcarEntregaExitosaDTO,
  MarcarEntregaFallidaDTO,
} from "../types/entrega.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function obtenerToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )token=([^;]+)"));
  if (match) return match[2];
  return "";
}

export const EntregaService = {
  async obtenerMisPedidos(): Promise<PedidoDomicilio[]> {
    const token = obtenerToken();
    const res = await fetch(`${API_URL}/entregas/mis-pedidos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al obtener pedidos");
    return data.data;
  },

  async marcarExito(
    id_pedido: number,
    payload: MarcarEntregaExitosaDTO,
  ): Promise<void> {
    const token = obtenerToken();
    const res = await fetch(`${API_URL}/entregas/${id_pedido}/exito`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al registrar entrega");
  },

  async marcarFallida(
    id_pedido: number,
    payload: MarcarEntregaFallidaDTO,
  ): Promise<void> {
    const token = obtenerToken();
    const res = await fetch(`${API_URL}/entregas/${id_pedido}/fallida`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al marcar como fallida");
  },
};
