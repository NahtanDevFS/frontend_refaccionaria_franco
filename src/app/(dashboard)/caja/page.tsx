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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "./Caja.module.css";

type Tab = "cobros" | "arqueo" | "historial" | "arqueos";

//Generar reporte PDF de un arqueo
const generarReporteArqueo = (a: ArqueoHistorial) => {
  const doc = new jsPDF();

  //Encabezado
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text("Refaccionaria Franco", 14, 22);

  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text("Reporte de Arqueo de Caja", 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Generado el: ${new Date().toLocaleDateString("es-GT")} ${new Date().toLocaleTimeString("es-GT")}`,
    14,
    38,
  );

  // ── Parseo seguro de fecha
  // fecha_cierre llega como "2026-04-04" — se parte manualmente
  const [anio, mes, dia] = String(a.fecha_cierre)
    .split("T")[0]
    .split("-")
    .map(Number);
  const fechaCierre = new Date(anio, mes - 1, dia).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const horaRegistro = new Date(a.created_at).toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const textoVerificacion =
    a.estado === "cuadrado"
      ? "No requerida (arqueo cuadrado)"
      : a.supervisor_verifica?.trim()
        ? a.supervisor_verifica
        : "Pendiente de verificación";

  //tabla de información general
  autoTable(doc, {
    startY: 45,
    head: [["Campo", "Valor"]],
    body: [
      ["N° de Arqueo", `#${String(a.id_arqueo).padStart(6, "0")}`],
      ["Fecha de Cierre", fechaCierre],
      ["Hora de Registro", horaRegistro],
      ["Cajero", a.cajero],
    ],
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    margin: { left: 14, right: 14 },
  });

  //tabla financiera
  const infoY = (doc as any).lastAutoTable?.finalY ?? 90;

  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text("Resumen Financiero", 14, infoY + 10);

  const diff = Number(a.diferencia);

  autoTable(doc, {
    startY: infoY + 14,
    head: [["Concepto", "Monto (Q)"]],
    body: [
      [
        "Efectivo según sistema",
        `Q ${Number(a.efectivo_segun_sistema).toFixed(2)}`,
      ],
      ["Efectivo físico contado", `Q ${Number(a.efectivo_contado).toFixed(2)}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  //observaciones (si existen)
  const finY = (doc as any).lastAutoTable?.finalY ?? infoY + 50;
  if (a.observaciones?.trim()) {
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text("Observaciones", 14, finY + 10);

    autoTable(doc, {
      startY: finY + 14,
      body: [[a.observaciones.trim()]],
      theme: "grid",
      styles: { fontSize: 9, textColor: [75, 85, 99] },
      margin: { left: 14, right: 14 },
    });
  }

  //pie de página
  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(
    "Refaccionaria Franco — Documento generado automáticamente",
    14,
    pageH - 10,
  );
  doc.text(`Arqueo #${String(a.id_arqueo).padStart(6, "0")}`, 196, pageH - 10, {
    align: "right",
  });

  //descargar
  doc.save(
    `Arqueo_${String(a.id_arqueo).padStart(6, "0")}_${String(anio)}${String(mes).padStart(2, "0")}${String(dia).padStart(2, "0")}.pdf`,
  );
};

function hoy() {
  return new Date().toISOString().split("T")[0];
}
function hace30() {
  return new Date(Date.now() - 29 * 86400000).toISOString().split("T")[0];
}

export default function CajaPage() {
  const [tabActual, setTabActual] = useState<Tab>("cobros");
  const [cargando, setCargando] = useState(false);

  //tab 1: Cobros pendientes
  const [pendientes, setPendientes] = useState<OrdenPendienteCaja[]>([]);
  const [modalCobro, setModalCobro] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] =
    useState<OrdenPendienteCaja | null>(null);
  const [metodoPago, setMetodoPago] = useState<
    "efectivo" | "tarjeta" | "transferencia"
  >("efectivo");
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");

  //Tab 2 Arqueo + Liquidación
  const [resumen, setResumen] = useState<ResumenCaja[]>([]);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [obsArqueo, setObservacionesArqueo] = useState("");
  const [cobrosRepartidor, setCobrosRepartidor] = useState<
    CobroRepartidorPendiente[]
  >([]);
  const [pagosSeleccionados, setPagosSeleccionados] = useState<Set<number>>(
    new Set(),
  );
  const [liquidando, setLiquidando] = useState(false);

  //Tab 3: Historial de cobros
  const [historial, setHistorial] = useState<HistorialCobro[]>([]);
  const [fechaDesde, setFechaDesde] = useState(hoy());
  const [fechaHasta, setFechaHasta] = useState(hoy());
  const [modalFactura, setModalFactura] = useState<HistorialCobro | null>(null);
  const facturaRef = useRef<HTMLDivElement>(null);

  //Tab 4: Historial de arqueos
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
  const [verificando, setVerificando] = useState(false);

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

  const fmtQ = (n: number) => `Q ${n.toFixed(2)}`;
  const fmtFecha = (iso: string) => new Date(iso).toLocaleString("es-GT");
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-GT");
  const labelMetodo = (m: string) =>
    m === "efectivo"
      ? "Efectivo"
      : m === "tarjeta"
        ? "Tarjeta POS"
        : "Transferencia";

  //Funciones Tab 1
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
        monto: ordenSeleccionada.total,
        referencia: referencia || undefined,
      });
      alert("Pago registrado exitosamente.");
      setModalCobro(false);
      cargarPendientes();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  //Funciones Tab 2
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

    const contado = Number(efectivoContado);
    const diferencia = parseFloat((contado - efectivoSistema).toFixed(2));

    if (diferencia !== 0) {
      const tipo = diferencia > 0 ? "sobrante" : "faltante";
      const monto = Math.abs(diferencia).toFixed(2);
      alert(
        `La caja no está cuadrada.\n\n` +
          `Efectivo según sistema: Q ${efectivoSistema.toFixed(2)}\n` +
          `Efectivo físico contado: Q ${contado.toFixed(2)}\n` +
          `Diferencia (${tipo}): Q ${monto}\n\n` +
          `Corrija el monto ingresado antes de cerrar la caja.`,
      );
      return;
    }

    if (!confirm("¿Registrar cierre de caja?")) return;

    try {
      await CajaService.registrarArqueo({
        efectivo_contado: contado,
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

  //Funciones Tab 3
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

  //Funciones Tab 4
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

  const verificar = async (id_arqueo: number) => {
    if (!confirm("¿Confirmar verificación de este arqueo?")) return;
    try {
      setVerificando(true);
      await CajaService.verificarArqueo(id_arqueo);
      alert("Arqueo verificado correctamente.");
      cargarHistorialArqueos();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setVerificando(false);
    }
  };

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
        <p className={styles.loadingText}>Cargando...</p>
      ) : (
        <>
          {/*tab 1 de cobros pendientes*/}
          {tabActual === "cobros" && (
            <div className={styles.card}>
              {pendientes.length === 0 ? (
                <p className={styles.emptyState}>No hay órdenes pendientes.</p>
              ) : (
                <div className={styles.tableContainer}>
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
                          <td className={styles.textBold}>#{p.id_venta}</td>
                          <td>{p.cliente}</td>
                          <td>{new Date(p.created_at).toLocaleString()}</td>
                          <td>
                            {p.canal === "domicilio" &&
                            p.pago_contra_entrega ? (
                              <span className={styles.badgeCE}>
                                Contra Entrega
                              </span>
                            ) : p.canal === "domicilio" ? (
                              <span className={styles.badgeCE}>Domicilio</span>
                            ) : (
                              <span className={styles.badgeNormal}>
                                Mostrador
                              </span>
                            )}
                          </td>
                          <td className={styles.textBold}>
                            Q {p.total.toFixed(2)}
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
                </div>
              )}
            </div>
          )}

          {/*TAB 2: ARQUEO + LIQUIDACIÓN */}
          {tabActual === "arqueo" && (
            <>
              {/* Liquidación Repartidores */}
              {Object.keys(cobrosAgrupados).length > 0 && (
                <div className={`${styles.card} ${styles.cardWarning}`}>
                  <h2 className={styles.warningTitle}>
                    ⚠ Cobros de Repartidores Pendientes de Liquidar
                  </h2>
                  <p className={styles.warningDesc}>
                    Los repartidores listados han cobrado efectivo en ruta.
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
                    const algunSeleccionado = grupo.cobros.some((c) =>
                      pagosSeleccionados.has(c.id_pago),
                    );

                    return (
                      <div key={grupo.id} className={styles.repartidorGroup}>
                        <div className={styles.repartidorHeader}>
                          <div>
                            <strong className={styles.repartidorName}>
                              {grupo.nombre}
                            </strong>
                            <span className={styles.repartidorMeta}>
                              {grupo.cobros.length} cobro(s) — Total:{" "}
                              <span className={styles.textBold}>
                                {fmtQ(totalGrupo)}
                              </span>
                            </span>
                          </div>
                          <div className={styles.repartidorActions}>
                            <button
                              className={styles.btnOutline}
                              onClick={() =>
                                toggleTodosRepartidor(
                                  grupo.id,
                                  !todosSeleccionados,
                                )
                              }
                            >
                              {todosSeleccionados
                                ? "Deseleccionar todos"
                                : "Seleccionar todos"}
                            </button>
                            <button
                              className={`${styles.btnSolid} ${algunSeleccionado ? styles.btnSolidActive : styles.btnSolidDisabled}`}
                              onClick={() => liquidar(grupo.id)}
                              disabled={liquidando || !algunSeleccionado}
                            >
                              {liquidando
                                ? "Liquidando..."
                                : "Confirmar recepción"}
                            </button>
                          </div>
                        </div>

                        <div className={styles.tableContainer}>
                          <table
                            className={`${styles.table} ${styles.tableSmall}`}
                          >
                            <thead>
                              <tr>
                                <th className={styles.colCheck}></th>
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
                                  className={styles.rowClickable}
                                  onClick={() => togglePago(c.id_pago)}
                                >
                                  <td>
                                    <input
                                      type="checkbox"
                                      className={styles.checkbox}
                                      checked={pagosSeleccionados.has(
                                        c.id_pago,
                                      )}
                                      onChange={() => togglePago(c.id_pago)}
                                    />
                                  </td>
                                  <td>#{c.id_pago}</td>
                                  <td>{c.cliente}</td>
                                  <td className={styles.textMuted}>
                                    {c.direccion_entrega ?? "—"}
                                  </td>
                                  <td>{fmtFecha(c.fecha_pago)}</td>
                                  <td className={styles.textBold}>
                                    {fmtQ(c.monto)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Arqueo */}
              <div className={styles.arqueoGrid}>
                <div className={styles.card}>
                  <h2 className={styles.sectionTitle}>
                    Resumen de Cobros de Hoy
                  </h2>
                  <ul className={styles.resumenList}>
                    {resumen.length === 0 ? (
                      <li className={styles.resumenEmpty}>
                        Sin cobros registrados hoy
                      </li>
                    ) : (
                      resumen.map((r) => (
                        <li key={r.metodo_pago}>
                          <span>{labelMetodo(r.metodo_pago)}</span>
                          <strong className={styles.textBold}>
                            {fmtQ(r.total)}
                          </strong>
                        </li>
                      ))
                    )}
                  </ul>
                  {cobrosRepartidor.length > 0 && (
                    <p className={styles.resumenWarning}>
                      ⚠ Aún hay cobros de repartidores sin liquidar que no están
                      incluidos aquí.
                    </p>
                  )}
                </div>

                <div className={styles.card}>
                  <h2 className={styles.sectionTitle}>
                    Registrar Cierre de Caja
                  </h2>
                  <div className={styles.inputGroup}>
                    <label>
                      Efectivo según sistema:{" "}
                      <strong className={styles.textBold}>
                        {fmtQ(efectivoSistema)}
                      </strong>
                    </label>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Efectivo físico contado (Q):</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.input}
                      placeholder="0.00"
                      value={efectivoContado}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) setEfectivoContado(val);
                      }}
                    />
                  </div>
                  {efectivoContado && (
                    <div
                      className={`${styles.diffBadge} ${Number(efectivoContado) === efectivoSistema ? styles.diffBadgeOk : styles.diffBadgeError}`}
                    >
                      Diferencia:{" "}
                      {fmtQ(Number(efectivoContado) - efectivoSistema)} (
                      {Number(efectivoContado) === efectivoSistema
                        ? "Cuadrado"
                        : "Con diferencia"}
                      )
                    </div>
                  )}

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

          {/*TAB 3: HISTORIAL DE COBROS  */}
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
                    <strong className={styles.textBold}>
                      {historial.length}
                    </strong>{" "}
                    cobros
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
                <p className={styles.emptyState}>
                  No hay cobros en este período.
                </p>
              ) : (
                <div className={styles.tableContainer}>
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
                              <span className={styles.badgeCE}>En Ruta</span>
                            ) : (
                              <span className={styles.badgeNormal}>
                                Mostrador
                              </span>
                            )}
                          </td>
                          <td>{h.cliente}</td>
                          <td>
                            <span className={styles.fontMono}>
                              {h.nit ?? "CF"}
                            </span>
                          </td>
                          <td>{labelMetodo(h.metodo_pago)}</td>
                          <td className={styles.textSmall}>
                            {h.es_cobro_ruta ? (
                              <>
                                {h.repartidor}
                                <br />
                                <span className={styles.textTiny}>
                                  Liquidado a: {h.cajero ?? "Pendiente"}
                                </span>
                              </>
                            ) : (
                              h.cajero
                            )}
                          </td>
                          <td className={styles.textBold}>{fmtQ(h.monto)}</td>
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

          {/* tab 4 de historial de arqueos */}
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
              {resumenArqueos && resumenArqueos.cuadrados > 0 && (
                <div className={styles.arqueoResumenGrid}>
                  <div className={styles.arqueoResumenCard}>
                    <span className={styles.arqueoResumenLabel}>
                      Total arqueos
                    </span>
                    <span className={styles.arqueoResumenValor}>
                      {resumenArqueos.cuadrados}
                    </span>
                  </div>
                </div>
              )}
              {arqueos.length === 0 ? (
                <p className={styles.emptyState}>
                  No hay arqueos en este período.
                </p>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Cajero</th>
                        <th>Sistema</th>
                        <th>Contado</th>
                        <th>Reporte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arqueos
                        .filter((a) => a.estado === "cuadrado")
                        .map((a) => (
                          <tr key={a.id_arqueo}>
                            <td className={styles.textMuted}>#{a.id_arqueo}</td>
                            <td>
                              <div>{fmtDate(a.fecha_cierre)}</div>
                              <div className={styles.textTiny}>
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
                              <button
                                className={styles.btnReporte}
                                onClick={() => generarReporteArqueo(a)}
                                title="Descargar reporte PDF"
                              >
                                PDF
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
        </>
      )}

      {/*MODAL COBRO  */}
      {modalCobro && ordenSeleccionada && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>
              Cobrar Orden #{ordenSeleccionada.id_venta}
            </h2>
            <p className={styles.modalSubtitle}>
              Total:{" "}
              <strong className={styles.textBold}>
                Q {ordenSeleccionada.total.toFixed(2)}
              </strong>
            </p>

            <div className={styles.inputGroup}>
              <label>Método de Pago:</label>
              <div className={styles.paymentMethods}>
                {(["efectivo", "tarjeta", "transferencia"] as const).map(
                  (m) => (
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
                  ),
                )}
              </div>
            </div>

            {metodoPago === "efectivo" && (
              <div className={styles.inputGroup}>
                <label>Monto Recibido (Q):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className={styles.input}
                  value={monto}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*\.?\d*$/.test(val)) setMonto(val);
                  }}
                />
              </div>
            )}

            {metodoPago !== "efectivo" && (
              <div className={styles.inputGroup}>
                <label>No. de Autorización / Referencia:</label>
                <input
                  type="number"
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
                  <strong className={styles.textBold}>
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

      {/*MODAL COMPROBANTE */}
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
