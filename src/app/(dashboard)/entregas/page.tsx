// src/app/(dashboard)/entregas/page.tsx
"use client";

import { useEffect, useState } from "react";
import { EntregaService } from "@/services/entrega.service";
import { PedidoDomicilio } from "@/types/entrega.types";
import styles from "./Entregas.module.css";

export default function EntregasPage() {
  const [pedidos, setPedidos] = useState<PedidoDomicilio[]>([]);
  const [cargando, setCargando] = useState(true);

  // Estados de Modales
  const [pedidoSeleccionado, setPedidoSeleccionado] =
    useState<PedidoDomicilio | null>(null);

  // Modal Éxito (Cobro)
  const [modalExito, setModalExito] = useState(false);
  const [montoCobrado, setMontoCobrado] = useState<string>("");

  // Modal Fallo
  const [modalFallo, setModalFallo] = useState(false);
  const [motivoFallo, setMotivoFallo] = useState("");

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    try {
      setCargando(true);
      const data = await EntregaService.obtenerMisPedidos();
      setPedidos(data);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  // --- Lógica de Entrega Exitosa ---
  const iniciarEntrega = (pedido: PedidoDomicilio) => {
    if (pedido.pago_contra_entrega) {
      setPedidoSeleccionado(pedido);
      setMontoCobrado(pedido.total.toString()); // Sugerir el monto exacto
      setModalExito(true);
    } else {
      // Si ya está pagado, no pide monto, confirmamos directamente
      if (confirm(`¿Confirmar entrega del Pedido #${pedido.id_pedido}?`)) {
        procesarExito(pedido.id_pedido);
      }
    }
  };

  const procesarExito = async (id: number, monto?: number) => {
    try {
      await EntregaService.marcarExito(id, { monto_cobrado: monto });
      alert("¡Entrega registrada exitosamente!");
      setModalExito(false);
      cargarPedidos();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  // --- Lógica de Entrega Fallida ---
  const iniciarFallo = (pedido: PedidoDomicilio) => {
    setPedidoSeleccionado(pedido);
    setMotivoFallo("");
    setModalFallo(true);
  };

  const procesarFallo = async () => {
    if (!pedidoSeleccionado) return;
    if (motivoFallo.trim().length < 5)
      return alert("Por favor escriba un motivo claro (min. 5 caracteres).");

    try {
      await EntregaService.marcarFallida(pedidoSeleccionado.id_pedido, {
        motivo_fallido: motivoFallo,
      });
      alert("Entrega marcada como fallida.");
      setModalFallo(false);
      cargarPedidos();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  if (cargando)
    return <div className={styles.container}>Cargando tu ruta...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Mi Ruta de Entregas</h1>

      {pedidos.length === 0 ? (
        <div className={styles.emptyState}>
          ¡Excelente trabajo! No tienes entregas pendientes en este momento.
        </div>
      ) : (
        <div className={styles.grid}>
          {pedidos.map((pedido) => (
            <div key={pedido.id_pedido} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.orderId}>
                  Pedido #{pedido.id_pedido}
                </span>
                {pedido.pago_contra_entrega ? (
                  <span className={styles.badgeCobrar}>
                    COBRAR Q{pedido.total.toFixed(2)}
                  </span>
                ) : (
                  <span className={styles.badgePagado}>YA PAGADO</span>
                )}
              </div>

              <div className={styles.infoRow}>
                <strong>Recibe:</strong>{" "}
                {pedido.nombre_contacto || "No especificado"}
              </div>
              <div className={styles.infoRow}>
                <strong>Teléfono:</strong>{" "}
                <a href={`tel:${pedido.telefono_contacto}`}>
                  {pedido.telefono_contacto}
                </a>
              </div>
              <div className={styles.infoRow}>
                <strong>Dirección:</strong> {pedido.direccion_entrega}
              </div>

              <div className={styles.productList}>
                <strong>Entregar:</strong>
                {pedido.productos?.map((p, index) => (
                  <div key={index} className={styles.productItem}>
                    <span>{p.producto}</span>
                    <strong>x{p.cantidad}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.actionButtons}>
                <button
                  className={styles.btnSuccess}
                  onClick={() => iniciarEntrega(pedido)}
                >
                  Entregado
                </button>
                <button
                  className={styles.btnDanger}
                  onClick={() => iniciarFallo(pedido)}
                >
                  Fallida
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Cobro (Contra Entrega) */}
      {modalExito && pedidoSeleccionado && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Registrar Cobro</h2>
            <p>
              El cliente debe pagar{" "}
              <strong>Q{pedidoSeleccionado.total.toFixed(2)}</strong>.
            </p>

            <label style={{ marginTop: "1rem", display: "block" }}>
              Efectivo Recibido (Q):
            </label>
            <input
              type="number"
              className={styles.inputLarge}
              value={montoCobrado}
              onChange={(e) => setMontoCobrado(e.target.value)}
            />

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                className={styles.btnDanger}
                style={{ backgroundColor: "#9ca3af" }}
                onClick={() => setModalExito(false)}
              >
                Cancelar
              </button>
              <button
                className={styles.btnSuccess}
                onClick={() =>
                  procesarExito(
                    pedidoSeleccionado.id_pedido,
                    Number(montoCobrado),
                  )
                }
              >
                Confirmar Cobro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Entrega Fallida */}
      {modalFallo && pedidoSeleccionado && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Reportar Problema</h2>
            <p>
              Indique por qué no se pudo entregar el Pedido #
              {pedidoSeleccionado.id_pedido}
            </p>

            <textarea
              className={styles.textarea}
              rows={4}
              placeholder="Ej. No había nadie en casa, dirección no existe..."
              value={motivoFallo}
              onChange={(e) => setMotivoFallo(e.target.value)}
            />

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                className={styles.btnDanger}
                style={{ backgroundColor: "#9ca3af" }}
                onClick={() => setModalFallo(false)}
              >
                Volver
              </button>
              <button className={styles.btnDanger} onClick={procesarFallo}>
                Reportar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
