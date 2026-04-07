// src/app/(dashboard)/caja/page.tsx
"use client";

import { useEffect, useState } from "react";
import { CajaService } from "@/services/caja.service";
import { OrdenPendienteCaja, ResumenCaja } from "@/types/caja.types";
import styles from "./Caja.module.css";

export default function CajaPage() {
  const [tabActual, setTabActual] = useState<"cobros" | "arqueo">("cobros");
  const [cargando, setCargando] = useState(false);

  // Estados Tab 1: Cobros
  const [pendientes, setPendientes] = useState<OrdenPendienteCaja[]>([]);
  const [modalCobro, setModalCobro] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] =
    useState<OrdenPendienteCaja | null>(null);

  // Formulario Cobro
  const [metodoPago, setMetodoPago] = useState<
    "efectivo" | "tarjeta" | "transferencia"
  >("efectivo");
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");

  // Estados Tab 2: Arqueo
  const [resumen, setResumen] = useState<ResumenCaja[]>([]);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [obsArqueo, setObservacionesArqueo] = useState("");

  useEffect(() => {
    if (tabActual === "cobros") cargarPendientes();
    if (tabActual === "arqueo") cargarResumen();
  }, [tabActual]);

  // --- Lógica Pestaña: COBROS ---
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
    if (Number(monto) < ordenSeleccionada.total) {
      return alert("El monto ingresado es menor al total de la orden.");
    }
    if (metodoPago !== "efectivo" && !referencia) {
      return alert(
        "Debe ingresar un número de autorización o referencia para tarjeta/transferencia.",
      );
    }

    try {
      await CajaService.registrarPago({
        id_venta: ordenSeleccionada.id_venta,
        metodo_pago: metodoPago,
        monto: Number(monto),
        referencia: referencia || undefined,
      });
      alert("¡Pago registrado exitosamente!");
      setModalCobro(false);
      cargarPendientes();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  // --- Lógica Pestaña: ARQUEO ---
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
    if (!efectivoContado || Number(efectivoContado) < 0) {
      return alert("Debe ingresar un monto válido de efectivo físico.");
    }

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
        // Opcional: Podrías forzar el cierre de sesión aquí si así lo requiere la empresa.
      } catch (error: any) {
        alert("Error: " + error.message);
      }
    }
  };

  // Helper para el total de efectivo en sistema
  const efectivoSistema =
    resumen.find((r) => r.metodo_pago === "efectivo")?.total || 0;

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

          {/* VISTA 2: ARQUEO DE CAJA */}
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
                        {r.metodo_pago === "efectivo"
                          ? "💵 Efectivo"
                          : r.metodo_pago === "tarjeta"
                            ? "💳 Tarjeta POS"
                            : "🏦 Transferencia"}
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
              <button
                className={`${styles.methodBtn} ${metodoPago === "efectivo" ? styles.methodActive : ""}`}
                onClick={() => setMetodoPago("efectivo")}
              >
                💵 Efectivo
              </button>
              <button
                className={`${styles.methodBtn} ${metodoPago === "tarjeta" ? styles.methodActive : ""}`}
                onClick={() => setMetodoPago("tarjeta")}
              >
                💳 Tarjeta
              </button>
              <button
                className={`${styles.methodBtn} ${metodoPago === "transferencia" ? styles.methodActive : ""}`}
                onClick={() => setMetodoPago("transferencia")}
              >
                🏦 Transf.
              </button>
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
                  placeholder="Ej. 049582"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: "2rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setModalCobro(false)}
                style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid #ccc",
                  background: "white",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                className={styles.btnCobrar}
                style={{ padding: "0.75rem 1.5rem", fontSize: "1rem" }}
                onClick={procesarPago}
              >
                Confirmar Cobro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
