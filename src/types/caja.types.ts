// src/types/caja.types.ts

export interface OrdenPendienteCaja {
  id_venta: number;
  cliente: string;
  total: number;
  estado: string;
  pago_contra_entrega: boolean;
  created_at: string;
}

export interface ResumenCaja {
  metodo_pago: string;
  total: number;
}

export interface RegistrarPagoDTO {
  id_venta: number;
  metodo_pago: "efectivo" | "tarjeta" | "transferencia";
  monto: number;
  referencia?: string;
}

export interface RegistrarArqueoDTO {
  efectivo_contado: number;
  observaciones?: string;
}

// ─── NUEVO: Historial de Cobros ───────────────────────────────────────────────

export interface DetalleFactura {
  id_producto: number;
  producto: string;
  sku: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  monto_iva: number;
}

export interface HistorialCobro {
  id_pago: number;
  id_venta: number;
  fecha_pago: string;
  metodo_pago: "efectivo" | "tarjeta" | "transferencia";
  monto: number;
  referencia: string | null;
  cliente: string;
  nit: string | null;
  direccion_cliente: string | null;
  cajero: string;
  subtotal: number;
  descuento_monto: number;
  total: number;
  detalles: DetalleFactura[];
}
