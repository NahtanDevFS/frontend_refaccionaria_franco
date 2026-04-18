"use client";

import { useEffect, useRef, useState } from "react";
import { CajaService } from "@/services/caja.service";
import {
  OrdenPendienteCaja,
  ResumenCaja,
  HistorialCobro,
  CobroRepartidorPendiente,
  ArqueoHistorial,
  ResumenArqueos,
  CajeroOpcion,
} from "@/types/caja.types";
import styles from "./Caja.module.css";

type Tab = "cobros" | "arqueo" | "historial" | "arqueos";

function hoy() {
  return new Date().toISOString().split("T")[0];
}
function hace30() {
  return new Date(Date.now() - 29 * 86400000).toISOString().split("T")[0];
}

export default function CajaPage() {
  const [tabActual, setTabActual] = useState<Tab>("cobros");
  const [cargando, setCargando] = useState(false);

  // ── Tab 1: Cobros pendientes ───────────────────────────────────────────────
  const [pendientes, setPendientes] = useState<OrdenPendienteCaja[]>([]);
  const [modalCobro, setModalCobro] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] =
    useState<OrdenPendienteCaja | null>(null);
  const [metodoPago, setMetodoPago] = useState<
    "efectivo" | "tarjeta" | "transferencia"
  >("efectivo");
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");

  // ── Tab 2: Arqueo + Liquidación ────────────────────────────────────────────
  const [resumen, setResumen] = useState<ResumenCaja[]>([]);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [obsArqueo, setObservacionesArqueo] = useState("");
  // Liquidación
  const [cobrosRepartidor, setCobrosRepartidor] = useState<
    CobroRepartidorPendiente[]
  >([]);
  const [pagosSeleccionados, setPagosSeleccionados] = useState<Set<number>>(
    new Set(),
  );
  const [liquidando, setLiquidando] = useState(false);

  // ── Tab 3: Historial de cobros ─────────────────────────────────────────────
  const [historial, setHistorial] = useState<HistorialCobro[]>([]);
  const [fechaDesde, setFechaDesde] = useState(hoy());
  const [fechaHasta, setFechaHasta] = useState(hoy());
  const [modalFactura, setModalFactura] = useState<HistorialCobro | null>(null);
  const facturaRef = useRef<HTMLDivElement>(null);

  // ── Tab 4: Historial de arqueos ────────────────────────────────────────────
  const [arqueos, setArqueos] = useState<ArqueoHistorial[]>([]);
  const [resumenArqueos, setResumenArqueos] = useState<ResumenArqueos | null>(
    null,
  );
  const [arqueoDesde, setArqueoDesde] = useState(hace30());
  const [arqueoHasta, setArqueoHasta] = useState(hoy());
  const [cajeros, setCajeros] = useState<CajeroOpcion[]>([]);
  const [cajerosLoaded, setCajerosLoaded] = useState(false);
  const [filtroCajero, setFiltroCajero] = useState("");
  const [esSupervisor, setEsSupervisor] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("usuario");
    if (u) {
      const rol = JSON.parse(u).rol ?? "";
      setEsSupervisor(
        ["ADMINISTRADOR", "GERENTE_REGIONAL", "SUPERVISOR_SUCURSAL"].includes(
          rol,
        ),
      );
    }
  }, []);

  useEffect(() => {
    if (tabActual === "cobros") cargarPendientes();
    if (tabActual === "arqueo") {
      cargarResumen();
      cargarCobrosRepartidor();
    }
    if (tabActual === "historial") cargarHistorial();
    if (tabActual === "arqueos") {
      cargarHistorialArqueos();
      if (!cajerosLoaded && esSupervisor) cargarCajeros();
    }
  }, [tabActual]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmtQ = (n: number) => `Q ${n.toFixed(2)}`;
  const fmtFecha = (iso: string) => new Date(iso).toLocaleString("es-GT");
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-GT");
  const labelMetodo = (m: string) =>
    m === "efectivo"
      ? "Efectivo"
      : m === "tarjeta"
        ? "Tarjeta POS"
        : "Transferencia";

  // ── Tab 1 ─────────────────────────────────────────────────────────────────
  const cargarPendientes = async () => {
    try {
      setCargando(true);
      setPendientes(await CajaService.obtenerPendientes());
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCargando(false);
    }
  };

  const abrirModalCobro = (orden: OrdenPendienteCaja) => {
    setOrdenSeleccionada(orden);
    setMonto(orden.total.toString());
    setMetodoPago("efectivo");
    setReferencia("");
    setModalCobro(true);
  };

  const procesarPago = async () => {
    if (!ordenSeleccionada) return;
    if (Number(monto) < ordenSeleccionada.total)
      return alert("El monto es menor al total de la orden.");
    if (metodoPago !== "efectivo" && !referencia)
      return alert("Ingrese número de autorización o referencia.");
    try {
      await CajaService.registrarPago({
        id_venta: ordenSeleccionada.id_venta,
        metodo_pago: metodoPago,
        monto: Number(monto),
        referencia: referencia || undefined,
      });
      alert("Pago registrado exitosamente.");
      setModalCobro(false);
      cargarPendientes();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // ── Tab 2 ─────────────────────────────────────────────────────────────────
  const cargarResumen = async () => {
    try {
      setCargando(true);
      setResumen(await CajaService.obtenerResumen());
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCargando(false);
    }
  };

  const cargarCobrosRepartidor = async () => {
    try {
      const data = await CajaService.obtenerCobrosRepartidoresPendientes();
      setCobrosRepartidor(Array.isArray(data) ? data : []);
    } catch {
      setCobrosRepartidor([]);
    }
  };

  const togglePago = (id: number) => {
    setPagosSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTodosRepartidor = (
    id_repartidor: number,
    seleccionar: boolean,
  ) => {
    const ids = cobrosRepartidor
      .filter((c) => c.id_repartidor === id_repartidor)
      .map((c) => c.id_pago);
    setPagosSeleccionados((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (seleccionar ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const liquidar = async (id_repartidor: number) => {
    const ids = cobrosRepartidor
      .filter(
        (c) =>
          c.id_repartidor === id_repartidor &&
          pagosSeleccionados.has(c.id_pago),
      )
      .map((c) => c.id_pago);
    if (!ids.length) return alert("Seleccione al menos un cobro a liquidar.");
    const total = cobrosRepartidor
      .filter((c) => ids.includes(c.id_pago))
      .reduce((s, c) => s + c.monto, 0);
    if (
      !confirm(
        `¿Confirmar recepción de Q${total.toFixed(2)} de este repartidor?`,
      )
    )
      return;
    try {
      setLiquidando(true);
      const resultado = await CajaService.liquidarRepartidor({
        id_repartidor,
        id_pagos: ids,
      });
      alert(
        `Liquidación registrada. Q${resultado.total_recibido.toFixed(2)} añadidos a tu caja.`,
      );
      setPagosSeleccionados(new Set());
      await Promise.all([cargarResumen(), cargarCobrosRepartidor()]);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLiquidando(false);
    }
  };

  const procesarArqueo = async () => {
    if (!efectivoContado || Number(efectivoContado) < 0)
      return alert("Ingrese un monto válido.");
    if (cobrosRepartidor.length > 0)
      return alert(
        "Hay cobros de repartidores sin liquidar. Liquídalos primero antes de cerrar caja.",
      );
    if (!confirm("¿Registrar cierre de caja?")) return;
    try {
      await CajaService.registrarArqueo({
        efectivo_contado: Number(efectivoContado),
        observaciones: obsArqueo || undefined,
      });
      alert("Arqueo registrado correctamente.");
      setEfectivoContado("");
      setObservacionesArqueo("");
      cargarResumen();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const efectivoSistema =
    resumen.find((r) => r.metodo_pago === "efectivo")?.total || 0;

  // Agrupar cobros de repartidores por repartidor
  const cobrosAgrupados = cobrosRepartidor.reduce<
    Record<
      string,
      { id: number; nombre: string; cobros: CobroRepartidorPendiente[] }
    >
  >((acc, c) => {
    const key = String(c.id_repartidor);
    if (!acc[key])
      acc[key] = { id: c.id_repartidor, nombre: c.repartidor, cobros: [] };
    acc[key].cobros.push(c);
    return acc;
  }, {});

  // ── Tab 3 ─────────────────────────────────────────────────────────────────
  const cargarHistorial = async () => {
    try {
      setCargando(true);
      setHistorial(await CajaService.obtenerHistorial(fechaDesde, fechaHasta));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCargando(false);
    }
  };

  const calcularIva = (cobro: HistorialCobro) => {
    const base = cobro.total / 1.12;
    return { baseImponible: base, iva: cobro.total - base };
  };

  const imprimirFactura = () => {
    if (!facturaRef.current) return;
    const ventana = window.open("", "_blank", "width=800,height=600");
    if (!ventana) return;
    ventana.document.write(`<html><head><title>Comprobante</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;padding:32px;color:#111}
      .imp-empresa{margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #111}.imp-empresa h2{font-size:17px;font-weight:bold;margin-bottom:6px}
      .imp-numero{font-size:13px;font-weight:bold;margin:16px 0 20px}.imp-seccion{margin-bottom:20px}
      .imp-seccion h3{font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb}
      .imp-fila{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:12px}.imp-fila span:first-child{color:#555}
      table{width:100%;border-collapse:collapse}table th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#888;padding:4px 0;border-bottom:1px solid #e5e7eb}
      table th:last-child,table td:last-child{text-align:right}table td{padding:6px 0;font-size:12px;border-bottom:1px solid #f3f4f6}
      .imp-fila-total{display:flex;justify-content:space-between;padding:4px 0;font-size:12px}.imp-fila-total span:first-child{color:#555}
      .imp-total-final{display:flex;justify-content:space-between;font-size:15px;font-weight:bold;padding:10px 0 6px;border-top:2px solid #111;margin-top:8px}
      .imp-footer{margin-top:24px;color:#999;font-size:10px;border-top:1px solid #e5e7eb;padding-top:12px}
      </style></head><body>${facturaRef.current.innerHTML}</body></html>`);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 300);
  };

  // ── Tab 4 ─────────────────────────────────────────────────────────────────
  const cargarHistorialArqueos = async () => {
    try {
      setCargando(true);
      const resp = await CajaService.obtenerHistorialArqueos(
        arqueoDesde,
        arqueoHasta,
        filtroCajero ? Number(filtroCajero) : undefined,
      );
      setArqueos(resp.arqueos);
      setResumenArqueos(resp.resumen);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCargando(false);
    }
  };

  const cargarCajeros = async () => {
    try {
      setCajeros(await CajaService.obtenerCajeros());
      setCajerosLoaded(true);
    } catch {
      setCajerosLoaded(true);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Caja y Cobros</h1>

      <div className={styles.tabs}>
        {(["cobros", "arqueo", "historial", "arqueos"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tabBtn} ${tabActual === t ? styles.tabActive : ""}`}
            onClick={() => setTabActual(t)}
          >
            {t === "cobros" && "Pendientes de Cobro"}
            {t === "arqueo" &&
              `Arqueo / Liquidación${cobrosRepartidor.length > 0 ? ` (${cobrosRepartidor.length})` : ""}`}
            {t === "historial" && "Historial de Cobros"}
            {t === "arqueos" && "Historial de Arqueos"}
          </button>
        ))}
      </div>

      {cargando ? (
        <p style={{ padding: "2rem", color: "#6b7280" }}>Cargando...</p>
      ) : (
        <>
          {/* ═══ TAB 1: COBROS PENDIENTES ═══════════════════════════════ */}
          {tabActual === "cobros" && (
            <div className={styles.card}>
              {pendientes.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "gray",
                    padding: "2rem",
                  }}
                >
                  No hay órdenes pendientes.
                </p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Total</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientes.map((p) => (
                      <tr key={p.id_venta}>
                        <td>
                          <strong>#{p.id_venta}</strong>
                        </td>
                        <td>{p.cliente}</td>
                        <td>{new Date(p.created_at).toLocaleString()}</td>
                        <td>
                          {p.pago_contra_entrega ? (
                            <span className={styles.badgeCE}>
                              Contra Entrega
                            </span>
                          ) : (
                            <span className={styles.badgeNormal}>
                              Mostrador
                            </span>
                          )}
                        </td>
                        <td>
                          <strong>Q {p.total.toFixed(2)}</strong>
                        </td>
                        <td>
                          <button
                            className={styles.btnCobrar}
                            onClick={() => abrirModalCobro(p)}
                          >
                            Cobrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ═══ TAB 2: ARQUEO + LIQUIDACIÓN ════════════════════════════ */}
          {tabActual === "arqueo" && (
            <>
              {/* ── Sección liquidación de repartidores ────────────────── */}
              {Object.keys(cobrosAgrupados).length > 0 && (
                <div
                  className={styles.card}
                  style={{
                    marginBottom: "1.5rem",
                    borderLeft: "4px solid #f59e0b",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1rem",
                      fontWeight: 700,
                      marginBottom: "1rem",
                      color: "#92400e",
                    }}
                  >
                    ⚠ Cobros de Repartidores Pendientes de Liquidar
                  </h2>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "#6b7280",
                      marginBottom: "1.25rem",
                    }}
                  >
                    Los repartidores listados cobrado efectivo en ruta.
                    Selecciona los cobros recibidos y confirma la liquidación
                    para incluirlos en tu arqueo.
                  </p>

                  {Object.values(cobrosAgrupados).map((grupo) => {
                    const totalGrupo = grupo.cobros.reduce(
                      (s, c) => s + c.monto,
                      0,
                    );
                    const todosSeleccionados = grupo.cobros.every((c) =>
                      pagosSeleccionados.has(c.id_pago),
                    );
                    return (
                      <div
                        key={grupo.id}
                        style={{
                          marginBottom: "1.25rem",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: 8,
                          padding: "1rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <div>
                            <strong style={{ color: "#92400e" }}>
                              🛵 {grupo.nombre}
                            </strong>
                            <span
                              style={{
                                marginLeft: "0.75rem",
                                fontSize: "0.82rem",
                                color: "#6b7280",
                              }}
                            >
                              {grupo.cobros.length} cobro(s) — Total:{" "}
                              <strong>{fmtQ(totalGrupo)}</strong>
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() =>
                                toggleTodosRepartidor(
                                  grupo.id,
                                  !todosSeleccionados,
                                )
                              }
                              style={{
                                fontSize: "0.78rem",
                                padding: "0.3rem 0.7rem",
                                background: "white",
                                border: "1px solid #d1d5db",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                            >
                              {todosSeleccionados
                                ? "Deseleccionar todos"
                                : "Seleccionar todos"}
                            </button>
                            <button
                              onClick={() => liquidar(grupo.id)}
                              disabled={
                                liquidando ||
                                !grupo.cobros.some((c) =>
                                  pagosSeleccionados.has(c.id_pago),
                                )
                              }
                              style={{
                                fontSize: "0.82rem",
                                padding: "0.3rem 0.9rem",
                                background: grupo.cobros.some((c) =>
                                  pagosSeleccionados.has(c.id_pago),
                                )
                                  ? "#16a34a"
                                  : "#9ca3af",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              {liquidando
                                ? "Liquidando..."
                                : "Confirmar recepción"}
                            </button>
                          </div>
                        </div>

                        <table
                          className={styles.table}
                          style={{ fontSize: "0.82rem" }}
                        >
                          <thead>
                            <tr>
                              <th style={{ width: 32 }}></th>
                              <th>#Pago</th>
                              <th>Cliente</th>
                              <th>Dirección</th>
                              <th>Fecha</th>
                              <th>Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.cobros.map((c) => (
                              <tr
                                key={c.id_pago}
                                style={{ cursor: "pointer" }}
                                onClick={() => togglePago(c.id_pago)}
                              >
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={pagosSeleccionados.has(c.id_pago)}
                                    onChange={() => togglePago(c.id_pago)}
                                    style={{ width: 16, height: 16 }}
                                  />
                                </td>
                                <td>#{c.id_pago}</td>
                                <td>{c.cliente}</td>
                                <td style={{ color: "#6b7280" }}>
                                  {c.direccion_entrega ?? "—"}
                                </td>
                                <td>{fmtFecha(c.fecha_pago)}</td>
                                <td>
                                  <strong>{fmtQ(c.monto)}</strong>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Arqueo ─────────────────────────────────────────────── */}
              <div className={styles.arqueoGrid}>
                <div className={styles.card}>
                  <h2
                    style={{
                      marginBottom: "1rem",
                      borderBottom: "1px solid #eee",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    Resumen de Cobros de Hoy
                  </h2>
                  <ul className={styles.resumenList}>
                    {resumen.length === 0 ? (
                      <li
                        style={{ color: "#6b7280", justifyContent: "center" }}
                      >
                        Sin cobros registrados hoy
                      </li>
                    ) : (
                      resumen.map((r) => (
                        <li key={r.metodo_pago}>
                          <span>{labelMetodo(r.metodo_pago)}</span>
                          <strong>{fmtQ(r.total)}</strong>
                        </li>
                      ))
                    )}
                  </ul>
                  {cobrosRepartidor.length > 0 && (
                    <p
                      style={{
                        marginTop: "0.75rem",
                        fontSize: "0.8rem",
                        color: "#d97706",
                        fontWeight: 600,
                      }}
                    >
                      ⚠ Aún hay cobros de repartidores sin liquidar que no están
                      incluidos aquí.
                    </p>
                  )}
                </div>

                <div className={styles.card}>
                  <h2
                    style={{
                      marginBottom: "1rem",
                      borderBottom: "1px solid #eee",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    Registrar Cierre de Caja
                  </h2>
                  <div className={styles.inputGroup}>
                    <label>
                      Efectivo según sistema:{" "}
                      <strong>{fmtQ(efectivoSistema)}</strong>
                    </label>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Efectivo físico contado (Q):</label>
                    <input
                      type="number"
                      className={styles.input}
                      placeholder="0.00"
                      value={efectivoContado}
                      onChange={(e) => setEfectivoContado(e.target.value)}
                    />
                  </div>
                  {efectivoContado && (
                    <div
                      style={{
                        padding: "0.75rem",
                        borderRadius: 6,
                        marginBottom: "1rem",
                        background:
                          Number(efectivoContado) === efectivoSistema
                            ? "#d1fae5"
                            : "#fee2e2",
                        color:
                          Number(efectivoContado) === efectivoSistema
                            ? "#065f46"
                            : "#991b1b",
                        fontWeight: 600,
                      }}
                    >
                      Diferencia:{" "}
                      {fmtQ(Number(efectivoContado) - efectivoSistema)}
                      {Number(efectivoContado) === efectivoSistema
                        ? "Cuadrado"
                        : "Con diferencia"}
                    </div>
                  )}
                  <div className={styles.inputGroup}>
                    <label>Observaciones (opcional):</label>
                    <textarea
                      className={styles.input}
                      rows={3}
                      placeholder="Ej. Faltan Q10..."
                      value={obsArqueo}
                      onChange={(e) => setObservacionesArqueo(e.target.value)}
                    />
                  </div>
                  <button
                    className={styles.btnCerrarCaja}
                    onClick={procesarArqueo}
                  >
                    Registrar Arqueo y Cerrar Caja
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ═══ TAB 3: HISTORIAL DE COBROS ═════════════════════════════ */}
          {tabActual === "historial" && (
            <div className={styles.card}>
              <div className={styles.historialFiltros}>
                <div className={styles.filtroGroup}>
                  <label>Desde:</label>
                  <input
                    type="date"
                    className={styles.inputFecha}
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                </div>
                <div className={styles.filtroGroup}>
                  <label>Hasta:</label>
                  <input
                    type="date"
                    className={styles.inputFecha}
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />
                </div>
                <button className={styles.btnBuscar} onClick={cargarHistorial}>
                  Buscar
                </button>
              </div>

              {historial.length > 0 && (
                <div className={styles.historialResumen}>
                  <span>
                    <strong>{historial.length}</strong> cobros
                  </span>
                  <span>
                    Total:{" "}
                    <strong className={styles.totalDestacado}>
                      Q {historial.reduce((s, h) => s + h.monto, 0).toFixed(2)}
                    </strong>
                  </span>
                </div>
              )}

              {historial.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "gray",
                    padding: "2rem",
                  }}
                >
                  No hay cobros en este período.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Canal</th>
                        <th>Cliente</th>
                        <th>NIT</th>
                        <th>Método</th>
                        <th>Cobrado por</th>
                        <th>Monto</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((h) => (
                        <tr key={h.id_pago}>
                          <td>#{h.id_pago}</td>
                          <td>{fmtFecha(h.fecha_pago)}</td>
                          <td>
                            {h.es_cobro_ruta ? (
                              <span className={styles.badgeCE}>🛵 En Ruta</span>
                            ) : (
                              <span className={styles.badgeNormal}>
                                Mostrador
                              </span>
                            )}
                          </td>
                          <td>{h.cliente}</td>
                          <td>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "0.8rem",
                              }}
                            >
                              {h.nit ?? "CF"}
                            </span>
                          </td>
                          <td>{labelMetodo(h.metodo_pago)}</td>
                          <td style={{ fontSize: "0.82rem", color: "#374151" }}>
                            {h.es_cobro_ruta ? (
                              <>
                                🛵 {h.repartidor}
                                <br />
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#9ca3af",
                                  }}
                                >
                                  Liquidado a: {h.cajero ?? "Pendiente"}
                                </span>
                              </>
                            ) : (
                              h.cajero
                            )}
                          </td>
                          <td>
                            <strong>{fmtQ(h.monto)}</strong>
                          </td>
                          <td>
                            <button
                              className={styles.btnVerFactura}
                              onClick={() => setModalFactura(h)}
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 4: HISTORIAL DE ARQUEOS ════════════════════════════ */}
          {tabActual === "arqueos" && (
            <div className={styles.card}>
              <div className={styles.historialFiltros}>
                <div className={styles.filtroGroup}>
                  <label>Desde:</label>
                  <input
                    type="date"
                    className={styles.inputFecha}
                    value={arqueoDesde}
                    onChange={(e) => setArqueoDesde(e.target.value)}
                  />
                </div>
                <div className={styles.filtroGroup}>
                  <label>Hasta:</label>
                  <input
                    type="date"
                    className={styles.inputFecha}
                    value={arqueoHasta}
                    onChange={(e) => setArqueoHasta(e.target.value)}
                  />
                </div>
                {esSupervisor && cajeros.length > 0 && (
                  <div className={styles.filtroGroup}>
                    <label>Cajero:</label>
                    <select
                      className={styles.inputFecha}
                      value={filtroCajero}
                      onChange={(e) => setFiltroCajero(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {cajeros.map((c) => (
                        <option key={c.id_empleado} value={c.id_empleado}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  className={styles.btnBuscar}
                  onClick={cargarHistorialArqueos}
                >
                  Buscar
                </button>
              </div>

              {resumenArqueos && resumenArqueos.totalArqueos > 0 && (
                <div className={styles.arqueoResumenGrid}>
                  <div className={styles.arqueoResumenCard}>
                    <span className={styles.arqueoResumenLabel}>
                      Total arqueos
                    </span>
                    <span className={styles.arqueoResumenValor}>
                      {resumenArqueos.totalArqueos}
                    </span>
                  </div>
                  <div
                    className={`${styles.arqueoResumenCard} ${styles.arqueoResumenVerde}`}
                  >
                    <span className={styles.arqueoResumenLabel}>Cuadraron</span>
                    <span className={styles.arqueoResumenValor}>
                      {resumenArqueos.cuadrados}
                    </span>
                  </div>
                  <div
                    className={`${styles.arqueoResumenCard} ${resumenArqueos.conDiferencia > 0 ? styles.arqueoResumenRojo : ""}`}
                  >
                    <span className={styles.arqueoResumenLabel}>
                      Con diferencia
                    </span>
                    <span className={styles.arqueoResumenValor}>
                      {resumenArqueos.conDiferencia}
                    </span>
                  </div>
                  <div
                    className={`${styles.arqueoResumenCard} ${resumenArqueos.sumaDiferencias !== 0 ? styles.arqueoResumenAmarillo : ""}`}
                  >
                    <span className={styles.arqueoResumenLabel}>
                      Suma diferencias
                    </span>
                    <span className={styles.arqueoResumenValor}>
                      {resumenArqueos.sumaDiferencias >= 0 ? "+" : ""}
                      {fmtQ(resumenArqueos.sumaDiferencias)}
                    </span>
                  </div>
                </div>
              )}

              {arqueos.length === 0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "gray",
                    padding: "2rem",
                  }}
                >
                  No hay arqueos en este período.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Cajero</th>
                        <th>Sistema</th>
                        <th>Contado</th>
                        <th>Diferencia</th>
                        <th>Estado</th>
                        <th>Supervisor</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arqueos.map((a) => (
                        <tr key={a.id_arqueo}>
                          <td style={{ color: "#6b7280" }}>#{a.id_arqueo}</td>
                          <td>
                            <div>{fmtDate(a.fecha_cierre)}</div>
                            <div
                              style={{ fontSize: "0.75rem", color: "#9ca3af" }}
                            >
                              {new Date(a.created_at).toLocaleTimeString(
                                "es-GT",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </div>
                          </td>
                          <td>{a.cajero}</td>
                          <td>{fmtQ(a.efectivo_segun_sistema)}</td>
                          <td>{fmtQ(a.efectivo_contado)}</td>
                          <td>
                            <span
                              style={{
                                fontWeight: 700,
                                color:
                                  a.diferencia === 0
                                    ? "#059669"
                                    : a.diferencia > 0
                                      ? "#d97706"
                                      : "#dc2626",
                              }}
                            >
                              {a.diferencia >= 0 ? "+" : ""}
                              {fmtQ(a.diferencia)}
                            </span>
                          </td>
                          <td>
                            {a.estado === "cuadrado" ? (
                              <span className={styles.badgeArqueoCuadra}>
                                Cuadrado
                              </span>
                            ) : (
                              <span className={styles.badgeArqueoDif}>
                                Diferencia
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: "0.82rem", color: "#6b7280" }}>
                            {a.supervisor_verifica ?? "—"}
                          </td>
                          <td
                            style={{
                              fontSize: "0.8rem",
                              color: "#6b7280",
                              maxWidth: 180,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={a.observaciones ?? ""}
                          >
                            {a.observaciones ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL COBRO ───────────────────────────────────────────────────── */}
      {modalCobro && ordenSeleccionada && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 style={{ marginBottom: "1rem" }}>
              Cobrar Orden #{ordenSeleccionada.id_venta}
            </h2>
            <p style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
              Total: <strong>Q {ordenSeleccionada.total.toFixed(2)}</strong>
            </p>
            <label style={{ fontWeight: "bold" }}>Método de Pago:</label>
            <div className={styles.paymentMethods}>
              {(["efectivo", "tarjeta", "transferencia"] as const).map((m) => (
                <button
                  key={m}
                  className={`${styles.methodBtn} ${metodoPago === m ? styles.methodActive : ""}`}
                  onClick={() => setMetodoPago(m)}
                >
                  {m === "efectivo"
                    ? "Efectivo"
                    : m === "tarjeta"
                      ? "Tarjeta"
                      : "Transferencia"}
                </button>
              ))}
            </div>
            <div className={styles.inputGroup}>
              <label>Monto Recibido (Q):</label>
              <input
                type="number"
                className={styles.input}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
            {metodoPago !== "efectivo" && (
              <div className={styles.inputGroup}>
                <label>No. de Autorización / Referencia:</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ej. 123456"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>
            )}
            {metodoPago === "efectivo" &&
              Number(monto) > ordenSeleccionada.total && (
                <div className={styles.vueltoBox}>
                  Vuelto:{" "}
                  <strong>
                    Q {(Number(monto) - ordenSeleccionada.total).toFixed(2)}
                  </strong>
                </div>
              )}
            <div className={styles.modalActions}>
              <button
                className={styles.btnCancelar}
                onClick={() => setModalCobro(false)}
              >
                Cancelar
              </button>
              <button className={styles.btnCobrar} onClick={procesarPago}>
                Registrar Cobro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL COMPROBANTE ─────────────────────────────────────────────── */}
      {modalFactura && (
        <div
          className={styles.modalOverlay}
          onClick={() => setModalFactura(null)}
        >
          <div
            className={styles.modalFacturaContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalFacturaHeader}>
              <div>
                <h2>Comprobante de Pago</h2>
                <p className={styles.modalFacturaSubtitle}>
                  Pago #{modalFactura.id_pago} — Venta #{modalFactura.id_venta}
                </p>
              </div>
              <div className={styles.modalFacturaBtns}>
                <button
                  className={styles.btnImprimir}
                  onClick={imprimirFactura}
                >
                  Imprimir
                </button>
                <button
                  className={styles.btnCancelar}
                  onClick={() => setModalFactura(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div ref={facturaRef} className={styles.facturaBody}>
              <div className="imp-empresa">
                <h2>Refaccionaria Franco</h2>
              </div>
              <div className="imp-numero">
                Comprobante No. {String(modalFactura.id_pago).padStart(8, "0")}
              </div>
              <div className="imp-seccion">
                <h3>Datos del cobro</h3>
                <div className="imp-fila">
                  <span>Fecha</span>
                  <span>{fmtFecha(modalFactura.fecha_pago)}</span>
                </div>
                <div className="imp-fila">
                  <span>Cliente</span>
                  <span>{modalFactura.cliente}</span>
                </div>
                <div className="imp-fila">
                  <span>NIT</span>
                  <span>{modalFactura.nit ?? "CF"}</span>
                </div>
                {modalFactura.direccion_cliente && (
                  <div className="imp-fila">
                    <span>Dirección</span>
                    <span>{modalFactura.direccion_cliente}</span>
                  </div>
                )}
                <div className="imp-fila">
                  <span>
                    {modalFactura.es_cobro_ruta
                      ? "Cobrado por (repartidor)"
                      : "Atendido por"}
                  </span>
                  <span>
                    {modalFactura.es_cobro_ruta
                      ? modalFactura.repartidor
                      : modalFactura.cajero}
                  </span>
                </div>
                {modalFactura.es_cobro_ruta && modalFactura.cajero && (
                  <div className="imp-fila">
                    <span>Liquidado a cajero</span>
                    <span>{modalFactura.cajero}</span>
                  </div>
                )}
                <div className="imp-fila">
                  <span>Forma de pago</span>
                  <span>{labelMetodo(modalFactura.metodo_pago)}</span>
                </div>
              </div>
              <div className="imp-seccion">
                <h3>Detalle</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>P.U.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalFactura.detalles.map((d, i) => (
                      <tr key={i}>
                        <td>{d.producto}</td>
                        <td style={{ textAlign: "center" }}>{d.cantidad}</td>
                        <td style={{ textAlign: "right" }}>
                          {fmtQ(d.precio_unitario)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {fmtQ(d.subtotal_linea)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="imp-totales">
                {(() => {
                  const { baseImponible, iva } = calcularIva(modalFactura);
                  return (
                    <>
                      <div className="imp-fila-total">
                        <span>Base imponible</span>
                        <span>{fmtQ(baseImponible)}</span>
                      </div>
                      <div className="imp-fila-total">
                        <span>IVA (12%)</span>
                        <span>{fmtQ(iva)}</span>
                      </div>
                      {modalFactura.descuento_monto > 0 && (
                        <div className="imp-fila-total">
                          <span>Descuento</span>
                          <span>- {fmtQ(modalFactura.descuento_monto)}</span>
                        </div>
                      )}
                      <div className="imp-total-final">
                        <span>TOTAL</span>
                        <span>{fmtQ(modalFactura.total)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="imp-footer">
                <p>Este documento es un comprobante interno.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
