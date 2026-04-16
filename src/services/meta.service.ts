// src/services/meta.service.ts
import {
  RendimientoEmpleado,
  ConsolidadoSucursal,
  VendedorParaMeta,
  SugerenciaMeta,
  HistorialMeta,
  SucursalOpcion,
  AsignarMetaPayload,
} from "../types/meta.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function getToken(): string | undefined {
  return document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
}

function getHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function manejarRespuesta<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.mensaje || error.message || "Error en la solicitud");
  }
  return res.json();
}

export const MetaService = {
  // Rendimiento del mes actual (filtrado opcional por sucursal)
  async obtenerRendimientoMensual(
    id_sucursal?: number,
  ): Promise<RendimientoEmpleado[]> {
    const url = id_sucursal
      ? `${API_URL}/metas/rendimiento?id_sucursal=${id_sucursal}`
      : `${API_URL}/metas/rendimiento`;
    const res = await fetch(url, { headers: getHeaders() });
    return manejarRespuesta<RendimientoEmpleado[]>(res);
  },

  // Consolidado del mes actual de la sucursal
  async obtenerConsolidado(id_sucursal?: number): Promise<ConsolidadoSucursal> {
    const url = id_sucursal
      ? `${API_URL}/metas/consolidado?id_sucursal=${id_sucursal}`
      : `${API_URL}/metas/consolidado`;
    const res = await fetch(url, { headers: getHeaders() });
    return manejarRespuesta<ConsolidadoSucursal>(res);
  },

  // Vendedores disponibles para asignar meta
  async obtenerVendedores(
    anio: number,
    mes: number,
    id_sucursal?: number,
  ): Promise<VendedorParaMeta[]> {
    const params = new URLSearchParams({
      anio: String(anio),
      mes: String(mes),
    });
    if (id_sucursal) params.append("id_sucursal", String(id_sucursal));
    const res = await fetch(`${API_URL}/metas/vendedores?${params}`, {
      headers: getHeaders(),
    });
    return manejarRespuesta<VendedorParaMeta[]>(res);
  },

  // Sugerencia automática
  async obtenerSugerencia(id_empleado: number): Promise<SugerenciaMeta> {
    const res = await fetch(`${API_URL}/metas/sugerencia/${id_empleado}`, {
      headers: getHeaders(),
    });
    return manejarRespuesta<SugerenciaMeta>(res);
  },

  // Historial de un empleado
  async obtenerHistorial(id_empleado: number): Promise<HistorialMeta[]> {
    const res = await fetch(`${API_URL}/metas/historial/${id_empleado}`, {
      headers: getHeaders(),
    });
    return manejarRespuesta<HistorialMeta[]>(res);
  },

  // Sucursales (selector)
  async obtenerSucursales(): Promise<SucursalOpcion[]> {
    const res = await fetch(`${API_URL}/metas/sucursales`, {
      headers: getHeaders(),
    });
    return manejarRespuesta<SucursalOpcion[]>(res);
  },

  // Asignar nueva meta
  async asignarMeta(payload: AsignarMetaPayload) {
    const res = await fetch(`${API_URL}/metas/asignar`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return manejarRespuesta(res);
  },
};
