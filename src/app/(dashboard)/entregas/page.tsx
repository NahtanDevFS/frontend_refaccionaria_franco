"use client";

import { useEffect, useRef, useState } from "react";
import { EntregaService } from "@/services/entrega.service";
import {
  ComprobanteEntrega,
  EntregaHistorial,
  PedidoDomicilio,
  ResumenHistorial,
} from "@/types/entrega.types";
import styles from "./Entregas.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtFechaSolo(iso: string): string {
  return new Date(iso).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function labelMetodo(m: string): string {
  return m === "efectivo"
    ? "Efectivo"
    : m === "tarjeta"
      ? "Tarjeta"
      : "Transferencia";
}

// Calcula fecha por defecto: hace N días en formato YYYY-MM-DD
function fechaHaceNDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function hoy(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function EntregasPage() {
  // ── Tab activo ──────────────────────────────────────────────────────────────
  const [tabActual, setTabActual] = useState<"ruta" | "historial">("ruta");

  // ── Tab Ruta ────────────────────────────────────────────────────────────────
  const [pedidos, setPedidos] = useState<PedidoDomicilio[]>([]);
  const [cargandoRuta, setCargandoRuta] = useState(true);
  const [pedidoSeleccionado, setPedidoSeleccionado] =
    useState<PedidoDomicilio | null>(null);

  const [modalExito, setModalExito] = useState(false);
  const [montoCobrado, setMontoCobrado] = useState<string>("");
  const [procesando, setProcesando] = useState(false);

  const [modalFallo, setModalFallo] = useState(false);
  const [motivoFallo, setMotivoFallo] = useState("");

  // ── Tab Historial ───────────────────────────────────────────────────────────
  const [desde, setDesde] = useState(fechaHaceNDias(6));
  const [hasta, setHasta] = useState(hoy());
  const [historial, setHistorial] = useState<EntregaHistorial[]>([]);
  const [resumen, setResumen] = useState<ResumenHistorial | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // ── Modal Comprobante (compartido entre tabs) ────────────────────────────────
  const [modalComprobante, setModalComprobante] =
    useState<ComprobanteEntrega | null>(null);
  const [cargandoComprobante, setCargandoComprobante] = useState(false);
  const comprobanteRef = useRef<HTMLDivElement>(null);

  // ── Carga inicial ────────────────────────────────────────────────────────────
  useEffect(() => {
    cargarPedidos();
  }, []);

  useEffect(() => {
    if (tabActual === "historial") cargarHistorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActual]);

  // ─── Lógica Ruta ──────────────────────────────────────────────────────────
  const cargarPedidos = async () => {
    try {
      setCargandoRuta(true);
      const data = await EntregaService.obtenerMisPedidos();
      setPedidos(data);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setCargandoRuta(false);
    }
  };

  const iniciarEntrega = (pedido: PedidoDomicilio) => {
    if (pedido.pago_contra_entrega) {
      setPedidoSeleccionado(pedido);
      setMontoCobrado(pedido.total.toString());
      setModalExito(true);
    } else {
      if (confirm(`¿Confirmar entrega del Pedido #${pedido.id_pedido}?`)) {
        procesarExito(pedido.id_pedido);
      }
    }
  };

  const procesarExito = async (id: number, monto?: number) => {
    try {
      setProcesando(true);
      const resultado = await EntregaService.marcarExito(id, {
        monto_cobrado: monto,
      });
      setModalExito(false);
      cargarPedidos();

      if (resultado.id_pago !== null) {
        setCargandoComprobante(true);
        setModalComprobante(null);
        try {
          const comprobante = await EntregaService.obtenerComprobante(
            resultado.id_pago,
          );
          setModalComprobante(comprobante);
        } catch {
          alert("Entrega registrada, pero no se pudo cargar el comprobante.");
        } finally {
          setCargandoComprobante(false);
        }
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const iniciarFallo = (pedido: PedidoDomicilio) => {
    setPedidoSeleccionado(pedido);
    setMotivoFallo("");
    setModalFallo(true);
  };

  const procesarFallo = async () => {
    if (!pedidoSeleccionado) return;
    if (motivoFallo.trim().length < 5)
      return alert("Por favor escriba un motivo claro (min. 5 caracteres).");
    try {
      await EntregaService.marcarFallida(pedidoSeleccionado.id_pedido, {
        motivo_fallido: motivoFallo,
      });
      alert("Entrega marcada como fallida.");
      setModalFallo(false);
      cargarPedidos();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  // ─── Lógica Historial ─────────────────────────────────────────────────────
  const cargarHistorial = async () => {
    try {
      setCargandoHistorial(true);
      const data = await EntregaService.obtenerMiHistorial(desde, hasta);
      setHistorial(data.entregas);
      setResumen(data.resumen);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // ─── Comprobante (compartido) ─────────────────────────────────────────────
  const abrirComprobante = async (id_pago: number) => {
    setCargandoComprobante(true);
    setModalComprobante(null);
    try {
      const comprobante = await EntregaService.obtenerComprobante(id_pago);
      setModalComprobante(comprobante);
    } catch (error: any) {
      alert("Error al cargar comprobante: " + error.message);
    } finally {
      setCargandoComprobante(false);
    }
  };

  const cerrarComprobante = () => {
    setModalComprobante(null);
    setCargandoComprobante(false);
  };

  const imprimirComprobante = () => {
    if (!comprobanteRef.current || !modalComprobante) return;
    const contenido = comprobanteRef.current.innerHTML;
    const ventana = window.open("", "_blank", "width=800,height=600");
    if (!ventana) return;
    ventana.document.write(`
      <html>
        <head>
          <title>Comprobante #${modalComprobante.id_pago}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; padding: 32px; color: #111; }
            h2 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            p  { font-size: 11px; color: #555; margin: 2px 0; }
            .imp-numero { font-size: 12px; font-weight: bold; margin: 16px 0 20px; }
            .imp-seccion { margin-bottom: 20px; }
            .imp-seccion h3 { font-size: 10px; font-weight: bold; text-transform: uppercase;
              color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
            .imp-fila { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
            .imp-gran-total { font-weight: bold; font-size: 14px; border-top: 2px solid #111;
              padding-top: 6px; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { text-align: left; font-size: 10px; font-weight: bold; text-transform: uppercase;
              color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 4px 0; }
            td { padding: 6px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
            .imp-footer { margin-top: 32px; text-align: center; font-size: 10px;
              color: #9ca3af; border-top: 1px dashed #e5e7eb; padding-top: 12px; }
          </style>
        </head>
        <body>${contenido}</body>
      </html>
    `);
    ventana.document.close();
    ventana.focus();
    ventana.print();
    ventana.close();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Entregas a Domicilio</h1>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${tabActual === "ruta" ? styles.tabActive : ""}`}
          onClick={() => setTabActual("ruta")}
        >
          Mi Ruta
        </button>
        <button
          className={`${styles.tabBtn} ${tabActual === "historial" ? styles.tabActive : ""}`}
          onClick={() => setTabActual("historial")}
        >
          Mi Historial
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: MI RUTA
         ══════════════════════════════════════════════════════════════════════ */}
      {tabActual === "ruta" && (
        <>
          {cargandoRuta ? (
            <div className={styles.emptyState}>Cargando tu ruta...</div>
          ) : pedidos.length === 0 ? (
            <div className={styles.emptyState}>
              ¡Excelente trabajo! No tienes entregas pendientes en este momento.
            </div>
          ) : (
            <div className={styles.grid}>
              {pedidos.map((pedido) => (
                <div key={pedido.id_pedido} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.orderId}>
                      Pedido #{pedido.id_pedido}
                    </span>
                    {pedido.pago_contra_entrega ? (
                      <span className={styles.badgeCobrar}>
                        COBRAR Q{pedido.total.toFixed(2)}
                      </span>
                    ) : (
                      <span className={styles.badgePagado}>YA PAGADO</span>
                    )}
                  </div>

                  <div className={styles.infoRow}>
                    <strong>Recibe:</strong>{" "}
                    {pedido.nombre_contacto || "No especificado"}
                  </div>
                  <div className={styles.infoRow}>
                    <strong>Teléfono:</strong>{" "}
                    <a href={`tel:${pedido.telefono_contacto}`}>
                      {pedido.telefono_contacto}
                    </a>
                  </div>
                  <div className={styles.infoRow}>
                    <strong>Dirección:</strong> {pedido.direccion_entrega}
                  </div>

                  <div className={styles.productList}>
                    <strong>Entregar:</strong>
                    {pedido.productos?.map((p, i) => (
                      <div key={i} className={styles.productItem}>
                        <span>{p.producto}</span>
                        <strong>x{p.cantidad}</strong>
                      </div>
                    ))}
                  </div>

                  <div className={styles.actionButtons}>
                    <button
                      className={styles.btnSuccess}
                      onClick={() => iniciarEntrega(pedido)}
                    >
                      Entregado
                    </button>
                    <button
                      className={styles.btnDanger}
                      onClick={() => iniciarFallo(pedido)}
                    >
                      Fallida
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: MI HISTORIAL
         ══════════════════════════════════════════════════════════════════════ */}
      {tabActual === "historial" && (
        <div className={styles.historialContainer}>
          {/* Filtro de fechas */}
          <div className={styles.historialFiltros}>
            <div className={styles.filtroGroup}>
              <label className={styles.filtroLabel}>Desde</label>
              <input
                type="date"
                className={styles.filtroInput}
                value={desde}
                max={hasta}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className={styles.filtroGroup}>
              <label className={styles.filtroLabel}>Hasta</label>
              <input
                type="date"
                className={styles.filtroInput}
                value={hasta}
                min={desde}
                max={hoy()}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <button
              className={styles.btnBuscar}
              onClick={cargarHistorial}
              disabled={cargandoHistorial}
            >
              {cargandoHistorial ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {cargandoHistorial ? (
            <div className={styles.emptyState}>Cargando historial...</div>
          ) : (
            <>
              {/* Resumen estadístico */}
              {resumen && (
                <div className={styles.resumenGrid}>
                  <div
                    className={`${styles.resumenCard} ${styles.resumenEntregados}`}
                  >
                    <span className={styles.resumenNumero}>
                      {resumen.totalEntregados}
                    </span>
                    <span className={styles.resumenLabel}>Entregados</span>
                  </div>
                  <div
                    className={`${styles.resumenCard} ${styles.resumenFallidos}`}
                  >
                    <span className={styles.resumenNumero}>
                      {resumen.totalFallidos}
                    </span>
                    <span className={styles.resumenLabel}>Fallidos</span>
                  </div>
                  <div
                    className={`${styles.resumenCard} ${styles.resumenCobrado}`}
                  >
                    <span className={styles.resumenNumero}>
                      Q{resumen.totalCobrado.toFixed(2)}
                    </span>
                    <span className={styles.resumenLabel}>Cobrado CE</span>
                  </div>
                </div>
              )}

              {/* Lista de entregas */}
              {historial.length === 0 ? (
                <div className={styles.emptyState}>
                  No hay entregas registradas en este período.
                </div>
              ) : (
                <div className={styles.grid}>
                  {historial.map((entrega) => (
                    <div
                      key={entrega.id_pedido}
                      className={`${styles.card} ${
                        entrega.estado_pedido === "fallido"
                          ? styles.cardFallido
                          : ""
                      }`}
                    >
                      {/* Cabecera */}
                      <div className={styles.cardHeader}>
                        <span className={styles.orderId}>
                          Pedido #{entrega.id_pedido}
                        </span>
                        {entrega.estado_pedido === "entregado" ? (
                          <span className={styles.badgePagado}>ENTREGADO</span>
                        ) : (
                          <span className={styles.badgeFallido}>FALLIDO</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className={styles.infoRow}>
                        <strong>Fecha:</strong>{" "}
                        {entrega.fecha_entrega
                          ? fmtFechaSolo(entrega.fecha_entrega)
                          : "—"}
                      </div>
                      <div className={styles.infoRow}>
                        <strong>Contacto:</strong>{" "}
                        {entrega.nombre_contacto || "No especificado"}
                      </div>
                      <div className={styles.infoRow}>
                        <strong>Dirección:</strong> {entrega.direccion_entrega}
                      </div>

                      {/* Monto cobrado si fue CE */}
                      {entrega.pago_contra_entrega &&
                        entrega.estado_pedido === "entregado" && (
                          <div className={styles.montoCobrado}>
                            Cobrado:{" "}
                            <strong>
                              Q{entrega.monto_cobrado?.toFixed(2)}
                            </strong>
                          </div>
                        )}

                      {/* Motivo si fue fallida */}
                      {entrega.estado_pedido === "fallido" &&
                        entrega.motivo_fallido && (
                          <div className={styles.motivoFallido}>
                            <strong>Motivo:</strong> {entrega.motivo_fallido}
                          </div>
                        )}

                      {/* Botón comprobante solo si hay id_pago */}
                      {entrega.id_pago !== null && (
                        <button
                          className={styles.btnComprobante}
                          onClick={() => abrirComprobante(entrega.id_pago!)}
                        >
                          Ver Comprobante
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODALES (compartidos entre tabs)
         ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Modal Cobro ──────────────────────────────────────────────────── */}
      {modalExito && pedidoSeleccionado && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Registrar Cobro</h2>
            <p>
              El cliente debe pagar{" "}
              <strong>Q{pedidoSeleccionado.total.toFixed(2)}</strong>.
            </p>

            <label style={{ marginTop: "1rem", display: "block" }}>
              Efectivo Recibido (Q):
            </label>
            <input
              type="number"
              className={styles.inputLarge}
              value={montoCobrado}
              onChange={(e) => setMontoCobrado(e.target.value)}
            />

            {Number(montoCobrado) > pedidoSeleccionado.total && (
              <div className={styles.vueltoBox}>
                Vuelto: Q
                {(Number(montoCobrado) - pedidoSeleccionado.total).toFixed(2)}
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.25rem" }}>
              <button
                className={styles.btnDanger}
                style={{ backgroundColor: "#9ca3af" }}
                onClick={() => setModalExito(false)}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                className={styles.btnSuccess}
                disabled={procesando}
                onClick={() =>
                  procesarExito(
                    pedidoSeleccionado.id_pedido,
                    Number(montoCobrado),
                  )
                }
              >
                {procesando ? "Registrando..." : "Confirmar Cobro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Fallida ─────────────────────────────────────────────────── */}
      {modalFallo && pedidoSeleccionado && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Reportar Problema</h2>
            <p>
              Indique por qué no se pudo entregar el Pedido #
              {pedidoSeleccionado.id_pedido}
            </p>
            <textarea
              className={styles.textarea}
              rows={4}
              placeholder="Ej. No había nadie en casa, dirección no existe..."
              value={motivoFallo}
              onChange={(e) => setMotivoFallo(e.target.value)}
            />
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                className={styles.btnDanger}
                style={{ backgroundColor: "#9ca3af" }}
                onClick={() => setModalFallo(false)}
              >
                Volver
              </button>
              <button className={styles.btnDanger} onClick={procesarFallo}>
                Reportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Comprobante ─────────────────────────────────────────────── */}
      {(cargandoComprobante || modalComprobante) && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalComprobanteContent}>
            <div className={styles.modalComprobanteHeader}>
              <div>
                <h2>Comprobante de Cobro</h2>
                {modalComprobante && (
                  <p className={styles.modalComprobanteSubtitle}>
                    Pago #{modalComprobante.id_pago} — Venta #
                    {modalComprobante.id_venta}
                  </p>
                )}
              </div>
              <div className={styles.modalComprobanteBtns}>
                {modalComprobante && (
                  <button
                    className={styles.btnImprimir}
                    onClick={imprimirComprobante}
                  >
                    Imprimir
                  </button>
                )}
                <button
                  className={styles.btnCerrar}
                  onClick={cerrarComprobante}
                >
                  Cerrar
                </button>
              </div>
            </div>

            {cargandoComprobante ? (
              <div className={styles.comprobanteLoading}>
                Generando comprobante...
              </div>
            ) : modalComprobante ? (
              <div ref={comprobanteRef} className={styles.comprobanteBody}>
                <div className="imp-empresa">
                  <h2>Refaccionaria Franco</h2>
                </div>

                <div className="imp-numero">
                  Comprobante No.{" "}
                  {String(modalComprobante.id_pago).padStart(8, "0")}
                </div>

                <div className="imp-seccion">
                  <h3>Datos del cobro</h3>
                  <div className="imp-fila">
                    <span>Fecha</span>
                    <span>{fmtFecha(modalComprobante.fecha_pago)}</span>
                  </div>
                  <div className="imp-fila">
                    <span>Cliente</span>
                    <span>{modalComprobante.cliente}</span>
                  </div>
                  <div className="imp-fila">
                    <span>NIT</span>
                    <span>{modalComprobante.nit ?? "CF"}</span>
                  </div>
                  {modalComprobante.direccion_cliente && (
                    <div className="imp-fila">
                      <span>Dirección</span>
                      <span>{modalComprobante.direccion_cliente}</span>
                    </div>
                  )}
                  <div className="imp-fila">
                    <span>Cobrado por</span>
                    <span>{modalComprobante.cajero}</span>
                  </div>
                  <div className="imp-fila">
                    <span>Forma de pago</span>
                    <span>{labelMetodo(modalComprobante.metodo_pago)}</span>
                  </div>
                  {modalComprobante.referencia && (
                    <div className="imp-fila">
                      <span>Referencia</span>
                      <span>{modalComprobante.referencia}</span>
                    </div>
                  )}
                </div>

                <div className="imp-seccion">
                  <h3>Productos</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Descripción</th>
                        <th style={{ textAlign: "center" }}>Cant.</th>
                        <th style={{ textAlign: "right" }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalComprobante.detalles.map((d, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{d.producto}</div>
                            <div
                              style={{ fontSize: "0.7rem", color: "#6b7280" }}
                            >
                              {d.sku}
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>{d.cantidad}</td>
                          <td style={{ textAlign: "right" }}>
                            Q{d.subtotal_linea.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="imp-seccion">
                  <h3>Resumen</h3>
                  <div className="imp-fila">
                    <span>Subtotal</span>
                    <span>Q{modalComprobante.subtotal.toFixed(2)}</span>
                  </div>
                  {modalComprobante.descuento_monto > 0 && (
                    <div className="imp-fila">
                      <span>Descuento</span>
                      <span>
                        -Q{modalComprobante.descuento_monto.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="imp-fila imp-gran-total">
                    <span>TOTAL</span>
                    <span>Q{modalComprobante.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="imp-footer">
                  Gracias por su compra — Refaccionaria Franco
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
