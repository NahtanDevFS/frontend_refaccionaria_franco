"use client";

import { useEffect, useState } from "react";
import { BodegaService } from "@/services/bodega.service";
import { InventarioService } from "@/services/inventario.service";
import { InventarioBodega, RecepcionPendiente } from "@/types/bodega.types";
import { GarantiaService } from "@/services/garantia.service";
import styles from "./Bodega.module.css";

const SUCURSALES = [
  { id: 1, nombre: "Sucursal Chiquimula Principal" },
  { id: 2, nombre: "Sede Central - Puerto Barrios" },
  { id: 3, nombre: "Sucursal Guatemala Central" },
  { id: 4, nombre: "Sucursal Quetzaltenango" },
  { id: 5, nombre: "Sucursal Zacapa" },
  { id: 6, nombre: "Sucursal Escuintla" },
  { id: 7, nombre: "Sucursal Suchitepéquez" },
];

export default function BodegaPage() {
  const [tabActual, setTabActual] = useState<
    "stock" | "emitir" | "recibir" | "ajustes" | "reacondicionados"
  >("stock");
  const [reacondicionados, setReacondicionados] = useState<any[]>([]);
  const [cargandoReac, setCargandoReac] = useState(false);
  const [cargando, setCargando] = useState(false);

  // --- TAB 1: Stock local ---
  const [inventario, setInventario] = useState<InventarioBodega[]>([]);
  const [categorias, setCategorias] = useState<
    { id_categoria: number; nombre: string }[]
  >([]);
  const [marcasRepuesto, setMarcasRepuesto] = useState<
    { id_marca: number; nombre: string }[]
  >([]);
  const [marcasVehiculo, setMarcasVehiculo] = useState<
    { id_marca_vehiculo: number; nombre: string }[]
  >([]);
  const [modelosVehiculo, setModelosVehiculo] = useState<
    { id_modelo: number; nombre: string }[]
  >([]);

  const [filtroTermino, setFiltroTermino] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroMarcaRepuesto, setFiltroMarcaRepuesto] = useState("");
  const [busquedaVehiculo, setBusquedaVehiculo] = useState({
    id_marca: "",
    id_modelo: "",
  });

  // --- TAB 2: Emitir Despacho ---
  const [idSucursalDestino, setIdSucursalDestino] = useState("");
  const [busquedaTraslado, setBusquedaTraslado] = useState("");
  const [resultadosTraslado, setResultadosTraslado] = useState<
    InventarioBodega[]
  >([]);
  const [cargandoTraslado, setCargandoTraslado] = useState(false);
  const [prodSelectTraslado, setProdSelectTraslado] =
    useState<InventarioBodega | null>(null);
  const [cantSelectTraslado, setCantSelectTraslado] = useState(1);
  const [detallesDespacho, setDetallesDespacho] = useState<
    { producto: InventarioBodega; cantidad: number }[]
  >([]);

  // --- TAB 3: Recepciones ---
  const [recepciones, setRecepciones] = useState<RecepcionPendiente[]>([]);

  // --- TAB 4: Ajustes (Mermas) ---
  const [busquedaAjuste, setBusquedaAjuste] = useState("");
  const [resultadosAjuste, setResultadosAjuste] = useState<InventarioBodega[]>(
    [],
  );
  const [cargandoAjuste, setCargandoAjuste] = useState(false);
  const [prodSelectAjuste, setProdSelectAjuste] =
    useState<InventarioBodega | null>(null);
  const [datosAjuste, setDatosAjuste] = useState({
    tipo: "ajuste_negativo",
    cantidad: 1,
    motivo: "",
  });

  // --- Modales ---
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
  const [productoDetalle, setProductoDetalle] =
    useState<InventarioBodega | null>(null);
  const [modalCompatAbierto, setModalCompatAbierto] = useState(false);
  const [productoCompatSelect, setProductoCompatSelect] =
    useState<InventarioBodega | null>(null);

  useEffect(() => {
    cargarInventario();
    InventarioService.obtenerCategorias()
      .then(setCategorias)
      .catch(console.error);
    InventarioService.obtenerMarcasRepuesto()
      .then(setMarcasRepuesto)
      .catch(console.error);
    InventarioService.obtenerMarcasVehiculo()
      .then(setMarcasVehiculo)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (tabActual === "recibir") cargarRecepciones();
    if (tabActual === "reacondicionados") cargarReacondicionados();
  }, [tabActual]);

  const cargarReacondicionados = async () => {
    try {
      setCargandoReac(true);
      const userString = localStorage.getItem("usuario");
      if (!userString) return;
      const { id_sucursal } = JSON.parse(userString);
      const res =
        await GarantiaService.obtenerReacondicionadosDisponibles(id_sucursal);
      setReacondicionados(Array.isArray(res) ? res : (res.data ?? []));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargandoReac(false);
    }
  };

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
  }, [busquedaVehiculo.id_marca]);

  // --- LÓGICA STOCK ---
  const cargarInventario = async (filtros?: any) => {
    try {
      setCargando(true);
      const data = await BodegaService.obtenerInventario(filtros);
      setInventario(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargando(false);
    }
  };

  const aplicarFiltros = () => {
    cargarInventario({
      termino: filtroTermino,
      id_categoria: filtroCategoria,
      id_marca: filtroMarcaRepuesto,
      id_modelo_vehiculo: busquedaVehiculo.id_modelo,
    });
  };

  const limpiarFiltros = () => {
    setFiltroTermino("");
    setFiltroCategoria("");
    setFiltroMarcaRepuesto("");
    setBusquedaVehiculo({ id_marca: "", id_modelo: "" });
    cargarInventario();
  };

  // --- LÓGICA TRASLADOS ---
  const buscarParaTraslado = async () => {
    if (!busquedaTraslado.trim()) return alert("Ingrese un SKU o Nombre.");
    try {
      setCargandoTraslado(true);
      const data = await BodegaService.obtenerInventario({
        termino: busquedaTraslado,
      });
      setResultadosTraslado(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargandoTraslado(false);
    }
  };

  const seleccionarParaTraslado = (p: InventarioBodega) => {
    if (p.cantidad_actual <= 0) return alert("No hay stock disponible.");
    setProdSelectTraslado(p);
    setCantSelectTraslado(1);
    setResultadosTraslado([]);
    setBusquedaTraslado("");
  };

  const agregarAlDespacho = () => {
    if (!prodSelectTraslado) return;
    const index = detallesDespacho.findIndex(
      (d) => d.producto.id_producto === prodSelectTraslado.id_producto,
    );

    if (index >= 0) {
      const nuevaCant = detallesDespacho[index].cantidad + cantSelectTraslado;
      if (nuevaCant > prodSelectTraslado.cantidad_actual)
        return alert("Supera el stock disponible.");
      const nuevos = [...detallesDespacho];
      nuevos[index].cantidad = nuevaCant;
      setDetallesDespacho(nuevos);
    } else {
      if (cantSelectTraslado > prodSelectTraslado.cantidad_actual)
        return alert("Supera el stock.");
      setDetallesDespacho([
        ...detallesDespacho,
        { producto: prodSelectTraslado, cantidad: cantSelectTraslado },
      ]);
    }
    setProdSelectTraslado(null);
  };

  const procesarEmision = async () => {
    if (!idSucursalDestino || detallesDespacho.length === 0)
      return alert("Datos incompletos.");
    try {
      await BodegaService.emitirDespacho({
        id_sucursal_destino: Number(idSucursalDestino),
        detalles: detallesDespacho.map((d) => ({
          id_producto: d.producto.id_producto,
          cantidad: d.cantidad,
        })),
      });
      alert("Traslado emitido.");
      setDetallesDespacho([]);
      cargarInventario();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- LÓGICA RECEPCIONES ---
  const cargarRecepciones = async () => {
    try {
      setCargando(true);
      const data = await BodegaService.obtenerRecepciones();
      setRecepciones(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargando(false);
    }
  };

  const confirmarLlegada = async (id: number) => {
    if (!confirm("¿Confirma la recepción física?")) return;
    try {
      await BodegaService.confirmarRecepcion(id);
      alert("Inventario actualizado.");
      cargarRecepciones();
      cargarInventario();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- LÓGICA AJUSTES ---
  const buscarParaAjuste = async () => {
    if (!busquedaAjuste.trim())
      return alert("Ingrese un SKU o Nombre para buscar.");
    try {
      setCargandoAjuste(true);
      const data = await BodegaService.obtenerInventario({
        termino: busquedaAjuste,
      });
      setResultadosAjuste(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargandoAjuste(false);
    }
  };

  const seleccionarParaAjuste = (p: InventarioBodega) => {
    setProdSelectAjuste(p);
    setResultadosAjuste([]);
    setBusquedaAjuste("");
    setDatosAjuste({ ...datosAjuste, cantidad: 1 });
  };

  const cancelarAjuste = () => {
    setProdSelectAjuste(null);
    setDatosAjuste({ tipo: "ajuste_negativo", cantidad: 1, motivo: "" });
  };

  const procesarAjuste = async () => {
    if (!prodSelectAjuste || !datosAjuste.motivo || datosAjuste.cantidad < 1) {
      return alert("Complete todos los campos obligatorios.");
    }
    if (
      datosAjuste.tipo === "ajuste_negativo" &&
      datosAjuste.cantidad > prodSelectAjuste.cantidad_actual
    ) {
      return alert(
        "No puede realizar un ajuste negativo mayor al stock actual.",
      );
    }

    try {
      await BodegaService.ajustarInventario({
        id_producto: prodSelectAjuste.id_producto,
        tipo: datosAjuste.tipo as any,
        cantidad: Number(datosAjuste.cantidad),
        motivo: datosAjuste.motivo,
      });
      alert("Ajuste registrado exitosamente.");
      cancelarAjuste();
      cargarInventario();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Panel de Bodega e Inventario</h1>

      <div className={styles.tabs}>
        {["stock", "emitir", "recibir", "ajustes", "reacondicionados"].map(
          (t) => (
            <button
              key={t}
              className={`${styles.tabBtn} ${tabActual === t ? styles.tabActive : ""}`}
              onClick={() => setTabActual(t as any)}
            >
              {t === "stock" && "Stock y Alertas"}
              {t === "emitir" && "Emitir Traslado"}
              {t === "recibir" && "Recibir Traslado"}
              {t === "ajustes" && "Ajustes de bodega"}
              {t === "reacondicionados" && "Reacondicionados"}
            </button>
          ),
        )}
      </div>

      {/* TAB 1: STOCK */}
      {tabActual === "stock" && (
        <div className={styles.card}>
          <div className={styles.filterSection}>
            <h3 className={styles.sectionTitle}>Filtros de Búsqueda</h3>
            <div className={styles.filterGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Buscar por Nombre o SKU</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Ej. FRIC-001..."
                  value={filtroTermino}
                  onChange={(e) => setFiltroTermino(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && aplicarFiltros()}
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
                  value={filtroMarcaRepuesto}
                  onChange={(e) => setFiltroMarcaRepuesto(e.target.value)}
                >
                  <option value="">Todas</option>
                  {marcasRepuesto.map((m) => (
                    <option key={m.id_marca} value={m.id_marca}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Vehículo (Marca)</label>
                <select
                  className={styles.select}
                  value={busquedaVehiculo.id_marca}
                  onChange={(e) =>
                    setBusquedaVehiculo({
                      ...busquedaVehiculo,
                      id_marca: e.target.value,
                      id_modelo: "",
                    })
                  }
                >
                  <option value="">Seleccione...</option>
                  {marcasVehiculo.map((m) => (
                    <option
                      key={m.id_marca_vehiculo}
                      value={m.id_marca_vehiculo}
                    >
                      {m.nombre.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Vehículo (Modelo)</label>
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
                  <option value="">Todos...</option>
                  {modelosVehiculo.map((m) => (
                    <option key={m.id_modelo} value={m.id_modelo}>
                      {m.nombre.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.filterActions}>
              <button className={styles.btnSecondary} onClick={limpiarFiltros}>
                Limpiar
              </button>
              <button className={styles.btnPrimary} onClick={aplicarFiltros}>
                Buscar
              </button>
            </div>
          </div>

          {cargando ? (
            <p className={styles.textMuted}>Cargando información...</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Marca</th>
                    <th>Costo</th>
                    <th>Venta</th>
                    <th>Stock</th>
                    <th>Estado</th>
                    <th>Compat.</th>
                    <th>Otros</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.map((item) => (
                    <tr
                      key={item.id_inventario}
                      className={item.requiere_reorden ? styles.rowAlert : ""}
                    >
                      <td>{item.sku}</td>
                      <td>{item.nombre}</td>
                      <td>
                        <span className={styles.textMuted}>
                          {item.categoria || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className={styles.textMuted}>
                          {item.marca_repuesto || "Genérica"}
                        </span>
                      </td>
                      <td className={styles.textMuted}>
                        Q {item.costo.toFixed(2)}
                      </td>
                      <td className={styles.textSuccess}>
                        Q {item.precio_venta.toFixed(2)}
                      </td>
                      <td className={styles.textBold}>
                        {item.cantidad_actual}
                      </td>
                      <td>
                        {item.requiere_reorden ? (
                          <span className={styles.badgeWarning}>Reorden</span>
                        ) : (
                          <span className={styles.badgeOk}>Suficiente</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={styles.btnSelectMini}
                          onClick={() => {
                            setProductoCompatSelect(item);
                            setModalCompatAbierto(true);
                          }}
                        >
                          Ver
                        </button>
                      </td>
                      <td>
                        {item.stock_otras_sucursales} und{" "}
                        {item.stock_otras_sucursales > 0 && (
                          <button
                            className={styles.btnSelectMini}
                            onClick={() => {
                              setProductoDetalle(item);
                              setModalDetalleAbierto(true);
                            }}
                          >
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EMITIR TRASLADO */}
      {tabActual === "emitir" && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>
            Enviar Producto a Otra Sucursal
          </h2>

          <div className={`${styles.formGroup} ${styles.formGroupMax}`}>
            <label className={styles.label}>
              1. Seleccione la Sucursal Destino:
            </label>
            <select
              className={styles.select}
              value={idSucursalDestino}
              onChange={(e) => setIdSucursalDestino(e.target.value)}
            >
              <option value="">Seleccione...</option>
              {SUCURSALES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.divider}>
            <label className={styles.label}>
              2. Busque y agregue los productos:
            </label>

            {!prodSelectTraslado && (
              <div className={styles.searchBar}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="SKU o Nombre..."
                  value={busquedaTraslado}
                  onChange={(e) => setBusquedaTraslado(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscarParaTraslado()}
                />
                <button
                  className={styles.btnSecondary}
                  onClick={buscarParaTraslado}
                  disabled={cargandoTraslado}
                >
                  Buscar
                </button>
              </div>
            )}

            {resultadosTraslado.length > 0 && !prodSelectTraslado && (
              <div className={styles.searchResultContainer}>
                <table className={styles.searchResultTable}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Stock</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosTraslado.map((p) => (
                      <tr key={p.id_producto}>
                        <td>{p.sku}</td>
                        <td>{p.nombre}</td>
                        <td
                          className={styles.textBold}
                          style={{
                            color:
                              p.cantidad_actual === 0 ? "#dc2626" : "#059669",
                          }}
                        >
                          {p.cantidad_actual}
                        </td>
                        <td>
                          <button
                            className={styles.btnSelectMini}
                            onClick={() => seleccionarParaTraslado(p)}
                            disabled={p.cantidad_actual <= 0}
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {prodSelectTraslado && (
              <div className={styles.selectedProductBox}>
                <div className={styles.selectedProductHeader}>
                  <h3 className={styles.selectedProductTitle}>
                    Añadiendo: {prodSelectTraslado.nombre}
                  </h3>
                  <button
                    className={styles.btnRemove}
                    onClick={() => setProdSelectTraslado(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className={styles.selectedProductActions}>
                  <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                    <label className={styles.label}>Cantidad:</label>
                    <input
                      type="number"
                      min={1}
                      max={prodSelectTraslado.cantidad_actual}
                      className={`${styles.input} ${styles.inputSmall}`}
                      value={cantSelectTraslado}
                      onChange={(e) =>
                        setCantSelectTraslado(Number(e.target.value))
                      }
                    />
                  </div>
                  <button
                    className={styles.btnPrimary}
                    onClick={agregarAlDespacho}
                  >
                    + Agregar a la caja
                  </button>
                </div>
              </div>
            )}
          </div>

          {detallesDespacho.length > 0 && (
            <div className={styles.divider}>
              <div className={styles.tableContainer}>
                <table className={styles.cartTable}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Descripción</th>
                      <th>Cantidad</th>
                      <th>Quitar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detallesDespacho.map((d, i) => (
                      <tr key={i}>
                        <td>{d.producto.sku}</td>
                        <td>{d.producto.nombre}</td>
                        <td className={styles.textBold}>{d.cantidad}</td>
                        <td>
                          <button
                            className={styles.btnRemove}
                            onClick={() =>
                              setDetallesDespacho(
                                detallesDespacho.filter(
                                  (x) =>
                                    x.producto.id_producto !==
                                    d.producto.id_producto,
                                ),
                              )
                            }
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.flexEnd}>
                <button className={styles.btnPrimary} onClick={procesarEmision}>
                  Emitir Despacho de Traslado
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECIBIR TRASLADO */}
      {tabActual === "recibir" && !cargando && (
        <div>
          {recepciones.length === 0 ? (
            <div className={`${styles.card} ${styles.emptyState}`}>
              No hay envíos en tránsito.
            </div>
          ) : (
            recepciones.map((rec) => (
              <div key={rec.id_despacho} className={styles.card}>
                <div className={styles.recepcionHeader}>
                  <h3 className={styles.recepcionTitle}>
                    Despacho #{rec.id_despacho}
                  </h3>
                  <span className={styles.textMuted}>
                    {new Date(rec.fecha_emision).toLocaleDateString()}
                  </span>
                </div>
                <p>
                  <strong>Viene de:</strong> {rec.origen}
                </p>
                <div className={styles.recepcionBox}>
                  <strong>Contenido esperado:</strong>
                  <ul className={styles.recepcionList}>
                    {rec.productos.map((p, i) => (
                      <li key={i}>
                        {p.producto}{" "}
                        <span className={styles.textMuted}>(SKU: {p.sku})</span>{" "}
                        -{" "}
                        <strong className={styles.textBold}>
                          x{p.cantidad}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className={styles.btnSuccess}
                  style={{ marginTop: "1rem" }}
                  onClick={() => confirmarLlegada(rec.id_despacho)}
                >
                  ✓ Confirmar Recepción Física
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: AJUSTES */}
      {tabActual === "ajustes" && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>
            Ajuste Manual de Inventario (Mermas)
          </h2>

          <div style={{ marginBottom: "1.5rem" }}>
            <label className={styles.label}>
              1. Busque el producto a ajustar:
            </label>

            {!prodSelectAjuste && (
              <div className={styles.searchBar}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="SKU o Nombre..."
                  value={busquedaAjuste}
                  onChange={(e) => setBusquedaAjuste(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscarParaAjuste()}
                />
                <button
                  className={styles.btnSecondary}
                  onClick={buscarParaAjuste}
                  disabled={cargandoAjuste}
                >
                  Buscar
                </button>
              </div>
            )}

            {resultadosAjuste.length > 0 && !prodSelectAjuste && (
              <div className={styles.searchResultContainer}>
                <table className={styles.searchResultTable}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Stock Local</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadosAjuste.map((p) => (
                      <tr key={p.id_producto}>
                        <td>{p.sku}</td>
                        <td>{p.nombre}</td>
                        <td className={styles.textBold}>{p.cantidad_actual}</td>
                        <td>
                          <button
                            className={styles.btnSelectMini}
                            onClick={() => seleccionarParaAjuste(p)}
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {prodSelectAjuste && (
            <div
              className={`${styles.selectedProductBox} ${styles.selectedProductDanger}`}
            >
              <div className={styles.selectedProductHeader}>
                <h3 className={styles.selectedProductTitle}>
                  Modificando: {prodSelectAjuste.nombre}
                </h3>
                <button className={styles.btnRemove} onClick={cancelarAjuste}>
                  Cancelar
                </button>
              </div>
              <p className={styles.textMuted}>
                SKU:{" "}
                <strong className={styles.textBold}>
                  {prodSelectAjuste.sku}
                </strong>{" "}
                | Stock actual en bodega:{" "}
                <strong className={styles.textBold}>
                  {prodSelectAjuste.cantidad_actual}
                </strong>
              </p>

              <div className={styles.grid2} style={{ marginTop: "1.5rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tipo de Ajuste:</label>
                  <select
                    className={styles.select}
                    value={datosAjuste.tipo}
                    onChange={(e) =>
                      setDatosAjuste({ ...datosAjuste, tipo: e.target.value })
                    }
                  >
                    <option value="ajuste_negativo">
                      Resta (Merma, dañado, robo)
                    </option>
                    <option value="ajuste_positivo">
                      Suma (Sobrante encontrado)
                    </option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Cantidad:</label>
                  <input
                    type="number"
                    min={1}
                    max={
                      datosAjuste.tipo === "ajuste_negativo"
                        ? prodSelectAjuste.cantidad_actual
                        : 9999
                    }
                    className={styles.input}
                    value={datosAjuste.cantidad}
                    onChange={(e) =>
                      setDatosAjuste({
                        ...datosAjuste,
                        cantidad: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Motivo / Justificación (Obligatorio):
                </label>
                <textarea
                  rows={3}
                  className={styles.input}
                  placeholder="Escriba el motivo del ajuste..."
                  value={datosAjuste.motivo}
                  onChange={(e) =>
                    setDatosAjuste({ ...datosAjuste, motivo: e.target.value })
                  }
                />
              </div>

              <div className={styles.flexEnd}>
                <button
                  className={`${styles.btnPrimary} ${styles.btnDanger}`}
                  onClick={procesarAjuste}
                >
                  Registrar Ajuste en Bitácora
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: REACONDICIONADOS */}
      {tabActual === "reacondicionados" && (
        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>
            Inventario de Productos Reacondicionados
          </h2>
          <p className={styles.textMuted} style={{ marginBottom: "1.5rem" }}>
            Piezas recuperadas de garantías, inspeccionadas y disponibles para
            venta como "segunda". El precio ya fue calculado al 50% del valor
            original.
          </p>

          {cargandoReac ? (
            <p className={styles.textMuted}>Cargando...</p>
          ) : reacondicionados.length === 0 ? (
            <div className={styles.emptyState}>
              No hay productos reacondicionados disponibles en esta sucursal.
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lote #</th>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Unidades</th>
                    <th>Precio Segunda</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reacondicionados.map((r) => (
                    <tr key={r.id_producto_reacondicionado}>
                      <td className={styles.textMuted}>
                        #{r.id_producto_reacondicionado}
                      </td>
                      <td className={styles.textBold}>{r.sku}</td>
                      <td>{r.nombre}</td>
                      <td className={styles.textBold}>{Number(r.cantidad)}</td>
                      <td className={styles.textSuccess}>
                        Q {Number(r.precio_venta_reac).toFixed(2)}
                        <span
                          className={styles.textMuted}
                          style={{ fontSize: "0.75rem", marginLeft: "0.5rem" }}
                        >
                          (segunda)
                        </span>
                      </td>
                      <td>
                        <span className={styles.badgeAvailable}>
                          Disponible
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DETALLE COMPATIBILIDAD VEHÍCULOS */}
      {modalCompatAbierto && productoCompatSelect && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Vehículos Compatibles</h2>
            <p>
              <strong className={styles.textBold}>Producto:</strong>{" "}
              {productoCompatSelect.nombre}{" "}
              <span className={styles.textMuted}>
                ({productoCompatSelect.sku})
              </span>
            </p>
            <div className={styles.compatBox}>
              {productoCompatSelect.compatibilidades.length === 0 ? (
                <p style={{ textAlign: "center", margin: 0 }}>
                  Sin información.
                </p>
              ) : productoCompatSelect.compatibilidades.some(
                  (c) => c.es_universal,
                ) ? (
                <div className={styles.compatUniversal}>🌐 Pieza Universal</div>
              ) : (
                <ul className={styles.compatList}>
                  {productoCompatSelect.compatibilidades.map((comp, idx) => (
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
                onClick={() => setModalCompatAbierto(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE OTRAS SUCURSALES */}
      {modalDetalleAbierto && productoDetalle && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Disponibilidad por Sucursal</h2>
            <p>
              <strong className={styles.textBold}>Producto:</strong>{" "}
              {productoDetalle.nombre}
            </p>
            <ul className={styles.listDetalle}>
              {productoDetalle.detalle_otras_sucursales.map((det, i) => (
                <li key={i}>
                  <span>{det.sucursal}</span>
                  <strong className={styles.textBold}>
                    {det.cantidad} und
                  </strong>
                </li>
              ))}
            </ul>
            <div className={styles.modalActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => setModalDetalleAbierto(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
