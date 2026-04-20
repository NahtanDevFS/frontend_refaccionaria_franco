// src/services/garantia.service.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const getHeaders = () => {
  const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const GarantiaService = {
  async crearGarantia(payload: {
    id_detalle_venta: number;
    cantidad: number;
    motivo_reclamo: string;
  }) {
    const res = await fetch(`${API_URL}/garantias`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Error al crear la garantía");
    }
    return res.json();
  },

  // Pestaña 1: Solicitudes pendientes de resolver
  async obtenerPendientesAutorizacion(id_sucursal: number) {
    const res = await fetch(
      `${API_URL}/garantias/sucursal/${id_sucursal}/pendientes`,
      { headers: getHeaders() },
    );
    if (!res.ok) throw new Error("Error obteniendo garantías pendientes");
    return res.json();
  },

  /**
   * Resuelve una garantía.
   * Si aprobado=true, se deben enviar condicion_recibido y opcionalmente notas_inspeccion.
   * Si aprobado=false, solo se necesita resolucion.
   */
  async resolverGarantia(payload: {
    id_garantia: number;
    aprobado: boolean;
    resolucion: string;
    condicion_recibido?: string;
    notas_inspeccion?: string;
  }) {
    const res = await fetch(`${API_URL}/garantias/resolver`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Error al resolver garantía");
    }
    return res.json();
  },

  // Pestaña 2: Pendientes de Inspección Técnica
  async obtenerPendientesInspeccion(id_sucursal: number) {
    const res = await fetch(
      `${API_URL}/garantias/sucursal/${id_sucursal}/inspecciones`,
      { headers: getHeaders() },
    );
    if (!res.ok) throw new Error("Error obteniendo inspecciones pendientes");
    return res.json();
  },

  async inspeccionarRetorno(payload: {
    id_retorno: number;
    resultado: string;
    observaciones?: string;
    destino: string;
  }) {
    const res = await fetch(`${API_URL}/garantias/retorno/inspeccion`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Error al registrar la inspección");
    }
    return res.json();
  },

  // Historial completo
  async obtenerHistorial(id_sucursal: number) {
    const res = await fetch(
      `${API_URL}/garantias/sucursal/${id_sucursal}/historial`,
      { headers: getHeaders() },
    );
    if (!res.ok) throw new Error("Error obteniendo el historial de garantías");
    return res.json();
  },

  async obtenerReacondicionadosDisponibles(id_sucursal: number) {
    const res = await fetch(
      `${API_URL}/garantias/sucursal/${id_sucursal}/reacondicionados`,
      { headers: getHeaders() },
    );
    if (!res.ok) throw new Error("Error obteniendo productos reacondicionados");
    return res.json();
  },
};
