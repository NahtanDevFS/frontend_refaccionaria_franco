"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Ventas.module.css";
import { VentaService } from "@/services/venta.service";
import { VentaResumen } from "@/types/venta.types";

export default function ListadoVentas() {
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarVentas();
  }, []);

  const cargarVentas = async () => {
    try {
      // En un entorno real sin backend activo esto fallará,
      // reemplazar con datos estáticos si el backend no está levantado aún.
      const data = await VentaService.obtenerVentas();
      setVentas(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Historial de Ventas</h1>
      </div>

      {error && <div style={{ color: "var(--error-color)" }}>{error}</div>}

      {loading ? (
        <p>Cargando datos...</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID Venta</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {ventas.length === 0 ? (
              <tr>
                <td colSpan={5}>No hay ventas registradas.</td>
              </tr>
            ) : (
              ventas.map((v) => (
                <tr key={v.id_venta}>
                  <td>{v.id_venta}</td>
                  <td>{new Date(v.fecha).toLocaleDateString()}</td>
                  <td>{v.cliente}</td>
                  <td>Q {v.total.toFixed(2)}</td>
                  <td>{v.estado}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
