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

// ── DTO para crear una venta (debe coincidir exactamente con dtos/CrearVentaDTO.ts del backend) ──

export interface ClienteNuevoDTO {
  nombre_razon_social: string;
  tipo_cliente: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  id_municipio?: number | null;
  notas_internas?: string | null;
}

export interface DetalleOrdenDTO {
  id_producto: number;
  id_producto_reacondicionado?: number;
  cantidad: number;
}

/**
 * Payload que se envía a POST /api/ventas/orden
 * Espeja exactamente dtos/CrearVentaDTO.ts del backend.
 *
 * NOTA: id_sucursal e id_vendedor se incluyen en el body porque el backend
 * los valida vía Zod y luego los sobreescribe con los valores del token JWT
 * para mayor seguridad (ver VentaController.crearOrden).
 *
 * Los campos subtotal/total/precio_unitario NO se envían: los calcula el
 * trigger de PostgreSQL sobre detalle_venta.
 */
export interface CrearVentaDTO {
  id_sucursal: number;
  id_vendedor: number;
  nit: string;
  cliente_nuevo?: ClienteNuevoDTO | null;
  canal: "mostrador" | "domicilio";
  pago_contra_entrega?: boolean;
  id_repartidor?: number | null;
  direccion_entrega?: string | null;
  nombre_contacto?: string | null;
  telefono_contacto?: string | null;
  id_municipio_entrega?: number | null;
  descuento_porcentaje?: number;
  detalles: DetalleOrdenDTO[];
}

// ── Tipos de respuesta ──────────────────────────────────────────────────────

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
  monto_iva: number;
}

export interface FiltrosHistorialVentas {
  id_venta?: number | string;
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
