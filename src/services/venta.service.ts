// src/services/venta.service.ts
import {
  CrearVentaDTO,
  VentaResumen,
  FiltrosHistorialVentas,
  RespuestaVentasPaginada,
} from "../types/venta.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Función auxiliar sencilla para leer cookies en el cliente
function obtenerToken(): string {
  const match = document.cookie.match(new RegExp("(^| )token=([^;]+)"));
  if (match) return match[2];
  return "";
}

export const VentaService = {
  async obtenerVentas(
    filtros?: FiltrosHistorialVentas,
  ): Promise<RespuestaVentasPaginada> {
    const token = obtenerToken();
    let url = `${API_URL}/ventas`;

    // Construir los query params si existen filtros
    if (filtros) {
      const params = new URLSearchParams();
      if (filtros.fechaInicio)
        params.append("fechaInicio", filtros.fechaInicio);
      if (filtros.fechaFin) params.append("fechaFin", filtros.fechaFin);
      if (filtros.id_vendedor)
        params.append("id_vendedor", filtros.id_vendedor.toString());
      if (filtros.estado) params.append("estado", filtros.estado);

      // 👇 Añadimos los parámetros de paginación
      if (filtros.page) params.append("page", filtros.page.toString());
      if (filtros.limit) params.append("limit", filtros.limit.toString());

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Error al obtener las ventas");

    // 👇 Ahora devolvemos TODO el objeto (success, data y meta)
    return response.json();
  },

  async obtenerVendedores(): Promise<
    { id_empleado: number; nombre: string; apellido: string }[]
  > {
    const token = obtenerToken();
    // Nota: Deberás asegurarte de tener este endpoint o uno similar en tu backend
    const response = await fetch(`${API_URL}/ventas/vendedores/activos`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Error al obtener vendedores");

    const data = await response.json();
    return data.data || data;
  },

  async crearVenta(data: CrearVentaDTO): Promise<void> {
    const token = obtenerToken();
    // OJO: Tu backend espera la creación en /ventas/mostrador, no en /ventas
    const response = await fetch(`${API_URL}/ventas/mostrador`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al procesar la venta");
    }
  },

  async crearOrdenVenta(payload: any): Promise<void> {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    const response = await fetch(`${API_URL}/ventas/orden`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al crear la orden");
    }
  },

  async obtenerRepartidores(): Promise<
    { id_empleado: number; nombre: string; apellido: string }[]
  > {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    const response = await fetch(`${API_URL}/ventas/repartidores/activos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error("Error al obtener repartidores");
    return response.json();
  },

  async obtenerVentaPorId(
    id_venta: number,
  ): Promise<{ venta: any; detalles: any[] }> {
    const token = obtenerToken();
    const response = await fetch(`${API_URL}/ventas/${id_venta}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok || !data.success)
      throw new Error(data.message || "Error al obtener la venta");
    return data.data;
  },
};
