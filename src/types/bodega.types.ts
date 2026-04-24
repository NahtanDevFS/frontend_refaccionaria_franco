export interface LoteInventario {
  id_lote: number;
  cantidad_actual: number;
  costo_unitario: number;
  fecha_ingreso: string;
  es_apertura: boolean;
  id_orden_compra: number | null;
}

export interface InventarioBodega {
  id_producto_sucursal: number;
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
  precio_venta: number;
  costo: number; // costo promedio ponderado de lotes activos
  total_lotes: number; // cantidad de lotes activos (para el indicador expandible)

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
