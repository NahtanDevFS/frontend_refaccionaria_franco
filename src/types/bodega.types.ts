// src/types/bodega.types.ts

export interface InventarioBodega {
  id_inventario: number;
  id_producto: number;
  sku: string;
  nombre: string;
  cantidad_actual: number;
  punto_reorden: number;
  requiere_reorden: boolean;
  stock_otras_sucursales: number;
  detalle_otras_sucursales: { sucursal: string; cantidad: number }[];

  categoria?: string;
  marca_repuesto?: string;
  compatibilidades: {
    marca: string | null;
    modelo: string | null;
    anio_desde: number | null;
    anio_hasta: number | null;
    es_universal: boolean;
  }[];
}

export interface RecepcionPendiente {
  id_despacho: number;
  fecha_emision: string;
  origen: string;
  productos: {
    producto: string;
    sku: string;
    cantidad: number;
  }[];
}

export interface EmitirDespachoDTO {
  id_sucursal_destino: number;
  detalles: {
    id_producto: number;
    cantidad: number;
  }[];
}

export interface AjusteInventarioDTO {
  id_producto: number;
  tipo: "ajuste_positivo" | "ajuste_negativo";
  cantidad: number;
  motivo: string;
}
