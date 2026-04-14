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

  // Pestaña 1: Pendientes de Aprobar
  async obtenerPendientesAutorizacion(id_sucursal: number) {
    const res = await fetch(
      `${API_URL}/garantias/sucursal/${id_sucursal}/pendientes`,
      { headers: getHeaders() },
    );
    if (!res.ok) throw new Error("Error obteniendo garantías pendientes");
    return res.json();
  },

  async resolverGarantia(payload: {
    id_garantia: number;
    aprobado: boolean;
    resolucion: string;
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

  // Pestaña 2: Pendientes de Recepción Física
  async obtenerPendientesRecepcion(id_sucursal: number) {
    const res = await fetch(
      `${API_URL}/garantias/sucursal/${id_sucursal}/recepciones`,
      { headers: getHeaders() },
    );
    if (!res.ok) throw new Error("Error obteniendo recepciones pendientes");
    return res.json();
  },

  async recibirRetorno(payload: {
    id_garantia: number;
    condicion_recibido: string;
    notas_inspeccion?: string;
  }) {
    const res = await fetch(`${API_URL}/garantias/retorno/recepcion`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Error al registrar la recepción");
    }
    return res.json();
  },

  // Pestaña 3: Pendientes de Inspección Técnica
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
};
