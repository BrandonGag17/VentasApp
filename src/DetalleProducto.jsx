import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './DetalleProducto.css'

function DetalleProducto() {

    const navigate = useNavigate()
    const { id } = useParams()
    const [producto, setProducto] = useState(null)
    const [editando, setEditando] = useState(false)
    const [form, setForm] = useState(null)

    useEffect(() => {
        async function traerProducto() {
            const { data, error } = await supabase
                .from('Productos')
                .select('idProducto, Nombre, PrecioCompra, PrecioVenta, Stock, NombreProveedor, TipoProducto, ImagenUrl')
                .eq('idProducto', id)

            if (error) {
                console.log(error)
                return
            }

            setProducto(data[0])
            setForm(data[0])
        }

        traerProducto()
    }, [id])

    const convertirPrecio = (precio) => {
        // Reemplazar coma por punto para que Number() lo interprete correctamente
        return Number(precio.toString().replace(',', '.'))
    }

    async function guardarCambios() {
        const { error } = await supabase
            .from('Productos')
            .update({
                Nombre: form.Nombre,
                PrecioCompra: convertirPrecio(form.PrecioCompra),
                PrecioVenta: convertirPrecio(form.PrecioVenta),
                Stock: Number(form.Stock),
                ImagenUrl: form.ImagenUrl
            })
            .eq('idProducto', id)

        if (error) {
            alert("Error al guardar")
            return
        }

        alert("Guardado ✅")
        setEditando(false)
    }

    async function eliminarProducto() {
        const confirmar = window.confirm(`¿Seguro que querés eliminar ${producto.Nombre}?`)
        if (!confirmar) return

        // verificamos si tiene ventas asociadas
        const { data: detalles } = await supabase
            .from('DetalleVentas')
            .select('idDetalle')
            .eq('idProducto', id)

        if (detalles && detalles.length > 0) {
            alert("No podés eliminar este producto porque tiene ventas registradas.")
            return
        }

        const { error } = await supabase
            .from('Productos')
            .delete()
            .eq('idProducto', id)

        if (error) {
            alert("Error al eliminar")
            return
        }

        alert("Producto eliminado ✅")
        navigate('/')
    }

    if (!producto) return <p>Cargando...</p>

    return (
        <div className="detalle-producto-page">

            <p className="detalle-producto-id">ID #{producto.idProducto}</p>

            <div className="detalle-producto-campos">

                <div className="campo-fila">
                    <span className="campo-label">Nombre</span>
                    {editando ? (
                        <input value={form.Nombre} onChange={(e) => setForm({ ...form, Nombre: e.target.value })} />
                    ) : (
                        <p className="campo-valor">{producto.Nombre}</p>
                    )}
                </div>

                <div className="campo-fila">
                    <span className="campo-label">Precio compra</span>
                    {editando ? (
                        <input value={form.PrecioCompra} onChange={(e) => setForm({ ...form, PrecioCompra: e.target.value })} />
                    ) : (
                        <p className="campo-valor">${producto.PrecioCompra}</p>
                    )}
                </div>

                <div className="campo-fila">
                    <span className="campo-label">Precio venta</span>
                    {editando ? (
                        <input value={form.PrecioVenta} onChange={(e) => setForm({ ...form, PrecioVenta: e.target.value })} />
                    ) : (
                        <p className="campo-valor">${producto.PrecioVenta}</p>
                    )}
                </div>

                <div className="campo-fila">
                    <span className="campo-label">Stock</span>
                    {editando ? (
                        <input value={form.Stock} onChange={(e) => setForm({ ...form, Stock: e.target.value })} />
                    ) : (
                        <p className="campo-valor">{producto.Stock} unidades</p>
                    )}
                </div>

                <div className="campo-fila">
                    <span className="campo-label">Proveedor</span>
                    <p className="campo-valor">{producto.NombreProveedor}</p>
                </div>

                <div className="campo-fila">
                    <span className="campo-label">Tipo</span>
                    <p className="campo-valor">{producto.TipoProducto}</p>
                </div>
                <div className="campo-fila">
                    <span className="campo-label">Imagen</span>
                    {editando ? (
                        <input value={form.ImagenUrl || ''} placeholder="https://..." onChange={(e) => setForm({ ...form, ImagenUrl: e.target.value })} />
                    ) : (
                        producto.ImagenUrl
                            ? <img src={producto.ImagenUrl} alt={producto.Nombre} style={{ width: 120, borderRadius: 8, marginTop: 4 }} />
                            : <p className="campo-valor">Sin imagen</p>
                    )}
                </div>

            </div>

            <div className="detalle-producto-acciones">
                {editando ? (
                    <button className="btn btn-primary" onClick={guardarCambios}>Guardar</button>
                ) : (
                    <>
                        <button className="btn btn-secondary" onClick={() => setEditando(true)}>Editar</button>
                        <button className="btn btn-danger" onClick={eliminarProducto}>Eliminar</button>
                    </>
                )}
            </div>

        </div>
    )
}

export default DetalleProducto