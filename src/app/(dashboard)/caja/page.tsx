// src/app/(dashboard)/caja/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { CajaService } from "@/services/caja.service";
import {
  OrdenPendienteCaja,
  ResumenCaja,
  HistorialCobro,
} from "@/types/caja.types";
import styles from "./Caja.module.css";

export default function CajaPage() {
  const [tabActual, setTabActual] = useState<"cobros" | "arqueo" | "historial">(
    "cobros",
  );
  const [cargando, setCargando] = useState(false);

  // Tab 1: Cobros
  const [pendientes, setPendientes] = useState<OrdenPendienteCaja[]>([]);
  const [modalCobro, setModalCobro] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] =
    useState<OrdenPendienteCaja | null>(null);
  const [metodoPago, setMetodoPago] = useState<
    "efectivo" | "tarjeta" | "transferencia"
  >("efectivo");
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");

  // Tab 2: Arqueo
  const [resumen, setResumen] = useState<ResumenCaja[]>([]);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [obsArqueo, setObservacionesArqueo] = useState("");

  // Tab 3: Historial
  const [historial, setHistorial] = useState<HistorialCobro[]>([]);
  const [fechaDesde, setFechaDesde] = useState(hoy());
  const [fechaHasta, setFechaHasta] = useState(hoy());
  const [modalFactura, setModalFactura] = useState<HistorialCobro | null>(null);
  const facturaRef = useRef<HTMLDivElement>(null);

  function hoy() {
    return new Date().toISOString().split("T")[0];
  }

  useEffect(() => {
    if (tabActual === "cobros") cargarPendientes();
    if (tabActual === "arqueo") cargarResumen();
    if (tabActual === "historial") cargarHistorial();
  }, [tabActual]);

  // Lógica Tab 1
  const cargarPendientes = async () => {
    try {
      setCargando(true);
      const data = await CajaService.obtenerPendientes();
      setPendientes(data);
    } catch (error: any) {
      alert("Error: " + error.message);
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
      return alert("El monto ingresado es menor al total de la orden.");
    if (metodoPago !== "efectivo" && !referencia)
      return alert(
        "Debe ingresar un número de autorización o referencia para tarjeta/transferencia.",
      );

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
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  // Lógica Tab 2
  const cargarResumen = async () => {
    try {
      setCargando(true);
      const data = await CajaService.obtenerResumen();
      setResumen(data);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const procesarArqueo = async () => {
    if (!efectivoContado || Number(efectivoContado) < 0)
      return alert("Debe ingresar un monto válido de efectivo físico.");

    if (
      confirm(
        "¿Está seguro que desea cerrar la caja con este efectivo contado?",
      )
    ) {
      try {
        await CajaService.registrarArqueo({
          efectivo_contado: Number(efectivoContado),
          observaciones: obsArqueo || undefined,
        });
        alert("Arqueo de caja registrado correctamente.");
        setEfectivoContado("");
        setObservacionesArqueo("");
        cargarResumen();
      } catch (error: any) {
        alert("Error: " + error.message);
      }
    }
  };

  const efectivoSistema =
    resumen.find((r) => r.metodo_pago === "efectivo")?.total || 0;

  // Lógica Tab 3
  const cargarHistorial = async () => {
    try {
      setCargando(true);
      const data = await CajaService.obtenerHistorial(fechaDesde, fechaHasta);
      setHistorial(data);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  const imprimirFactura = () => {
    if (!facturaRef.current) return;
    const contenido = facturaRef.current.innerHTML;
    const ventana = window.open("", "_blank", "width=800,height=600");
    if (!ventana) return;
    ventana.document.write(`
      <html>
        <head>
          <title>Comprobante de Pago</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; padding: 32px; color: #111; }
            h2 { font-size: 16px; }
            .imp-empresa { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #111; }
            .imp-empresa h2 { font-size: 17px; font-weight: bold; margin-bottom: 6px; }
            .imp-empresa p { color: #555; margin: 2px 0; }
            .imp-numero { font-size: 13px; font-weight: bold; margin: 16px 0 20px; }
            .imp-seccion { margin-bottom: 20px; }
            .imp-seccion h3 { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
            .imp-fila { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
            .imp-fila span:first-child { color: #555; }
            table { width: 100%; border-collapse: collapse; }
            table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #888; padding: 4px 0; border-bottom: 1px solid #e5e7eb; }
            table th:last-child, table td:last-child { text-align: right; }
            table th:nth-child(2), table td:nth-child(2) { text-align: center; }
            table th:nth-child(3), table td:nth-child(3) { text-align: right; }
            table td { padding: 6px 0; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
            .imp-totales { margin-top: 12px; }
            .imp-fila-total { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
            .imp-fila-total span:first-child { color: #555; }
            .imp-total-final { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; padding: 10px 0 6px; border-top: 2px solid #111; margin-top: 8px; }
            .imp-footer { margin-top: 24px; color: #999; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          </style>
        </head>
        <body>${contenido}</body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 300);
  };

  const fmtQ = (n: number) => `Q ${n.toFixed(2)}`;
  const fmtFecha = (iso: string) => new Date(iso).toLocaleString("es-GT");
  const labelMetodo = (m: string) =>
    m === "efectivo"
      ? "Efectivo"
      : m === "tarjeta"
        ? "Tarjeta POS"
        : "Transferencia";

  const calcularIva = (cobro: HistorialCobro) => {
    const baseImponible = cobro.total / 1.12;
    const iva = cobro.total - baseImponible;
    return { baseImponible, iva };
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Caja y Cobros</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${tabActual === "cobros" ? styles.tabActive : ""}`}
          onClick={() => setTabActual("cobros")}
        >
          Pendientes de Cobro
        </button>
        <button
          className={`${styles.tabBtn} ${tabActual === "arqueo" ? styles.tabActive : ""}`}
          onClick={() => setTabActual("arqueo")}
        >
          Arqueo (Cierre de Caja)
        </button>
        <button
          className={`${styles.tabBtn} ${tabActual === "historial" ? styles.tabActive : ""}`}
          onClick={() => setTabActual("historial")}
        >
          Historial de Cobros
        </button>
      </div>

      {cargando ? (
        <p>Cargando información...</p>
      ) : (
        <>
          {/* VISTA 1: COBROS PENDIENTES */}
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
                  No hay órdenes pendientes de cobro.
                </p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID Venta</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th>Estado / Tipo</th>
                      <th>Total</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientes.map((p) => (
                      <tr key={p.id_venta}>
                        <td style={{ fontWeight: "bold" }}>#{p.id_venta}</td>
                        <td>{p.cliente}</td>
                        <td>{new Date(p.created_at).toLocaleString()}</td>
                        <td>
                          {p.pago_contra_entrega ? (
                            <span className={styles.badgeCE}>
                              Contra Entrega (Liquidación)
                            </span>
                          ) : (
                            <span className={styles.badgeNormal}>
                              Mostrador
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                          Q {p.total.toFixed(2)}
                        </td>
                        <td>
                          <button
                            className={styles.btnCobrar}
                            onClick={() => abrirModalCobro(p)}
                          >
                            Cobrar Q{p.total.toFixed(2)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* VISTA 2: ARQUEO */}
          {tabActual === "arqueo" && (
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
                    <li>No hay cobros registrados hoy.</li>
                  ) : null}
                  {resumen.map((r, i) => (
                    <li key={i}>
                      <span style={{ textTransform: "capitalize" }}>
                        {labelMetodo(r.metodo_pago)}
                      </span>
                      <strong>Q {r.total.toFixed(2)}</strong>
                    </li>
                  ))}
                </ul>
                <div
                  style={{
                    marginTop: "2rem",
                    padding: "1rem",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "0.5rem",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <p style={{ color: "#166534", margin: 0 }}>
                    El sistema espera encontrar en su gaveta: <br />
                    <strong style={{ fontSize: "1.5rem" }}>
                      Q {efectivoSistema.toFixed(2)} en Efectivo
                    </strong>
                  </p>
                </div>
              </div>

              <div className={styles.card}>
                <h2 style={{ marginBottom: "1.5rem" }}>Cierre Físico</h2>
                <div className={styles.inputGroup}>
                  <label style={{ fontWeight: "bold" }}>
                    Efectivo físico contado (Q):
                  </label>
                  <input
                    type="number"
                    className={styles.input}
                    style={{ fontSize: "1.5rem", padding: "1rem" }}
                    placeholder="0.00"
                    value={efectivoContado}
                    onChange={(e) => setEfectivoContado(e.target.value)}
                  />
                </div>
                <div
                  className={styles.inputGroup}
                  style={{ marginTop: "1rem" }}
                >
                  <label>Observaciones (si hay sobrante o faltante):</label>
                  <textarea
                    className={styles.input}
                    rows={3}
                    placeholder="Ej. Faltan Q10 porque se dio vuelto de más..."
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
          )}

          {/* VISTA 3: HISTORIAL DE COBROS */}
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
                    <strong>{historial.length}</strong> cobros encontrados
                  </span>
                  <span>
                    Total recaudado:{" "}
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
                  No se encontraron cobros en el período seleccionado.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ID Pago</th>
                        <th>Venta</th>
                        <th>Fecha y Hora</th>
                        <th>Cliente</th>
                        <th>NIT</th>
                        <th>Método</th>
                        <th>Monto</th>
                        <th>Cajero</th>
                        <th>Comprobante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((h) => (
                        <tr key={h.id_pago}>
                          <td style={{ fontWeight: "bold" }}>#{h.id_pago}</td>
                          <td>#{h.id_venta}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {fmtFecha(h.fecha_pago)}
                          </td>
                          <td>{h.cliente}</td>
                          <td>
                            <span className={styles.nitBadge}>
                              {h.nit ?? "CF"}
                            </span>
                          </td>
                          <td>{labelMetodo(h.metodo_pago)}</td>
                          <td style={{ fontWeight: "bold" }}>
                            {fmtQ(h.monto)}
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                            {h.cajero}
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
        </>
      )}

      {/* MODAL COBRO */}
      {modalCobro && ordenSeleccionada && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 style={{ marginBottom: "1rem" }}>
              Cobrar Orden #{ordenSeleccionada.id_venta}
            </h2>
            <p style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
              Total a pagar:{" "}
              <strong>Q {ordenSeleccionada.total.toFixed(2)}</strong>
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
                  Vuelto a entregar:{" "}
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

      {/* MODAL COMPROBANTE */}
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
                  <span>Atendido por</span>
                  <span>{modalFactura.cajero}</span>
                </div>
                <div className="imp-fila">
                  <span>Forma de pago</span>
                  <span>{labelMetodo(modalFactura.metodo_pago)}</span>
                </div>
                {modalFactura.referencia && (
                  <div className="imp-fila">
                    <span>No. Autorización</span>
                    <span>{modalFactura.referencia}</span>
                  </div>
                )}
              </div>

              <div className="imp-seccion">
                <h3>Detalle</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Cant.</th>
                      <th>Precio</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalFactura.detalles.map((d, i) => (
                      <tr key={i}>
                        <td>
                          {d.producto}
                          <br />
                          <small style={{ color: "#9ca3af" }}>
                            SKU: {d.sku}
                          </small>
                        </td>
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

              {(() => {
                const { baseImponible, iva } = calcularIva(modalFactura);
                return (
                  <div className="imp-totales">
                    {modalFactura.descuento_monto > 0 && (
                      <div className="imp-fila-total">
                        <span>Descuento</span>
                        <span>- {fmtQ(modalFactura.descuento_monto)}</span>
                      </div>
                    )}
                    <div className="imp-fila-total">
                      <span>Base imponible (sin IVA)</span>
                      <span>{fmtQ(baseImponible)}</span>
                    </div>
                    <div className="imp-fila-total">
                      <span>IVA (12%)</span>
                      <span>{fmtQ(iva)}</span>
                    </div>
                    <div className="imp-total-final">
                      <span>Total</span>
                      <span>{fmtQ(modalFactura.total)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="imp-footer">
                <p>
                  Conforme al Decreto 27-92 (Ley del IVA), Guatemala. IVA
                  incluido al 12%.
                </p>
                <p>Documento interno — comprobante de pago.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
