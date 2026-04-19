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

  // ── Estado del cliente (nuevo diseño) ────────────────────────────────────────
  // "cf"        → Consumidor Final, listo para vender
  // "buscando"  → mostrando el buscador libre
  // "seleccionado" → cliente encontrado y confirmado
  // "nuevo"     → modal de registro abierto
  type ModoCliente = "cf" | "buscando" | "seleccionado" | "nuevo";
  const [modoCliente, setModoCliente] = useState<ModoCliente>("cf");
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteDB | null>(null);

  // Buscador con autocomplete
  const [termBusqCliente, setTermBusqCliente] = useState("");
  const [sugerencias, setSugerencias] = useState<ClienteDB[]>([]);
  const [busquedaLibre, setBusquedaLibre] = useState("");
  const [resultadosCliente, setResultadosCliente] = useState<any[]>([]);
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
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(0);
  const [listaRepartidores, setListaRepartidores] = useState<
    { id_empleado: number; nombre: string; apellido: string }[]
  >([]);

  // ── Ubicación ────────────────────────────────────────────────────────────────
  const [departamentos, setDepartamentos] = useState<
    { id_departamento: number; nombre: string }[]
  >([]);
  const [municipios, setMunicipios] = useState<
    { id_municipio: number; nombre: string }[]
  >([]);
  const [deptoModal, setDeptoModal] = useState<
    { id_departamento: number; nombre: string }[]
  >([]);
  const [munModal, setMunModal] = useState<
    { id_municipio: number; nombre: string }[]
  >([]);

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

  // Cerrar dropdown al hacer click fuera
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

  // ── Carga de repartidores ────────────────────────────────────────────────────
  const cargarRepartidores = async () => {
    try {
      const data = await VentaService.obtenerRepartidores();
      setListaRepartidores(Array.isArray(data) ? data : []);
    } catch {
      console.error("No se pudieron cargar repartidores");
    }
  };

  // ── Búsqueda de productos ────────────────────────────────────────────────────
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

  // ── Lógica de cliente (nuevo diseño) ─────────────────────────────────────────

  // Autocomplete con debounce
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
    // Si había texto buscado, prellenar el NIT o nombre
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
      // El backend crea el cliente dentro de crearOrdenVenta si viene cliente_nuevo
      // Aquí solo lo guardamos en el estado local como "seleccionado"
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

  // ── Totales ──────────────────────────────────────────────────────────────────
  const subtotalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);
  const descuentoMonto = subtotalCarrito * (descuentoPorcentaje / 100);
  const totalVentaConIva = subtotalCarrito - descuentoMonto;

  // ── Procesar orden ───────────────────────────────────────────────────────────
  const procesarOrden = async () => {
    if (!usuarioSesion) {
      alert("No se detectó una sesión activa.");
      return;
    }

    // Determinar NIT y cliente_nuevo según modo
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
      direccion_entrega: esDomicilio
        ? clienteSeleccionado?.direccion || null
        : null,
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
      alert(`Orden enviada exitosamente.\nEstado: ${mensajeEstado}`);

      // Reset
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
    } catch (error: any) {
      alert(`Error al procesar: ${error.message}`);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      {/* ═══════════════════════════════════════════════════════════════════════
          PANEL IZQUIERDO — Catálogo (sin cambios)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className={styles.panel}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
            Catálogo de Repuestos
          </h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className={styles.btnAction}
              style={{
                margin: 0,
                padding: "0.4rem 1rem",
                background:
                  tipoBusqueda === "texto" ? "var(--primary-blue)" : "#ccc",
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
                  tipoBusqueda === "vehiculo" ? "var(--primary-blue)" : "#ccc",
              }}
              onClick={() => setTipoBusqueda("vehiculo")}
            >
              Por Vehículo
            </button>
          </div>
        </div>

        {/* Buscador texto */}
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
            <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
              <button
                className={styles.btnAction}
                style={{ marginTop: 0 }}
                onClick={buscarProductoTexto}
              >
                Buscar
              </button>
            </div>
          </div>
        )}

        {/* Buscador vehículo */}
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
            <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
              <button
                className={styles.btnAction}
                style={{ marginTop: 0 }}
                onClick={buscarPorVehiculo}
                disabled={!busquedaVehiculo.id_modelo}
              >
                Buscar Repuestos
              </button>
            </div>
          </div>
        )}

        {/* Tabla resultados */}
        {resultadosProducto.length > 0 && (
          <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Stock Local</th>
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
                    <td>
                      {p.is_reacondicionado && (
                        <span className={styles.badgeReacTable}>REAC</span>
                      )}
                      {p.nombre}
                      {p.stock_otras_sucursales &&
                        p.stock_otras_sucursales.length > 0 && (
                          <details style={{ marginTop: "4px" }}>
                            <summary
                              style={{
                                fontSize: "0.75rem",
                                color: "#6b7280",
                                cursor: "pointer",
                              }}
                            >
                              Stock otras sucursales (
                              {p.stock_otras_sucursales.reduce(
                                (a, b) => a + b.cantidad,
                                0,
                              )}{" "}
                              und)
                            </summary>
                            <div
                              style={{
                                paddingLeft: "0.5rem",
                                marginTop: "4px",
                              }}
                            >
                              {p.stock_otras_sucursales.map((otra, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: "0.75rem",
                                    borderBottom:
                                      i < p.stock_otras_sucursales!.length - 1
                                        ? "1px solid #e2e8f0"
                                        : "none",
                                    padding: "2px 0",
                                  }}
                                >
                                  <span>{otra.sucursal}</span>
                                  <strong style={{ marginLeft: "12px" }}>
                                    {otra.cantidad} und
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                    </td>
                    <td>Q {p.precio_venta.toFixed(2)}</td>
                    <td style={{ color: p.stock_local > 0 ? "green" : "red" }}>
                      {p.stock_local}
                    </td>
                    <td>
                      <button
                        className={styles.btnAction}
                        style={{
                          padding: "0.4rem 0.8rem",
                          marginTop: 0,
                          backgroundColor: p.is_reacondicionado
                            ? "#d97706"
                            : "var(--primary-blue)",
                        }}
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

        {/* Carrito */}
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
                    {item.es_reacondicionado && (
                      <span
                        className={styles.badgeReacTable}
                        style={{ marginRight: "0.5rem" }}
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
                  <td style={{ fontWeight: "bold" }}>
                    Q {item.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Descuento y totales */}
        <div className={styles.totalBox}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "1rem",
              marginBottom: "0.75rem",
            }}
          >
            <label
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "var(--primary-blue)",
              }}
            >
              Descuento %
            </label>
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
              style={{
                width: "70px",
                padding: "0.35rem 0.5rem",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                textAlign: "center",
              }}
            />
          </div>
          {descuentoPorcentaje > 0 && (
            <div
              style={{
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

      {/* ═══════════════════════════════════════════════════════════════════════
          PANEL DERECHO — Cliente y Logística (REDISEÑADO)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className={styles.panel}>
        <h2 className={styles.sectionTitle}>Cliente</h2>

        {/* ── Selector CF / Cliente registrado ─────────────────────────── */}
        {(modoCliente === "cf" || modoCliente === "buscando") && (
          <div className={styles.tipoClienteSelector}>
            <button
              className={`${styles.tipoClienteBtn} ${modoCliente === "cf" ? styles.tipoClienteBtnActivo : ""}`}
              onClick={cambiarAConsumidorFinal}
            >
              Consumidor Final
              <br />
              <span style={{ fontSize: "0.72rem", fontWeight: 400 }}>
                Sin NIT (CF)
              </span>
            </button>
            <button
              className={`${styles.tipoClienteBtn} ${modoCliente === "buscando" ? styles.tipoClienteBtnActivo : ""}`}
              onClick={iniciarBusquedaCliente}
            >
              Cliente registrado
              <br />
              <span style={{ fontSize: "0.72rem", fontWeight: 400 }}>
                Buscar por NIT, nombre o tel.
              </span>
            </button>
          </div>
        )}

        {/* ── Buscador con autocomplete ─────────────────────────────────── */}
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

            {/* Dropdown de sugerencias */}
            {(sugerencias.length > 0 ||
              (termBusqCliente.length >= 2 && !buscandoCliente)) && (
              <div className={styles.autocompleteDropdown}>
                {sugerencias.length === 0 ? (
                  <div className={styles.autocompleteSinResultados}>
                    No encontrado —{" "}
                    <button
                      onClick={abrirModalNuevoCliente}
                      style={{
                        color: "var(--primary-blue)",
                        fontWeight: 700,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
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
                      className={styles.autocompleteItem}
                      onClick={abrirModalNuevoCliente}
                      style={{
                        borderTop: "1px solid #e5e7eb",
                        color: "var(--primary-blue)",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                      }}
                    >
                      + Registrar cliente nuevo
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tarjeta de cliente seleccionado ──────────────────────────── */}
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
                  <span
                    style={{
                      color: "#d97706",
                      fontWeight: 600,
                      fontSize: "0.72rem",
                    }}
                  >
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

        {/* ── Sección de Entrega ────────────────────────────────────────── */}
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
                  value={clienteSeleccionado?.direccion || ""}
                  onChange={(e) =>
                    setClienteSeleccionado((prev) =>
                      prev
                        ? { ...prev, direccion: e.target.value }
                        : {
                            nombre_razon_social: "Consumidor Final",
                            nit: "CF",
                            tipo_cliente: "particular",
                            telefono: null,
                            email: null,
                            direccion: e.target.value,
                            id_municipio: null,
                            notas_internas: null,
                          },
                    )
                  }
                  placeholder="Dirección exacta, referencias..."
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
                  marginTop: "0.5rem",
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
                  El cliente pagará al recibir (Contra Entrega)
                </label>
              </div>
            </>
          )}
        </div>

        {/* ── Botón confirmar ───────────────────────────────────────────── */}
        <button
          className={styles.btnAction}
          onClick={procesarOrden}
          disabled={
            carrito.length === 0 ||
            modoCliente === "buscando" ||
            modoCliente === "nuevo" ||
            (esDomicilio &&
              (!clienteSeleccionado?.direccion ||
                !idRepartidor ||
                !nombreContacto ||
                !telefonoContacto))
          }
        >
          Generar Orden de Venta
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL — Registrar cliente nuevo
         ═══════════════════════════════════════════════════════════════════════ */}
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
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}>
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
    </div>
  );
}
