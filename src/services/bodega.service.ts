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
  // Acepta parámetros de filtro y los adjunta a la URL
  async obtenerInventario(filtros?: any): Promise<InventarioBodega[]> {
    let queryParams = "";
    if (filtros) {
      const params = new URLSearchParams();
      if (filtros.termino) params.append("termino", filtros.termino);
      if (filtros.id_categoria)
        params.append("id_categoria", filtros.id_categoria);
      if (filtros.id_marca) params.append("id_marca", filtros.id_marca);
      if (filtros.id_modelo_vehiculo)
        params.append("id_modelo_vehiculo", filtros.id_modelo_vehiculo);
      queryParams = `?${params.toString()}`;
    }

    const res = await fetch(`${API_URL}/bodega/inventario${queryParams}`, {
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
