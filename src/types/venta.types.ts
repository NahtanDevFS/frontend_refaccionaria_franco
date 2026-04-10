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
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  nombre_producto?: string; // Solo para visualización en UI
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
  fechaInicio?: string;
  fechaFin?: string;
  id_vendedor?: number | string;
  estado?: string;
}
