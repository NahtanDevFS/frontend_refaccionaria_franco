// src/types/entrega.types.ts
// ── PUNTO 7: Los campos nombre_contacto, telefono_contacto y
//    direccion_entrega siguen existiendo en estos tipos con los
//    mismos nombres. El backend los sirve desde la tabla destinatario
//    con aliases que coinciden exactamente, por lo que el frontend
//    no necesita ningún cambio estructural.

export interface ProductoPedido {
  producto: string;
  cantidad: number;
}

export interface PedidoDomicilio {
  id_pedido: number;
  id_venta: number;
  direccion_entrega: string; // viene de destinatario.direccion_texto
  estado_pedido: string;
  nombre_contacto: string; // viene de destinatario.nombre
  telefono_contacto: string; // viene de destinatario.telefono
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

export interface ResultadoEntregaExitosa {
  id_pedido: number;
  id_pago: number | null;
}

// ─── Comprobante ──────────────────────────────────────────────────────────────

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

// ─── Historial ────────────────────────────────────────────────────────────────

export interface EntregaHistorial {
  id_pedido: number;
  id_venta: number;
  estado_pedido: "entregado" | "fallido";
  direccion_entrega: string; // viene de destinatario.direccion_texto
  nombre_contacto: string; // viene de destinatario.nombre
  telefono_contacto: string; // viene de destinatario.telefono
  fecha_entrega: string;
  motivo_fallido: string | null;
  monto_cobrado: number | null;
  total: number;
  pago_contra_entrega: boolean;
  id_pago: number | null;
}

export interface ResumenHistorial {
  totalEntregados: number;
  totalFallidos: number;
  totalCobrado: number;
}

export interface RespuestaHistorial {
  resumen: ResumenHistorial;
  entregas: EntregaHistorial[];
}
