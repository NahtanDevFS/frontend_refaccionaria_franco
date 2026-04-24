"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "./Ventas.module.css";
import { VentaService } from "@/services/venta.service";
import {
  VentaResumen,
  FiltrosHistorialVentas,
  MetaPaginacion,
} from "@/types/venta.types";

const LABELS_ESTADO: Record<string, string> = {
  pagada: "Pagada",
  pendiente_pago: "Pendiente de Pago",
  pendiente_autorizacion: "Pendiente Autorización",
  pendiente_cobro_contra_entrega: "Contra Entrega",
  anulada: "Anulada",
  rechazada: "Rechazada",
};

const ESTILOS_ESTADO: Record<string, string> = {
  pagada: "badgeSuccess",
  pendiente_pago: "badgeWarning",
  pendiente_autorizacion: "badgeInfo",
  pendiente_cobro_contra_entrega: "badgeInfo",
  anulada: "badgeDanger",
  rechazada: "badgeDanger",
};

export default function ListadoVentas() {
  const [ventas, setVentas] = useState<VentaResumen[]>([]);
  const [meta, setMeta] = useState<MetaPaginacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [error, setError] = useState("");

  const [vendedores, setVendedores] = useState<
    { id_empleado: number; nombre: string; apellido: string }[]
  >([]);

  const [filtros, setFiltros] = useState<FiltrosHistorialVentas>({
    id_venta: "",
    fechaInicio: "",
    fechaFin: "",
    id_vendedor: "",
    estado: "",
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      const [respuestaVentas, vendedoresData] = await Promise.all([
        VentaService.obtenerVentas({ page: 1, limit: 20 }),
        VentaService.obtenerVendedores().catch(() => []),
      ]);
      setVentas(respuestaVentas.data || []);
      setMeta(respuestaVentas.meta || null);
      setVendedores(vendedoresData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const manejarFiltros = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const filtrosNuevos = { ...filtros, page: 1 };
      setFiltros(filtrosNuevos);
      const respuesta = await VentaService.obtenerVentas(filtrosNuevos);
      setVentas(respuesta.data || []);
      setMeta(respuesta.meta || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = async () => {
    const filtrosVacios: FiltrosHistorialVentas = {
      id_venta: "",
      fechaInicio: "",
      fechaFin: "",
      id_vendedor: "",
      estado: "",
      page: 1,
      limit: 20,
    };
    setFiltros(filtrosVacios);
    setLoading(true);
    try {
      const respuesta = await VentaService.obtenerVentas(filtrosVacios);
      setVentas(respuesta.data || []);
      setMeta(respuesta.meta || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cambiarPagina = async (nuevaPagina: number) => {
    if (nuevaPagina < 1 || (meta && nuevaPagina > meta.totalPages)) return;
    setLoading(true);
    const filtrosActualizados = { ...filtros, page: nuevaPagina };
    setFiltros(filtrosActualizados);
    try {
      const respuesta = await VentaService.obtenerVentas(filtrosActualizados);
      setVentas(respuesta.data || []);
      setMeta(respuesta.meta || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = async () => {
    setGenerandoPdf(true);
    try {
      // Obtenemos todos los registros para el reporte usando un límite alto
      const filtrosReporte = { ...filtros, page: 1, limit: 10000 };
      const respuesta = await VentaService.obtenerVentas(filtrosReporte);
      const ventasReporte = respuesta.data || [];

      if (ventasReporte.length === 0) {
        alert("No hay ventas con los filtros actuales para exportar.");
        return;
      }

      const doc = new jsPDF("landscape"); // Formato horizontal

      // Encabezados del Documento
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text("Refaccionaria Franco", 14, 22);

      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text("Reporte de Ventas", 14, 30);

      // Imprimir filtros aplicados si existen
      doc.setFontSize(10);
      let infoFiltros = `Generado el: ${new Date().toLocaleDateString("es-GT")} ${new Date().toLocaleTimeString("es-GT")}`;
      if (filtros.fechaInicio || filtros.fechaFin) {
        infoFiltros += ` | Período: ${filtros.fechaInicio || "Inicio"} a ${filtros.fechaFin || "Fin"}`;
      }
      doc.text(infoFiltros, 14, 38);

      // Variables para los totales
      let sumaSubtotal = 0;
      let sumaDescuento = 0;
      let sumaIVA = 0;
      let sumaTotal = 0;

      // Estructurar el cuerpo de la tabla
      const tableBody = ventasReporte.map((v) => {
        const subtotal = v.subtotal || v.total;
        const descuento = v.descuento || 0;
        const total = v.total;

        // Cálculo del IVA
        const iva = total - total / 1.12;

        sumaSubtotal += subtotal;
        sumaDescuento += descuento;
        sumaIVA += iva;
        sumaTotal += total;

        return [
          `#${v.id_venta}`,
          new Date(v.fecha).toLocaleDateString("es-GT"),
          v.cliente,
          v.vendedor || "No asignado",
          LABELS_ESTADO[v.estado] ?? v.estado,
          `Q ${subtotal.toFixed(2)}`,
          `Q ${descuento.toFixed(2)}`,
          `Q ${iva.toFixed(2)}`,
          `Q ${total.toFixed(2)}`,
        ];
      });

      // Añadir la fila de totales al final
      const totalsRow = [
        {
          content: "TOTALES GLOBALES",
          colSpan: 5,
          styles: { halign: "right" as const, fontStyle: "bold" as const },
        },
        `Q ${sumaSubtotal.toFixed(2)}`,
        `Q ${sumaDescuento.toFixed(2)}`,
        `Q ${sumaIVA.toFixed(2)}`,
        `Q ${sumaTotal.toFixed(2)}`,
      ];

      autoTable(doc, {
        startY: 45,
        head: [
          [
            "ID",
            "Fecha",
            "Cliente",
            "Vendedor",
            "Estado",
            "Subtotal",
            "Descto",
            "IVA",
            "Total",
          ],
        ],
        body: tableBody,
        foot: [totalsRow],
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: 0,
          fontStyle: "bold",
        },
        styles: { fontSize: 9 },
      });

      doc.save(
        `Reporte_Ventas_Refaccionaria_Franco_${new Date().getTime()}.pdf`,
      );
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      alert("Ocurrió un error al intentar generar el reporte.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Historial de Ventas</h1>

      {error && <p className={styles.error}>{error}</p>}

      {/* Filtros */}
      <div className={styles.card}>
        <form className={styles.filtrosGrid} onSubmit={manejarFiltros}>
          <div className={styles.filterGroup}>
            <label>ID de Venta</label>
            <input
              type="number"
              className={styles.input}
              placeholder="Ej. 42"
              value={filtros.id_venta ?? ""}
              onChange={(e) =>
                setFiltros({ ...filtros, id_venta: e.target.value })
              }
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Fecha inicio</label>
            <input
              type="date"
              className={styles.input}
              value={filtros.fechaInicio ?? ""}
              onChange={(e) =>
                setFiltros({ ...filtros, fechaInicio: e.target.value })
              }
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Fecha fin</label>
            <input
              type="date"
              className={styles.input}
              value={filtros.fechaFin ?? ""}
              onChange={(e) =>
                setFiltros({ ...filtros, fechaFin: e.target.value })
              }
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Vendedor</label>
            <select
              className={styles.select}
              value={filtros.id_vendedor ?? ""}
              onChange={(e) =>
                setFiltros({ ...filtros, id_vendedor: e.target.value })
              }
            >
              <option value="">Todos</option>
              {vendedores.map((v) => (
                <option key={v.id_empleado} value={v.id_empleado}>
                  {v.nombre} {v.apellido}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Estado</label>
            <select
              className={styles.select}
              value={filtros.estado ?? ""}
              onChange={(e) =>
                setFiltros({ ...filtros, estado: e.target.value })
              }
            >
              <option value="">Todos</option>
              <option value="pagada">Pagada</option>
              <option value="pendiente_pago">Pendiente de Pago</option>
              <option value="pendiente_autorizacion">
                Pendiente Autorización
              </option>
              <option value="pendiente_cobro_contra_entrega">
                Contra Entrega
              </option>
              <option value="anulada">Anulada</option>
            </select>
          </div>

          <div className={styles.filterActions}>
            <button type="submit" className={styles.btnPrimary}>
              Filtrar
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={limpiarFiltros}
            >
              Limpiar
            </button>

            {/* boton exportar PDF */}
            <button
              type="button"
              className={styles.btnPrimary}
              style={{
                backgroundColor: "#e74c3c",
                borderColor: "#c0392b",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem", // Espacio entre el ícono y el texto
                paddingTop: "0.5rem", // Ajuste fino opcional para balancear verticalmente
                paddingBottom: "0.5rem",
              }}
              onClick={exportarPDF}
              disabled={generandoPdf}
            >
              {generandoPdf ? "Generando..." : "Exportar PDF"}
            </button>
          </div>
        </form>
      </div>

      {/* Tabla */}
      <div className={styles.card}>
        {loading ? (
          <p className={styles.textMuted}>Cargando datos...</p>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Canal</th>
                    <th>Subtotal</th>
                    <th>Descuento</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className={`${styles.textCenter} ${styles.textMuted}`}
                      >
                        No se encontraron ventas con estos filtros.
                      </td>
                    </tr>
                  ) : (
                    ventas.map((v) => (
                      <tr key={v.id_venta}>
                        <td className={styles.textBold}>#{v.id_venta}</td>
                        <td>{new Date(v.fecha).toLocaleDateString("es-GT")}</td>
                        <td>{v.cliente}</td>
                        <td>{v.vendedor || "No asignado"}</td>
                        <td className={styles.textCapitalize}>
                          {v.canal || "Mostrador"}
                        </td>
                        <td>Q {(v.subtotal || v.total).toFixed(2)}</td>
                        <td>Q {(v.descuento || 0).toFixed(2)}</td>
                        <td className={styles.textBold}>
                          Q {v.total.toFixed(2)}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.25rem",
                            }}
                          >
                            <span
                              className={
                                styles[ESTILOS_ESTADO[v.estado] ?? "badge"]
                              }
                            >
                              {LABELS_ESTADO[v.estado] ?? v.estado}
                            </span>
                            {v.estado_pedido === "fallido" && (
                              <span className={styles.badgeEntregaFallida}>
                                ⚠ Entrega fallida
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <Link
                            href={`/ventas/${v.id_venta}`}
                            className={styles.btnDetalle}
                          >
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {meta && meta.totalPages > 1 && (
              <div className={styles.paginacion}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => cambiarPagina(meta.currentPage - 1)}
                  disabled={meta.currentPage === 1}
                >
                  Anterior
                </button>
                <span className={styles.paginacionInfo}>
                  Página{" "}
                  <strong className={styles.textBold}>
                    {meta.currentPage}
                  </strong>{" "}
                  de {meta.totalPages}
                  <small> ({meta.totalRecords} registros)</small>
                </span>
                <button
                  className={styles.btnSecondary}
                  onClick={() => cambiarPagina(meta.currentPage + 1)}
                  disabled={meta.currentPage === meta.totalPages}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
