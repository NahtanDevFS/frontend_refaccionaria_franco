"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./Inicio.module.css";
import {
  RendimientoEmpleado,
  ConsolidadoSucursal,
  VendedorParaMeta,
  SugerenciaMeta,
  HistorialMeta,
  SucursalOpcion,
} from "@/types/meta.types";
import { MetaService } from "@/services/meta.service";

type Tab = "rendimiento" | "asignar" | "historial";

interface Usuario {
  id_empleado: number;
  id_sucursal: number;
  rol: string;
}

const NOMBRES_MES = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function InicioPage() {
  // Sesión
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  // Tabs
  const [tabActual, setTabActual] = useState<Tab>("rendimiento");

  // Selector de sucursal
  const [sucursales, setSucursales] = useState<SucursalOpcion[]>([]);
  const [sucursalFiltro, setSucursalFiltro] = useState<number | "">("");

  // Tab Rendimiento
  const [rendimientos, setRendimientos] = useState<RendimientoEmpleado[]>([]);
  const [consolidado, setConsolidado] = useState<ConsolidadoSucursal | null>(
    null,
  );
  const [loadingRend, setLoadingRend] = useState(true);
  const [errorRend, setErrorRend] = useState("");

  // Tab Asignar
  const hoy = new Date();
  const [anioMeta, setAnioMeta] = useState<number>(hoy.getFullYear());
  const [mesMeta, setMesMeta] = useState<number>(hoy.getMonth() + 1);
  const [vendedores, setVendedores] = useState<VendedorParaMeta[]>([]);
  const [vendedorSel, setVendedorSel] = useState<VendedorParaMeta | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [sugerencia, setSugerencia] = useState<SugerenciaMeta | null>(null);
  const [montoMeta, setMontoMeta] = useState<string>("");
  const [comisionBase, setComisionBase] = useState<string>("2");
  const [comisionExc, setComisionExc] = useState<string>("4");
  const [loadingAsig, setLoadingAsig] = useState(false);
  const [msgExito, setMsgExito] = useState("");
  const [msgError, setMsgError] = useState("");

  // Tab Historial
  const [empleadoHist, setEmpleadoHist] = useState<number | "">("");
  const [historial, setHistorial] = useState<HistorialMeta[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // Carga inicial
  useEffect(() => {
    const userString = localStorage.getItem("usuario");
    if (userString) {
      const u = JSON.parse(userString) as Usuario;
      setUsuario(u);
    }
  }, []);

  // Cargar sucursales si es Admin/Gerente
  useEffect(() => {
    if (!usuario) return;
    if (esRolGlobal(usuario.rol)) {
      MetaService.obtenerSucursales()
        .then(setSucursales)
        .catch((e) => console.error("Error cargando sucursales:", e));
    }
  }, [usuario]);

  // Cargar rendimiento + consolidado cada vez que cambia la sucursal o entramos al tab
  const cargarRendimiento = useCallback(async () => {
    if (!usuario) return;
    setLoadingRend(true);
    setErrorRend("");
    try {
      const idSuc = esRolGlobal(usuario.rol)
        ? sucursalFiltro === ""
          ? undefined
          : Number(sucursalFiltro)
        : usuario.id_sucursal;
      const [rend, cons] = await Promise.all([
        MetaService.obtenerRendimientoMensual(idSuc),
        MetaService.obtenerConsolidado(idSuc),
      ]);
      setRendimientos(rend);
      setConsolidado(cons);
    } catch (err: any) {
      setErrorRend(err.message);
    } finally {
      setLoadingRend(false);
    }
  }, [usuario, sucursalFiltro]);

  useEffect(() => {
    if (tabActual === "rendimiento") cargarRendimiento();
  }, [tabActual, cargarRendimiento]);

  // Tab Asignar: cargar vendedores
  const cargarVendedores = useCallback(async () => {
    if (!usuario || !esRolGlobal(usuario.rol)) return;
    try {
      const idSuc = sucursalFiltro === "" ? undefined : Number(sucursalFiltro);
      const data = await MetaService.obtenerVendedores(
        anioMeta,
        mesMeta,
        idSuc,
      );
      setVendedores(data);
      setVendedorSel(null);
      setSugerencia(null);
      setMontoMeta("");

      setEmpleadoHist("");
      setHistorial([]);
    } catch (err: any) {
      setMsgError(err.message);
    }
  }, [usuario, sucursalFiltro, anioMeta, mesMeta]);

  //Tab Asignar: seleccionar vendedor y cargar sugerencia
  const seleccionarVendedor = async (v: VendedorParaMeta) => {
    setVendedorSel(v);
    setSugerencia(null);
    setMsgError("");
    setMsgExito("");

    if (v.ya_tiene_meta) {
      // Modo edición: precarga los valores actuales
      setModoEdicion(true);
      setMontoMeta(v.meta_actual?.toFixed(2) ?? "");
      setComisionBase(String(v.comision_base_pct_actual ?? 2));
      setComisionExc(String(v.comision_excedente_pct_actual ?? 4));
    } else {
      // Modo creación: carga sugerencia normalmente
      setModoEdicion(false);
      setMontoMeta("");
      setComisionBase("2");
      setComisionExc("4");
      try {
        const sug = await MetaService.obtenerSugerencia(v.id_empleado);
        setSugerencia(sug);
        if (sug.sugerencia !== null) {
          setMontoMeta(sug.sugerencia.toFixed(2));
        }
      } catch (err: any) {
        setMsgError(err.message);
      }
    }
  };

  //Tab Asignar enviar
  const guardarMeta = async () => {
    if (!vendedorSel) return;
    const monto = parseFloat(montoMeta);
    if (isNaN(monto) || monto <= 0) {
      setMsgError("El monto de la meta debe ser mayor a 0");
      return;
    }
    const base = parseFloat(comisionBase);
    const exc = parseFloat(comisionExc);
    if (isNaN(base) || base < 0 || base > 100) {
      setMsgError("Comisión base inválida");
      return;
    }
    if (isNaN(exc) || exc < 0 || exc > 100) {
      setMsgError("Comisión excedente inválida");
      return;
    }

    setLoadingAsig(true);
    setMsgError("");
    setMsgExito("");
    try {
      if (modoEdicion) {
        await MetaService.actualizarMeta(vendedorSel.id_empleado, {
          anio: anioMeta,
          mes: mesMeta,
          monto_meta: monto,
          comision_base_pct: base,
          comision_excedente_pct: exc,
        });
        setMsgExito(
          `Meta de ${vendedorSel.nombre} actualizada para ${NOMBRES_MES[mesMeta]}/${anioMeta}`,
        );
      } else {
        await MetaService.asignarMeta({
          id_empleado: vendedorSel.id_empleado,
          anio: anioMeta,
          mes: mesMeta,
          monto_meta: monto,
          comision_base_pct: base,
          comision_excedente_pct: exc,
        });
        setMsgExito(
          `Meta asignada a ${vendedorSel.nombre} para ${NOMBRES_MES[mesMeta]}/${anioMeta}`,
        );
      }
      setVendedorSel(null);
      setModoEdicion(false);
      setSugerencia(null);
      setMontoMeta("");
      cargarVendedores();
    } catch (err: any) {
      setMsgError(err.message);
    } finally {
      setLoadingAsig(false);
    }
  };

  // Tab Historial
  const cargarHistorial = useCallback(async (id_emp: number) => {
    setLoadingHist(true);
    try {
      const data = await MetaService.obtenerHistorial(id_emp);
      setHistorial(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHist(false);
    }
  }, []);

  // Efecto unificado para recargar vendedores al entrar a la tab o cambiar de sucursal
  useEffect(() => {
    if (tabActual === "asignar" || tabActual === "historial") {
      cargarVendedores();
    }
  }, [tabActual, cargarVendedores]);

  useEffect(() => {
    if (empleadoHist !== "") cargarHistorial(Number(empleadoHist));
  }, [empleadoHist, cargarHistorial]);

  if (!usuario) return null;

  const rolGlobal = esRolGlobal(usuario.rol);
  const esSupervisor = usuario.rol === "SUPERVISOR_SUCURSAL" || rolGlobal;
  const diaActual = new Date().getDate();

  // Filtramos los datos según el rol
  const datosMostrar = esSupervisor
    ? rendimientos
    : rendimientos.filter((r) => r.id_empleado === usuario.id_empleado);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Módulo de Metas</h1>
      </div>

      {/* Selector de sucursal — solo Admin/Gerente */}
      {rolGlobal && sucursales.length > 0 && (
        <div className={styles.sucursalSelector}>
          <label>Sucursal:</label>
          <select
            className={styles.select}
            value={sucursalFiltro}
            onChange={(e) =>
              setSucursalFiltro(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
          >
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => (
              <option key={s.id_sucursal} value={s.id_sucursal}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tabActual === "rendimiento" ? styles.tabActive : ""}`}
          onClick={() => setTabActual("rendimiento")}
        >
          Rendimiento
        </button>
        {rolGlobal && (
          <>
            <button
              className={`${styles.tab} ${tabActual === "asignar" ? styles.tabActive : ""}`}
              onClick={() => setTabActual("asignar")}
            >
              Asignar Meta
            </button>
            <button
              className={`${styles.tab} ${tabActual === "historial" ? styles.tabActive : ""}`}
              onClick={() => setTabActual("historial")}
            >
              Historial
            </button>
          </>
        )}
      </div>

      {/* TAB: RENDIMIENTO */}
      {tabActual === "rendimiento" && (
        <>
          {loadingRend ? (
            <div className={styles.loading}>Cargando rendimiento...</div>
          ) : errorRend ? (
            <div className={styles.error}>{errorRend}</div>
          ) : (
            <>
              {/* Consolidado solo si hay datos y el usuario tiene visión amplia */}
              {esSupervisor &&
                consolidado &&
                consolidado.empleados_con_meta > 0 && (
                  <div className={styles.consolidadoCard}>
                    <div className={styles.consolidadoTitle}>
                      Consolidado del mes —{" "}
                      {rolGlobal
                        ? sucursalFiltro === ""
                          ? "Todas las sucursales"
                          : sucursales.find(
                              (s) => s.id_sucursal === sucursalFiltro,
                            )?.nombre || "Sucursal"
                        : rendimientos[0]?.nombre_sucursal || "Mi Sucursal"}
                    </div>
                    <div className={styles.consolidadoStats}>
                      <div className={styles.consolidadoStat}>
                        <span className={styles.consolidadoStatLabel}>
                          Meta Total
                        </span>
                        <span className={styles.consolidadoStatValue}>
                          Q {consolidado.total_meta.toFixed(2)}
                        </span>
                      </div>
                      <div className={styles.consolidadoStat}>
                        <span className={styles.consolidadoStatLabel}>
                          Vendido
                        </span>
                        <span className={styles.consolidadoStatValue}>
                          Q {consolidado.total_vendido.toFixed(2)}
                        </span>
                      </div>
                      <div className={styles.consolidadoStat}>
                        <span className={styles.consolidadoStatLabel}>
                          Cumplimiento
                        </span>
                        <span className={styles.consolidadoStatValue}>
                          {consolidado.porcentaje_cumplimiento.toFixed(2)}%
                        </span>
                      </div>
                      <div className={styles.consolidadoStat}>
                        <span className={styles.consolidadoStatLabel}>
                          Vendedores
                        </span>
                        <span className={styles.consolidadoStatValue}>
                          {consolidado.empleados_con_meta}
                        </span>
                      </div>
                    </div>
                    <div className={styles.consolidadoProgress}>
                      <div
                        className={styles.consolidadoProgressBar}
                        style={{
                          width: `${Math.min(
                            consolidado.porcentaje_cumplimiento,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

              {datosMostrar.length === 0 ? (
                <div className={styles.emptyState}>
                  No se encontraron metas asignadas para este mes.
                </div>
              ) : (
                <div className={styles.grid}>
                  {datosMostrar.map((emp) => {
                    const requiereAlerta =
                      diaActual >= 20 && emp.porcentaje_cumplimiento < 60;
                    return (
                      <div key={emp.id_empleado} className={styles.card}>
                        <div className={styles.cardTitle}>
                          {emp.nombre_vendedor}
                        </div>
                        {esSupervisor && (
                          <div className={styles.cardSubtitle}>
                            {emp.nombre_sucursal}
                          </div>
                        )}

                        <div className={styles.statsRow}>
                          <span>
                            Vendido:{" "}
                            <strong>Q {emp.monto_vendido.toFixed(2)}</strong>
                          </span>
                          <span>
                            Meta: <strong>Q {emp.monto_meta.toFixed(2)}</strong>
                          </span>
                        </div>

                        <div className={styles.progressContainer}>
                          <div
                            className={styles.progressBar}
                            style={{
                              width: `${Math.min(emp.porcentaje_cumplimiento, 100)}%`,
                            }}
                          />
                        </div>

                        <div className={styles.progressText}>
                          {emp.porcentaje_cumplimiento.toFixed(2)}%
                        </div>

                        {requiereAlerta && esSupervisor && (
                          <div className={styles.alertBox}>
                            ATENCIÓN: Este empleado no lleva un buen rendimiento
                            para la fecha actual.
                          </div>
                        )}
                        {requiereAlerta && !esSupervisor && (
                          <div className={styles.alertBoxSoft}>
                            Recuerda: aún no alcanzas el 60% de tu meta y ya
                            estamos después del día 20. ¡Vamos por más!
                          </div>
                        )}
                        <div className={styles.comisionBox}>
                          <div className={styles.comisionTitle}>
                            Comisión del mes
                          </div>
                          <div className={styles.comisionRow}>
                            <span>Base ({emp.comision_base_pct}%):</span>
                            <strong>Q {emp.comision_base.toFixed(2)}</strong>
                          </div>
                          {emp.comision_excedente > 0 && (
                            <div className={styles.comisionRow}>
                              <span>
                                Excedente ({emp.comision_excedente_pct}%):
                              </span>
                              <strong>
                                Q {emp.comision_excedente.toFixed(2)}
                              </strong>
                            </div>
                          )}
                          <div className={styles.comisionTotal}>
                            <span>Total:</span>
                            <strong>Q {emp.comision_total.toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/*  TAB: ASIGNAR META  */}
      {tabActual === "asignar" && rolGlobal && (
        <div className={styles.formContainer}>
          {msgExito && <div className={styles.successMsg}>{msgExito}</div>}
          {msgError && <div className={styles.errorMsg}>{msgError}</div>}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Año</label>
              <select
                className={styles.input}
                value={anioMeta}
                onChange={(e) => setAnioMeta(Number(e.target.value))}
              >
                {[hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Mes</label>
              <select
                className={styles.input}
                value={mesMeta}
                onChange={(e) => setMesMeta(Number(e.target.value))}
              >
                {NOMBRES_MES.slice(1).map((nombre, idx) => {
                  const numMes = idx + 1;
                  // Bloqueamos meses pasados del año actual
                  const esPasado =
                    anioMeta === hoy.getFullYear() &&
                    numMes < hoy.getMonth() + 1;
                  return (
                    <option key={numMes} value={numMes} disabled={esPasado}>
                      {nombre}
                      {esPasado ? " (pasado)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <h3 style={{ color: "var(--primary-blue)", marginBottom: "0.75rem" }}>
            Vendedores
          </h3>
          {vendedores.length === 0 ? (
            <div className={styles.emptyState}>
              No hay vendedores en la sucursal seleccionada.
            </div>
          ) : (
            <div className={styles.vendedoresList}>
              {vendedores.map((v) => (
                <div
                  key={v.id_empleado}
                  className={`${styles.vendedorCard} ${
                    vendedorSel?.id_empleado === v.id_empleado
                      ? styles.vendedorCardActiva
                      : ""
                  } ${v.ya_tiene_meta ? styles.vendedorCardConMetaEditable : ""}`}
                  onClick={() => seleccionarVendedor(v)}
                >
                  <div className={styles.vendedorNombre}>{v.nombre}</div>
                  <div className={styles.vendedorEstado}>
                    {v.nombre_sucursal}
                  </div>
                  <div
                    className={`${styles.vendedorEstado} ${
                      v.ya_tiene_meta ? styles.vendedorEstadoConMeta : ""
                    }`}
                  >
                    {v.ya_tiene_meta
                      ? `✓ Ya tiene meta: Q ${v.meta_actual?.toFixed(2)}`
                      : "Sin meta para este periodo"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Panel de asignación */}
          {vendedorSel && (
            <>
              <h3
                style={{
                  color: "var(--primary-blue)",
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                {modoEdicion
                  ? `Editando meta de ${vendedorSel.nombre}`
                  : `Nueva meta para ${vendedorSel.nombre}`}
                {modoEdicion && (
                  <span className={styles.badgeEdicion}>EDICIÓN</span>
                )}
              </h3>

              {sugerencia && (
                <div
                  className={`${styles.suggestionBox} ${
                    sugerencia.supero_meta === true
                      ? styles.suggestionBoxOk
                      : sugerencia.supero_meta === false
                        ? styles.suggestionBoxWarn
                        : ""
                  }`}
                >
                  <div className={styles.suggestionTitle}>
                    {sugerencia.sugerencia !== null
                      ? `Sugerencia: Q ${sugerencia.sugerencia.toFixed(2)}`
                      : "Sin sugerencia disponible"}
                  </div>
                  <div className={styles.suggestionDetail}>
                    {sugerencia.meta_anterior !== null && (
                      <>
                        Mes anterior ({sugerencia.mes_referencia}):{" "}
                        <strong>
                          Vendió Q {sugerencia.vendido_anterior?.toFixed(2)} de
                          Q {sugerencia.meta_anterior.toFixed(2)}
                        </strong>
                        <br />
                      </>
                    )}
                    {sugerencia.explicacion}
                  </div>
                </div>
              )}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Monto de la meta (Q)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={styles.input}
                    value={montoMeta}
                    onChange={(e) => setMontoMeta(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Comisión base (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className={styles.input}
                    value={comisionBase}
                    onChange={(e) => setComisionBase(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Comisión excedente (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className={styles.input}
                    value={comisionExc}
                    onChange={(e) => setComisionExc(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.btnGroup}>
                <button
                  className={styles.btnPrimary}
                  onClick={guardarMeta}
                  disabled={loadingAsig}
                >
                  {loadingAsig
                    ? "Guardando..."
                    : modoEdicion
                      ? "Guardar cambios"
                      : "Asignar meta"}
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={() => {
                    setVendedorSel(null);
                    setSugerencia(null);
                    setMontoMeta("");
                  }}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: HISTORIAL */}
      {tabActual === "historial" && rolGlobal && (
        <div className={styles.formContainer}>
          <div className={styles.empleadoSelectorRow}>
            <div
              className={styles.formGroup}
              style={{ flex: 1, minWidth: 250 }}
            >
              <label>Vendedor</label>
              <select
                className={styles.input}
                value={empleadoHist}
                onChange={(e) =>
                  setEmpleadoHist(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              >
                <option value="">— Seleccione un vendedor —</option>
                {vendedores.map((v) => (
                  <option key={v.id_empleado} value={v.id_empleado}>
                    {v.nombre} ({v.nombre_sucursal})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {empleadoHist === "" ? (
            <div className={styles.emptyState}>
              Seleccione un vendedor para ver su historial.
            </div>
          ) : loadingHist ? (
            <div className={styles.loading}>Cargando historial...</div>
          ) : historial.length === 0 ? (
            <div className={styles.emptyState}>
              Este vendedor no tiene historial de metas.
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Meta</th>
                    <th>Vendido</th>
                    <th>Cumplimiento</th>
                    <th>%</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={`${h.anio}-${h.mes}`}>
                      <td>
                        {NOMBRES_MES[h.mes]} {h.anio}
                      </td>
                      <td>Q {h.monto_meta.toFixed(2)}</td>
                      <td>Q {h.monto_vendido.toFixed(2)}</td>
                      <td>
                        <div className={styles.miniProgressContainer}>
                          <div
                            className={`${styles.miniProgressBar} ${
                              h.estado === "cumplió"
                                ? styles.miniProgressBarFull
                                : ""
                            }`}
                            style={{
                              width: `${Math.min(h.porcentaje_cumplimiento, 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td>{h.porcentaje_cumplimiento.toFixed(2)}%</td>
                      <td>
                        {h.estado === "en_curso" ? (
                          <span className={styles.badgeEnCurso}>En curso</span>
                        ) : h.estado === "cumplió" ? (
                          <span className={styles.badgeCumplio}>Cumplió</span>
                        ) : (
                          <span className={styles.badgeNoCumplio}>
                            No cumplió
                          </span>
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
    </div>
  );
}

function esRolGlobal(rol: string): boolean {
  return rol === "ADMINISTRADOR" || rol === "GERENTE_REGIONAL";
}
