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
