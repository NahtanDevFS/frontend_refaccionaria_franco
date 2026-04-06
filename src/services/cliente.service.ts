const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const ClienteService = {
  async buscarPorNit(nit: string) {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    const res = await fetch(`${API_URL}/clientes/buscar?nit=${nit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Error buscando cliente");
    return res.json();
  },
};
