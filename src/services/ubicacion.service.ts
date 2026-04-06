const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const UbicacionService = {
  async obtenerDepartamentos() {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    const res = await fetch(`${API_URL}/ubicaciones/departamentos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("Error al obtener departamentos");
    return res.json();
  },

  async obtenerMunicipios(idDepartamento: number) {
    const token = document.cookie.match(new RegExp("(^| )token=([^;]+)"))?.[2];
    const res = await fetch(
      `${API_URL}/ubicaciones/departamentos/${idDepartamento}/municipios`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!res.ok) throw new Error("Error al obtener municipios");
    return res.json();
  },
};
