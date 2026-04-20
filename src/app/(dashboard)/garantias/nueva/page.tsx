"use client";

import { useState } from "react";
import { GarantiaService } from "@/services/garantia.service";
import { VentaService } from "@/services/venta.service";
import styles from "./NuevaGarantia.module.css";

export default function NuevaGarantiaPage() {
  const [idVenta, setIdVenta] = useState("");
  const [venta, setVenta] = useState<any>(null);
  const [detalles, setDetalles] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Estados del modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState("");

  const buscarVenta = async () => {
    if (!idVenta) return;
    try {
      setError("");
      setVenta(null);
      setDetalles([]);

      const data = await VentaService.obtenerVentaPorId(Number(idVenta));
      setVenta(data.venta);
      setDetalles(data.detalles);
    } catch (err: any) {
      setError("No se encontró el ticket o hubo un error de conexión.");
    }
  };

  const calcularDiasRestantes = (
    fechaCompra: string,
    diasGarantia: number | undefined,
  ) => {
    if (
      diasGarantia === undefined ||
      diasGarantia === null ||
      diasGarantia <= 0
    )
      return -1;

    const limite = new Date(fechaCompra);
    limite.setDate(limite.getDate() + diasGarantia);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    limite.setHours(0, 0, 0, 0);

    return Math.ceil(
      (limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const abrirModal = (detalle: any) => {
    setProductoSeleccionado(detalle);
    setCantidad(1);
    setMotivo("");
    setModalAbierto(true);
  };

  const enviarReclamo = async () => {
    if (motivo.length < 10)
      return alert("El motivo debe ser más detallado (mín. 10 caracteres).");
    if (cantidad < 1 || cantidad > productoSeleccionado.cantidad)
      return alert("Cantidad inválida.");

    try {
      await GarantiaService.crearGarantia({
        id_detalle_venta: productoSeleccionado.id_detalle,
        cantidad: Number(cantidad),
        motivo_reclamo: motivo,
      });
      alert(
        "Reclamo de garantía registrado con éxito. Pendiente de aprobación por el supervisor.",
      );
      setModalAbierto(false);
      // Refrescar los detalles para que el botón cambie a "Reclamado"
      const data = await VentaService.obtenerVentaPorId(Number(idVenta));
      setDetalles(data.detalles);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Reclamar Garantía</h1>

      <div className={styles.searchBox}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            Buscar por ID de Venta (Ticket)
          </label>
          <input
            type="number"
            className={styles.input}
            placeholder="Ej. 1023"
            value={idVenta}
            onChange={(e) => setIdVenta(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarVenta()}
          />
        </div>
        <button className={styles.btnSearch} onClick={buscarVenta}>
          Buscar
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {venta && (
        <div className={styles.ventaInfo}>
          <p>
            <strong>Ticket:</strong> #{venta.id_venta}
          </p>
          <p>
            <strong>Cliente:</strong> {venta.cliente}
          </p>
          <p>
            <strong>Fecha:</strong>{" "}
            {new Date(venta.created_at).toLocaleDateString("es-GT")}
          </p>
        </div>
      )}

      {detalles.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>SKU</th>
              <th>Cantidad</th>
              <th>Garantía</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((det) => {
              const diasRestantes = calcularDiasRestantes(
                venta.created_at,
                det.garantia_dias,
              );
              const garantiaVigente = diasRestantes > 0;
              const sinGarantia = det.garantia_dias <= 0;

              return (
                <tr key={det.id_detalle}>
                  <td>{det.producto}</td>
                  <td>{det.sku}</td>
                  <td>{det.cantidad}</td>
                  <td>
                    {sinGarantia ? (
                      <span className={styles.badgeNoGarantia}>
                        Sin garantía
                      </span>
                    ) : garantiaVigente ? (
                      <span className={styles.badgeVigente}>
                        {diasRestantes} día{diasRestantes !== 1 ? "s" : ""}{" "}
                        restante{diasRestantes !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className={styles.badgeVencida}>Vencida</span>
                    )}
                  </td>
                  <td>
                    {/* Caso 1: ya tiene un reclamo (cualquier estado) */}
                    {det.tiene_garantia ? (
                      <button className={styles.btnReclamado} disabled>
                        ✓ Reclamado
                      </button>
                    ) : /* Caso 2: sin garantía o vencida */ sinGarantia ||
                      !garantiaVigente ? (
                      <button className={styles.btnDisabled} disabled>
                        No aplica
                      </button>
                    ) : (
                      /* Caso 3: apto para reclamar */
                      <button
                        className={styles.btnReclamar}
                        onClick={() => abrirModal(det)}
                      >
                        Reclamar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Modal de reclamo */}
      {modalAbierto && productoSeleccionado && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Registrar Reclamo</h2>
            <p className={styles.modalSubtitle}>
              {productoSeleccionado.producto} — SKU: {productoSeleccionado.sku}
            </p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Cantidad reclamada</label>
              <input
                type="number"
                className={styles.input}
                min={1}
                max={productoSeleccionado.cantidad}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Motivo del reclamo</label>
              <textarea
                className={styles.textarea}
                rows={4}
                placeholder="Describa el defecto o problema con la pieza..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.btnCancel}
                onClick={() => setModalAbierto(false)}
              >
                Cancelar
              </button>
              <button className={styles.btnApprove} onClick={enviarReclamo}>
                Registrar Reclamo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
