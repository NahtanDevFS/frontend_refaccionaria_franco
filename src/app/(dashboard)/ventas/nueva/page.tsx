"use client";

import { useState, useEffect } from "react";
import styles from "./NuevaVenta.module.css";
import { InventarioService } from "@/services/inventario.service";
import { ClienteService } from "@/services/cliente.service";
import { VentaService } from "@/services/venta.service";
import { UbicacionService } from "@/services/ubicacion.service";
import { GarantiaService } from "@/services/garantia.service"; // <-- NUEVO

interface ProductoInventario {
  id_producto: number;
  sku: string;
  nombre: string;
  precio_venta: number;
  stock_local: number;
  stock_otras_sucursales?: { sucursal: string; cantidad: number }[];
  marca_repuesto?: string;
}

// <-- NUEVO: Manejo de llave única 'uid' y campos reacondicionados
interface ItemCarrito extends ProductoInventario {
  uid: string;
  cantidad: number;
  subtotal: number;
  es_reacondicionado?: boolean;
  id_producto_reacondicionado?: number;
}

export default function NuevaVentaPage() {
  // === SESIÓN ===
  const [usuarioSesion, setUsuarioSesion] = useState<{
    id_empleado: number;
    id_sucursal: number;
  } | null>(null);

  // === ESTADOS DE BÚSQUEDA ===
  const [tipoBusqueda, setTipoBusqueda] = useState<"texto" | "vehiculo">(
    "texto",
  );
  const [terminoBusqueda, setTerminoBusqueda] = useState("");

  const [categorias, setCategorias] = useState<
    { id_categoria: number; nombre: string }[]
  >([]);
  const [marcasRepuesto, setMarcasRepuesto] = useState<
    { id_marca: number; nombre: string }[]
  >([]);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");

  // Vehículos
  const [marcasVehiculo, setMarcasVehiculo] = useState<
    { id_marca_vehiculo: number; nombre: string }[]
  >([]);
  const [modelosVehiculo, setModelosVehiculo] = useState<
    { id_modelo: number; nombre: string }[]
  >([]);
  const [busquedaVehiculo, setBusquedaVehiculo] = useState({
    id_marca: "",
    id_modelo: "",
    anio: "",
  });

  const [resultadosProducto, setResultadosProducto] = useState<
    ProductoInventario[]
  >([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  // <-- NUEVO: Estado para reacondicionados
  const [reacondicionados, setReacondicionados] = useState<any[]>([]);

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

  // === ESTADOS DE LOGÍSTICA Y NEGOCIO ===
  const [esDomicilio, setEsDomicilio] = useState(false);
  const [idRepartidor, setIdRepartidor] = useState("");
  const [pagoContraEntrega, setPagoContraEntrega] = useState(false);
  const [nombreContacto, setNombreContacto] = useState("");
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(0);
  const [listaRepartidores, setListaRepartidores] = useState<
    { id_empleado: number; nombre: string; apellido: string }[]
  >([]);

  // === ESTADOS DE UBICACIÓN ===
  const [departamentos, setDepartamentos] = useState<
    { id_departamento: number; nombre: string }[]
  >([]);
  const [municipios, setMunicipios] = useState<
    { id_municipio: number; nombre: string }[]
  >([]);

  // === EFECTOS ===
  useEffect(() => {
    const userString = localStorage.getItem("usuario");
    if (userString) {
      const u = JSON.parse(userString);
      setUsuarioSesion({
        id_empleado: u.id_empleado,
        id_sucursal: u.id_sucursal || 1,
      });

      InventarioService.obtenerCategorias()
        .then(setCategorias)
        .catch(console.error);
      InventarioService.obtenerMarcasRepuesto()
        .then(setMarcasRepuesto)
        .catch(console.error);
      cargarRepartidores();
      UbicacionService.obtenerDepartamentos()
        .then((data) => {
          if (Array.isArray(data)) setDepartamentos(data);
        })
        .catch(console.error);

      // <-- NUEVO: Cargar reacondicionados disponibles
      GarantiaService.obtenerReacondicionadosDisponibles(u.id_sucursal || 1)
        .then((res) => {
          if (res.success) setReacondicionados(res.data);
        })
        .catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (datosCliente.id_departamento) {
      UbicacionService.obtenerMunicipios(parseInt(datosCliente.id_departamento))
        .then((data) => {
          if (Array.isArray(data)) setMunicipios(data);
        })
        .catch(console.error);
    } else {
      setMunicipios([]);
    }
  }, [datosCliente.id_departamento]);

  useEffect(() => {
    if (tipoBusqueda === "vehiculo" && marcasVehiculo.length === 0) {
      InventarioService.obtenerMarcasVehiculo()
        .then(setMarcasVehiculo)
        .catch(console.error);
    }
  }, [tipoBusqueda]);

  useEffect(() => {
    if (busquedaVehiculo.id_marca) {
      InventarioService.obtenerModelosPorMarca(
        parseInt(busquedaVehiculo.id_marca),
      )
        .then(setModelosVehiculo)
        .catch(console.error);
    } else {
      setModelosVehiculo([]);
    }
    setBusquedaVehiculo((prev) => ({ ...prev, id_modelo: "", anio: "" }));
  }, [busquedaVehiculo.id_marca]);

  const cargarRepartidores = async () => {
    try {
      const data = await VentaService.obtenerRepartidores();
      setListaRepartidores(data);
    } catch (error) {
      console.error("No se pudieron cargar los repartidores", error);
    }
  };

  // === MÉTODOS DE BÚSQUEDA Y CARRITO ===
  const buscarProductoTexto = async () => {
    if (!usuarioSesion) return;
    if (!terminoBusqueda && !filtroCategoria && !filtroMarca) {
      alert(
        "Ingrese un término o seleccione al menos una Categoría/Marca para filtrar.",
      );
      return;
    }
    try {
      const data = await InventarioService.buscarProductoMultiSucursal(
        usuarioSesion.id_sucursal,
        terminoBusqueda,
        filtroCategoria,
        filtroMarca,
      );
      setResultadosProducto(data);
    } catch (error: any) {
      alert(error.message || "Error al buscar productos en el inventario.");
    }
  };

  const buscarPorVehiculo = async () => {
    if (!busquedaVehiculo.id_modelo || !usuarioSesion) return;
    try {
      const data = await InventarioService.buscarPorVehiculo(
        usuarioSesion.id_sucursal,
        parseInt(busquedaVehiculo.id_modelo),
        busquedaVehiculo.anio ? parseInt(busquedaVehiculo.anio) : undefined,
        filtroCategoria,
        filtroMarca,
      );
      setResultadosProducto(data);
    } catch (error) {
      alert("Error al buscar repuestos para este vehículo.");
    }
  };

  const agregarAlCarrito = (prod: ProductoInventario) => {
    if (prod.stock_local < 1) {
      alert("Sin stock en esta sucursal. Solicita traslado.");
      return;
    }

    const uid = `P_${prod.id_producto}`; // UID para normales
    const itemExistente = carrito.find((i) => i.uid === uid);

    if (itemExistente) {
      if (itemExistente.cantidad >= prod.stock_local) return;
      const nuevoCarrito = carrito.map((i) =>
        i.uid === uid
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
        { ...prod, uid, cantidad: 1, subtotal: prod.precio_venta },
      ]);
    }
    setResultadosProducto([]);
    setTerminoBusqueda("");
    setBusquedaVehiculo({ id_marca: "", id_modelo: "", anio: "" });
  };

  // <-- NUEVO: Función para agregar reacondicionados
  const agregarReacondicionadoAlCarrito = (reac: any) => {
    const uid = `R_${reac.id_producto_reacondicionado}`;
    const itemExistente = carrito.find((i) => i.uid === uid);

    if (itemExistente) {
      if (itemExistente.cantidad >= reac.cantidad) {
        alert("No hay más stock de este producto reacondicionado.");
        return;
      }
      const nuevoCarrito = carrito.map((i) =>
        i.uid === uid
          ? {
              ...i,
              cantidad: i.cantidad + 1,
              subtotal: (i.cantidad + 1) * reac.precio_venta_reac,
            }
          : i,
      );
      setCarrito(nuevoCarrito);
    } else {
      setCarrito([
        ...carrito,
        {
          uid,
          id_producto: reac.id_producto,
          id_producto_reacondicionado: reac.id_producto_reacondicionado,
          sku: reac.sku,
          nombre: reac.nombre,
          precio_venta: reac.precio_venta_reac,
          stock_local: reac.cantidad,
          es_reacondicionado: true,
          cantidad: 1,
          subtotal: reac.precio_venta_reac,
        },
      ]);
    }
  };

  // <-- ACTUALIZADO: Usa UID para identificar exactamente qué fila del carrito modificar
  const modificarCantidad = (uid: string, delta: number) => {
    const nuevoCarrito = carrito.map((item) => {
      if (item.uid === uid) {
        const nuevaCant = item.cantidad + delta;
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

  // === CLIENTE ===
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
          id_departamento: "",
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

  // === CÁLCULO DE TOTALES E IVA ===
  const subtotalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);
  const descuentoMonto = subtotalCarrito * (descuentoPorcentaje / 100);
  const totalVentaConIva = subtotalCarrito - descuentoMonto;
  const precioBaseSinIva = totalVentaConIva / 1.12;
  const montoIvaCalculado = totalVentaConIva - precioBaseSinIva;

  // === PROCESAR ORDEN ===
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
      descuento_porcentaje: descuentoPorcentaje,
      id_repartidor:
        esDomicilio && idRepartidor ? parseInt(idRepartidor) : null,
      direccion_entrega: esDomicilio ? datosCliente.direccion : null,
      nombre_contacto: esDomicilio ? nombreContacto : null,
      telefono_contacto: esDomicilio ? telefonoContacto : null,
      // <-- ACTUALIZADO: Envía el ID del reacondicionado al backend
      detalles: carrito.map((c) => ({
        id_producto: c.id_producto,
        id_producto_reacondicionado: c.id_producto_reacondicionado,
        cantidad: c.cantidad,
      })),
    };

    try {
      let mensajeEstado = "";
      if (descuentoPorcentaje > 5)
        mensajeEstado = "Enviada a Supervisor para Autorización";
      else if (esDomicilio && pagoContraEntrega)
        mensajeEstado = "Pendiente de cobro contra entrega";
      else mensajeEstado = "Pendiente de Pago";

      await VentaService.crearOrdenVenta(payload);
      alert(`Orden enviada exitosamente. Estado: ${mensajeEstado}`);

      // Limpiar UI y refrescar reaconcionados por si se vendió alguno
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
      setDescuentoPorcentaje(0);
      setIdRepartidor("");

      GarantiaService.obtenerReacondicionadosDisponibles(
        usuarioSesion.id_sucursal,
      ).then((res) => {
        if (res.success) setReacondicionados(res.data);
      });
    } catch (error: any) {
      alert(`Error al procesar: ${error.message}`);
    }
  };

  return (
    <div className={styles.container}>
      {/* PANEL IZQUIERDO: PRODUCTOS Y CARRITO */}
      <div className={styles.panel}>
        {/* <-- NUEVO: SECCIÓN DE REACONDICIONADOS --> */}
        {reacondicionados.length > 0 && (
          <div className={styles.reacSection}>
            <h3 className={styles.reacTitle}>
              Oportunidades: Productos Reacondicionados
            </h3>
            <div className={styles.reacGrid}>
              {reacondicionados.map((r) => (
                <div
                  key={r.id_producto_reacondicionado}
                  className={styles.reacCard}
                >
                  <span style={{ fontWeight: 600 }}>{r.sku}</span>
                  <span>{r.nombre}</span>
                  <strong>Q {r.precio_venta_reac.toFixed(2)}</strong>
                  <span style={{ fontSize: "0.8rem" }}>
                    Disponibles: {r.cantidad}
                  </span>
                  <button
                    className={styles.btnAction}
                    style={{ marginTop: "auto", padding: "0.4rem" }}
                    onClick={() => agregarReacondicionadoAlCarrito(r)}
                  >
                    Agregar Reacondicionado
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            marginTop: "2rem",
          }}
        >
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
            Catálogo de Repuestos Nuevos
          </h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className={styles.btnAction}
              style={{
                margin: 0,
                padding: "0.4rem 1rem",
                background:
                  tipoBusqueda === "texto" ? "var(--primary-color)" : "#ccc",
              }}
              onClick={() => setTipoBusqueda("texto")}
            >
              Texto / SKU
            </button>
            <button
              className={styles.btnAction}
              style={{
                margin: 0,
                padding: "0.4rem 1rem",
                background:
                  tipoBusqueda === "vehiculo" ? "var(--primary-color)" : "#ccc",
              }}
              onClick={() => setTipoBusqueda("vehiculo")}
            >
              Por Vehículo
            </button>
          </div>
        </div>

        {/* Buscadores (igual que antes) */}
        {tipoBusqueda === "texto" && (
          <div
            className={styles.formGrid}
            style={{
              marginBottom: "1.5rem",
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
              <label className={styles.label}>Buscar por Nombre o SKU</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ej. Pastillas, FRIC-001..."
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarProductoTexto()}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Categoría</label>
              <select
                className={styles.select}
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Marca del Repuesto</label>
              <select
                className={styles.select}
                value={filtroMarca}
                onChange={(e) => setFiltroMarca(e.target.value)}
              >
                <option value="">Todas las marcas</option>
                {marcasRepuesto.map((m) => (
                  <option key={m.id_marca} value={m.id_marca}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div
              className={styles.formGroup}
              style={{ gridColumn: "span 2", justifyContent: "flex-end" }}
            >
              <button
                className={styles.btnAction}
                style={{ margin: 0 }}
                onClick={buscarProductoTexto}
              >
                Aplicar Filtros y Buscar
              </button>
            </div>
          </div>
        )}

        {tipoBusqueda === "vehiculo" && (
          <div
            className={styles.formGrid}
            style={{
              marginBottom: "1.5rem",
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div className={styles.formGroup}>
              <label className={styles.label}>Marca Vehículo</label>
              <select
                className={styles.select}
                value={busquedaVehiculo.id_marca}
                onChange={(e) =>
                  setBusquedaVehiculo({
                    ...busquedaVehiculo,
                    id_marca: e.target.value,
                  })
                }
              >
                <option value="">Seleccione...</option>
                {marcasVehiculo.map((m) => (
                  <option key={m.id_marca_vehiculo} value={m.id_marca_vehiculo}>
                    {m.nombre.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Modelo</label>
              <select
                className={styles.select}
                disabled={!busquedaVehiculo.id_marca}
                value={busquedaVehiculo.id_modelo}
                onChange={(e) =>
                  setBusquedaVehiculo({
                    ...busquedaVehiculo,
                    id_modelo: e.target.value,
                  })
                }
              >
                <option value="">Todos los modelos...</option>
                {modelosVehiculo.map((m) => (
                  <option key={m.id_modelo} value={m.id_modelo}>
                    {m.nombre.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Año (Opcional)</label>
              <input
                type="number"
                className={styles.input}
                placeholder="Ej. 2018"
                value={busquedaVehiculo.anio}
                onChange={(e) =>
                  setBusquedaVehiculo({
                    ...busquedaVehiculo,
                    anio: e.target.value,
                  })
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Categoría (Repuesto)</label>
              <select
                className={styles.select}
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Marca (Repuesto)</label>
              <select
                className={styles.select}
                value={filtroMarca}
                onChange={(e) => setFiltroMarca(e.target.value)}
              >
                <option value="">Todas las marcas</option>
                {marcasRepuesto.map((m) => (
                  <option key={m.id_marca} value={m.id_marca}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div
              className={styles.formGroup}
              style={{ justifyContent: "flex-end" }}
            >
              <button
                className={styles.btnAction}
                style={{ margin: 0 }}
                disabled={!busquedaVehiculo.id_modelo}
                onClick={buscarPorVehiculo}
              >
                Buscar Repuestos
              </button>
            </div>
          </div>
        )}

        {/* Resultados de búsqueda */}
        {resultadosProducto.length > 0 && (
          <div
            style={{
              maxHeight: "350px",
              overflowY: "auto",
              marginTop: "1rem",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
            }}
          >
            <table className={styles.table} style={{ margin: 0 }}>
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  background: "white",
                  zIndex: 1,
                }}
              >
                <tr>
                  <th>Info</th>
                  <th>Precio c/IVA</th>
                  <th>Stock</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {resultadosProducto.map((p) => (
                  <tr key={p.id_producto}>
                    <td>
                      <strong>{p.sku}</strong>
                      <br />
                      {p.nombre}
                      <br />
                      {p.marca_repuesto && (
                        <span style={{ fontSize: "0.8rem", color: "gray" }}>
                          {p.marca_repuesto}
                        </span>
                      )}
                    </td>
                    <td>Q {p.precio_venta.toFixed(2)}</td>
                    <td>
                      <div style={{ marginBottom: "6px" }}>
                        <span
                          className={`${styles.badgeStock} ${p.stock_local === 0 ? styles.badgeStockOut : ""}`}
                        >
                          {p.stock_local} und
                        </span>
                      </div>
                      {p.stock_otras_sucursales &&
                        p.stock_otras_sucursales.length > 0 && (
                          <details
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-main)",
                              cursor: "pointer",
                            }}
                          >
                            <summary
                              style={{
                                outline: "none",
                                userSelect: "none",
                                fontWeight: "bold",
                                color: "var(--primary-color)",
                              }}
                            >
                              + en otras sucursales
                            </summary>
                            <div
                              style={{
                                marginTop: "6px",
                                padding: "6px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "4px",
                              }}
                            >
                              {p.stock_otras_sucursales.map((otra, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    borderBottom:
                                      idx !==
                                      p.stock_otras_sucursales!.length - 1
                                        ? "1px solid #e2e8f0"
                                        : "none",
                                    padding: "2px 0",
                                  }}
                                >
                                  <span>{otra.sucursal}</span>
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      marginLeft: "12px",
                                    }}
                                  >
                                    {otra.cantidad} und
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
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
          </div>
        )}

        <h2 className={styles.sectionTitle} style={{ marginTop: "2rem" }}>
          Detalle de la Orden
        </h2>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Producto</th>
              <th>P.U.</th>
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
                <tr key={item.uid}>
                  <td>
                    {/* <-- ACTUALIZADO: Badge visual para piezas reacondicionadas --> */}
                    {item.es_reacondicionado && (
                      <span className={styles.badgeReac}>REAC</span>
                    )}
                    {item.nombre}
                  </td>
                  <td>Q {item.precio_venta.toFixed(2)}</td>
                  <td>
                    <div className={styles.qtyControl}>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => modificarCantidad(item.uid, -1)}
                      >
                        -
                      </button>
                      <span>{item.cantidad}</span>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => modificarCantidad(item.uid, 1)}
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

        {/* SECCIÓN DE DESCUENTOS Y TOTALES */}
        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <label className={styles.label}>Descuento (%):</label>
          <input
            type="number"
            min="0"
            max="100"
            className={styles.input}
            style={{ width: "80px" }}
            value={descuentoPorcentaje}
            onChange={(e) => setDescuentoPorcentaje(Number(e.target.value))}
          />
        </div>

        <div className={styles.totalBox}>
          <div
            style={{
              fontSize: "0.9rem",
              color: "gray",
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.2rem",
            }}
          >
            <span>Precio Base (Neto):</span>
            <span>Q {precioBaseSinIva.toFixed(2)}</span>
          </div>
          <div
            style={{
              fontSize: "0.9rem",
              color: "gray",
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <span>IVA (12%):</span>
            <span>Q {montoIvaCalculado.toFixed(2)}</span>
          </div>
          <div
            style={{
              fontSize: "1.1rem",
              color: "var(--text-main)",
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.25rem",
            }}
          >
            <span>Subtotal (IVA Incluido):</span>
            <span>Q {subtotalCarrito.toFixed(2)}</span>
          </div>
          {descuentoPorcentaje > 0 && (
            <div
              style={{
                fontSize: "1.1rem",
                color: "var(--error-color)",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <span>Descuento:</span>
              <span>- Q {descuentoMonto.toFixed(2)}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "1rem",
            }}
          >
            <span>Total a Pagar:</span>
            <span className={styles.totalText}>
              Q {totalVentaConIva.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* PANEL DERECHO: CLIENTE Y LOGÍSTICA (Sin cambios visuales) */}
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
                maxLength={9}
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
                placeholder="Ej. Entregar en puerta azul..."
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
              <label className={styles.label}>Nombre de quien recibe</label>
              <input
                type="text"
                className={styles.input}
                value={nombreContacto}
                onChange={(e) => setNombreContacto(e.target.value)}
                placeholder="Ej. Juan Pérez o Taller Los Motores"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Teléfono de contacto</label>
              <input
                type="text"
                className={styles.input}
                value={telefonoContacto}
                maxLength={9}
                onChange={(e) => setTelefonoContacto(e.target.value)}
                placeholder="Teléfono para el repartidor"
              />
            </div>
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
                placeholder="Dirección exacta, referencias..."
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
                style={{ width: "18px", height: "18px", margin: 0 }}
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
