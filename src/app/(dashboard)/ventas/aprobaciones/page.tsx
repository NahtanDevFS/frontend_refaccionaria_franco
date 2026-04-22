"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../historial/Ventas.module.css";
import apStyles from "./Aprobaciones.module.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hoy() {
  return new Date().toISOString().split("T")[0];
}

function hace30() {
  return new Date(Date.now() - 29 * 86400000).toISOString().split("T")[0];
}

const LABELS_ESTADO: Record<string, string> = {
  pagada: "Pagada",
  pendiente_pago: "Pend. Pago",
  pendiente_autorizacion: "Pend. Autorización",
  pendiente_cobro_contra_entrega: "Contra Entrega",
  rechazada: "Rechazada",
  anulada: "Anulada",
};

const BADGE_ESTADO: Record<string, string> = {
  pagada: "badgeSuccess",
  pendiente_pago: "badgeWarning",
  pendiente_autorizacion: "badgeInfo",
  pendiente_cobro_contra_entrega: "badgeInfo",
  rechazada: "badgeDanger",
  anulada: "badgeDanger",
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function AprobacionesPage() {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  // ── Tab activo ──────────────────────────────────────────────────────────────
  const [tabActual, setTabActual] = useState<"pendientes" | "historial">(
    "pendientes",
  );

  // ── Tab Pendientes ──────────────────────────────────────────────────────────
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(true);
  const [errorPendientes, setErrorPendientes] = useState<string | null>(null);

  // ── Tab Historial ───────────────────────────────────────────────────────────
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);
  const [desde, setDesde] = useState(hace30());
  const [hasta, setHasta] = useState(hoy());
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [idVendedor, setIdVendedor] = useState("");

  function getToken() {
    return document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2] ?? "";
  }

  // ── Carga inicial ────────────────────────────────────────────────────────────
  useEffect(() => {
    cargarPendientes();
    cargarVendedores();
  }, []);

  useEffect(() => {
    if (tabActual === "historial" && historial.length === 0) {
      cargarHistorial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActual]);

  // ─── Pendientes ───────────────────────────────────────────────────────────
  const cargarPendientes = async () => {
    try {
      setCargandoPendientes(true);
      setErrorPendientes(null);
      const res = await fetch(`${API_URL}/ventas/autorizaciones/pendientes`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Error");
      setPendientes(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      setErrorPendientes(err.message);
    } finally {
      setCargandoPendientes(false);
    }
  };

  const resolver = async (id_venta: number, aprobado: boolean) => {
    const mensaje = aprobado
      ? "¿Aprobar el descuento solicitado para esta venta?"
      : "¿Rechazar el descuento solicitado? Se aplicará automáticamente un descuento base del 5% y la venta continuará.";

    if (!confirm(mensaje)) return;

    try {
      const res = await fetch(`${API_URL}/ventas/autorizaciones/resolver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id_venta, aprobado }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Error");
      cargarPendientes();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // ─── Historial ────────────────────────────────────────────────────────────
  const cargarVendedores = async () => {
    try {
      const res = await fetch(`${API_URL}/ventas/vendedores/activos`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setVendedores(data.data ?? []);
    } catch {
      // silencioso — no bloquea la página
    }
  };

  const cargarHistorial = async () => {
    try {
      setCargandoHistorial(true);
      setErrorHistorial(null);
      const params = new URLSearchParams({ desde, hasta });
      if (idVendedor) params.append("id_vendedor", idVendedor);

      const res = await fetch(
        `${API_URL}/ventas/descuentos/historial?${params}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Error");
      setHistorial(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      setErrorHistorial(err.message);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Gestión de Descuentos</h1>

      {/* Tabs */}
      <div className={apStyles.tabs}>
        <button
          className={`${apStyles.tabBtn} ${tabActual === "pendientes" ? apStyles.tabActive : ""}`}
          onClick={() => setTabActual("pendientes")}
        >
          Pendientes de Autorización
          {pendientes.length > 0 && (
            <span className={apStyles.tabBadge}>{pendientes.length}</span>
          )}
        </button>
        <button
          className={`${apStyles.tabBtn} ${tabActual === "historial" ? apStyles.tabActive : ""}`}
          onClick={() => setTabActual("historial")}
        >
          Historial de Descuentos
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: PENDIENTES
         ══════════════════════════════════════════════════════════════ */}
      {tabActual === "pendientes" && (
        <div className={styles.card}>
          {errorPendientes && (
            <div className={styles.error}>{errorPendientes}</div>
          )}
          {cargandoPendientes ? (
            <p style={{ padding: "2rem", color: "#6b7280" }}>Cargando...</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID Venta</th>
                    <th>Fecha</th>
                    <th>Vendedor</th>
                    <th>Cliente</th>
                    <th>Subtotal</th>
                    <th>Descuento</th>
                    <th>Total Final</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: "center",
                          padding: "2rem",
                          color: "#6b7280",
                        }}
                      >
                        No hay peticiones pendientes
                      </td>
                    </tr>
                  ) : (
                    pendientes.map((v) => (
                      <tr key={v.id_venta}>
                        <td style={{ fontWeight: "bold" }}>#{v.id_venta}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {fmtFecha(v.fecha)}
                        </td>
                        <td>{v.vendedor}</td>
                        <td>{v.cliente}</td>
                        <td>Q {Number(v.subtotal).toFixed(2)}</td>
                        <td style={{ color: "#dc2626", fontWeight: 600 }}>
                          {Number(v.pct_descuento).toFixed(1)}%
                          <span
                            style={{
                              color: "#6b7280",
                              fontWeight: 400,
                              marginLeft: "0.3rem",
                            }}
                          >
                            (Q {Number(v.descuento_monto).toFixed(2)})
                          </span>
                        </td>
                        <td style={{ fontWeight: "bold" }}>
                          Q {Number(v.total).toFixed(2)}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              className={apStyles.btnAprobar}
                              onClick={() => resolver(v.id_venta, true)}
                            >
                              Aprobar
                            </button>
                            <button
                              className={apStyles.btnRechazar}
                              title="Rechaza el descuento solicitado y aplica un 5% automáticamente"
                              onClick={() => resolver(v.id_venta, false)}
                            >
                              Rechazar y aplicar un 5%
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: HISTORIAL DE DESCUENTOS
         ══════════════════════════════════════════════════════════════ */}
      {tabActual === "historial" && (
        <>
          {/* Filtros */}
          <div className={styles.card}>
            <div className={styles.filtrosGrid}>
              <div className={styles.filterGroup}>
                <label>Desde</label>
                <input
                  type="date"
                  className={styles.input}
                  value={desde}
                  max={hasta}
                  onChange={(e) => setDesde(e.target.value)}
                />
              </div>
              <div className={styles.filterGroup}>
                <label>Hasta</label>
                <input
                  type="date"
                  className={styles.input}
                  value={hasta}
                  min={desde}
                  max={hoy()}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>
              <div className={styles.filterGroup}>
                <label>Vendedor</label>
                <select
                  className={styles.select}
                  value={idVendedor}
                  onChange={(e) => setIdVendedor(e.target.value)}
                >
                  <option value="">Todos</option>
                  {vendedores.map((v) => (
                    <option key={v.id_empleado} value={v.id_empleado}>
                      {v.nombre} {v.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.filterActions}>
                <button
                  className={styles.btnPrimary}
                  onClick={cargarHistorial}
                  disabled={cargandoHistorial}
                >
                  {cargandoHistorial ? "Buscando..." : "Filtrar"}
                </button>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className={styles.card}>
            {errorHistorial && (
              <div className={styles.error}>{errorHistorial}</div>
            )}
            {cargandoHistorial ? (
              <p style={{ padding: "2rem", color: "#6b7280" }}>
                Cargando historial...
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID Venta</th>
                      <th>Fecha</th>
                      <th>Vendedor</th>
                      <th>Cliente</th>
                      <th>Subtotal</th>
                      <th>Descuento</th>
                      <th>Total Final</th>
                      <th>Tipo</th>
                      <th>Aprobado por</th>
                      <th>Estado venta</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "#6b7280",
                          }}
                        >
                          No hay descuentos registrados en este período.
                        </td>
                      </tr>
                    ) : (
                      historial.map((v) => (
                        <tr key={v.id_venta}>
                          <td style={{ fontWeight: "bold" }}>#{v.id_venta}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {fmtFecha(v.fecha)}
                          </td>
                          <td>{v.vendedor}</td>
                          <td>{v.cliente}</td>
                          <td>Q {Number(v.subtotal).toFixed(2)}</td>
                          <td style={{ color: "#dc2626", fontWeight: 600 }}>
                            {Number(v.pct_descuento).toFixed(1)}%
                            <span
                              style={{
                                color: "#6b7280",
                                fontWeight: 400,
                                marginLeft: "0.3rem",
                              }}
                            >
                              (Q {Number(v.descuento_monto).toFixed(2)})
                            </span>
                          </td>
                          <td style={{ fontWeight: "bold" }}>
                            Q {Number(v.total).toFixed(2)}
                          </td>
                          <td>
                            {v.tipo_descuento === "requirio_aprobacion" ? (
                              <span className={apStyles.badgeAprobacion}>
                                Requirió aprobación
                              </span>
                            ) : (
                              <span className={apStyles.badgeAutomatico}>
                                Automático
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: "0.82rem", color: "#374151" }}>
                            {v.aprobado_por ?? (
                              <span style={{ color: "#9ca3af" }}>—</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${styles[BADGE_ESTADO[v.estado] ?? ""]}`}
                            >
                              {LABELS_ESTADO[v.estado] ?? v.estado}
                            </span>
                          </td>
                          <td>
                            <Link
                              href={`/ventas/${v.id_venta}`}
                              className={styles.btnDetalle}
                            >
                              Ver
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
        </>
      )}
    </div>
  );
}
