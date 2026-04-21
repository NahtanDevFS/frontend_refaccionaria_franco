"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./NuevaVenta.module.css";
import { InventarioService } from "@/services/inventario.service";
import { ClienteService } from "@/services/cliente.service";
import { VentaService } from "@/services/venta.service";
import { UbicacionService } from "@/services/ubicacion.service";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ProductoInventario {
  id_producto: number;
  id_producto_reacondicionado?: number;
  sku: string;
  nombre: string;
  precio_venta: number;
  stock_local: number;
  stock_otras_sucursales?: { sucursal: string; cantidad: number }[];
  marca_repuesto?: string;
  is_reacondicionado?: boolean;
  compatibilidades?: {
    marca: string | null;
    modelo: string | null;
    anio_desde: number | null;
    anio_hasta: number | null;
    es_universal: boolean;
  }[];
}

interface ItemCarrito extends ProductoInventario {
  uid: string;
  cantidad: number;
  subtotal: number;
  es_reacondicionado?: boolean;
}

interface ClienteDB {
  id_cliente?: number;
  nombre_razon_social: string;
  nit: string;
  telefono: string | null;
  direccion: string | null;
  tipo_cliente: string;
  email: string | null;
  id_municipio: number | null;
  notas_internas: string | null;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function NuevaVentaPage() {
  // ── Sesión ──────────────────────────────────────────────────────────────────
  const [usuarioSesion, setUsuarioSesion] = useState<{
    id_empleado: number;
    id_sucursal: number;
  } | null>(null);

  // ── Búsqueda de productos ────────────────────────────────────────────────────
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

  // ── Estado del cliente ────────────────────────────────────────
  type ModoCliente = "cf" | "buscando" | "seleccionado" | "nuevo";
  const [modoCliente, setModoCliente] = useState<ModoCliente>("cf");
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteDB | null>(null);

  // Buscador con autocomplete
  const [termBusqCliente, setTermBusqCliente] = useState("");
  const [sugerencias, setSugerencias] = useState<ClienteDB[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Formulario cliente nuevo (modal)
  const [nuevoCliente, setNuevoCliente] = useState({
    nit: "",
    nombre: "",
    tipo: "particular",
    telefono: "",
    email: "",
    direccion: "",
    id_departamento: "",
    id_municipio: "",
    notas_internas: "",
  });
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  // ── Logística ────────────────────────────────────────────────────────────────
  const [esDomicilio, setEsDomicilio] = useState(false);
  const [idRepartidor, setIdRepartidor] = useState("");
  const [deptoEntrega, setDeptoEntrega] = useState("");
  const [municipioEntrega, setMunicipioEntrega] = useState("");
  const [municipiosEntrega, setMunicipiosEntrega] = useState<
    { id_municipio: number; nombre: string }[]
  >([]);
  const [pagoContraEntrega, setPagoContraEntrega] = useState(false);
  const [nombreContacto, setNombreContacto] = useState("");
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(0);
  const [listaRepartidores, setListaRepartidores] = useState<
    {
      id_empleado: number;
      nombre: string;
      apellido: string;
      disponible: boolean;
      pedidos_activos: number;
    }[]
  >([]);

  // ── Modal confirmación ───────────────────────────────────────────────────────
  const [modalConfirmacion, setModalConfirmacion] = useState(false);
  const [procesandoOrden, setProcesandoOrden] = useState(false);

  // ── Ubicación ────────────────────────────────────────────────────────────────
  const [departamentos, setDepartamentos] = useState<
    { id_departamento: number; nombre: string }[]
  >([]);
  const [deptoModal, setDeptoModal] = useState<
    { id_departamento: number; nombre: string }[]
  >([]);
  const [munModal, setMunModal] = useState<
    { id_municipio: number; nombre: string }[]
  >([]);

  // Modal de compatibilidad
  const [modalCompatVentaAbierto, setModalCompatVentaAbierto] = useState(false);
  const [productoCompatVenta, setProductoCompatVenta] =
    useState<ProductoInventario | null>(null);

  const abrirCompatVenta = async (prod: ProductoInventario) => {
    try {
      const data = await InventarioService.obtenerCompatibilidades(
        prod.id_producto,
      );
      const compatibilidades = data.map((c: any) => ({
        marca: c.marca_vehiculo,
        modelo: c.modelo_vehiculo,
        anio_desde: c.anio_desde,
        anio_hasta: c.anio_hasta,
        es_universal: c.es_universal,
      }));
      setProductoCompatVenta({ ...prod, compatibilidades });
      setModalCompatVentaAbierto(true);
    } catch {
      alert("No se pudo cargar la compatibilidad.");
    }
  };

  // ── Efectos iniciales ────────────────────────────────────────────────────────
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
          if (Array.isArray(data)) {
            setDepartamentos(data);
            setDeptoModal(data);
          }
        })
        .catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (deptoEntrega) {
      UbicacionService.obtenerMunicipios(parseInt(deptoEntrega))
        .then((data) => {
          if (Array.isArray(data)) setMunicipiosEntrega(data);
        })
        .catch(console.error);
      setMunicipioEntrega("");
    } else {
      setMunicipiosEntrega([]);
      setMunicipioEntrega("");
    }
  }, [deptoEntrega]);

  useEffect(() => {
    if (nuevoCliente.id_departamento) {
      UbicacionService.obtenerMunicipios(parseInt(nuevoCliente.id_departamento))
        .then((data) => {
          if (Array.isArray(data)) setMunModal(data);
        })
        .catch(console.error);
    } else {
      setMunModal([]);
    }
  }, [nuevoCliente.id_departamento]);

  useEffect(() => {
    if (tipoBusqueda === "vehiculo" && marcasVehiculo.length === 0) {
      InventarioService.obtenerMarcasVehiculo()
        .then(setMarcasVehiculo)
        .catch(console.error);
    }
  }, [tipoBusqueda, marcasVehiculo.length]);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setSugerencias([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Autorellenado de domicilio con datos del cliente ─────────────────────────
  useEffect(() => {
    if (esDomicilio && clienteSeleccionado) {
      setNombreContacto(clienteSeleccionado.nombre_razon_social ?? "");
      setTelefonoContacto(clienteSeleccionado.telefono ?? "");
      setDireccionEntrega(clienteSeleccionado.direccion ?? "");
    }
    if (!esDomicilio) {
      setNombreContacto("");
      setTelefonoContacto("");
      setDireccionEntrega("");
      setDeptoEntrega("");
      setMunicipioEntrega("");
      setMunicipiosEntrega([]);
    }
  }, [esDomicilio, clienteSeleccionado]);

  const cargarRepartidores = async () => {
    try {
      const data = await VentaService.obtenerRepartidores();
      setListaRepartidores(Array.isArray(data) ? data : []);
    } catch {
      console.error("No se pudieron cargar repartidores");
    }
  };

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
      alert(error.message || "Error al buscar productos.");
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
    } catch {
      alert("Error al buscar repuestos para este vehículo.");
    }
  };

  const agregarAlCarrito = (prod: ProductoInventario) => {
    if (prod.stock_local < 1) {
      alert("Sin stock en esta sucursal. Solicita traslado.");
      return;
    }
    const uid = prod.is_reacondicionado
      ? `R_${prod.id_producto_reacondicionado}`
      : `P_${prod.id_producto}`;
    const itemExistente = carrito.find((i) => i.uid === uid);
    if (itemExistente) {
      if (itemExistente.cantidad >= prod.stock_local) {
        alert(
          prod.is_reacondicionado
            ? "No hay más stock de este producto reacondicionado."
            : "Stock máximo local alcanzado.",
        );
        return;
      }
      setCarrito(
        carrito.map((i) =>
          i.uid === uid
            ? {
                ...i,
                cantidad: i.cantidad + 1,
                subtotal: (i.cantidad + 1) * i.precio_venta,
              }
            : i,
        ),
      );
    } else {
      setCarrito([
        ...carrito,
        {
          ...prod,
          uid,
          cantidad: 1,
          subtotal: prod.precio_venta,
          es_reacondicionado: prod.is_reacondicionado,
        },
      ]);
    }
    setResultadosProducto([]);
    setTerminoBusqueda("");
    setBusquedaVehiculo({ id_marca: "", id_modelo: "", anio: "" });
  };

  const modificarCantidad = (uid: string, delta: number) => {
    setCarrito(
      carrito.map((item) => {
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
      }),
    );
  };

  const eliminarDelCarrito = (uid: string) => {
    setCarrito(carrito.filter((item) => item.uid !== uid));
  };

  const handleTermBusqCliente = useCallback((valor: string) => {
    setTermBusqCliente(valor);
    setSugerencias([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (valor.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setBuscandoCliente(true);
      try {
        const resultados = await ClienteService.buscarClientes(valor);
        setSugerencias(resultados);
      } catch {
        setSugerencias([]);
      } finally {
        setBuscandoCliente(false);
      }
    }, 400);
  }, []);

  const seleccionarCliente = (cliente: ClienteDB) => {
    setClienteSeleccionado(cliente);
    setModoCliente("seleccionado");
    setSugerencias([]);
    setTermBusqCliente("");
  };

  const cambiarAConsumidorFinal = () => {
    setModoCliente("cf");
    setClienteSeleccionado(null);
    setTermBusqCliente("");
    setSugerencias([]);
  };

  const iniciarBusquedaCliente = () => {
    setModoCliente("buscando");
    setClienteSeleccionado(null);
    setTermBusqCliente("");
    setSugerencias([]);
  };

  const abrirModalNuevoCliente = () => {
    const esNit = /^\d+$/.test(termBusqCliente.trim());
    setNuevoCliente({
      nit: esNit ? termBusqCliente.trim() : "",
      nombre: esNit ? "" : termBusqCliente.trim(),
      tipo: "particular",
      telefono: "",
      email: "",
      direccion: "",
      id_departamento: "",
      id_municipio: "",
      notas_internas: "",
    });
    setModoCliente("nuevo");
    setSugerencias([]);
  };

  const guardarNuevoCliente = async () => {
    if (!nuevoCliente.nombre.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }
    setGuardandoCliente(true);
    try {
      const clienteLocal: ClienteDB = {
        nombre_razon_social: nuevoCliente.nombre.trim(),
        nit: nuevoCliente.nit.trim() || "CF",
        tipo_cliente: nuevoCliente.tipo,
        telefono: nuevoCliente.telefono || null,
        email: nuevoCliente.email || null,
        direccion: nuevoCliente.direccion || null,
        id_municipio: nuevoCliente.id_municipio
          ? parseInt(nuevoCliente.id_municipio)
          : null,
        notas_internas: nuevoCliente.notas_internas || null,
      };
      setClienteSeleccionado(clienteLocal);
      setModoCliente("seleccionado");
    } finally {
      setGuardandoCliente(false);
    }
  };

  const subtotalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);
  const descuentoMonto = subtotalCarrito * (descuentoPorcentaje / 100);
  const totalVentaConIva = subtotalCarrito - descuentoMonto;

  // Abre el modal de confirmación
  const procesarOrden = () => {
    setModalConfirmacion(true);
  };

  // Ejecuta la orden tras confirmar en el modal
  const ejecutarOrden = async () => {
    if (!usuarioSesion) {
      alert("No se detectó una sesión activa.");
      return;
    }

    setProcesandoOrden(true);

    const esCF = modoCliente === "cf";
    const nitFinal = esCF ? "CF" : clienteSeleccionado?.nit || "CF";
    const esClienteNuevo =
      modoCliente === "seleccionado" && !clienteSeleccionado?.id_cliente;

    const payload = {
      id_sucursal: usuarioSesion.id_sucursal,
      id_vendedor: usuarioSesion.id_empleado,
      nit: nitFinal,
      cliente_nuevo:
        esClienteNuevo && clienteSeleccionado
          ? {
              nombre_razon_social: clienteSeleccionado.nombre_razon_social,
              tipo_cliente: clienteSeleccionado.tipo_cliente,
              telefono: clienteSeleccionado.telefono,
              email: clienteSeleccionado.email,
              direccion: clienteSeleccionado.direccion,
              id_municipio: clienteSeleccionado.id_municipio ?? undefined,
              notas_internas: clienteSeleccionado.notas_internas,
            }
          : null,
      canal: esDomicilio ? "domicilio" : "mostrador",
      pago_contra_entrega: esDomicilio ? pagoContraEntrega : false,
      descuento_porcentaje: descuentoPorcentaje,
      id_repartidor:
        esDomicilio && idRepartidor ? parseInt(idRepartidor) : null,
      direccion_entrega: esDomicilio ? direccionEntrega || null : null,
      nombre_contacto: esDomicilio ? nombreContacto : null,
      telefono_contacto: esDomicilio ? telefonoContacto : null,
      id_municipio_entrega:
        esDomicilio && municipioEntrega ? parseInt(municipioEntrega) : null,
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

      // Reset completo
      setCarrito([]);
      setModoCliente("cf");
      setClienteSeleccionado(null);
      setEsDomicilio(false);
      setPagoContraEntrega(false);
      setDescuentoPorcentaje(0);
      setIdRepartidor("");
      setDeptoEntrega("");
      setMunicipioEntrega("");
      setMunicipiosEntrega([]);
      setNombreContacto("");
      setTelefonoContacto("");
      setDireccionEntrega("");
      setModalConfirmacion(false);
      setProcesandoOrden(false);

      alert(`Orden enviada exitosamente.\nEstado: ${mensajeEstado}`);
    } catch (error: any) {
      setProcesandoOrden(false);
      alert(`Error al procesar: ${error.message}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <div className={styles.headerFlex}>
          <h2 className={`${styles.sectionTitle} ${styles.headerTitle}`}>
            Catálogo de Repuestos
          </h2>
          <div className={styles.btnGroup}>
            <button
              className={`${styles.btnTab} ${tipoBusqueda === "texto" ? styles.btnTabActive : styles.btnTabInactive}`}
              onClick={() => setTipoBusqueda("texto")}
            >
              Texto / SKU
            </button>
            <button
              className={`${styles.btnTab} ${tipoBusqueda === "vehiculo" ? styles.btnTabActive : styles.btnTabInactive}`}
              onClick={() => setTipoBusqueda("vehiculo")}
            >
              Por Vehículo
            </button>
          </div>
        </div>

        {tipoBusqueda === "texto" && (
          <div className={`${styles.formGrid} ${styles.searchBox}`}>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Buscar por Nombre o SKU</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ej. FRIC-001 o Pastillas de Freno..."
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
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Marca Repuesto</label>
              <select
                className={styles.select}
                value={filtroMarca}
                onChange={(e) => setFiltroMarca(e.target.value)}
              >
                <option value="">Todas</option>
                {marcasRepuesto.map((m) => (
                  <option key={m.id_marca} value={m.id_marca}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <button
                className={`${styles.btnAction} ${styles.mt0}`}
                onClick={buscarProductoTexto}
              >
                Buscar
              </button>
            </div>
          </div>
        )}

        {tipoBusqueda === "vehiculo" && (
          <div className={`${styles.formGrid} ${styles.searchBox}`}>
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
                placeholder="Ej. 2019"
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
              <label className={styles.label}>Categoría</label>
              <select
                className={styles.select}
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <button
                className={`${styles.btnAction} ${styles.mt0}`}
                onClick={buscarPorVehiculo}
                disabled={!busquedaVehiculo.id_modelo}
              >
                Buscar Repuestos
              </button>
            </div>
          </div>
        )}

        {resultadosProducto.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Stock Local</th>
                  <th>Compat.</th>
                  <th>Agregar</th>
                </tr>
              </thead>
              <tbody>
                {resultadosProducto.map((p) => (
                  <tr
                    key={
                      p.is_reacondicionado
                        ? `R_${p.id_producto_reacondicionado}`
                        : `P_${p.id_producto}`
                    }
                  >
                    <td className={styles.textBold}>{p.sku}</td>
                    <td>
                      {p.is_reacondicionado && (
                        <span className={styles.badgeReacTable}>REAC</span>
                      )}
                      {p.nombre}
                      {p.stock_otras_sucursales &&
                        p.stock_otras_sucursales.length > 0 && (
                          <details className={styles.stockDetails}>
                            <summary className={styles.stockSummary}>
                              Stock otras sucursales (
                              {p.stock_otras_sucursales.reduce(
                                (a, b) => a + b.cantidad,
                                0,
                              )}{" "}
                              und)
                            </summary>
                            <div className={styles.stockList}>
                              {p.stock_otras_sucursales.map((otra, i) => (
                                <div key={i} className={styles.stockItem}>
                                  <span>{otra.sucursal}</span>
                                  <strong className={styles.stockItemQty}>
                                    {otra.cantidad} und
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                    </td>
                    <td>Q {p.precio_venta.toFixed(2)}</td>
                    <td
                      className={
                        p.stock_local > 0 ? styles.stockGreen : styles.stockRed
                      }
                    >
                      {p.stock_local}
                    </td>
                    <td>
                      <button
                        className={styles.btnSecondary}
                        style={{
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.75rem",
                        }}
                        onClick={() => abrirCompatVenta(p)}
                      >
                        Ver
                      </button>
                    </td>
                    <td>
                      <button
                        className={`${styles.btnAddCart} ${p.is_reacondicionado ? styles.btnAddCartReac : ""}`}
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

        <h2 className={`${styles.sectionTitle} ${styles.mt2}`}>
          Detalle de la Orden
        </h2>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>P.U.</th>
                <th>Cantidad</th>
                <th>Subtotal</th>
                <th style={{ width: "50px", textAlign: "center" }}> </th>
              </tr>
            </thead>
            <tbody>
              {carrito.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.textCenter}>
                    El carrito está vacío
                  </td>
                </tr>
              ) : (
                carrito.map((item) => (
                  <tr key={item.uid}>
                    <td>
                      {item.es_reacondicionado && (
                        <span
                          className={`${styles.badgeReacTable} ${styles.mr05}`}
                        >
                          REAC
                        </span>
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
                    <td className={styles.bold}>
                      Q {item.subtotal.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => eliminarDelCarrito(item.uid)}
                        title="Quitar del carrito"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: "1.1rem",
                          fontWeight: "bold",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          transition: "background-color 0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.backgroundColor = "#fee2e2")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.totalBox}>
          <div className={styles.discountRow}>
            <label className={styles.discountLabel}>Descuento %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={descuentoPorcentaje}
              onChange={(e) =>
                setDescuentoPorcentaje(
                  Math.min(100, Math.max(0, Number(e.target.value))),
                )
              }
              className={styles.discountInput}
            />
          </div>
          {descuentoPorcentaje > 0 && (
            <div className={styles.discountResult}>
              <span>Descuento:</span>
              <span>- Q {descuentoMonto.toFixed(2)}</span>
            </div>
          )}
          <div className={styles.totalRow}>
            <span>Total a Pagar:</span>
            <span className={styles.totalText}>
              Q {totalVentaConIva.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.sectionTitle}>Cliente</h2>

        {(modoCliente === "cf" || modoCliente === "buscando") && (
          <div className={styles.tipoClienteSelector}>
            <button
              className={`${styles.tipoClienteBtn} ${modoCliente === "cf" ? styles.tipoClienteBtnActivo : ""}`}
              onClick={cambiarAConsumidorFinal}
            >
              Consumidor Final
              <br />
              <span className={styles.subTextBtn}>Sin NIT (CF)</span>
            </button>
            <button
              className={`${styles.tipoClienteBtn} ${modoCliente === "buscando" ? styles.tipoClienteBtnActivo : ""}`}
              onClick={iniciarBusquedaCliente}
            >
              Cliente registrado
              <br />
              <span className={styles.subTextBtn}>
                Buscar por NIT, nombre o tel.
              </span>
            </button>
          </div>
        )}

        {modoCliente === "buscando" && (
          <div ref={dropdownRef} className={styles.buscadorWrapper}>
            <input
              autoFocus
              type="text"
              className={styles.buscadorInput}
              placeholder="Nombre, NIT o teléfono..."
              value={termBusqCliente}
              onChange={(e) => handleTermBusqCliente(e.target.value)}
            />
            <p className={styles.buscadorHint}>
              {buscandoCliente
                ? "Buscando..."
                : "Escribe al menos 2 caracteres"}
            </p>

            {(sugerencias.length > 0 ||
              (termBusqCliente.length >= 2 && !buscandoCliente)) && (
              <div className={styles.autocompleteDropdown}>
                {sugerencias.length === 0 ? (
                  <div className={styles.autocompleteSinResultados}>
                    No encontrado —{" "}
                    <button
                      onClick={abrirModalNuevoCliente}
                      className={styles.btnLink}
                    >
                      Registrar cliente nuevo
                    </button>
                  </div>
                ) : (
                  <>
                    {sugerencias.map((c) => (
                      <div
                        key={c.id_cliente}
                        className={styles.autocompleteItem}
                        onClick={() => seleccionarCliente(c)}
                      >
                        <div className={styles.autocompleteNombre}>
                          {c.nombre_razon_social}
                        </div>
                        <div className={styles.autocompleteNit}>
                          NIT: {c.nit}
                          {c.telefono && ` • Tel: ${c.telefono}`}
                        </div>
                      </div>
                    ))}
                    <div
                      className={`${styles.autocompleteItem} ${styles.autocompleteItemAdd} ${styles.btnLink}`}
                      onClick={abrirModalNuevoCliente}
                    >
                      + Registrar cliente nuevo
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {modoCliente === "cf" && (
          <div className={styles.clienteCard}>
            <div className={styles.clienteCardInfo}>
              <div className={styles.clienteCardNombre}>Consumidor Final</div>
              <div className={styles.clienteCardDetalle}>
                <span>
                  <span className={styles.nitBadge}>CF</span>
                </span>
                <span>Sin datos de cliente</span>
              </div>
            </div>
            <button
              className={styles.btnCambiarCliente}
              onClick={iniciarBusquedaCliente}
            >
              Cambiar
            </button>
          </div>
        )}

        {modoCliente === "seleccionado" && clienteSeleccionado && (
          <div className={styles.clienteCard}>
            <div className={styles.clienteCardInfo}>
              <div className={styles.clienteCardNombre}>
                {clienteSeleccionado.nombre_razon_social}
              </div>
              <div className={styles.clienteCardDetalle}>
                <span>
                  <span className={styles.nitBadge}>
                    {clienteSeleccionado.nit}
                  </span>
                </span>
                {clienteSeleccionado.telefono && (
                  <span>{clienteSeleccionado.telefono}</span>
                )}
                {clienteSeleccionado.direccion && (
                  <span>{clienteSeleccionado.direccion}</span>
                )}
                {!clienteSeleccionado.id_cliente && (
                  <span className={styles.hintTextWarning}>
                    Nuevo — se guardará al confirmar
                  </span>
                )}
              </div>
            </div>
            <button
              className={styles.btnCambiarCliente}
              onClick={iniciarBusquedaCliente}
            >
              Cambiar
            </button>
          </div>
        )}

        <div className={styles.seccionEntrega}>
          <h3 className={styles.seccionEntregaTitulo}>Entrega</h3>

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
                  maxLength={8}
                  onChange={(e) => setTelefonoContacto(e.target.value)}
                  placeholder="Teléfono para el repartidor"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Dirección de Entrega</label>
                <input
                  type="text"
                  className={styles.input}
                  value={direccionEntrega}
                  onChange={(e) => setDireccionEntrega(e.target.value)}
                  placeholder="Ej. 3a calle 5-20 zona 1, colonia Las Flores..."
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Departamento de Entrega</label>
                <select
                  className={styles.select}
                  value={deptoEntrega}
                  onChange={(e) => setDeptoEntrega(e.target.value)}
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
                <label className={styles.label}>Municipio de Entrega</label>
                <select
                  className={styles.select}
                  value={municipioEntrega}
                  onChange={(e) => setMunicipioEntrega(e.target.value)}
                  disabled={!deptoEntrega}
                >
                  <option value="">Seleccione...</option>
                  {municipiosEntrega.map((m) => (
                    <option key={m.id_municipio} value={m.id_municipio}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Asignar Repartidor</label>
                <select
                  className={styles.select}
                  value={idRepartidor}
                  onChange={(e) => setIdRepartidor(e.target.value)}
                >
                  <option value="">Seleccione un repartidor...</option>
                  {listaRepartidores.map((rep) => {
                    const enRuta = rep.disponible && rep.pedidos_activos > 0;
                    const noDisponible = !rep.disponible;

                    let etiqueta = "";
                    if (noDisponible) {
                      etiqueta = " 🔴 No disponible";
                    } else if (enRuta) {
                      etiqueta = ` 🟡 En ruta (${rep.pedidos_activos} pedido${rep.pedidos_activos > 1 ? "s" : ""})`;
                    } else {
                      etiqueta = " 🟢 Disponible";
                    }

                    return (
                      <option key={rep.id_empleado} value={rep.id_empleado}>
                        {rep.nombre} {rep.apellido} —{etiqueta}
                      </option>
                    );
                  })}
                </select>

                {listaRepartidores.length > 0 && (
                  <p
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-secondary, #6b7280)",
                      marginTop: "0.25rem",
                      lineHeight: 1.4,
                    }}
                  >
                    🟢 Disponible &nbsp;·&nbsp; 🟡 En ruta &nbsp;·&nbsp; 🔴 No
                    disponible
                  </p>
                )}
              </div>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="contraEntrega"
                  checked={pagoContraEntrega}
                  onChange={(e) => setPagoContraEntrega(e.target.checked)}
                  className={styles.checkboxInput}
                />
                <label
                  htmlFor="contraEntrega"
                  className={`${styles.label} ${styles.checkboxLabel}`}
                >
                  El cliente pagará al recibir (Contra Entrega)
                </label>
              </div>
            </>
          )}
        </div>

        <button
          className={styles.btnAction}
          onClick={procesarOrden}
          disabled={
            carrito.length === 0 ||
            modoCliente === "buscando" ||
            modoCliente === "nuevo" ||
            (esDomicilio &&
              (!direccionEntrega ||
                !idRepartidor ||
                !nombreContacto ||
                !telefonoContacto))
          }
        >
          Generar Orden de Venta
        </button>
      </div>

      {/* ── MODAL: Registrar cliente nuevo ──────────────────────────────────── */}
      {modoCliente === "nuevo" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalNuevoCliente}>
            <div className={styles.modalHeader}>
              <h3>Registrar cliente nuevo</h3>
              <button
                className={styles.btnCerrarModal}
                onClick={() => setModoCliente("buscando")}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  NIT{" "}
                  <span className={styles.hintText}>
                    (dejar vacío si no tiene)
                  </span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  maxLength={9}
                  value={nuevoCliente.nit}
                  onChange={(e) =>
                    setNuevoCliente({ ...nuevoCliente, nit: e.target.value })
                  }
                  placeholder="Ej. 12345678"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nombre / Razón Social *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={nuevoCliente.nombre}
                  onChange={(e) =>
                    setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })
                  }
                  placeholder="Ej. Taller López"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tipo de Cliente</label>
                <select
                  className={styles.select}
                  value={nuevoCliente.tipo}
                  onChange={(e) =>
                    setNuevoCliente({ ...nuevoCliente, tipo: e.target.value })
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
                  maxLength={8}
                  value={nuevoCliente.telefono}
                  onChange={(e) =>
                    setNuevoCliente({
                      ...nuevoCliente,
                      telefono: e.target.value,
                    })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Dirección</label>
                <input
                  type="text"
                  className={styles.input}
                  value={nuevoCliente.direccion}
                  onChange={(e) =>
                    setNuevoCliente({
                      ...nuevoCliente,
                      direccion: e.target.value,
                    })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Departamento</label>
                <select
                  className={styles.select}
                  value={nuevoCliente.id_departamento}
                  onChange={(e) =>
                    setNuevoCliente({
                      ...nuevoCliente,
                      id_departamento: e.target.value,
                      id_municipio: "",
                    })
                  }
                >
                  <option value="">Seleccione...</option>
                  {deptoModal.map((d) => (
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
                  value={nuevoCliente.id_municipio}
                  disabled={!nuevoCliente.id_departamento}
                  onChange={(e) =>
                    setNuevoCliente({
                      ...nuevoCliente,
                      id_municipio: e.target.value,
                    })
                  }
                >
                  <option value="">Seleccione...</option>
                  {munModal.map((m) => (
                    <option key={m.id_municipio} value={m.id_municipio}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Notas internas</label>
                <textarea
                  className={styles.input}
                  rows={2}
                  value={nuevoCliente.notas_internas}
                  onChange={(e) =>
                    setNuevoCliente({
                      ...nuevoCliente,
                      notas_internas: e.target.value,
                    })
                  }
                  placeholder="Ej. Entregar en puerta azul..."
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnModalCancelar}
                onClick={() => setModoCliente("buscando")}
              >
                Cancelar
              </button>
              <button
                className={styles.btnModalGuardar}
                onClick={guardarNuevoCliente}
                disabled={guardandoCliente || !nuevoCliente.nombre.trim()}
              >
                {guardandoCliente ? "Guardando..." : "Confirmar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Compatibilidad de vehículos ──────────────────────────────── */}
      {modalCompatVentaAbierto && productoCompatVenta && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Vehículos Compatibles</h2>
            <p>
              <strong className={styles.textBold}>Producto:</strong>{" "}
              {productoCompatVenta.nombre}{" "}
              <span className={styles.textMuted}>
                ({productoCompatVenta.sku})
              </span>
            </p>
            <div className={styles.compatBox}>
              {!productoCompatVenta.compatibilidades ||
              productoCompatVenta.compatibilidades.length === 0 ? (
                <p style={{ textAlign: "center", margin: 0 }}>
                  Sin información.
                </p>
              ) : productoCompatVenta.compatibilidades.some(
                  (c) => c.es_universal,
                ) ? (
                <div className={styles.compatUniversal}>🌐 Pieza Universal</div>
              ) : (
                <ul className={styles.compatList}>
                  {productoCompatVenta.compatibilidades.map((comp, idx) => (
                    <li key={idx}>
                      <strong className={styles.textBold}>{comp.marca}</strong>{" "}
                      - {comp.modelo}{" "}
                      {comp.anio_desde && (
                        <span>
                          ({comp.anio_desde} - {comp.anio_hasta})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => setModalCompatVentaAbierto(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Confirmación de orden ────────────────────────────────────── */}
      {modalConfirmacion && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalConfirmacion}>
            <div className={styles.modalHeader}>
              <h3>Confirmar Orden de Venta</h3>
              <button
                className={styles.btnCerrarModal}
                onClick={() => !procesandoOrden && setModalConfirmacion(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Cliente */}
              <div className={styles.confirmSeccion}>
                <p className={styles.confirmLabel}>CLIENTE</p>
                <p className={styles.confirmValor}>
                  {modoCliente === "cf"
                    ? "Consumidor Final"
                    : clienteSeleccionado?.nombre_razon_social || "—"}
                </p>
                {modoCliente !== "cf" && (
                  <p className={styles.confirmSubvalor}>
                    NIT: {clienteSeleccionado?.nit || "CF"}
                    {clienteSeleccionado?.telefono &&
                      ` • Tel: ${clienteSeleccionado.telefono}`}
                  </p>
                )}
              </div>

              {/* Entrega */}
              <div className={styles.confirmSeccion}>
                <p className={styles.confirmLabel}>TIPO DE ENTREGA</p>
                <p className={styles.confirmValor}>
                  {esDomicilio
                    ? "🚚 Envío a Domicilio"
                    : "🏪 Retiro en Mostrador"}
                </p>
                {esDomicilio && (
                  <div className={styles.confirmSubvalor}>
                    <p className={styles.confirmDetalle}>
                      📍 {direccionEntrega}
                    </p>
                    <p className={styles.confirmDetalle}>👤 {nombreContacto}</p>
                    <p className={styles.confirmDetalle}>
                      📞 {telefonoContacto}
                    </p>
                    {pagoContraEntrega && (
                      <p className={styles.confirmContraEntrega}>
                        ⚠ Pago Contra Entrega
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Productos */}
              <div className={styles.confirmSeccion}>
                <p className={styles.confirmLabel}>
                  PRODUCTOS ({carrito.length}{" "}
                  {carrito.length === 1 ? "artículo" : "artículos"})
                </p>
                <div className={styles.confirmProductosBox}>
                  {carrito.map((item) => (
                    <div key={item.uid} className={styles.confirmProductoFila}>
                      <span>
                        {item.es_reacondicionado && (
                          <span className={styles.confirmBadgeReac}>REAC</span>
                        )}
                        {item.nombre} × {item.cantidad}
                      </span>
                      <span className={styles.confirmProductoMonto}>
                        Q {item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales */}
              <div className={styles.confirmTotalesBox}>
                {descuentoPorcentaje > 0 && (
                  <>
                    <div className={styles.confirmTotalFila}>
                      <span>Subtotal</span>
                      <span>Q {subtotalCarrito.toFixed(2)}</span>
                    </div>
                    <div
                      className={`${styles.confirmTotalFila} ${styles.confirmDescuento}`}
                    >
                      <span>Descuento ({descuentoPorcentaje}%)</span>
                      <span>− Q {descuentoMonto.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div
                  className={`${styles.confirmTotalFila} ${styles.confirmTotalFinal}`}
                >
                  <span>Total</span>
                  <span>Q {totalVentaConIva.toFixed(2)}</span>
                </div>
              </div>

              {descuentoPorcentaje > 5 && (
                <p className={styles.confirmAvisoDescuento}>
                  ⚠ Descuento mayor al 5% — requiere autorización de supervisor
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnModalCancelar}
                onClick={() => setModalConfirmacion(false)}
                disabled={procesandoOrden}
              >
                Revisar
              </button>
              <button
                className={styles.btnModalGuardar}
                onClick={ejecutarOrden}
                disabled={procesandoOrden}
              >
                {procesandoOrden ? "Procesando..." : "✓ Confirmar Orden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
