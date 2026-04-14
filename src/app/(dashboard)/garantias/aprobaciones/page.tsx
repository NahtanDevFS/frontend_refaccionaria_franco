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
  const [modalInspeccion, setModalInspeccion] = useState<{
    visible: boolean;
    id: number;
    resultado: string;
    destino: string;
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

  // --- ACCIONES TAB 1 (Aprobar/Rechazar) ---
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
          ? "Garantía aprobada. Se ha descontado el stock de reemplazo."
          : "Garantía rechazada.",
      );
      setModalAprobar(null);
      cargarDatosTab();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // --- ACCIONES TAB 2 (Recepcion Física) ---
  const handleRecibir = async () => {
    if (!modalRecibir) return;
    try {
      await GarantiaService.recibirRetorno({
        id_garantia: modalRecibir.id,
        condicion_recibido: modalRecibir.condicion,
        notas_inspeccion: modalRecibir.notas,
      });
      alert("Pieza recibida en sucursal correctamente.");
      setModalRecibir(null);
      cargarDatosTab();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // --- ACCIONES TAB 3 (Inspeccion y Reventa) ---
  const handleInspeccionar = async () => {
    if (!modalInspeccion) return;
    try {
      await GarantiaService.inspeccionarRetorno({
        id_retorno: modalInspeccion.id,
        resultado: modalInspeccion.resultado,
        destino: modalInspeccion.destino,
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

      {/* SISTEMA DE PESTAÑAS */}
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
          {/* TAB 1: SOLICITUDES NUEVAS */}
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

          {/* TAB 2: RECEPCIÓN FÍSICA */}
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

          {/* TAB 3: INSPECCIÓN TÉCNICA */}
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
                              resultado: "descarte",
                              destino: "basura",
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

      {/* ================= MODALES ================= */}

      {/* Modal 1: Aprobar/Rechazar */}
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
                Aprobar y Entregar Nuevo
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
            <p style={{ marginBottom: "1rem", color: "gray" }}>
              El cliente ha traído la pieza a la tienda.
            </p>
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
              <button className={styles.btnAction} onClick={handleRecibir}>
                Confirmar Ingreso a Bodega
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
              <label className={styles.label}>Dictamen / Resultado</label>
              <select
                className={styles.select}
                value={modalInspeccion.resultado}
                onChange={(e) =>
                  setModalInspeccion({
                    ...modalInspeccion,
                    resultado: e.target.value,
                  })
                }
              >
                <option value="descarte">Pérdida Total (Descarte)</option>
                <option value="devolver_proveedor">
                  Reclamar al Proveedor Internacional
                </option>
                <option value="aprobado_reventa">
                  Funciona: Pasar a Lote Reacondicionado (Segunda)
                </option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Destino Físico</label>
              <input
                type="text"
                className={styles.input}
                value={modalInspeccion.destino}
                onChange={(e) =>
                  setModalInspeccion({
                    ...modalInspeccion,
                    destino: e.target.value,
                  })
                }
                placeholder="Ej. Basurero, Bodega de Defectuosos..."
              />
            </div>

            <div className={styles.formGroup}>
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
                placeholder="Se midió voltaje y está quemado internamente..."
              />
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.btnCancel}
                onClick={() => setModalInspeccion(null)}
              >
                Cancelar
              </button>
              <button
                className={styles.btnAction}
                style={{ backgroundColor: "#8b5cf6" }}
                onClick={handleInspeccionar}
              >
                Finalizar Inspección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
