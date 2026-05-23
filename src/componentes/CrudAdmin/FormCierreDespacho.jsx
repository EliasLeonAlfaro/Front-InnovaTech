import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import axios from "axios";

export const FormCierreDespacho = ({ despacho, onClose }) => {
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    console.log("onSubmit ejecutado");

    // ➡️ Mantenemos tu estructura de enviar solo intento y despachado,
    // pero sanitizando los tipos para que Spring Boot los procese correctamente.
    const jsonData = {
      intento: Number(data.intento),            // Convierte el texto del input a número puro
      despachado: data.despachado === "true"    // Convierte el string del select a booleano real
    };

    console.log("Datos del formulario enviados a Nginx:", jsonData);

    try {
      // ➡️ CORREGIDO: Cambiamos la IP pública y puerto por la ruta del proxy de Nginx
      await axios.put(
        `/api/despachos/v1/despachos/${despacho.idDespacho}`,
        jsonData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      Swal.fire({
        title: "Despacho modificado 🛻!",
        text: "El despacho ha sido modificado exitosamente",
        icon: "success",
        confirmButtonText: "Aceptar",
      });
    } catch (error) {
      console.error("Error en la solicitud:", error);
      Swal.fire({
        title: "Error de red",
        text: "No se pudo actualizar el despacho a través del proxy de Nginx.",
        icon: "error",
        confirmButtonText: "Entendido",
      });
    }
    onClose();
  };

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col justify-center text-center px-24 text-xl"
      >
        <div className="mx-auto text-3xl font-bold mb-10 text-teal-600">
          Editar y cierre de despacho
        </div>

        <div className="mb-5">
          <label className="block font-bold mb-2">ID despacho</label>
          <input
            disabled={true}
            type="text"
            placeholder="Ingresa fecha de despacho"
            className="border border-gray-300 rounded-lg block w-full p-1 text-slate-400 bg-gray-50"
            value={despacho.idDespacho}
          />
        </div>

        <div className="mb-5">
          <label className="block font-bold mb-2">Fecha despacho</label>
          <input
            type="date"
            placeholder="Elige patente de camión"
            className="border border-gray-300 rounded-lg block w-full text-slate-400 p-1 bg-gray-50"
            value={despacho.fechaDespacho}
            disabled={true}
          />
        </div>

        <div className="mb-5">
          <label className="block font-bold mb-2">Patente Camión</label>
          <input
            type="text"
            disabled={true}
            value={despacho.patenteCamion}
            className="border border-gray-300 rounded-lg block w-full text-slate-400 p-1 bg-gray-50"
          />
        </div>

        <div className="mb-5">
          <label className="block font-bold mb-2">Intentos de entrega</label>
          <input
            type="number"
            defaultValue={despacho.intento}
            className="border border-gray-300 rounded-lg block w-full p-1"
            {...register("intento", { required: true })}
          />
        </div>

        <div className="mb-5">
          <label className="block font-bold mb-2">Despacho entregado</label>
          <select
            // ➡️ Vinculamos el estado inicial que ya viene en la fila de la tabla
            defaultValue={despacho.despachado ? "true" : "false"}
            className="border border-gray-300 rounded-lg block w-full p-1"
            {...register("despachado", { required: true })}
          >
            <option value="false">Despacho abierto</option>
            <option value="true">Cerrar despacho</option>
          </select>
        </div>

        <div className="mb-5">
          <label className="block font-bold mb-2">ID Compra</label>
          <input
            type="text"
            className="border border-gray-300 rounded-lg block w-full text-slate-400 p-1 bg-gray-50"
            disabled={true}
            value={despacho.idCompra}
          />
        </div>

        <div className="mb-5">
          <label className="block font-bold mb-2">Dirección Compra</label>
          <input
            type="text"
            className="border border-gray-300 rounded-lg block w-full text-slate-400 p-1 bg-gray-50"
            disabled={true}
            value={despacho.direccionCompra}
          />
        </div>

        <div className="mb-5">
          <label className="block font-bold mb-2">Valor Compra</label>
          <input
            type="text"
            className="border border-gray-300 rounded-lg block w-full text-slate-400 p-1 bg-gray-50"
            disabled={true}
            value={despacho.valorCompra}
          />
        </div>

        <button
          className="py-6 px-14 rounded-lg bg-teal-600 text-white font-bold mb-14 hover:bg-teal-700 transition-colors"
          type="submit"
        >
          Modificar Despacho
        </button>
      </form>
    </>
  );
};