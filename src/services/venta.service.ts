// src/services/venta.service.ts
import {
  CrearVentaDTO,
  VentaResumen,
  FiltrosHistorialVentas,
  RespuestaVentasPaginada,
} from "../types/venta.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

/**
 * Función ÚNICA para obtener el token.
 * Usarla en todos los métodos del servicio evita el bug de
 * "Bearer undefined" que ocurría cuando se duplicaba la lógica inline.
 */
function obtenerToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )token=([^;]+)"));
  return match ? match[2] : "";
}

export const VentaService = {
  async obtenerVentas(
    filtros?: FiltrosHistorialVentas,
  ): Promise<RespuestaVentasPaginada> {
    const token = obtenerToken();
    let url = `${API_URL}/ventas`;

    if (filtros) {
      const params = new URLSearchParams();
      if (filtros.id_venta)
        params.append("id_venta", filtros.id_venta.toString());
      if (filtros.fechaInicio)
        params.append("fechaInicio", filtros.fechaInicio);
      if (filtros.fechaFin) params.append("fechaFin", filtros.fechaFin);
      if (filtros.id_vendedor)
        params.append("id_vendedor", filtros.id_vendedor.toString());
      if (filtros.estado) params.append("estado", filtros.estado);
      if (filtros.page) params.append("page", filtros.page.toString());
      if (filtros.limit) params.append("limit", filtros.limit.toString());

      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Error al obtener las ventas");
    return response.json();
  },

  async obtenerVendedores(): Promise<
    { id_empleado: number; nombre: string; apellido: string }[]
  > {
    const token = obtenerToken();
    const response = await fetch(`${API_URL}/ventas/vendedores/activos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Error al obtener vendedores");
    const data = await response.json();
    return data.data || data;
  },

  /**
   * Crea una orden de venta.
   * Llama a POST /api/ventas/orden (único endpoint de creación de ventas).
   *
   * Retorna el id_venta creado para poder redirigir o mostrar confirmación.
   *
   * ELIMINADO: crearVenta() que apuntaba a /ventas/mostrador (ruta inexistente →
   * siempre devolvía 404). Toda creación de venta usa este método.
   */
  async crearOrdenVenta(payload: CrearVentaDTO): Promise<number> {
    const token = obtenerToken();
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
    const data = await response.json();
    // El backend responde: { success: true, data: { id_venta } }
    return data.data.id_venta as number;
  },

  async obtenerRepartidores(): Promise<
    {
      id_empleado: number;
      nombre: string;
      apellido: string;
      disponible: boolean;
      pedidos_activos: number;
    }[]
  > {
    const token = obtenerToken();
    const response = await fetch(`${API_URL}/ventas/repartidores/activos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error("Error al obtener repartidores");
    return data.data ?? [];
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
