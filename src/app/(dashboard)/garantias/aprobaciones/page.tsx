"use client";

import { useEffect, useState } from "react";
import styles from "./Garantias.module.css";
import { GarantiaService } from "@/services/garantia.service";

const CONDICION_OPTIONS = [
  { value: "buena", label: "Buena — visible pero funcional" },
  { value: "dañada", label: "Dañada — defecto claro" },
  { value: "muy_dañada", label: "Muy dañada — inutilizable" },
];

const DESTINO_POR_RESULTADO: Record<string, string> = {
  descarte: "baja_inventario",
  devolver_proveedor: "retorno_proveedor",
  aprobado_reventa: "inventario_reacondicionado",
};

export default function CentroGarantiasPage() {
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [idSucursal, setIdSucursal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Datos
  const [pendientesAprobar, setPendientesAprobar] = useState<any[]>([]);
  const [pendientesInspeccion, setPendientesInspeccion] = useState<any[]>([]);

  // Modal de aprobación/rechazo (con recepción fusionada al aprobar)
  const [modalResolver, setModalResolver] = useState<{
    visible: boolean;
    id: number;
    resolucion: string;
    condicion: string;
    notas: string;
  } | null>(null);

  // Modal de inspección técnica
  const [modalInspeccion, setModalInspeccion] = useState<{
    visible: boolean;
    id: number;
    notas: string;
  } | null>(null);

  useEffect(() => {
    const userString = localStorage.getItem("usuario");
    if (userString) {
      const u = JSON.parse(userString);
      setIdSucursal(u.id_sucursal || 1);
    }
  }, []);

  useEffect(() => {
    if (idSucursal) cargarDatosTab();
  }, [idSucursal, activeTab]);

  const cargarDatosTab = async () => {
    if (!idSucursal) return;
    setLoading(true);
    try {
      if (activeTab === 0) {
        const res =
          await GarantiaService.obtenerPendientesAutorizacion(idSucursal);
        setPendientesAprobar(res.data);
      } else {
        const res =
          await GarantiaService.obtenerPendientesInspeccion(idSucursal);
        setPendientesInspeccion(res.data);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── TAB 1: Aprobar (con recepción fusionada) o Rechazar
  const handleResolver = async (aprobado: boolean) => {
    if (!modalResolver) return;
    if (!modalResolver.resolucion.trim())
      return alert("Debe ingresar una resolución.");
    if (aprobado && !modalResolver.condicion)
      return alert("Debe indicar la condición de la pieza recibida.");

    try {
      await GarantiaService.resolverGarantia({
        id_garantia: modalResolver.id,
        aprobado,
        resolucion: modalResolver.resolucion,
        ...(aprobado && {
          condicion_recibido: modalResolver.condicion,
          notas_inspeccion: modalResolver.notas,
        }),
      });
      alert(
        aprobado
          ? "Garantía aprobada. Pieza recibida e inventario actualizado. Se puede entregar el reemplazo al cliente."
          : "Reclamo rechazado. El cliente se retira con su pieza.",
      );
      setModalResolver(null);
      cargarDatosTab();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // ── TAB 2: Inspección técnica
  const handleInspeccionar = async (resultado: string) => {
    if (!modalInspeccion) return;
    try {
      await GarantiaService.inspeccionarRetorno({
        id_retorno: modalInspeccion.id,
        resultado,
        destino: DESTINO_POR_RESULTADO[resultado],
        observaciones: modalInspeccion.notas,
      });
      alert("Inspección finalizada.");
      setModalInspeccion(null);
      cargarDatosTab();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (!idSucursal) return <div>Cargando sesión...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Centro de Control de Garantías</h1>

      {/* PESTAÑAS */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${activeTab === 0 ? styles.activeTab : ""}`}
          onClick={() => setActiveTab(0)}
        >
          1. Solicitudes (
          {activeTab === 0 && !loading ? pendientesAprobar.length : "..."})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 1 ? styles.activeTab : ""}`}
          onClick={() => setActiveTab(1)}
        >
          2. Inspección Técnica (
          {activeTab === 1 && !loading ? pendientesInspeccion.length : "..."})
        </button>
      </div>

      {loading ? (
        <p className={styles.loadingText}>Cargando...</p>
      ) : (
        <>
          {/* ── TAB 1: Solicitudes pendientes ── */}
          {activeTab === 0 && (
            <div className={styles.tabContent}>
              {pendientesAprobar.length === 0 ? (
                <p className={styles.emptyText}>
                  No hay solicitudes pendientes.
                </p>
              ) : (
                pendientesAprobar.map((g) => (
                  <div key={g.id_garantia} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{g.producto}</span>
                      <span className={styles.cardSku}>{g.sku}</span>
                    </div>
                    <div className={styles.cardBody}>
                      <p>
                        <strong>Cliente:</strong> {g.cliente}
                      </p>
                      <p>
                        <strong>Ticket #:</strong> {g.id_venta}
                      </p>
                      <p>
                        <strong>Fecha compra:</strong>{" "}
                        {new Date(g.fecha_compra).toLocaleDateString("es-GT")}
                      </p>
                      <p>
                        <strong>Cantidad reclamada:</strong> {g.cantidad}
                      </p>
                      <p>
                        <strong>Motivo:</strong> {g.motivo_reclamo}
                      </p>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.btnReview}
                        onClick={() =>
                          setModalResolver({
                            visible: true,
                            id: g.id_garantia,
                            resolucion: "",
                            condicion: "",
                            notas: "",
                          })
                        }
                      >
                        Revisar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── TAB 2: Inspección técnica ── */}
          {activeTab === 1 && (
            <div className={styles.tabContent}>
              {pendientesInspeccion.length === 0 ? (
                <p className={styles.emptyText}>
                  No hay piezas pendientes de inspección.
                </p>
              ) : (
                pendientesInspeccion.map((rg) => (
                  <div key={rg.id_retorno} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{rg.producto}</span>
                      <span className={styles.cardSku}>{rg.sku}</span>
                    </div>
                    <div className={styles.cardBody}>
                      <p>
                        <strong>Recibida el:</strong>{" "}
                        {new Date(rg.fecha_ingreso).toLocaleDateString("es-GT")}
                      </p>
                      <p>
                        <strong>Condición al recibir:</strong>{" "}
                        {rg.condicion_recibido?.replace("_", " ")}
                      </p>
                      {rg.notas_inspeccion && (
                        <p>
                          <strong>Notas:</strong> {rg.notas_inspeccion}
                        </p>
                      )}
                      <p>
                        <strong>Recibió:</strong> {rg.recibio_nombre}
                      </p>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.btnReview}
                        onClick={() =>
                          setModalInspeccion({
                            visible: true,
                            id: rg.id_retorno,
                            notas: "",
                          })
                        }
                      >
                        Inspeccionar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL RESOLVER (Aprobar / Rechazar) ── */}
      {modalResolver && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Resolución de Garantía</h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>Resolución / Observaciones</label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Ej: Se verificó defecto de fábrica. Procede cambio."
                value={modalResolver.resolucion}
                onChange={(e) =>
                  setModalResolver(
                    (p) => p && { ...p, resolucion: e.target.value },
                  )
                }
              />
            </div>

            <div className={styles.sectionDivider}>
              <span>Al APROBAR, complete la recepción de la pieza</span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Condición de la pieza recibida{" "}
                <span className={styles.requiredIfApprove}>
                  (requerido al aprobar)
                </span>
              </label>
              <select
                className={styles.select}
                value={modalResolver.condicion}
                onChange={(e) =>
                  setModalResolver(
                    (p) => p && { ...p, condicion: e.target.value },
                  )
                }
              >
                <option value="">— Seleccionar —</option>
                {CONDICION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Notas de recepción (opcional)
              </label>
              <textarea
                className={styles.textarea}
                rows={2}
                placeholder="Observaciones adicionales sobre el estado físico..."
                value={modalResolver.notas}
                onChange={(e) =>
                  setModalResolver((p) => p && { ...p, notas: e.target.value })
                }
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.btnCancel}
                onClick={() => setModalResolver(null)}
              >
                Cancelar
              </button>
              <button
                className={styles.btnReject}
                onClick={() => handleResolver(false)}
              >
                Rechazar Reclamo
              </button>
              <button
                className={styles.btnApprove}
                onClick={() => handleResolver(true)}
              >
                Aprobar y Recibir Pieza
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL INSPECCIÓN TÉCNICA ── */}
      {modalInspeccion && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Inspección Técnica</h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Observaciones técnicas (opcional)
              </label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Descripción técnica del estado de la pieza..."
                value={modalInspeccion.notas}
                onChange={(e) =>
                  setModalInspeccion(
                    (p) => p && { ...p, notas: e.target.value },
                  )
                }
              />
            </div>

            <p className={styles.helperText}>
              Seleccione el destino final de la pieza:
            </p>

            <div className={styles.modalActions}>
              <button
                className={styles.btnCancel}
                onClick={() => setModalInspeccion(null)}
              >
                Cancelar
              </button>
              <button
                className={styles.btnDestino}
                onClick={() => handleInspeccionar("descarte")}
              >
                Dar de baja
              </button>
              <button
                className={styles.btnDestino}
                onClick={() => handleInspeccionar("devolver_proveedor")}
              >
                Devolver a proveedor
              </button>
              <button
                className={styles.btnApprove}
                onClick={() => handleInspeccionar("aprobado_reventa")}
              >
                Reacondicionado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
