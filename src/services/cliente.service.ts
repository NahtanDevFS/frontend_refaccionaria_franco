// src/services/cliente.service.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function getToken() {
  if (typeof document === "undefined") return "";
  return document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2] ?? "";
}

export const ClienteService = {
  // Búsqueda exacta por NIT
  async buscarPorNit(nit: string) {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    const res = await fetch(`${API_URL}/clientes/buscar?nit=${nit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Error buscando cliente");
    return res.json();
  },

  //búsqueda libre por nombre, NIT o teléfono
  async buscarClientes(criterio: string): Promise<any[]> {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    const res = await fetch(
      `${API_URL}/clientes/buscar-general?query=${encodeURIComponent(criterio)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error("Error en la búsqueda de clientes");
    const data = await res.json();
    // El controller devuelve { success: true, data: [...] }
    return Array.isArray(data) ? data : (data.data ?? []);
  },

  async buscarPorTelefono(telefono: string): Promise<boolean> {
    const resultados = await ClienteService.buscarClientes(telefono);
    return resultados.some((c: any) => c.telefono === telefono);
  },
};
