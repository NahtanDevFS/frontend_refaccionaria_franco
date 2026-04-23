"use client";

import { useEffect, useState } from "react";
import { GarantiaService } from "@/services/garantia.service";
import { GarantiaHistorial } from "@/types/garantia.types";
import styles from "./HistorialGarantias.module.css";

export default function HistorialGarantiasPage() {
  const [historial, setHistorial] = useState<GarantiaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const [selectedGarantia, setSelectedGarantia] =
    useState<GarantiaHistorial | null>(null);

  useEffect(() => {
    cargarHistorial(page);
  }, [page]);

  const cargarHistorial = async (currentPage: number = 1) => {
    setLoading(true);
    try {
      const userString = localStorage.getItem("usuario");
      if (!userString) return;
      const user = JSON.parse(userString);

      const res = await GarantiaService.obtenerHistorial(user.id_sucursal, {
        search: searchTerm,
        estado: estadoFilter,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        page: currentPage,
        limit: limit,
      });

      if (res.success) {
        setHistorial(res.data);
        setTotalPages(res.totalPages || 1);
        setTotalItems(res.total || 0);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Volver a la página 1 al filtrar
    cargarHistorial(1);
  };

  const limpiarFiltros = () => {
    setSearchTerm("");
    setEstadoFilter("");
    setFechaInicio("");
    setFechaFin("");
    setPage(1);
    // setTimeout para asegurar que los estados se actualicen antes de la llamada
    setTimeout(() => cargarHistorial(1), 0);
  };

  const formatearFecha = (
    fecha: string | null,
    mostrarHora: boolean = true,
  ) => {
    if (!fecha) return "N/A";

    const opciones: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };

    if (mostrarHora) {
      opciones.hour = "2-digit";
      opciones.minute = "2-digit";
    } else {
      // Si es solo fecha (como fecha_solicitud que viene de un campo DATE de Postgres),
      // forzamos UTC para evitar que por el cambio de zona horaria se muestre un día antes.
      opciones.timeZone = "UTC";
    }

    return new Date(fecha).toLocaleDateString("es-GT", opciones);
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "aprobada":
        return (
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>
            Aprobada
          </span>
        );
      case "rechazada":
        return (
          <span className={`${styles.badge} ${styles.badgeDanger}`}>
            Rechazada
          </span>
        );
      case "en_revision":
        return (
          <span className={`${styles.badge} ${styles.badgeWarning}`}>
            En Revisión
          </span>
        );
      case "cerrado":
        return (
          <span className={`${styles.badge} ${styles.badgeNeutral}`}>
            Cerrada
          </span>
        );
      default:
        return (
          <span className={`${styles.badge} ${styles.badgeInfo}`}>
            {estado.replace("_", " ")}
          </span>
        );
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Historial y Trazabilidad de Garantías</h1>

      {/* Barra de Búsqueda y Filtros */}
      <form onSubmit={aplicarFiltros} className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <div className={styles.filterGroup}>
            <label>Buscar Producto o ID</label>
            <input
              type="text"
              placeholder="Ej. Bomba, #12, SKU..."
              className={styles.filterInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Estado</label>
            <select
              className={styles.filterSelect}
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Fecha Desde</label>
            <input
              type="date"
              className={styles.filterInput}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Fecha Hasta</label>
            <input
              type="date"
              className={styles.filterInput}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filtersActions}>
          <button
            type="button"
            onClick={limpiarFiltros}
            className={styles.btnSecondary}
          >
            Limpiar Filtros
          </button>
          <button type="submit" className={styles.btnPrimary}>
            Buscar
          </button>
        </div>
      </form>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.card}>
        {loading ? (
          <p style={{ color: "#6b7280", padding: "1rem 0" }}>
            Cargando historial...
          </p>
        ) : (
          <>
            <p className={styles.totalText}>
              Mostrando {historial.length} de {totalItems} registros
            </p>
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha Solicitud</th>
                    <th>Producto (SKU)</th>
                    <th>Estado Actual</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((g) => (
                    <tr key={g.id_garantia}>
                      <td style={{ fontWeight: "bold" }}>#{g.id_garantia}</td>
                      <td>{formatearFecha(g.fecha_solicitud, false)}</td>
                      <td>
                        {g.producto}{" "}
                        <span className={styles.textMuted}>({g.sku})</span>
                      </td>
                      <td>{getEstadoBadge(g.estado_garantia)}</td>
                      <td>
                        <button
                          className={styles.btnAction}
                          onClick={() => setSelectedGarantia(g)}
                        >
                          Ver Trazabilidad
                        </button>
                      </td>
                    </tr>
                  ))}
                  {historial.length === 0 && (
                    <tr>
                      <td colSpan={5} className={styles.textCenter}>
                        No hay registros que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginación */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={styles.pageBtn}
                >
                  &laquo; Anterior
                </button>
                <span className={styles.pageInfo}>
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={styles.pageBtn}
                >
                  Siguiente &raquo;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Trazabilidad (Sin cambios, se mantiene igual) */}
      {selectedGarantia && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedGarantia(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Trazabilidad - Garantía #{selectedGarantia.id_garantia}</h2>
              <button
                className={styles.btnClose}
                onClick={() => setSelectedGarantia(null)}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.timeline}>
                {/* Paso 1: Solicitud */}
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDate}>
                    {formatearFecha(selectedGarantia.fecha_solicitud, false)}
                  </div>
                  <div className={styles.timelineContent}>
                    <h3>1. Solicitud de Garantía</h3>
                    <p>
                      <strong>Producto:</strong> {selectedGarantia.producto}
                    </p>
                    <p>
                      <strong>Motivo del reclamo:</strong>{" "}
                      {selectedGarantia.motivo_reclamo}
                    </p>
                    <p>
                      <strong>Estado:</strong>{" "}
                      <span style={{ textTransform: "capitalize" }}>
                        {selectedGarantia.estado_garantia.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                </div>
                {/* Paso 2: Recepción */}
                {selectedGarantia.fecha_recepcion && (
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineDate}>
                      {formatearFecha(selectedGarantia.fecha_recepcion)}
                    </div>
                    <div className={styles.timelineContent}>
                      <h3>2. Recepción Física en Sucursal</h3>
                      <p>
                        <strong>Condición:</strong>{" "}
                        <span style={{ textTransform: "capitalize" }}>
                          {selectedGarantia.condicion_recibido?.replace(
                            "_",
                            " ",
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                {/* Paso 3: Inspección Técnica */}
                {selectedGarantia.fecha_inspeccion && (
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineDate}>
                      {formatearFecha(selectedGarantia.fecha_inspeccion)}
                    </div>
                    <div className={styles.timelineContent}>
                      <h3>3. Inspección Técnica y Resolución</h3>
                      <p>
                        <strong>Dictamen:</strong> {selectedGarantia.dictamen}
                      </p>
                      <p>
                        <strong>Destino Final:</strong>{" "}
                        <span style={{ textTransform: "capitalize" }}>
                          {selectedGarantia.destino?.replace("_", " ")}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                {/* Paso 4: Reacondicionamiento */}
                {selectedGarantia.id_lote && (
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineDate}>
                      Lote #{selectedGarantia.id_lote}
                    </div>
                    <div className={styles.timelineContent}>
                      <h3>4. Reacondicionamiento</h3>
                      <p>
                        Pieza enviada a inventario de segunda y disponible para
                        reventa.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
