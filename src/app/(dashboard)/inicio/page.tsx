"use client";

import { useEffect, useState } from "react";
import styles from "./Inicio.module.css";
import { RendimientoEmpleado } from "@/types/meta.types";
import { MetaService } from "@/services/meta.service";

export default function InicioPage() {
  const [rendimientos, setRendimientos] = useState<RendimientoEmpleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Guardamos los datos del usuario en sesión
  const [usuario, setUsuario] = useState<{
    id_empleado: number;
    rol: string;
  } | null>(null);

  useEffect(() => {
    // 1. Obtener información de la sesión activa
    const userString = localStorage.getItem("usuario");
    if (userString) {
      setUsuario(JSON.parse(userString));
    }

    // 2. Cargar los datos desde el backend
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const data = await MetaService.obtenerRendimientoMensual();
      setRendimientos(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!usuario) return null;
  if (loading)
    return <div className={styles.loading}>Cargando rendimiento...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  // Lógica de acceso (RBAC en el frontend)
  const esSupervisor =
    usuario.rol === "SUPERVISOR_SUCURSAL" ||
    usuario.rol === "ADMINISTRADOR" ||
    usuario.rol === "GERENTE_REGIONAL";
  const esVendedor = usuario.rol === "VENDEDOR";

  // Filtramos los datos según el rol
  const datosMostrar = esSupervisor
    ? rendimientos
    : rendimientos.filter((r) => r.id_empleado === usuario.id_empleado);

  const diaActual = new Date().getDate();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {esSupervisor ? "Rendimiento de Sucursal" : "Mi Rendimiento Mensual"}
        </h1>
      </div>

      {datosMostrar.length === 0 ? (
        <p>No se encontraron metas asignadas para este mes.</p>
      ) : (
        <div className={styles.grid}>
          {datosMostrar.map((emp) => {
            // Regla de Negocio: >= día 20 y < 60% de la meta
            const requiereAlerta =
              diaActual >= 20 && emp.porcentaje_cumplimiento < 60;

            return (
              <div key={emp.id_empleado} className={styles.card}>
                <div className={styles.cardTitle}>{emp.nombre_vendedor}</div>

                <div className={styles.statsRow}>
                  <span>
                    Vendido: <strong>Q {emp.monto_vendido.toFixed(2)}</strong>
                  </span>
                  <span>
                    Meta: <strong>Q {emp.monto_meta.toFixed(2)}</strong>
                  </span>
                </div>

                <div className={styles.progressContainer}>
                  <div
                    className={styles.progressBar}
                    style={{
                      width: `${Math.min(emp.porcentaje_cumplimiento, 100)}%`,
                    }}
                  />
                </div>

                <div className={styles.progressText}>
                  {emp.porcentaje_cumplimiento.toFixed(2)}%
                </div>

                {/* Mostrar alerta ÚNICAMENTE a supervisores (y rangos mayores) */}
                {esSupervisor && requiereAlerta && (
                  <div className={styles.alertBox}>
                    ATENCIÓN: Este empleado no lleva un buen rendimiento para la
                    fecha actual.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
