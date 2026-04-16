// src/types/venta.types.ts

export interface Producto {
  id_producto: number;
  sku: string;
  nombre: string;
  precio_venta: number;
}

export interface Cliente {
  id_cliente: number;
  nombre_razon_social: string;
  nit: string;
}

export interface DetalleVentaDTO {
  id_producto: number;
  id_producto_reacondicionado?: number;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  nombre_producto?: string;
  es_reacondicionado?: boolean;
}

export interface CrearVentaDTO {
  id_sucursal: number;
  id_vendedor: number;
  id_cliente?: number;
  subtotal: number;
  total: number;
  detalles: DetalleVentaDTO[];
  metodo_pago: string;
  monto_pago: number;
}

export interface VentaResumen {
  id_venta: number;
  fecha: string;
  cliente: string;
  total: number;
  estado: string;
  vendedor: string;
  canal: string;
  subtotal: number;
  descuento: number;
}

export interface FiltrosHistorialVentas {
  id_venta?: number | string; // NUEVO
  fechaInicio?: string;
  fechaFin?: string;
  id_vendedor?: number | string;
  estado?: string;
  page?: number;
  limit?: number;
}

export interface MetaPaginacion {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface RespuestaVentasPaginada {
  success: boolean;
  data: VentaResumen[];
  meta: MetaPaginacion;
}
