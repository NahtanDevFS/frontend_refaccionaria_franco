// src/types/meta.types.ts
export interface RendimientoEmpleado {
  id_empleado: number;
  id_sucursal: number;
  nombre_sucursal: string;
  nombre_vendedor: string;
  monto_meta: number;
  monto_vendido: number;
  porcentaje_cumplimiento: number;
  comision_base_pct: number;
  comision_excedente_pct: number;
  comision_base: number;
  comision_excedente: number;
  comision_total: number;
}

export interface ConsolidadoSucursal {
  total_meta: number;
  total_vendido: number;
  porcentaje_cumplimiento: number;
  empleados_con_meta: number;
}

export interface VendedorParaMeta {
  id_empleado: number;
  nombre: string;
  id_sucursal: number;
  nombre_sucursal: string;
  ya_tiene_meta: boolean;
  meta_actual: number | null;
  comision_base_pct_actual: number | null;
  comision_excedente_pct_actual: number | null;
}

export interface SugerenciaMeta {
  meta_anterior: number | null;
  vendido_anterior: number | null;
  supero_meta: boolean | null;
  sugerencia: number | null;
  mes_referencia: string;
  explicacion: string;
}

export interface HistorialMeta {
  anio: number;
  mes: number;
  monto_meta: number;
  monto_vendido: number;
  porcentaje_cumplimiento: number;
  estado: "en_curso" | "cumplió" | "no_cumplió";
}

export interface SucursalOpcion {
  id_sucursal: number;
  nombre: string;
}

export interface AsignarMetaPayload {
  id_empleado: number;
  anio: number;
  mes: number;
  monto_meta: number;
  //el backend los usa para resolver/crear el esquema
  comision_base_pct?: number;
  comision_excedente_pct?: number;
}

export interface ActualizarMetaPayload {
  anio: number;
  mes: number;
  monto_meta: number;
  comision_base_pct?: number;
  comision_excedente_pct?: number;
}
