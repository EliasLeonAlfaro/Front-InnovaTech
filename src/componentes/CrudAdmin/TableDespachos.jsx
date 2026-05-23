import { useState, useEffect } from "react";
import axios from "axios";
import { Modal } from "./Modal";
import { FormCierreDespacho } from "./FormCierreDespacho";

export const TableDespachos = () => {
  const [despachos, setDespachos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const despacho = async () => {
    try {
      // ➡️ CORREGIDO: Cambiamos la IP pública y puerto por el proxy relativo de Nginx (Puerto 8085 interno)
      const response = await axios.get("/api/despachos/v1/despachos", {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // 🛡️ Validación de Arreglo para evitar pantallazos blancos inesperados
      if (Array.isArray(response.data)) {
        setDespachos(response.data);
      } else {
        console.error("El microservicio no devolvió un arreglo válido:", response.data);
        setDespachos([]);
      }
    } catch (error) {
      console.error("Error al obtener los despachos mediante Nginx:", error);
      setDespachos([]); // Respaldo seguro en caso de error
    } finally {
      setCargando(false); // Apagamos el estado de carga
    }
  };

  // Llamada a la función para obtener los datos cuando el componente se monta
  useEffect(() => {
    despacho();
  }, []);

  const [openModal, setOpenModal] = useState(false);
  const [despachoSeleccionado, setDespachoSeleccionado] = useState(null);

  const handleAbrirModal = (despacho) => {
    setDespachoSeleccionado(despacho);
    setOpenModal(true);
  };

  return (
    <>
      <section className="grid text-center grid-cols-12 mb-8">
        <div className="col-span-12 flex justify-center">
          <div className="col-span-10 p-2 bg-white border border-gray-200 rounded-lg shadow h-full overflow-hidden">

            {cargando ? (
              <p className="py-10 text-teal-600 font-bold">Cargando órdenes de despacho...</p>
            ) : (
              <table className="table-fixed w-full">
                <thead>
                  <tr className="py-10">
                    <th className="pr-10">Orden de despacho</th>
                    <th className="pr-10">Orden de compra</th>
                    <th className="pr-10">Dirección de entrega</th>
                    <th className="pr-10">Fecha despacho</th>
                    <th className="pr-10">Patente Camión</th>
                    <th className="pr-10">Entregado</th>
                    <th className="pr-10">Intentos de entrega</th>
                    <th className="pr-10">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ➡️ SEGURO: Verificamos datos antes de iterar con el .map */}
                  {despachos && despachos.length > 0 ? (
                    despachos.map((item) => (
                      <tr key={item.idDespacho} className="border-b border-gray-100">
                        <td className="pr-10 py-10 items-center">{item.idDespacho}</td>
                        <td className="pr-10 py-10 items-center">{item.idCompra}</td>
                        <td className="pr-10 py-10 items-center">{item.direccionCompra}</td>
                        <td className="pr-10 py-10 items-center">{item.fechaDespacho}</td>
                        <td className="pr-10 py-10 items-center">{item.patenteCamion}</td>
                        <td className="pr-10 py-10 items-center">
                          {item.entregado ? "Despacho entregado" : "Despacho pendiente"}
                        </td>
                        <td className="pr-10 py-10 items-center">{item.intento}</td>
                        <td>
                          <button
                            onClick={() => handleAbrirModal(item)}
                            className="py-1 bg-orange-200 px-8 rounded-xl shadow-md hover:bg-orange-300/70 transition-all duration-300"
                          >
                            Cerrar despacho
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="py-10 text-gray-500">
                        No hay órdenes de despacho disponibles.
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
        {despachoSeleccionado && (
          <FormCierreDespacho
            despacho={despachoSeleccionado}
            onClose={() => {
              setOpenModal(false);
              despacho(); // Refresca la tabla automáticamente al cerrar el modal
            }}
          />
        )}
      </Modal>
    </>
  );
};