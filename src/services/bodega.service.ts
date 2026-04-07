// src/services/bodega.service.ts
import {
  InventarioBodega,
  RecepcionPendiente,
  EmitirDespachoDTO,
  AjusteInventarioDTO,
} from "../types/bodega.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function obtenerToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )token=([^;]+)"));
  if (match) return match[2];
  return "";
}

export const BodegaService = {
  async obtenerInventario(): Promise<InventarioBodega[]> {
    const res = await fetch(`${API_URL}/bodega/inventario`, {
      headers: { Authorization: `Bearer ${obtenerToken()}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);
    return data.data;
  },

  async emitirDespacho(payload: EmitirDespachoDTO): Promise<void> {
    const res = await fetch(`${API_URL}/bodega/despacho`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);
  },

  async obtenerRecepciones(): Promise<RecepcionPendiente[]> {
    const res = await fetch(`${API_URL}/bodega/recepciones`, {
      headers: { Authorization: `Bearer ${obtenerToken()}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);
    return data.data;
  },

  async confirmarRecepcion(id_despacho: number): Promise<void> {
    const res = await fetch(`${API_URL}/bodega/recepcion/${id_despacho}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${obtenerToken()}` },
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);
  },

  async ajustarInventario(payload: AjusteInventarioDTO): Promise<void> {
    const res = await fetch(`${API_URL}/bodega/ajuste`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);
  },
};
