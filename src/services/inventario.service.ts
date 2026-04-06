const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const InventarioService = {
  async buscarProductoMultiSucursal(termino: string, idSucursal: number) {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    const res = await fetch(
      `${API_URL}/inventario/buscar?q=${termino}&sucursal=${idSucursal}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) throw new Error("Error buscando inventario");
    return res.json();
  },
};
