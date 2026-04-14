const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const getHeaders = () => {
  const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
  return { Authorization: `Bearer ${token}` };
};

export const InventarioService = {
  async buscarProductoMultiSucursal(termino: string, idSucursal: number) {
    const res = await fetch(
      `${API_URL}/inventario/buscar?q=${termino}&id_sucursal=${idSucursal}`,
      { headers: getHeaders() },
    );
    if (!res.ok) throw new Error("Error buscando inventario");
    return res.json();
  },

  // === NUEVOS ENDPOINTS DE VEHÍCULOS ===

  async obtenerMarcasVehiculo() {
    const res = await fetch(`${API_URL}/inventario/vehiculos/marcas`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Error obteniendo marcas de vehículos");
    return res.json();
  },

  async obtenerModelosPorMarca(id_marca: number) {
    const res = await fetch(
      `${API_URL}/inventario/vehiculos/marcas/${id_marca}/modelos`,
      {
        headers: getHeaders(),
      },
    );
    if (!res.ok) throw new Error("Error obteniendo modelos del vehículo");
    return res.json();
  },

  async buscarPorVehiculo(
    id_sucursal: number,
    id_modelo: number,
    anio?: number,
  ) {
    let url = `${API_URL}/inventario/buscar-por-vehiculo?id_sucursal=${id_sucursal}&id_modelo=${id_modelo}`;
    if (anio) url += `&anio=${anio}`;

    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error("Error buscando repuestos para este vehículo");
    return res.json();
  },

  async obtenerCompatibilidades(id_producto: number) {
    const res = await fetch(
      `${API_URL}/inventario/producto/${id_producto}/compatibilidad`,
      {
        headers: getHeaders(),
      },
    );
    if (!res.ok) throw new Error("Error obteniendo compatibilidades");
    return res.json();
  },
};
