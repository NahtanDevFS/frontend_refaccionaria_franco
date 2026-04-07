// src/app/(dashboard)/garantias/aprobaciones/page.tsx
"use client";

import { useEffect, useState } from "react";
import { GarantiaService } from "@/services/garantia.service";
import { GarantiaPendiente } from "@/types/garantia.types";
import styles from "./Garantias.module.css";

export default function GarantiasPendientesPage() {
  const [garantias, setGarantias] = useState<GarantiaPendiente[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados para el Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [garantiaSeleccionada, setGarantiaSeleccionada] =
    useState<GarantiaPendiente | null>(null);
  const [resolucion, setResolucion] = useState("");
  const [esAprobacion, setEsAprobacion] = useState(false);

  useEffect(() => {
    cargarGarantias();
  }, []);

  const cargarGarantias = async () => {
    try {
      setCargando(true);
      const userString = localStorage.getItem("usuario");
      if (!userString) return;
      const usuario = JSON.parse(userString);

      const data = await GarantiaService.obtenerPendientes(usuario.id_sucursal);
      setGarantias(data);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Error al cargar las garantías pendientes");
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (garantia: GarantiaPendiente, aprobar: boolean) => {
    setGarantiaSeleccionada(garantia);
    setEsAprobacion(aprobar);
    setResolucion("");
    setModalAbierto(true);
  };

  const confirmarResolucion = async () => {
    if (!resolucion.trim()) {
      return alert("Debe ingresar la resolución detallando su decisión.");
    }
    if (!garantiaSeleccionada) return;

    try {
      await GarantiaService.resolverGarantia({
        id_garantia: garantiaSeleccionada.id_garantia,
        aprobado: esAprobacion,
        resolucion,
      });
      alert(
        `Garantía ${esAprobacion ? "aprobada" : "rechazada"} exitosamente.`,
      );

      setModalAbierto(false);
      cargarGarantias(); // Refrescamos la tabla
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  if (cargando) {
    return (
      <div className={styles.container}>Cargando garantías pendientes...</div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Garantías Pendientes de Revisión</h1>

      {garantias.length === 0 ? (
        <p>No hay garantías en estado de revisión en esta sucursal.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID Venta</th>
                <th>Cliente</th>
                <th>Producto (SKU)</th>
                <th>Cant.</th>
                <th>Motivo Reclamo</th>
                <th>Fecha Compra</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {garantias.map((g) => (
                <tr key={g.id_garantia}>
                  <td>#{g.id_venta}</td>
                  <td>{g.cliente}</td>
                  <td>
                    {g.producto} <br />
                    <small style={{ color: "#6b7280" }}>{g.sku}</small>
                  </td>
                  <td>{g.cantidad}</td>
                  <td>{g.motivo_reclamo}</td>
                  <td>{new Date(g.fecha_compra).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={styles.btnAprobar}
                      onClick={() => abrirModal(g, true)}
                    >
                      Aprobar
                    </button>
                    <button
                      className={styles.btnRechazar}
                      onClick={() => abrirModal(g, false)}
                    >
                      Rechazar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE RESOLUCIÓN */}
      {modalAbierto && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>
              {esAprobacion ? "Autorizar Garantía" : "Rechazar Garantía"}
            </h2>
            <p>
              <strong>Producto:</strong> {garantiaSeleccionada?.producto}
            </p>
            <p>
              <strong>Motivo del cliente:</strong>{" "}
              {garantiaSeleccionada?.motivo_reclamo}
            </p>

            <textarea
              className={styles.textarea}
              rows={4}
              placeholder="Detalle el diagnóstico o la razón de su decisión (Ej. Defecto de fábrica comprobado)..."
              value={resolucion}
              onChange={(e) => setResolucion(e.target.value)}
            />

            <div className={styles.modalActions}>
              <button
                className={styles.btnCancel}
                onClick={() => setModalAbierto(false)}
              >
                Cancelar
              </button>
              <button
                className={
                  esAprobacion ? styles.btnAprobar : styles.btnRechazar
                }
                onClick={confirmarResolucion}
              >
                Confirmar {esAprobacion ? "Aprobación" : "Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
