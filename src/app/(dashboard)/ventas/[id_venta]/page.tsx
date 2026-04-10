"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./VentaDetalle.module.css";
import { VentaService } from "@/services/venta.service";

export default function DetalleVentaPage() {
  const params = useParams();
  const router = useRouter();
  const id_venta = Number(params.id_venta);

  // El servicio devuelve { venta: any, detalles: any[] }
  const [data, setData] = useState<{ venta: any; detalles: any[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id_venta) {
      cargarDetalleVenta();
    }
  }, [id_venta]);

  const cargarDetalleVenta = async () => {
    try {
      const respuesta = await VentaService.obtenerVentaPorId(id_venta);
      setData(respuesta);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Detalle de Venta #{venta.id_venta}</h1>
        <button onClick={() => router.back()} className={styles.btnSecondary}>
          &larr; Volver al Historial
        </button>
      </div>

      <div className={styles.gridContainer}>
        {/* Tarjeta de Información General */}
        <div className={styles.card}>
          <h3>Información General</h3>
          <p>
            <strong>Fecha:</strong>{" "}
            {new Date(venta.created_at || venta.fecha).toLocaleString()}
          </p>
          <p>
            <strong>Estado:</strong>{" "}
            <span className={styles.badge}>
              {venta.estado?.replace("_", " ").toUpperCase()}
            </span>
          </p>
          <p>
            <strong>Canal:</strong> {venta.canal || "Mostrador"}
          </p>
          <p>
            <strong>Vendedor (ID):</strong>{" "}
            {venta.id_vendedor || "No registrado"}
          </p>
        </div>

        {/* Tarjeta del Cliente */}
        <div className={styles.card}>
          <h3>Datos del Cliente</h3>
          <p>
            <strong>Nombre:</strong> {venta.cliente || "Cliente Final"}
          </p>
          {/* Aquí puedes agregar NIT o Dirección si el backend los devuelve en el objeto venta */}
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className={styles.card} style={{ marginTop: "2rem" }}>
        <h3>Productos</h3>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID Prod.</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Subtotal Linea</th>
              </tr>
            </thead>
            <tbody>
              {detalles && detalles.length > 0 ? (
                detalles.map((d: any, index: number) => (
                  <tr key={index}>
                    <td>{d.id_producto}</td>
                    <td>{d.nombre_producto || `Producto #${d.id_producto}`}</td>
                    <td>{Number(d.cantidad).toFixed(2)}</td>
                    <td>Q {Number(d.precio_unitario).toFixed(2)}</td>
                    <td>
                      <strong>Q {Number(d.subtotal_linea).toFixed(2)}</strong>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center" }}>
                    No hay detalles registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen de Totales */}
      <div className={styles.totalsContainer}>
        <div className={styles.totalsCard}>
          <div className={styles.totalRow}>
            <span>Subtotal:</span>
            <span>Q {Number(venta.subtotal || venta.total).toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Descuento:</span>
            <span>Q {Number(venta.descuento_monto || 0).toFixed(2)}</span>
          </div>
          <div className={`${styles.totalRow} ${styles.granTotal}`}>
            <span>Total:</span>
            <span>Q {Number(venta.total).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
