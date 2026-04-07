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
