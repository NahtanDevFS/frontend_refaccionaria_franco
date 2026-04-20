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

    // Usamos el inicio del día para que la hora exacta no interfiera en el cálculo
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
            placeholder="Ej. 1024"
            value={idVenta}
            onChange={(e) => setIdVenta(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarVenta()}
          />
        </div>
        <button className={styles.btnSearch} onClick={buscarVenta}>
          Buscar
        </button>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {venta && (
        <div className={styles.card}>
          <h2 className={styles.subtitle}>Datos de Venta #{venta.id_venta}</h2>
          <p>
            <strong>Fecha de Compra:</strong>{" "}
            {new Date(venta.created_at || venta.fecha).toLocaleDateString()}
          </p>
          <p>
            <strong>Cliente:</strong> {venta.cliente || "Consumidor Final"}
          </p>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto (SKU)</th>
                  <th>Cant. Comprada</th>
                  <th>Días Garantía</th>
                  <th>Estado Plazo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((d) => {
                  const diasRestantes = calcularDiasRestantes(
                    venta.created_at || venta.fecha,
                    d.garantia_dias,
                  );
                  const esValida = diasRestantes >= 0;

                  return (
                    <tr key={d.id_detalle}>
                      <td>
                        {d.producto}
                        <span className={styles.textMuted}>{d.sku}</span>
                      </td>
                      <td>{d.cantidad} und</td>
                      <td>{d.garantia_dias || 0} días</td>
                      <td>
                        {esValida ? (
                          <span className={styles.badgeValida}>
                            Vigente ({diasRestantes} días rest.)
                          </span>
                        ) : (
                          <span className={styles.badgeExpirada}>Expirada</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={styles.btnAction}
                          disabled={!esValida}
                          onClick={() => abrirModal(d)}
                        >
                          Reclamar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.subtitle}>Registrar Reclamo</h2>
            <p>
              <strong>Producto:</strong> {productoSeleccionado?.producto}
            </p>

            <div className={`${styles.inputGroup} ${styles.inputGroupModal}`}>
              <label className={styles.label}>
                Cantidad a Reclamar (Máx {productoSeleccionado?.cantidad})
              </label>
              <input
                type="number"
                min={1}
                max={productoSeleccionado?.cantidad}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className={styles.input}
              />
            </div>

            <div className={`${styles.inputGroup} ${styles.inputGroupModal}`}>
              <label className={styles.label}>Motivo del Defecto</label>
              <textarea
                rows={3}
                className={styles.input}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describa la falla según el cliente..."
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.btnCancel}
                onClick={() => setModalAbierto(false)}
              >
                Cancelar
              </button>
              <button className={styles.btnSearch} onClick={enviarReclamo}>
                Enviar Reclamo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
