"use client";

import { useEffect, useState } from "react";
import { GarantiaService } from "@/services/garantia.service";
import { GarantiaHistorial } from "@/types/garantia.types";
import styles from "./HistorialGarantias.module.css";

export default function HistorialGarantiasPage() {
  const [historial, setHistorial] = useState<GarantiaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedGarantia, setSelectedGarantia] =
    useState<GarantiaHistorial | null>(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      const userString = localStorage.getItem("usuario");
      if (!userString) return;
      const user = JSON.parse(userString);

      const res = await GarantiaService.obtenerHistorial(user.id_sucursal);
      if (res.success) {
        setHistorial(res.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return "N/A";
    return new Date(fecha).toLocaleDateString("es-GT", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.card}>
        {loading ? (
          <p style={{ color: "#6b7280", padding: "1rem 0" }}>
            Cargando historial...
          </p>
        ) : (
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
                    <td>{formatearFecha(g.fecha_solicitud)}</td>
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
                      No hay registros en el historial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Trazabilidad */}
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
                    {formatearFecha(selectedGarantia.fecha_solicitud)}
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
                      <strong>Estado inicial:</strong>{" "}
                      <span style={{ textTransform: "capitalize" }}>
                        {selectedGarantia.estado_garantia.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Paso 2: Recepción (Opcional) */}
                {selectedGarantia.fecha_recepcion && (
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineDate}>
                      {formatearFecha(selectedGarantia.fecha_recepcion)}
                    </div>
                    <div className={styles.timelineContent}>
                      <h3>2. Recepción Física en Sucursal</h3>
                      <p>
                        <strong>Condición al recibir:</strong>{" "}
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

                {/* Paso 3: Inspección Técnica (Opcional) */}
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

                {/* Paso 4: Reacondicionamiento (Opcional) */}
                {selectedGarantia.id_lote && (
                  <div className={styles.timelineItem}>
                    <div className={styles.timelineDate}>
                      Lote #{selectedGarantia.id_lote}
                    </div>
                    <div className={styles.timelineContent}>
                      <h3>4. Reacondicionamiento</h3>
                      <p>
                        Pieza enviada a inventario de segunda. Estado:{" "}
                        <span style={{ textTransform: "capitalize" }}>
                          {selectedGarantia.estado_lote?.replace("_", " ")}
                        </span>
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
