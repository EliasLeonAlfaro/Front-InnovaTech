import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { FormDespacho } from "./FormDespacho";
import axios from "axios";

export const TableCompras = () => {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const compras = async () => {
    try {
      // ➡️ CORREGIDO: Cambiamos la IP pública por la ruta relativa manejada por Nginx (Manda al puerto 8086)
      const response = await axios.get("/api/v1/ventas", {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // 🛡️ Blindaje contra errores de tipo: Aseguramos que sea un Arreglo antes del .map
      if (Array.isArray(response.data)) {
        setVentas(response.data);
      } else {
        console.error("El microservicio de ventas no devolvió un formato de arreglo válido:", response.data);
        setVentas([]);
      }
    } catch (error) {
      console.error("Error al obtener las ventas desde Nginx:", error);
      setVentas([]); // Mantiene el estado seguro en caso de caída del servicio
    } finally {
      setCargando(false); // Desactiva el estado visual de carga
    }
  };

  // Llamada a la función para obtener los datos cuando el componente se monta
  useEffect(() => {
    compras();
  }, []);

  //state que controla el modal
  const [openModal, setOpenModal] = useState(false);

  //state que abre el modal junto con la data del id seleccionado
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const handleAbrirModal = (venta) => {
    setVentaSeleccionada(venta);
    setOpenModal(true);
  };

  return (
    <>
      <section className="grid text-center grid-cols-12 mb-8">
        <div className="col-span-12 flex justify-center">
          <div className="col-span-10 p-2 bg-white border border-gray-200 rounded-lg shadow h-full overflow-hidden">

            {cargando ? (
              <p className="py-10 text-teal-600 font-bold">Cargando órdenes de compra disponibles...</p>
            ) : (
              <table className="table-fixed w-full">
                <thead>
                  <tr className="py-10">
                    <th className="pr-10">Orden de compra</th>
                    <th className="pr-10">Dirección</th>
                    <th className="pr-10">Fecha de compra</th>
                    <th className="pr-10">Valor total</th>
                    <th className="pr-10">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ➡️ SEGURO: Validamos la existencia de datos antes de aplicar filtros y mapeos */}
                  {ventas && ventas.length > 0 ? (
                    ventas
                      .filter((venta) => !venta.despachoGenerado)
                      .map((venta) => (
                        <tr key={venta.idVenta} className="border-b border-gray-100">
                          <td className="pr-10 py-10 items-center">
                            {venta.idVenta}
                          </td>
                          <td className="pr-10 py-10 items-center">
                            {venta.direccionCompra}
                          </td>
                          <td className="pr-10 py-10 items-center">
                            {venta.fechaCompra}
                          </td>
                          <td className="pr-10 py-10 items-center">
                            ${venta.valorCompra}
                          </td>
                          <td>
                            <button
                              onClick={() => handleAbrirModal(venta)}
                              className="py-1 bg-orange-200 px-8 rounded-xl shadow-md hover:bg-orange-300/70 transition-all duration-300"
                            >
                              Generar Despacho
                            </button>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-10 text-gray-500">
                        No quedan ventas pendientes por despachar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

          </div>
        </div>
      </section>

      <Modal
        onClose={() => {
          setOpenModal(false);
        }}
        open={openModal}
      >
        {ventaSeleccionada && (
          <FormDespacho
            venta={ventaSeleccionada}
            onClose={() => {
              setOpenModal(false);
              compras(); // Refresca la tabla de ventas automáticamente al cerrar el formulario
            }}
          />
        )}
      </Modal>
    </>
  );
};