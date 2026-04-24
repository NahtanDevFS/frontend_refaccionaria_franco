// src/services/caja.service.ts
import {
  OrdenPendienteCaja,
  ResumenCaja,
  RegistrarPagoDTO,
  RegistrarArqueoDTO,
  HistorialCobro,
  CobroRepartidorPendiente,
  LiquidarRepartidorDTO,
  RespuestaHistorialArqueos,
  CajeroOpcion,
} from "../types/caja.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function obtenerToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )token=([^;]+)"));
  return match ? match[2] : "";
}

export const CajaService = {
  async obtenerPendientes(): Promise<OrdenPendienteCaja[]> {
    const res = await fetch(`${API_URL}/caja/pendientes`, {
      headers: {
        Authorization: `Bearer ${obtenerToken()}`,
        "ngrok-skip-browser-warning": "true",
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al obtener pendientes");
    return data.data;
  },

  async registrarPago(payload: RegistrarPagoDTO): Promise<void> {
    const res = await fetch(`${API_URL}/caja/cobrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al registrar el pago");
  },

  async obtenerResumen(): Promise<ResumenCaja[]> {
    const res = await fetch(`${API_URL}/caja/resumen`, {
      headers: {
        Authorization: `Bearer ${obtenerToken()}`,
        "ngrok-skip-browser-warning": "true",
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al obtener resumen");
    return data.data;
  },

  async registrarArqueo(
    payload: RegistrarArqueoDTO,
  ): Promise<{ id_arqueo: number }> {
    const res = await fetch(`${API_URL}/caja/arqueo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al registrar arqueo");
    return data.data;
  },

  async obtenerHistorial(
    fechaDesde?: string,
    fechaHasta?: string,
  ): Promise<HistorialCobro[]> {
    const params = new URLSearchParams();
    if (fechaDesde) params.append("desde", fechaDesde);
    if (fechaHasta) params.append("hasta", fechaHasta);
    const res = await fetch(`${API_URL}/caja/historial?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${obtenerToken()}`,
        "ngrok-skip-browser-warning": "true",
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al obtener historial");
    return data.data;
  },

  //Liquidación de repartidores
  async obtenerCobrosRepartidoresPendientes(): Promise<
    CobroRepartidorPendiente[]
  > {
    const res = await fetch(`${API_URL}/caja/repartidores/pendientes`, {
      headers: {
        Authorization: `Bearer ${obtenerToken()}`,
        "ngrok-skip-browser-warning": "true",
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(
        data.message || "Error al obtener cobros de repartidores",
      );
    return data.data;
  },

  async liquidarRepartidor(
    payload: LiquidarRepartidorDTO,
  ): Promise<{ pagos_liquidados: number; total_recibido: number }> {
    const res = await fetch(`${API_URL}/caja/repartidores/liquidar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${obtenerToken()}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al liquidar");
    return data.data;
  },

  //Historial de arqueos
  async obtenerHistorialArqueos(
    fechaDesde?: string,
    fechaHasta?: string,
    id_cajero?: number,
  ): Promise<RespuestaHistorialArqueos> {
    const params = new URLSearchParams();
    if (fechaDesde) params.append("desde", fechaDesde);
    if (fechaHasta) params.append("hasta", fechaHasta);
    if (id_cajero) params.append("id_cajero", String(id_cajero));
    const res = await fetch(`${API_URL}/caja/arqueos?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${obtenerToken()}`,
        "ngrok-skip-browser-warning": "true",
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al obtener historial de arqueos");
    return data.data;
  },

  async obtenerCajeros(): Promise<CajeroOpcion[]> {
    const res = await fetch(`${API_URL}/caja/arqueos/cajeros`, {
      headers: {
        Authorization: `Bearer ${obtenerToken()}`,
        "ngrok-skip-browser-warning": "true",
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al obtener cajeros");
    return Array.isArray(data.data) ? data.data : [];
  },

  async verificarArqueo(id_arqueo: number): Promise<void> {
    const res = await fetch(`${API_URL}/caja/arqueos/${id_arqueo}/verificar`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${obtenerToken()}`,
        "ngrok-skip-browser-warning": "true",
      },
    });
    const data = await res.json();
    if (!res.ok || !data.success)
      throw new Error(data.message || "Error al verificar arqueo");
  },
};
