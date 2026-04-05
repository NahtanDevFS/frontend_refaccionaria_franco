"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./NuevaVenta.module.css";
import { DetalleVentaDTO, CrearVentaDTO } from "@/types/venta.types";
import { VentaService } from "@/services/venta.service";

export default function NuevaVenta() {
  const router = useRouter();

  // Estado del Carrito
  const [carrito, setCarrito] = useState<DetalleVentaDTO[]>([]);
  const [idCliente, setIdCliente] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<string>("efectivo");

  // Estado temporal para agregar producto (MOCK - Esto debería ser un buscador real)
  const [tempIdProducto, setTempIdProducto] = useState("");
  const [tempNombre, setTempNombre] = useState("");
  const [tempPrecio, setTempPrecio] = useState("");
  const [tempCantidad, setTempCantidad] = useState("1");

  const agregarAlCarrito = () => {
    if (!tempIdProducto || !tempPrecio || !tempCantidad) return;

    const cantidad = parseFloat(tempCantidad);
    const precio = parseFloat(tempPrecio);

    const nuevoDetalle: DetalleVentaDTO = {
      id_producto: parseInt(tempIdProducto),
      nombre_producto: tempNombre || `Producto ${tempIdProducto}`,
      cantidad: cantidad,
      precio_unitario: precio,
      subtotal_linea: cantidad * precio,
    };

    setCarrito([...carrito, nuevoDetalle]);

    // Limpiar form temporal
    setTempIdProducto("");
    setTempNombre("");
    setTempPrecio("");
    setTempCantidad("1");
  };

  const eliminarDelCarrito = (index: number) => {
    const nuevoCarrito = [...carrito];
    nuevoCarrito.splice(index, 1);
    setCarrito(nuevoCarrito);
  };

  const totalVenta = carrito.reduce(
    (sum, item) => sum + item.subtotal_linea,
    0,
  );

  const procesarVenta = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío");

    // Como ADMINISTRADOR, estamos forzando valores de sucursal y vendedor por ahora.
    // En el futuro, sacar esto del contexto de autenticación.
    const payload: CrearVentaDTO = {
      id_sucursal: 1,
      id_vendedor: 1,
      id_cliente: idCliente ? parseInt(idCliente) : undefined,
      subtotal: totalVenta,
      total: totalVenta,
      detalles: carrito,
      metodo_pago: metodoPago,
      monto_pago: totalVenta, // Asumiendo pago exacto para simplificar
    };

    try {
      await VentaService.crearVenta(payload);
      alert("Venta registrada con éxito");
      router.push("/ventas");
    } catch (error: any) {
      alert(`Error al procesar: ${error.message}`);
    }
  };

  return (
    <div className={styles.container}>
      {/* Panel Izquierdo: Buscador y Carrito */}
      <div className={styles.panel}>
        <h2 className={styles.title}>Detalle de Productos</h2>

        {/* Simulador de buscador de productos */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <input
            type="number"
            placeholder="ID Prod"
            className={styles.input}
            value={tempIdProducto}
            onChange={(e) => setTempIdProducto(e.target.value)}
          />
          <input
            type="text"
            placeholder="Nombre (Opcional)"
            className={styles.input}
            value={tempNombre}
            onChange={(e) => setTempNombre(e.target.value)}
          />
          <input
            type="number"
            placeholder="Precio"
            className={styles.input}
            value={tempPrecio}
            onChange={(e) => setTempPrecio(e.target.value)}
          />
          <input
            type="number"
            placeholder="Cant"
            className={styles.input}
            value={tempCantidad}
            onChange={(e) => setTempCantidad(e.target.value)}
          />
          <button
            className={styles.btnPrimary}
            style={{ marginTop: 0 }}
            onClick={agregarAlCarrito}
          >
            Agregar
          </button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant</th>
                <th>Precio</th>
                <th>Subtotal</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {carrito.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.nombre_producto}</td>
                  <td>{item.cantidad}</td>
                  <td>Q {item.precio_unitario.toFixed(2)}</td>
                  <td>Q {item.subtotal_linea.toFixed(2)}</td>
                  <td>
                    <button
                      className={styles.btnDanger}
                      onClick={() => eliminarDelCarrito(idx)}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel Derecho: Cliente y Pago */}
      <div className={styles.panel}>
        <h2 className={styles.title}>Resumen y Cobro</h2>

        <div className={styles.formGroup}>
          <label>ID Cliente (Opcional)</label>
          <input
            type="number"
            className={styles.input}
            placeholder="Dejar en blanco para CF"
            value={idCliente}
            onChange={(e) => setIdCliente(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Método de Pago</label>
          <select
            className={styles.input}
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>

        <div className={styles.totalText}>
          Total a Cobrar: Q {totalVenta.toFixed(2)}
        </div>

        <button
          className={styles.btnPrimary}
          onClick={procesarVenta}
          disabled={carrito.length === 0}
        >
          Procesar Venta
        </button>
      </div>
    </div>
  );
}
