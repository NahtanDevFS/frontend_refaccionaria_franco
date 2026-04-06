"use client";

import { useState, useEffect } from "react";
import styles from "./NuevaVenta.module.css";
import { InventarioService } from "@/services/inventario.service";
import { ClienteService } from "@/services/cliente.service";
import { VentaService } from "@/services/venta.service";
import { UbicacionService } from "@/services/ubicacion.service";

// Interfaces internas para el tipado estricto
interface ProductoInventario {
  id_producto: number;
  sku: string;
  nombre: string;
  precio_venta: number;
  stock_local: number;
  stock_otras_sucursales: { sucursal: string; cantidad: number }[];
}

interface ItemCarrito extends ProductoInventario {
  cantidad: number;
  subtotal: number;
}

export default function NuevaVentaPage() {
  // === SESIÓN ===
  const [usuarioSesion, setUsuarioSesion] = useState<{
    id_empleado: number;
    id_sucursal: number;
  } | null>(null);

  // === ESTADOS DEL CARRITO ===
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [resultadosProducto, setResultadosProducto] = useState<
    ProductoInventario[]
  >([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  // === ESTADOS DEL CLIENTE ===
  const [nitBusqueda, setNitBusqueda] = useState("CF");
  const [clienteExiste, setClienteExiste] = useState(false);
  const [datosCliente, setDatosCliente] = useState({
    nombre: "Consumidor Final",
    tipo: "particular",
    telefono: "",
    email: "",
    direccion: "",
    id_departamento: "",
    id_municipio: "",
    notas_internas: "",
  });

  // === ESTADOS DE LOGÍSTICA ===
  const [esDomicilio, setEsDomicilio] = useState(false);
  const [idRepartidor, setIdRepartidor] = useState("");
  const [pagoContraEntrega, setPagoContraEntrega] = useState(false);
  const [listaRepartidores, setListaRepartidores] = useState<
    { id_empleado: number; nombre: string; apellido: string }[]
  >([]);

  // ESTADOS DE UBICACIÓN
  const [departamentos, setDepartamentos] = useState<
    { id_departamento: number; nombre: string }[]
  >([]);
  const [municipios, setMunicipios] = useState<
    { id_municipio: number; nombre: string }[]
  >([]);

  // === EFECTO DE MONTAJE ===
  useEffect(() => {
    const userString = localStorage.getItem("usuario");
    if (userString) {
      const u = JSON.parse(userString);
      setUsuarioSesion({
        id_empleado: u.id_empleado,
        id_sucursal: u.id_sucursal || 1,
      });

      // Disparamos la carga de repartidores una vez tenemos la sesión
      cargarRepartidores();

      // Cargar departamentos validando que sea un arreglo
      UbicacionService.obtenerDepartamentos()
        .then((data) => {
          if (Array.isArray(data)) {
            setDepartamentos(data);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Efecto para cargar municipios cuando cambia el departamento
  useEffect(() => {
    if (datosCliente.id_departamento) {
      UbicacionService.obtenerMunicipios(parseInt(datosCliente.id_departamento))
        .then((data) => {
          if (Array.isArray(data)) {
            setMunicipios(data);
          }
        })
        .catch(console.error);
    } else {
      setMunicipios([]);
    }
  }, [datosCliente.id_departamento]);

  const cargarRepartidores = async () => {
    try {
      const data = await VentaService.obtenerRepartidores();
      setListaRepartidores(data);
    } catch (error) {
      console.error("No se pudieron cargar los repartidores", error);
    }
  };

  // === BÚSQUEDA DE PRODUCTO REAL ===
  const buscarProducto = async () => {
    if (!terminoBusqueda || !usuarioSesion) return;

    try {
      const data = await InventarioService.buscarProductoMultiSucursal(
        terminoBusqueda,
        usuarioSesion.id_sucursal,
      );
      setResultadosProducto(data);
    } catch (error) {
      alert("Error al buscar productos en el inventario.");
    }
  };

  // === LÓGICA DE CARRITO ===
  const agregarAlCarrito = (prod: ProductoInventario) => {
    if (prod.stock_local < 1) {
      alert("Sin stock en esta sucursal. Solicita traslado.");
      return;
    }

    const itemExistente = carrito.find(
      (i) => i.id_producto === prod.id_producto,
    );
    if (itemExistente) {
      if (itemExistente.cantidad >= prod.stock_local) return; // Validación límite de stock

      const nuevoCarrito = carrito.map((i) =>
        i.id_producto === prod.id_producto
          ? {
              ...i,
              cantidad: i.cantidad + 1,
              subtotal: (i.cantidad + 1) * i.precio_venta,
            }
          : i,
      );
      setCarrito(nuevoCarrito);
    } else {
      setCarrito([
        ...carrito,
        { ...prod, cantidad: 1, subtotal: prod.precio_venta },
      ]);
    }
    setResultadosProducto([]);
    setTerminoBusqueda("");
  };

  const modificarCantidad = (id: number, delta: number) => {
    const nuevoCarrito = carrito.map((item) => {
      if (item.id_producto === id) {
        const nuevaCant = item.cantidad + delta;
        // Validaciones: no menor a 1, no mayor al stock local
        if (nuevaCant < 1 || nuevaCant > item.stock_local) return item;
        return {
          ...item,
          cantidad: nuevaCant,
          subtotal: nuevaCant * item.precio_venta,
        };
      }
      return item;
    });
    setCarrito(nuevoCarrito);
  };

  // === BÚSQUEDA DE CLIENTE REAL ===
  const buscarClienteNit = async () => {
    if (nitBusqueda === "CF" || nitBusqueda.trim() === "") {
      setNitBusqueda("CF");
      setClienteExiste(true);
      setDatosCliente((prev) => ({ ...prev, nombre: "Consumidor Final" }));
      return;
    }

    try {
      const clienteDB = await ClienteService.buscarPorNit(nitBusqueda);
      if (clienteDB) {
        setClienteExiste(true);
        setDatosCliente({
          nombre: clienteDB.nombre_razon_social,
          tipo: clienteDB.tipo_cliente,
          telefono: clienteDB.telefono || "",
          email: clienteDB.email || "",
          direccion: clienteDB.direccion || "",
          id_departamento: "", // Manejar selects en cascada después
          id_municipio: clienteDB.id_municipio?.toString() || "",
          notas_internas: clienteDB.notas_internas || "",
        });
      } else {
        setClienteExiste(false);
        setDatosCliente((prev) => ({
          ...prev,
          nombre: "",
          telefono: "",
          direccion: "",
        }));
        alert(
          "Cliente no encontrado. Por favor, rellena los datos para crearlo.",
        );
      }
    } catch (error) {
      alert("Error validando el NIT.");
    }
  };

  const totalVenta = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  // === ENVÍO DE ORDEN AL BACKEND ===
  const procesarOrden = async () => {
    if (!usuarioSesion) {
      alert("No se detectó una sesión activa.");
      return;
    }

    const payload = {
      id_sucursal: usuarioSesion.id_sucursal,
      id_vendedor: usuarioSesion.id_empleado,
      nit: nitBusqueda,
      cliente_nuevo:
        !clienteExiste && nitBusqueda !== "CF"
          ? {
              nombre_razon_social: datosCliente.nombre,
              tipo_cliente: datosCliente.tipo,
              telefono: datosCliente.telefono,
              email: datosCliente.email,
              direccion: datosCliente.direccion,
              id_municipio: datosCliente.id_municipio
                ? parseInt(datosCliente.id_municipio)
                : undefined,
              notas_internas: datosCliente.notas_internas,
            }
          : null,
      canal: esDomicilio ? "domicilio" : "mostrador",
      pago_contra_entrega: esDomicilio ? pagoContraEntrega : false,
      id_repartidor:
        esDomicilio && idRepartidor ? parseInt(idRepartidor) : null,
      direccion_entrega: esDomicilio ? datosCliente.direccion : null,
      detalles: carrito.map((c) => ({
        id_producto: c.id_producto,
        cantidad: c.cantidad,
      })),
    };

    try {
      const mensajeEstado =
        esDomicilio && pagoContraEntrega
          ? "Pendiente de cobro contra entrega"
          : "Pendiente de Pago";
      alert(`Orden enviada exitosamente. Estado: ${mensajeEstado}`);

      // Reiniciar formulario
      setCarrito([]);
      setNitBusqueda("CF");
      setClienteExiste(true);
      setDatosCliente({
        nombre: "Consumidor Final",
        tipo: "particular",
        telefono: "",
        email: "",
        direccion: "",
        id_departamento: "",
        id_municipio: "",
        notas_internas: "",
      });
      setEsDomicilio(false);
      setPagoContraEntrega(false);
      setIdRepartidor("");
    } catch (error: any) {
      alert(`Error al procesar: ${error.message}`);
    }
  };

  return (
    <div className={styles.container}>
      {/* PANEL IZQUIERDO: PRODUCTOS Y CARRITO */}
      <div className={styles.panel}>
        <h2 className={styles.sectionTitle}>Búsqueda de Productos</h2>

        <div className={styles.searchRow}>
          <input
            type="text"
            className={styles.input}
            placeholder="Buscar por Nombre o SKU..."
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarProducto()}
          />
          <button
            className={styles.btnAction}
            style={{ marginTop: 0, width: "auto" }}
            onClick={buscarProducto}
          >
            Buscar
          </button>
        </div>

        {/* Resultados de búsqueda */}
        {resultadosProducto.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Stock Local</th>
                <th>Otras Sucursales</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {resultadosProducto.map((p) => (
                <tr key={p.id_producto}>
                  <td>{p.sku}</td>
                  <td>{p.nombre}</td>
                  <td>
                    <span
                      className={`${styles.badgeStock} ${
                        p.stock_local === 0 ? styles.badgeStockOut : ""
                      }`}
                    >
                      {p.stock_local} und
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8rem", color: "gray" }}>
                    {p.stock_otras_sucursales.map((o, i) => (
                      <div key={i}>
                        {o.sucursal}: {o.cantidad} und
                      </div>
                    ))}
                  </td>
                  <td>
                    <button
                      className={styles.btnAction}
                      style={{ padding: "0.4rem 0.8rem", marginTop: 0 }}
                      onClick={() => agregarAlCarrito(p)}
                      disabled={p.stock_local === 0}
                    >
                      Agregar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2 className={styles.sectionTitle} style={{ marginTop: "2rem" }}>
          Detalle de la Orden
        </h2>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Cantidad</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {carrito.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  El carrito está vacío
                </td>
              </tr>
            ) : (
              carrito.map((item) => (
                <tr key={item.id_producto}>
                  <td>{item.nombre}</td>
                  <td>Q {item.precio_venta.toFixed(2)}</td>
                  <td>
                    <div className={styles.qtyControl}>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => modificarCantidad(item.id_producto, -1)}
                      >
                        -
                      </button>
                      <span>{item.cantidad}</span>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => modificarCantidad(item.id_producto, 1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td style={{ fontWeight: "bold" }}>
                    Q {item.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className={styles.totalBox}>
          Total de la Orden:{" "}
          <span className={styles.totalText}>Q {totalVenta.toFixed(2)}</span>
        </div>
      </div>

      {/* PANEL DERECHO: CLIENTE Y LOGÍSTICA */}
      <div className={styles.panel}>
        <h2 className={styles.sectionTitle}>Datos del Cliente</h2>

        <div className={styles.searchRow}>
          <input
            type="text"
            className={styles.input}
            placeholder="NIT del Cliente (CF por defecto)"
            maxLength={9}
            value={nitBusqueda}
            onChange={(e) => setNitBusqueda(e.target.value)}
          />
          <button
            className={styles.btnAction}
            style={{ marginTop: 0, width: "auto" }}
            onClick={buscarClienteNit}
          >
            Validar
          </button>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Nombre / Razón Social</label>
          <input
            type="text"
            className={styles.input}
            value={datosCliente.nombre}
            onChange={(e) =>
              setDatosCliente({ ...datosCliente, nombre: e.target.value })
            }
            disabled={clienteExiste && nitBusqueda !== "CF"}
          />
        </div>

        {!clienteExiste && nitBusqueda !== "CF" && (
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tipo de Cliente</label>
              <select
                className={styles.select}
                value={datosCliente.tipo}
                onChange={(e) =>
                  setDatosCliente({ ...datosCliente, tipo: e.target.value })
                }
              >
                <option value="particular">Particular</option>
                <option value="taller">Taller</option>
                <option value="refaccionaria">Refaccionaria</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Teléfono</label>
              <input
                type="text"
                className={styles.input}
                value={datosCliente.telefono}
                onChange={(e) =>
                  setDatosCliente({ ...datosCliente, telefono: e.target.value })
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Correo Electrónico</label>
              <input
                type="email"
                className={styles.input}
                value={datosCliente.email}
                onChange={(e) =>
                  setDatosCliente({ ...datosCliente, email: e.target.value })
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Departamento</label>
              <select
                className={styles.select}
                value={datosCliente.id_departamento}
                onChange={(e) =>
                  setDatosCliente({
                    ...datosCliente,
                    id_departamento: e.target.value,
                    id_municipio: "",
                  })
                }
              >
                <option value="">Seleccione...</option>
                {departamentos.map((d) => (
                  <option key={d.id_departamento} value={d.id_departamento}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Municipio</label>
              <select
                className={styles.select}
                value={datosCliente.id_municipio}
                onChange={(e) =>
                  setDatosCliente({
                    ...datosCliente,
                    id_municipio: e.target.value,
                  })
                }
                disabled={!datosCliente.id_departamento}
              >
                <option value="">Seleccione...</option>
                {municipios.map((m) => (
                  <option key={m.id_municipio} value={m.id_municipio}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
              <label className={styles.label}>Notas Internas del Cliente</label>
              <textarea
                className={styles.input}
                rows={2}
                value={datosCliente.notas_internas}
                onChange={(e) =>
                  setDatosCliente({
                    ...datosCliente,
                    notas_internas: e.target.value,
                  })
                }
                placeholder="Ej. Entregar en puerta azul, preguntar por Don Julio..."
              />
            </div>
          </div>
        )}

        <h2 className={styles.sectionTitle} style={{ marginTop: "2rem" }}>
          Logística
        </h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>Tipo de Entrega</label>
          <select
            className={styles.select}
            value={esDomicilio ? "domicilio" : "mostrador"}
            onChange={(e) => setEsDomicilio(e.target.value === "domicilio")}
          >
            <option value="mostrador">Entrega en Mostrador</option>
            <option value="domicilio">Envío a Domicilio</option>
          </select>
        </div>

        {esDomicilio && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>Dirección de Entrega</label>
              <input
                type="text"
                className={styles.input}
                value={datosCliente.direccion}
                onChange={(e) =>
                  setDatosCliente({
                    ...datosCliente,
                    direccion: e.target.value,
                  })
                }
                placeholder="Dirección exacta..."
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Asignar Repartidor</label>
              <select
                className={styles.select}
                value={idRepartidor}
                onChange={(e) => setIdRepartidor(e.target.value)}
              >
                <option value="">Seleccione un repartidor...</option>
                {/* AHORA ES DINÁMICO Y FILTRADO POR SUCURSAL */}
                {listaRepartidores.map((rep) => (
                  <option key={rep.id_empleado} value={rep.id_empleado}>
                    {rep.nombre} {rep.apellido}
                  </option>
                ))}
              </select>
            </div>
            <div
              className={styles.formGroup}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "1rem",
              }}
            >
              <input
                type="checkbox"
                id="contraEntrega"
                checked={pagoContraEntrega}
                onChange={(e) => setPagoContraEntrega(e.target.checked)}
                style={{ width: "auto 18px", height: "18px" }}
              />
              <label
                htmlFor="contraEntrega"
                className={styles.label}
                style={{ marginBottom: 0, cursor: "pointer" }}
              >
                El cliente pagará al recibir el pedido (Contra Entrega)
              </label>
            </div>
          </>
        )}

        <button
          className={styles.btnAction}
          onClick={procesarOrden}
          disabled={
            carrito.length === 0 ||
            (esDomicilio && (!datosCliente.direccion || !idRepartidor))
          }
        >
          Generar Orden de Venta
        </button>
      </div>
    </div>
  );
}
