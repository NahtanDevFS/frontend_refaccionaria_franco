// src/types/entrega.types.ts

export interface ProductoPedido {
  producto: string;
  cantidad: number;
}

export interface PedidoDomicilio {
  id_pedido: number;
  id_venta: number;
  direccion_entrega: string;
  estado_pedido: string;
  nombre_contacto: string;
  telefono_contacto: string;
  total: number;
  pago_contra_entrega: boolean;
  productos: ProductoPedido[];
}

export interface MarcarEntregaExitosaDTO {
  monto_cobrado?: number;
}

export interface MarcarEntregaFallidaDTO {
  motivo_fallido: string;
}

// Resultado que devuelve el backend al confirmar una entrega exitosa
export interface ResultadoEntregaExitosa {
  id_pedido: number;
  id_pago: number | null; // null si no era contra entrega
}

// ─── Comprobante de cobro (estructura idéntica a HistorialCobro del cajero) ──

export interface DetalleComprobante {
  id_producto: number;
  producto: string;
  sku: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  monto_iva: number;
}

export interface ComprobanteEntrega {
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
  detalles: DetalleComprobante[];
}
