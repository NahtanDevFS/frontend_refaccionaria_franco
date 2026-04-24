"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./VentaDetalle.module.css";
import { VentaService } from "@/services/venta.service";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString("es-GT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtQ(n: number | string) {
  return `Q ${Number(n).toFixed(2)}`;
}

function getToken(): string {
  if (typeof document === "undefined") return "";
  return document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2] ?? "";
}

function getRol(): string {
  if (typeof window === "undefined") return "";
  try {
    return JSON.parse(localStorage.getItem("usuario") ?? "{}").rol ?? "";
  } catch {
    return "";
  }
}

const ROLES_SUPERVISOR = [
  "ADMINISTRADOR",
  "GERENTE_REGIONAL",
  "SUPERVISOR_SUCURSAL",
];

const LABELS_ESTADO: Record<string, string> = {
  pagada: "Pagada",
  pendiente_pago: "Pendiente de Pago",
  pendiente_autorizacion: "Pendiente Autorización",
  pendiente_cobro_contra_entrega: "Contra Entrega",
  anulada: "Anulada",
  rechazada: "Rechazada",
};

// ── Componente ────────────────────────────────────────────────────────────────
export default function DetalleVentaPage() {
  const params = useParams();
  const router = useRouter();
  const id_venta = Number(params?.id_venta);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  // ── Datos de la venta
  const [data, setData] = useState<{ venta: any; detalles: any[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reagendando, setReagendando] = useState(false);
  const [idRepartidorNuevo, setIdRepartidorNuevo] = useState("");
  const [repartidores, setRepartidores] = useState<any[]>([]);
  const [errorReagenda, setErrorReagenda] = useState("");

  const cargarRepartidores = async () => {
    try {
      const res = await fetch(`${API_URL}/ventas/repartidores/activos`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      const json = await res.json();
      if (json.success) setRepartidores(json.data ?? []);
    } catch {
      /* silencioso */
    }
  };

  const reagendarEntrega = async () => {
    if (!idRepartidorNuevo) {
      setErrorReagenda("Selecciona un repartidor.");
      return;
    }
    setReagendando(true);
    setErrorReagenda("");
    try {
      const res = await fetch(
        `${API_URL}/ventas/${id_venta}/reagendar-entrega`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({ id_repartidor: Number(idRepartidorNuevo) }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      setIdRepartidorNuevo("");
      await cargarVenta(); // recarga para limpiar el card
    } catch (err: any) {
      setErrorReagenda(err.message);
    } finally {
      setReagendando(false);
    }
  };

  // ── Sesión
  const [esSupervisor, setEsSupervisor] = useState(false);

  // ── Modal de anulación
  const [modalAnulacion, setModalAnulacion] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [montoDevolucion, setMontoDevolucion] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [errorAnulacion, setErrorAnulacion] = useState("");

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    const esSup = ROLES_SUPERVISOR.includes(getRol());
    setEsSupervisor(esSup);
    if (id_venta > 0) {
      cargarVenta();
      if (esSup) cargarRepartidores(); // ← agregar
    }
  }, [id_venta]);

  const cargarVenta = async () => {
    setLoading(true);
    setError("");
    try {
      const respuesta = await VentaService.obtenerVentaPorId(id_venta);
      setData(respuesta);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Anulación ─────────────────────────────────────────────────────────────
  const abrirModalAnulacion = () => {
    setMotivoAnulacion("");
    setMontoDevolucion("");
    setErrorAnulacion("");
    setModalAnulacion(true);
  };

  const confirmarAnulacion = async () => {
    if (motivoAnulacion.trim().length < 5) {
      setErrorAnulacion("El motivo debe tener al menos 5 caracteres.");
      return;
    }

    const montoNum = montoDevolucion ? Number(montoDevolucion) : 0;

    if (montoNum < 0) {
      setErrorAnulacion("El monto a devolver no puede ser negativo.");
      return;
    }

    if (montoNum > Number(venta.total)) {
      setErrorAnulacion(
        `El monto a devolver no puede superar el total de la venta (${fmtQ(venta.total)}).`,
      );
      return;
    }
    setAnulando(true);
    setErrorAnulacion("");
    try {
      const res = await fetch(`${API_URL}/ventas/${id_venta}/anular`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          motivo_anulacion: motivoAnulacion.trim(),
          monto_devolucion: montoDevolucion ? Number(montoDevolucion) : 0,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Error al anular");
      setModalAnulacion(false);
      await cargarVenta(); // recargar para mostrar el bloque informativo
    } catch (err: any) {
      setErrorAnulacion(err.message);
    } finally {
      setAnulando(false);
    }
  };

  // ── Guardas de renderizado ────────────────────────────────────────────────
  if (!id_venta || id_venta <= 0)
    return (
      <div className={styles.container}>
        <p>ID de venta inválido.</p>
      </div>
    );

  if (loading)
    return (
      <div className={styles.container}>
        <p>Cargando detalles de la venta...</p>
      </div>
    );

  if (error)
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );

  if (!data || !data.venta)
    return (
      <div className={styles.container}>
        <p>No se encontró la venta.</p>
      </div>
    );

  const { venta, detalles } = data;
  const estaAnulada = venta.estado === "anulada";
  const puedeAnular = esSupervisor && !estaAnulada;

  return (
    <div className={styles.container}>
      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Detalle de Venta #{venta.id_venta}</h1>
        <div className={styles.headerActions}>
          {puedeAnular && (
            <button onClick={abrirModalAnulacion} className={styles.btnDanger}>
              Anular venta
            </button>
          )}
          <button onClick={() => router.back()} className={styles.btnSecondary}>
            ← Volver al Historial
          </button>
        </div>
      </div>

      {/*Bloque informativo de anulación (solo si está anulada) */}
      {estaAnulada && (
        <div className={styles.bloqueAnulacion}>
          <div className={styles.bloqueAnulacionTexto}>
            <p className={styles.bloqueAnulacionTitulo}>Venta anulada</p>
            <p>
              <strong>Anulada por:</strong>{" "}
              {venta.anulado_por ?? "No registrado"}{" "}
              <span className={styles.textMuted}>·</span>{" "}
              {venta.updated_at ? fmtFecha(venta.updated_at) : "—"}
            </p>
            <p>
              <strong>Motivo:</strong>{" "}
              {venta.motivo_anulacion ?? "Sin motivo registrado"}
            </p>
            {Number(venta.monto_devolucion) > 0 && (
              <p>
                <strong>Monto a devolver al cliente:</strong>{" "}
                <span className={styles.textDevolucion}>
                  {fmtQ(venta.monto_devolucion)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Cards de información ─────────────────────────────────────────────── */}
      <div className={styles.gridContainer}>
        {/* Información General */}
        <div className={styles.card}>
          <h3>Información General</h3>
          <p>
            <strong>Fecha:</strong> {fmtFecha(venta.created_at || venta.fecha)}
          </p>
          <p>
            <strong>Estado:</strong>{" "}
            <span
              className={`${styles.badge} ${estaAnulada ? styles.badgeDanger : styles.badgeDefault}`}
            >
              {LABELS_ESTADO[venta.estado] ??
                venta.estado?.replace(/_/g, " ").toUpperCase()}
            </span>
          </p>
          <p>
            <strong>Canal:</strong>{" "}
            {venta.canal === "domicilio" ? "Domicilio" : "Mostrador"}
          </p>
          <p>
            <strong>Vendedor:</strong>{" "}
            {venta.vendedor || venta.id_vendedor || "No registrado"}
          </p>
        </div>

        {/* Datos del Cliente */}
        <div className={styles.card}>
          <h3>Datos del Cliente</h3>
          <p>
            <strong>Nombre:</strong> {venta.cliente || "Consumidor Final"}
          </p>
        </div>

        {/* Totales */}
        <div className={styles.card}>
          <h3>Totales</h3>
          <p>
            <strong>Subtotal:</strong> {fmtQ(venta.subtotal)}
          </p>
          {Number(venta.descuento_monto) > 0 && (
            <p>
              <strong>Descuento:</strong> - {fmtQ(venta.descuento_monto)}
            </p>
          )}
          <p>
            <strong>IVA (12%):</strong> {fmtQ(venta.monto_iva)}
          </p>
          <p>
            <strong>Total:</strong>{" "}
            <span className={styles.textBold}>{fmtQ(venta.total)}</span>
          </p>
        </div>
      </div>

      {/* ── Tabla de productos ───────────────────────────────────────────────── */}
      <div className={styles.card} style={{ marginTop: "2rem" }}>
        <h3>Productos</h3>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Subtotal Línea</th>
              </tr>
            </thead>
            <tbody>
              {detalles && detalles.length > 0 ? (
                detalles.map((d: any) => (
                  <tr key={d.id_detalle}>
                    <td>{d.producto}</td>
                    <td>{d.sku}</td>
                    <td>{d.cantidad}</td>
                    <td>{fmtQ(d.precio_unitario)}</td>
                    <td>{fmtQ(d.subtotal_linea)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center" }}>
                    Sin productos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal de anulación ───────────────────────────────────────────────── */}
      {modalAnulacion && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Anular Venta #{id_venta}</h2>
            <p className={styles.modalAviso}>
              Esta acción es irreversible. El stock de todos los productos será
              reintegrado automáticamente.
            </p>

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                Motivo de anulación <span className={styles.required}>*</span>
              </label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Ej. El cliente devolvió los productos, precio registrado incorrectamente..."
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
              />
            </div>

            {/* Solo mostrar si la venta ya estaba pagada */}
            {venta.estado === "pagada" && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  Monto a devolver al cliente (Q){" "}
                  <span className={styles.textMuted}>— opcional</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={venta.total}
                  step="0.01"
                  className={styles.input}
                  placeholder={`Máx. ${fmtQ(venta.total)}`}
                  value={montoDevolucion}
                  onChange={(e) => setMontoDevolucion(e.target.value)}
                />
              </div>
            )}

            {errorAnulacion && (
              <p className={styles.errorMsg}>{errorAnulacion}</p>
            )}

            <div className={styles.modalActions}>
              <button
                className={styles.btnDanger}
                onClick={confirmarAnulacion}
                disabled={anulando}
              >
                {anulando ? "Anulando..." : "Confirmar anulación"}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={() => setModalAnulacion(false)}
                disabled={anulando}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {esSupervisor &&
        venta.canal === "domicilio" &&
        venta.estado_pedido === "fallido" && (
          <div className={styles.bloqueReagenda}>
            <div className={styles.bloqueReagendaIcono}>⚠️</div>
            <div className={styles.bloqueReagendaTexto}>
              <p className={styles.bloqueReagendaTitulo}>Entrega fallida</p>
              <p>
                <strong>Motivo:</strong> <em>{venta.motivo_fallido}</em>
              </p>
              <div className={styles.reagendaForm}>
                <select
                  className={styles.input}
                  value={idRepartidorNuevo}
                  onChange={(e) => setIdRepartidorNuevo(e.target.value)}
                >
                  <option value="">— Seleccionar repartidor —</option>
                  {repartidores.map((r: any) => (
                    <option key={r.id_empleado} value={r.id_empleado}>
                      {r.nombre} {r.apellido}
                      {!r.disponible ? " (no disponible)" : ""}
                    </option>
                  ))}
                </select>
                <button
                  className={styles.btnPrimary}
                  onClick={reagendarEntrega}
                  disabled={reagendando}
                >
                  {reagendando ? "Reagendando..." : "Reagendar entrega"}
                </button>
              </div>
              {errorReagenda && (
                <p className={styles.errorMsg}>{errorReagenda}</p>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
