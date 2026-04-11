// src/app/(dashboard)/bodega/page.tsx
"use client";

import { useEffect, useState } from "react";
import { BodegaService } from "@/services/bodega.service";
import { InventarioBodega, RecepcionPendiente } from "@/types/bodega.types";
import styles from "./Bodega.module.css";

// Lista temporal de sucursales para el select de destino
const SUCURSALES = [
  { id: 1, nombre: "Sucursal Chiquimula Principal" },
  { id: 2, nombre: "Sede Central - Puerto Barrios" },
  { id: 3, nombre: "Sucursal Guatemala Central" },
  { id: 4, nombre: "Sucursal Quetzaltenango" },
  { id: 5, nombre: "Sucursal Cobán" },
  { id: 6, nombre: "Sucursal Escuintla" },
  { id: 7, nombre: "Sucursal Retalhuleu" },
];

export default function BodegaPage() {
  const [tabActual, setTabActual] = useState<
    "stock" | "emitir" | "recibir" | "ajustes"
  >("stock");
  const [cargando, setCargando] = useState(false);

  // Tab 1: Stock local
  const [inventario, setInventario] = useState<InventarioBodega[]>([]);

  // Tab 2: Emitir Despacho (Traslado)
  const [idSucursalDestino, setIdSucursalDestino] = useState("");
  const [detallesDespacho, setDetallesDespacho] = useState<
    { id_producto: number; cantidad: number }[]
  >([]);
  const [prodSelectTraslado, setProdSelectTraslado] = useState("");
  const [cantSelectTraslado, setCantSelectTraslado] = useState(1);

  // Tab 3: Recepciones
  const [recepciones, setRecepciones] = useState<RecepcionPendiente[]>([]);

  // Tab 4: Ajustes
  const [ajuste, setAjuste] = useState({
    id_producto: "",
    tipo: "ajuste_negativo",
    cantidad: 1,
    motivo: "",
  });

  // Modal de Detalle de Sucursales
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [productoDetalle, setProductoDetalle] =
    useState<InventarioBodega | null>(null);

  useEffect(() => {
    cargarInventario(); // Se carga siempre porque lo usamos para los selects
  }, []);

  useEffect(() => {
    if (tabActual === "recibir") cargarRecepciones();
  }, [tabActual]);

  const cargarInventario = async () => {
    try {
      setCargando(true);
      const data = await BodegaService.obtenerInventario();
      setInventario(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargando(false);
    }
  };

  const cargarRecepciones = async () => {
    try {
      setCargando(true);
      const data = await BodegaService.obtenerRecepciones();
      setRecepciones(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargando(false);
    }
  };

  // Lógica Emisión
  const agregarAlDespacho = () => {
    if (!prodSelectTraslado || cantSelectTraslado < 1) return;
    const invLocal = inventario.find(
      (i) => i.id_producto === Number(prodSelectTraslado),
    );

    if (invLocal && cantSelectTraslado > invLocal.cantidad_actual) {
      return alert(
        `Solo tienes ${invLocal.cantidad_actual} unidades disponibles en stock local.`,
      );
    }

    setDetallesDespacho([
      ...detallesDespacho,
      { id_producto: Number(prodSelectTraslado), cantidad: cantSelectTraslado },
    ]);
    setProdSelectTraslado("");
    setCantSelectTraslado(1);
  };

  const procesarEmision = async () => {
    if (!idSucursalDestino) return alert("Seleccione sucursal destino");
    if (detallesDespacho.length === 0)
      return alert("Agregue al menos un producto");

    try {
      await BodegaService.emitirDespacho({
        id_sucursal_destino: Number(idSucursalDestino),
        detalles: detallesDespacho,
      });
      alert("Despacho emitido y mercadería descontada del inventario.");
      setDetallesDespacho([]);
      setIdSucursalDestino("");
      cargarInventario(); // Refrescar stock
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Lógica Recepción
  const confirmarLlegada = async (id_despacho: number) => {
    if (
      confirm(
        "¿Verificó físicamente que todos los productos del listado llegaron correctamente?",
      )
    ) {
      try {
        await BodegaService.confirmarRecepcion(id_despacho);
        alert("¡Recepción confirmada e inventario actualizado!");
        cargarRecepciones();
        cargarInventario(); // Refrescar stock
      } catch (err: any) {
        alert("Error: " + err.message);
      }
    }
  };

  // Lógica Ajuste
  const procesarAjuste = async () => {
    if (!ajuste.id_producto || !ajuste.motivo || ajuste.cantidad < 1) {
      return alert("Complete todos los campos del ajuste correctamente.");
    }
    try {
      await BodegaService.ajustarInventario({
        id_producto: Number(ajuste.id_producto),
        tipo: ajuste.tipo as any,
        cantidad: Number(ajuste.cantidad),
        motivo: ajuste.motivo,
      });
      alert("Ajuste registrado exitosamente.");
      setAjuste({
        id_producto: "",
        tipo: "ajuste_negativo",
        cantidad: 1,
        motivo: "",
      });
      cargarInventario(); // Refrescar stock
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Panel de Bodega e Inventario</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${tabActual === "stock" ? styles.tabActive : ""}`}
          onClick={() => setTabActual("stock")}
        >
          Stock y Alertas
        </button>
        <button
          className={`${styles.tabBtn} ${tabActual === "emitir" ? styles.tabActive : ""}`}
          onClick={() => setTabActual("emitir")}
        >
          Emitir Traslado
        </button>
        <button
          className={`${styles.tabBtn} ${tabActual === "recibir" ? styles.tabActive : ""}`}
          onClick={() => setTabActual("recibir")}
        >
          Recibir Traslado
        </button>
        <button
          className={`${styles.tabBtn} ${tabActual === "ajustes" ? styles.tabActive : ""}`}
          onClick={() => setTabActual("ajustes")}
        >
          Ajustes (Mermas)
        </button>
      </div>

      {cargando && <p>Cargando información...</p>}

      {/* TAB 1: STOCK */}
      {tabActual === "stock" && !cargando && (
        <div className={styles.card}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Stock Local</th>
                <th>Estado</th>
                <th>Otras Sucursales</th>
              </tr>
            </thead>
            <tbody>
              {inventario.map((item) => (
                <tr
                  key={item.id_producto}
                  className={item.requiere_reorden ? styles.rowAlert : ""}
                >
                  <td>{item.sku}</td>
                  <td>{item.nombre}</td>
                  <td style={{ fontWeight: "bold" }}>{item.cantidad_actual}</td>
                  <td>
                    {item.requiere_reorden ? (
                      <span className={styles.badgeWarning}>
                        Reorden ({item.punto_reorden})
                      </span>
                    ) : (
                      <span className={styles.badgeOk}>Suficiente</span>
                    )}
                  </td>
                  <td>
                    {item.stock_otras_sucursales} und
                    {item.stock_otras_sucursales > 0 && (
                      <button
                        className={styles.btnSecondary}
                        style={{
                          marginLeft: "10px",
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.75rem",
                        }}
                        onClick={() => {
                          setProductoDetalle(item);
                          setModalDetalleAbierto(true);
                        }}
                      >
                        Ver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: EMITIR TRASLADO */}
      {tabActual === "emitir" && (
        <div className={styles.card}>
          <h2 style={{ marginBottom: "1rem" }}>
            Enviar Producto a Otra Sucursal
          </h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>Sucursal Destino</label>
            <select
              className={styles.select}
              value={idSucursalDestino}
              onChange={(e) => setIdSucursalDestino(e.target.value)}
            >
              <option value="">Seleccione a dónde enviar...</option>
              {SUCURSALES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div
            className={styles.grid2}
            style={{
              marginTop: "1.5rem",
              borderTop: "1px solid #e5e7eb",
              paddingTop: "1rem",
            }}
          >
            <div className={styles.formGroup}>
              <label className={styles.label}>Producto</label>
              <select
                className={styles.select}
                value={prodSelectTraslado}
                onChange={(e) => setProdSelectTraslado(e.target.value)}
              >
                <option value="">Seleccione producto...</option>
                {inventario.map((i) => (
                  <option key={i.id_producto} value={i.id_producto}>
                    {i.nombre} (Hay {i.cantidad_actual})
                  </option>
                ))}
              </select>
            </div>
            <div
              className={styles.formGroup}
              style={{ flexDirection: "row", alignItems: "flex-end" }}
            >
              <div style={{ flex: 1 }}>
                <label className={styles.label}>Cantidad a enviar</label>
                <input
                  type="number"
                  min={1}
                  className={styles.input}
                  style={{ width: "100%" }}
                  value={cantSelectTraslado}
                  onChange={(e) =>
                    setCantSelectTraslado(Number(e.target.value))
                  }
                />
              </div>
              <button
                className={styles.btnSecondary}
                onClick={agregarAlDespacho}
              >
                + Agregar
              </button>
            </div>
          </div>

          {detallesDespacho.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <h3 style={{ marginBottom: "0.5rem" }}>Productos en la caja:</h3>
              <ul style={{ marginBottom: "1.5rem" }}>
                {detallesDespacho.map((d, index) => {
                  const nombreProd = inventario.find(
                    (i) => i.id_producto === d.id_producto,
                  )?.nombre;
                  return (
                    <li key={index}>
                      {nombreProd} - <strong>x{d.cantidad}</strong>
                    </li>
                  );
                })}
              </ul>
              <button className={styles.btnPrimary} onClick={procesarEmision}>
                Generar Nota y Despachar
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECIBIR TRASLADO */}
      {tabActual === "recibir" && !cargando && (
        <div>
          {recepciones.length === 0 ? (
            <div
              className={styles.card}
              style={{ textAlign: "center", color: "gray" }}
            >
              No hay envíos en tránsito hacia esta sucursal.
            </div>
          ) : (
            recepciones.map((rec) => (
              <div key={rec.id_despacho} className={styles.card}>
                <div className={styles.recepcionHeader}>
                  <h3 style={{ margin: 0 }}>Despacho #{rec.id_despacho}</h3>
                  <span style={{ fontSize: "0.875rem", color: "gray" }}>
                    Enviado el:{" "}
                    {new Date(rec.fecha_emision).toLocaleDateString()}
                  </span>
                </div>
                <p>
                  <strong>Viene de:</strong> {rec.origen}
                </p>
                <div
                  style={{
                    marginTop: "1rem",
                    backgroundColor: "#f9fafb",
                    padding: "1rem",
                    borderRadius: "0.5rem",
                  }}
                >
                  <strong>Contenido esperado:</strong>
                  <ul style={{ margin: "0.5rem 0 0 1.5rem" }}>
                    {rec.productos.map((p, i) => (
                      <li key={i}>
                        {p.producto} (SKU: {p.sku}) -{" "}
                        <strong>x{p.cantidad}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className={styles.btnSuccess}
                  style={{ marginTop: "1rem" }}
                  onClick={() => confirmarLlegada(rec.id_despacho)}
                >
                  Confirmar Recepción Física
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: AJUSTES */}
      {tabActual === "ajustes" && (
        <div className={styles.card}>
          <h2 style={{ marginBottom: "1rem" }}>Ajuste Manual de Inventario</h2>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Producto</label>
              <select
                className={styles.select}
                value={ajuste.id_producto}
                onChange={(e) =>
                  setAjuste({ ...ajuste, id_producto: e.target.value })
                }
              >
                <option value="">Seleccione producto...</option>
                {inventario.map((i) => (
                  <option key={i.id_producto} value={i.id_producto}>
                    {i.nombre} (Stock: {i.cantidad_actual})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tipo de Ajuste</label>
              <select
                className={styles.select}
                value={ajuste.tipo}
                onChange={(e) => setAjuste({ ...ajuste, tipo: e.target.value })}
              >
                <option value="ajuste_negativo">
                  Resta (Merma, dañado, robo)
                </option>
                <option value="ajuste_positivo">
                  Suma (Sobrante por error de conteo)
                </option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup} style={{ maxWidth: "200px" }}>
            <label className={styles.label}>Cantidad</label>
            <input
              type="number"
              min={1}
              className={styles.input}
              value={ajuste.cantidad}
              onChange={(e) =>
                setAjuste({ ...ajuste, cantidad: Number(e.target.value) })
              }
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Motivo / Justificación (Obligatorio)
            </label>
            <textarea
              rows={3}
              className={styles.input}
              placeholder="Ej. El repuesto se cayó del estante y se quebró..."
              value={ajuste.motivo}
              onChange={(e) => setAjuste({ ...ajuste, motivo: e.target.value })}
            />
          </div>

          <button
            className={styles.btnPrimary}
            style={{ backgroundColor: "#ef4444" }}
            onClick={procesarAjuste}
          >
            Registrar Ajuste en Bitácora
          </button>
        </div>
      )}
      {/* MODAL DETALLE OTRAS SUCURSALES */}
      {modalDetalleAbierto && productoDetalle && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 style={{ marginBottom: "0.5rem" }}>
              Disponibilidad por Sucursal
            </h2>
            <p>
              <strong>Producto:</strong> {productoDetalle.nombre}
            </p>
            <p>
              <strong>SKU:</strong> {productoDetalle.sku}
            </p>

            <ul className={styles.listDetalle}>
              {productoDetalle.detalle_otras_sucursales.length === 0 ? (
                <li style={{ color: "gray" }}>
                  No hay inventario en otras sucursales.
                </li>
              ) : (
                productoDetalle.detalle_otras_sucursales.map((det, index) => (
                  <li key={index}>
                    <span>{det.sucursal}</span>
                    <strong style={{ fontSize: "1.1rem" }}>
                      {det.cantidad} und
                    </strong>
                  </li>
                ))
              )}
            </ul>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "1rem",
              }}
            >
              <button
                className={styles.btnSecondary}
                onClick={() => setModalDetalleAbierto(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
