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
