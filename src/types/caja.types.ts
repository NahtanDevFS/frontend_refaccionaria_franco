// src/types/caja.types.ts

export interface OrdenPendienteCaja {
  id_venta: number;
  cliente: string;
  total: number;
  estado: string;
  canal: "mostrador" | "domicilio";
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

//Historial de cobros

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
  // uuid_factura eliminado (PUNTO 5)
  cliente: string;
  nit: string | null;
  direccion_cliente: string | null;
  cajero: string | null;
  repartidor: string | null;
  es_cobro_ruta: boolean;
  subtotal: number;
  descuento_monto: number;
  total: number;
  detalles: DetalleFactura[];
}

//Liquidación de repartidores

export interface CobroRepartidorPendiente {
  id_pago: number;
  id_venta: number;
  id_repartidor: number;
  monto: number;
  fecha_pago: string;
  repartidor: string;
  cliente: string;
  direccion_entrega: string | null; // viene de destinatario.direccion_texto
}

export interface LiquidarRepartidorDTO {
  id_repartidor: number;
  id_pagos: number[];
}

// Historial de arqueos

export interface ArqueoHistorial {
  id_arqueo: number;
  fecha_cierre: string;
  created_at: string;
  efectivo_contado: number;
  efectivo_segun_sistema: number;
  diferencia: number;
  estado: "cuadrado" | "con_diferencia";
  observaciones: string | null;
  cajero: string;
  id_cajero: number;
  pendiente_verificacion: boolean;
  supervisor_verifica: string | null;
}

export interface ResumenArqueos {
  totalArqueos: number;
  cuadrados: number;
  conDiferencia: number;
  sumaDiferencias: number;
  sinVerificar: number;
}

export interface RespuestaHistorialArqueos {
  resumen: ResumenArqueos;
  arqueos: ArqueoHistorial[];
}

export interface CajeroOpcion {
  id_empleado: number;
  nombre: string;
}
