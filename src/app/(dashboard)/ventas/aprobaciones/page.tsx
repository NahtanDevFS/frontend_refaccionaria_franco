"use client";

import { useEffect, useState } from "react";
import styles from "../historial/Ventas.module.css";

export default function AprobacionesPage() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

  const cargarPendientes = async () => {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    const res = await fetch(`${API_URL}/ventas/autorizaciones/pendientes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (Array.isArray(data)) setPendientes(data);
  };

  useEffect(() => {
    cargarPendientes();
  }, []);

  const resolver = async (id_venta: number, aprobado: boolean) => {
    if (
      !confirm(
        `¿Estás seguro de ${aprobado ? "APROBAR" : "RECHAZAR"} este descuento?`,
      )
    )
      return;

    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    await fetch(`${API_URL}/ventas/autorizaciones/resolver`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id_venta, aprobado }),
    });

    cargarPendientes();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Autorización de Descuentos {">"} 5%</h1>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID Venta</th>
            <th>Vendedor</th>
            <th>Cliente</th>
            <th>Subtotal</th>
            <th>Descuento</th>
            <th>Total Final</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pendientes.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center" }}>
                No hay peticiones pendientes
              </td>
            </tr>
          ) : (
            pendientes.map((v) => (
              <tr key={v.id_venta}>
                <td>#{v.id_venta}</td>
                <td>{v.vendedor}</td>
                <td>{v.cliente}</td>
                <td>Q {v.subtotal.toFixed(2)}</td>
                <td style={{ color: "var(--error-color)" }}>
                  {v.pct_descuento}% (Q {v.descuento_monto.toFixed(2)})
                </td>
                <td style={{ fontWeight: "bold" }}>Q {v.total.toFixed(2)}</td>
                <td style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => resolver(v.id_venta, true)}
                    style={{
                      background: "#28a745",
                      color: "white",
                      padding: "0.5rem",
                      borderRadius: "4px",
                    }}
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => resolver(v.id_venta, false)}
                    style={{
                      background: "var(--error-color)",
                      color: "white",
                      padding: "0.5rem",
                      borderRadius: "4px",
                    }}
                  >
                    Rechazar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
