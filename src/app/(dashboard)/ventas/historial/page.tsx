"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Ventas.module.css";
import { VentaService } from "@/services/venta.service";
import { VentaResumen, FiltrosHistorialVentas } from "@/types/venta.types";

export default function ListadoVentas() {
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 👇 Nuevos estados para los filtros y catálogos
  const [vendedores, setVendedores] = useState<
    { id_empleado: number; nombre: string; apellido: string }[]
  >([]);
  const [filtros, setFiltros] = useState<FiltrosHistorialVentas>({
    fechaInicio: "",
    fechaFin: "",
    id_vendedor: "",
    estado: "",
  });

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      // Cargamos las ventas sin filtros y la lista de vendedores en paralelo
      const [ventasData, vendedoresData] = await Promise.all([
        VentaService.obtenerVentas(),
        VentaService.obtenerVendedores().catch(() => []), // Evitamos que falle todo si el endpoint de vendedores aún no existe
      ]);
      setVentas(ventasData);
      setVendedores(vendedoresData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 👇 Lógica para manejar el submit del formulario de filtros
  const manejarFiltros = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await VentaService.obtenerVentas(filtros);
      setVentas(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 👇 Lógica para limpiar los filtros
  const limpiarFiltros = async () => {
    const filtrosVacios = {
      fechaInicio: "",
      fechaFin: "",
      id_vendedor: "",
      estado: "",
    };
    setFiltros(filtrosVacios);
    setLoading(true);
    try {
      const data = await VentaService.obtenerVentas(filtrosVacios);
      setVentas(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Historial de Ventas</h1>
      </div>

      {error && (
        <div style={{ color: "var(--error-color)", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* 👇 NUEVA SECCIÓN DE FILTROS 👇 */}
      <form className={styles.filtersContainer} onSubmit={manejarFiltros}>
        <div className={styles.filterGroup}>
          <label htmlFor="fechaInicio">Fecha Inicio</label>
          <input
            type="date"
            id="fechaInicio"
            value={filtros.fechaInicio}
            onChange={(e) =>
              setFiltros({ ...filtros, fechaInicio: e.target.value })
            }
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="fechaFin">Fecha Fin</label>
          <input
            type="date"
            id="fechaFin"
            value={filtros.fechaFin}
            onChange={(e) =>
              setFiltros({ ...filtros, fechaFin: e.target.value })
            }
            className={styles.input}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="id_vendedor">Vendedor</label>
          <select
            id="id_vendedor"
            value={filtros.id_vendedor}
            onChange={(e) =>
              setFiltros({ ...filtros, id_vendedor: e.target.value })
            }
            className={styles.select}
          >
            <option value="">Todos</option>
            {vendedores.map((v) => (
              <option key={v.id_empleado} value={v.id_empleado}>
                {v.nombre} {v.apellido}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="estado">Estado</label>
          <select
            id="estado"
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className={styles.select}
          >
            <option value="">Todos</option>
            <option value="pendiente_pago">Pendiente de Pago</option>
            <option value="pagada">Pagada</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>

        <div className={styles.filterActions}>
          <button type="submit" className={styles.btnPrimary}>
            Filtrar
          </button>
          <button
            type="button"
            onClick={limpiarFiltros}
            className={styles.btnSecondary}
          >
            Limpiar
          </button>
        </div>
      </form>
      {/* 👆 FIN SECCIÓN DE FILTROS 👆 */}

      {loading ? (
        <p>Cargando datos...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Canal</th>
                <th>Subtotal</th>
                <th>Descuento</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    No se encontraron ventas con estos filtros.
                  </td>
                </tr>
              ) : (
                ventas.map((v) => (
                  <tr key={v.id_venta}>
                    <td>{v.id_venta}</td>
                    <td>{new Date(v.fecha).toLocaleDateString()}</td>
                    <td>{v.cliente}</td>
                    <td>{v.vendedor || "No asignado"}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      {v.canal || "Mostrador"}
                    </td>
                    <td>Q {(v.subtotal || v.total).toFixed(2)}</td>
                    <td>Q {(v.descuento || 0).toFixed(2)}</td>
                    <td>
                      <strong>Q {v.total.toFixed(2)}</strong>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${styles[v.estado] || ""}`}
                      >
                        {v.estado.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/ventas/${v.id_venta}`}
                        className={styles.btnSecondary}
                      >
                        Ver Detalle
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
