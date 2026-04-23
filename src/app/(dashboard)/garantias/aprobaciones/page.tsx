"use client";

import { useEffect, useState } from "react";
import styles from "./Garantias.module.css";
import { GarantiaService } from "@/services/garantia.service";

const DESTINO_POR_RESULTADO: Record<string, string> = {
  descarte: "baja_inventario",
  devolver_proveedor: "retorno_proveedor",
  aprobado_reventa: "inventario_reacondicionado",
};

export default function CentroGarantiasPage() {
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [idSucursal, setIdSucursal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendientesAprobar, setPendientesAprobar] = useState<any[]>([]);
  const [pendientesInspeccion, setPendientesInspeccion] = useState<any[]>([]);

  // Modal de aprobación/rechazo
  const [modalResolver, setModalResolver] = useState<{
    id: number;
    resolucion: string;
    stock_disponible: number;
    cantidad_reclamada: number;
  } | null>(null);

  // Modal de inspección técnica
  const [modalInspeccion, setModalInspeccion] = useState<{
    id: number; // id_garantia
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

  // ── Aprobar o Rechazar garantía
  const handleResolver = async (aprobado: boolean) => {
    if (!modalResolver) return;

    if (!modalResolver.resolucion.trim())
      return alert("Debe ingresar una resolución.");

    try {
      await GarantiaService.resolverGarantia({
        id_garantia: modalResolver.id,
        aprobado,
        resolucion: modalResolver.resolucion,
      });

      alert(
        aprobado
          ? "Garantía aprobada. Inventario actualizado. Se puede entregar el repuesto al cliente."
          : "Reclamo rechazado.",
      );
      setModalResolver(null);
      cargarDatosTab();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // ── Inspección técnica
  const handleInspeccionar = async (resultado: string) => {
    if (!modalInspeccion) return;
    try {
      await GarantiaService.inspeccionarRetorno({
        id_garantia: modalInspeccion.id,
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

                      {g.stock_disponible < g.cantidad ? (
                        <p className={styles.alertaSinStock}>
                          ⚠️ Sin stock suficiente ({g.stock_disponible}{" "}
                          disponibles). La aprobación quedará bloqueada hasta
                          que ingrese mercadería.
                        </p>
                      ) : null}
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.btnReview}
                        onClick={() =>
                          setModalResolver({
                            id: g.id_garantia,
                            resolucion: "",
                            stock_disponible: g.stock_disponible,
                            cantidad_reclamada: g.cantidad,
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

          {/* ── TAB 2: Pendientes de inspección ── */}
          {activeTab === 1 && (
            <div className={styles.tabContent}>
              {pendientesInspeccion.length === 0 ? (
                <p className={styles.emptyText}>
                  No hay piezas pendientes de inspección.
                </p>
              ) : (
                pendientesInspeccion.map((g) => (
                  <div key={g.id_garantia} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{g.producto}</span>
                      <span className={styles.cardSku}>{g.sku}</span>
                    </div>
                    <div className={styles.cardBody}>
                      <p>
                        <strong>Garantía #:</strong> {g.id_garantia}
                      </p>
                      <p>
                        <strong>Fecha solicitud:</strong>{" "}
                        {new Date(g.fecha_solicitud).toLocaleDateString(
                          "es-GT",
                        )}
                      </p>
                      <p>
                        <strong>Cantidad:</strong> {g.cantidad}
                      </p>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.btnReview}
                        onClick={() =>
                          setModalInspeccion({
                            id: g.id_garantia,
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

            {modalResolver.stock_disponible <
              modalResolver.cantidad_reclamada && (
              <div className={styles.alertaBanner}>
                ⚠️ No hay stock suficiente para aprobar esta garantía. Solo
                puedes rechazarla o esperar a que ingrese mercadería.
              </div>
            )}

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
                disabled={
                  modalResolver.stock_disponible <
                  modalResolver.cantidad_reclamada
                }
                style={
                  modalResolver.stock_disponible <
                  modalResolver.cantidad_reclamada
                    ? { opacity: 0.4, cursor: "not-allowed" }
                    : {}
                }
                onClick={() => handleResolver(true)}
              >
                Aprobar Garantía
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
