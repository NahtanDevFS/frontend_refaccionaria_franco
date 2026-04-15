// src/types/garantia.types.ts
export interface CrearGarantiaDTO {
  id_detalle_venta: number;
  cantidad: number;
  motivo_reclamo: string;
}

export interface ResolverGarantiaDTO {
  id_garantia: number;
  aprobado: boolean;
  resolucion: string;
}

export interface GarantiaPendiente {
  id_garantia: number;
  cantidad: number;
  motivo_reclamo: string;
  fecha_solicitud: string;
  estado: string;
  producto: string;
  sku: string;
  garantia_dias: number;
  id_venta: number;
  fecha_compra: string;
  cliente: string;
}

// NUEVO: Interfaz para el historial de garantías
export interface GarantiaHistorial {
  id_garantia: number;
  fecha_solicitud: string;
  estado_garantia: string;
  motivo_reclamo: string;
  sku: string;
  producto: string;
  condicion_recibido: string | null;
  fecha_recepcion: string | null;
  dictamen: string | null;
  destino: string | null;
  fecha_inspeccion: string | null;
  id_lote: number | null;
  estado_lote: string | null;
}
