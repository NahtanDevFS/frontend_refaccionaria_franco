// src/app/(dashboard)/garantias/aprobaciones/page.tsx
"use client";

import { useEffect, useState } from "react";
import styles from "./Garantias.module.css";
import { GarantiaService } from "@/services/garantia.service";

export default function CentroGarantiasPage() {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [idSucursal, setIdSucursal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados de Datos
  const [pendientesAprobar, setPendientesAprobar] = useState<any[]>([]);
  const [pendientesRecepcion, setPendientesRecepcion] = useState<any[]>([]);
  const [pendientesInspeccion, setPendientesInspeccion] = useState<any[]>([]);

  // Estados de Modales
  const [modalAprobar, setModalAprobar] = useState<{
    visible: boolean;
    id: number;
    resolucion: string;
  } | null>(null);

  const [modalRecibir, setModalRecibir] = useState<{
    visible: boolean;
    id: number;
    condicion: string;
    notas: string;
  } | null>(null);

  // ── destino y resultado eliminados del state: se derivan del botón pulsado
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
      } else if (activeTab === 1) {
        const res =
          await GarantiaService.obtenerPendientesRecepcion(idSucursal);
        setPendientesRecepcion(res.data);
      } else if (activeTab === 2) {
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

  // ── TAB 1: Aprobar / Rechazar ────────────────────────────────────
  const handleResolver = async (aprobado: boolean) => {
    if (!modalAprobar) return;
    if (!modalAprobar.resolucion.trim())
      return alert("Debe ingresar una resolución.");
    try {
      await GarantiaService.resolverGarantia({
        id_garantia: modalAprobar.id,
        aprobado,
        resolucion: modalAprobar.resolucion,
      });
      alert(
        aprobado
          ? "Garantía autorizada. El cliente debe traer la pieza defectuosa para recibir el reemplazo."
          : "Garantía rechazada. Se notificará al vendedor.",
      );
      setModalAprobar(null);
      cargarDatosTab();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // ── TAB 2: Recibir pieza física ──────────────────────────────────
  const handleRecibir = async () => {
    if (!modalRecibir) return;
    try {
      await GarantiaService.recibirRetorno({
        id_garantia: modalRecibir.id,
        condicion_recibido: modalRecibir.condicion,
        notas_inspeccion: modalRecibir.notas,
      });
      alert(
        "Pieza recibida. El stock ha sido descontado y el cliente puede recibir su reemplazo.",
      );
      setModalRecibir(null);
      cargarDatosTab();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // ── TAB 3: Inspección técnica ────────────────────────────────────
  // El destino se deriva automáticamente del resultado — el usuario
  // solo pulsa uno de los 3 botones de acción directa.
  const DESTINO_POR_RESULTADO: Record<string, string> = {
    descarte: "baja_inventario",
    devolver_proveedor: "retorno_proveedor",
    aprobado_reventa: "inventario_reacondicionado",
  };

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
          2. Esperando Pieza (
          {activeTab === 1 && !loading ? pendientesRecepcion.length : "..."})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 2 ? styles.activeTab : ""}`}
          onClick={() => setActiveTab(2)}
        >
          3. Inspección Técnica (
          {activeTab === 2 && !loading ? pendientesInspeccion.length : "..."})
        </button>
      </div>

      {loading ? (
        <p>Cargando datos...</p>
      ) : (
        <>
          {/* ── TAB 1: SOLICITUDES NUEVAS ── */}
          {activeTab === 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Cliente</th>
                  <th>Motivo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendientesAprobar.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay solicitudes pendientes.</td>
                  </tr>
                ) : (
                  pendientesAprobar.map((g) => (
                    <tr key={g.id_garantia}>
                      <td>
                        {new Date(g.fecha_solicitud).toLocaleDateString()}
                      </td>
                      <td>
                        <strong>{g.sku}</strong>
                        <br />
                        {g.producto} (x{g.cantidad})
                      </td>
                      <td>{g.cliente}</td>
                      <td>{g.motivo_reclamo}</td>
                      <td>
                        <button
                          className={styles.btnAction}
                          onClick={() =>
                            setModalAprobar({
                              visible: true,
                              id: g.id_garantia,
                              resolucion: "",
                            })
                          }
                        >
                          Evaluar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* ── TAB 2: RECEPCIÓN FÍSICA ── */}
          {activeTab === 1 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Aprobada el</th>
                  <th>Producto</th>
                  <th>Cliente</th>
                  <th>Motivo Aprobado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendientesRecepcion.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay piezas pendientes de recibir.</td>
                  </tr>
                ) : (
                  pendientesRecepcion.map((g) => (
                    <tr key={g.id_garantia}>
                      <td>
                        {new Date(g.fecha_solicitud).toLocaleDateString()}
                      </td>
                      <td>
                        <strong>{g.sku}</strong>
                        <br />
                        {g.producto} (x{g.cantidad})
                      </td>
                      <td>{g.cliente}</td>
                      <td>{g.motivo_reclamo}</td>
                      <td>
                        <button
                          className={styles.btnAction}
                          style={{ backgroundColor: "#0ea5e9" }}
                          onClick={() =>
                            setModalRecibir({
                              visible: true,
                              id: g.id_garantia,
                              condicion: "bueno",
                              notas: "",
                            })
                          }
                        >
                          Recibir Físico
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* ── TAB 3: INSPECCIÓN TÉCNICA ── */}
          {activeTab === 2 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Recibido el</th>
                  <th>Producto</th>
                  <th>Recibido por</th>
                  <th>Condición Inicial</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendientesInspeccion.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay piezas pendientes de inspección.</td>
                  </tr>
                ) : (
                  pendientesInspeccion.map((r) => (
                    <tr key={r.id_retorno}>
                      <td>{new Date(r.fecha_ingreso).toLocaleString()}</td>
                      <td>
                        <strong>{r.sku}</strong>
                        <br />
                        {r.producto} (x{r.cantidad})
                      </td>
                      <td>{r.recibio_nombre}</td>
                      <td>
                        <span className={styles.badge}>
                          {r.condicion_recibido}
                        </span>
                        <br />
                        <small>{r.notas_inspeccion}</small>
                      </td>
                      <td>
                        <button
                          className={styles.btnAction}
                          style={{ backgroundColor: "#8b5cf6" }}
                          onClick={() =>
                            setModalInspeccion({
                              visible: true,
                              id: r.id_retorno,
                              notas: "",
                            })
                          }
                        >
                          Dictaminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ═══════════════ MODALES ═══════════════ */}

      {/* Modal 1: Aprobar / Rechazar */}
      {modalAprobar && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Resolver Garantía</h2>
            <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
              <label className={styles.label}>Resolución / Justificación</label>
              <textarea
                className={styles.textarea}
                rows={4}
                value={modalAprobar.resolucion}
                onChange={(e) =>
                  setModalAprobar({
                    ...modalAprobar,
                    resolucion: e.target.value,
                  })
                }
                placeholder="Ej. Procede cambio por defecto de fábrica comprobado..."
              />
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#6b7280",
                  marginTop: "0.5rem",
                }}
              >
                Al autorizar, el cliente deberá traer la pieza defectuosa. El
                reemplazo se entregará al registrar la devolución.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.btnCancel}
                onClick={() => setModalAprobar(null)}
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
                Autorizar Garantía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Recibir Pieza */}
      {modalRecibir && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Recibir Producto Dañado</h2>

            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #f59e0b",
                borderRadius: "6px",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.875rem",
                color: "#92400e",
              }}
            >
              <strong>⚠ Al confirmar:</strong> se descontará una unidad del
              inventario y se autorizará la entrega del producto nuevo al
              cliente.
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Condición Visual</label>
              <select
                className={styles.select}
                value={modalRecibir.condicion}
                onChange={(e) =>
                  setModalRecibir({
                    ...modalRecibir,
                    condicion: e.target.value,
                  })
                }
              >
                <option value="bueno">Se ve en buen estado general</option>
                <option value="dañado_leve">
                  Dañado Levemente (raspones, uso normal)
                </option>
                <option value="dañado_grave">
                  Dañado Gravemente (roto, quemado, piezas faltantes)
                </option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Notas de Recepción</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={modalRecibir.notas}
                onChange={(e) =>
                  setModalRecibir({ ...modalRecibir, notas: e.target.value })
                }
                placeholder="Viene en su caja original..."
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.btnCancel}
                onClick={() => setModalRecibir(null)}
              >
                Cancelar
              </button>
              <button className={styles.btnApprove} onClick={handleRecibir}>
                Recibir Pieza y Entregar Reemplazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Inspección Técnica */}
      {modalInspeccion && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Inspección Técnica de Bodega</h2>

            <div className={styles.formGroup} style={{ marginTop: "1rem" }}>
              <label className={styles.label}>Observaciones Técnicas</label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={modalInspeccion.notas}
                onChange={(e) =>
                  setModalInspeccion({
                    ...modalInspeccion,
                    notas: e.target.value,
                  })
                }
                placeholder="Ej. Se midió voltaje, el componente está quemado internamente..."
              />
            </div>

            <p
              style={{
                fontSize: "0.85rem",
                color: "#6b7280",
                marginBottom: "1rem",
              }}
            >
              Seleccione el dictamen para cerrar la inspección:
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <button
                onClick={() => handleInspeccionar("aprobado_reventa")}
                style={{
                  background: "#d1fae5",
                  color: "#065f46",
                  border: "2px solid #16a34a",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  fontWeight: "bold",
                  textAlign: "left",
                  fontSize: "0.95rem",
                }}
              >
                Vender como segunda — Pasar a lote reacondicionado
              </button>

              <button
                onClick={() => handleInspeccionar("devolver_proveedor")}
                style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "2px solid #f59e0b",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  fontWeight: "bold",
                  textAlign: "left",
                  fontSize: "0.95rem",
                }}
              >
                Reclamar al proveedor — Defecto de fabricación comprobado
              </button>

              <button
                onClick={() => handleInspeccionar("descarte")}
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  border: "2px solid #dc2626",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  fontWeight: "bold",
                  textAlign: "left",
                  fontSize: "0.95rem",
                }}
              >
                Dar de baja — Pieza sin valor, descarte definitivo
              </button>
            </div>

            <div
              className={styles.modalActions}
              style={{ marginTop: "1.5rem" }}
            >
              <button
                className={styles.btnCancel}
                onClick={() => setModalInspeccion(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
