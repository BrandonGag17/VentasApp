import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './DetalleVenta.css'

function DetalleVenta() {
    const { id } = useParams()
    const [venta, setVenta] = useState(null)
    const [editando, setEditando] = useState(false)
    const [form, setForm] = useState(null)

    // Estados para agregar productos nuevos a la venta
    const [todosLosProductos, setTodosLosProductos] = useState([])
    const [busqueda, setBusqueda] = useState('')

    const cargarProductos = useCallback(async () => {
        const { data } = await supabase
            .from('Productos')
            .select('idProducto, Nombre, PrecioVenta')
        setTodosLosProductos(data || [])
    }, [])

    const traerVenta = useCallback(async () => {
        const { data, error } = await supabase
            .from('Ventas')
            .select(`
                idVenta, fecha, estado, total,
                Clientes(Nombre, Apellido),
                DetalleVentas(idDetalle, CantidadUnidades, PrecioVentaUnitario, idProducto, Productos(Nombre))
            `)
            .eq('idVenta', id)
            .single()

        if (error) return console.log(error)
        setVenta(data)
        setForm(JSON.parse(JSON.stringify(data))) // Clonado profundo para evitar problemas de referencia
    }, [id])

    useEffect(() => {
        traerVenta()
        cargarProductos()
    }, [traerVenta, cargarProductos])

    const sugerencias = todosLosProductos.filter(p =>
        p.Nombre.toLowerCase().includes(busqueda.toLowerCase()) && busqueda !== ''
    )

    function agregarProductoNuevo(prod) {
        const nuevoDetalle = {
            idVenta: id,
            idProducto: prod.idProducto,
            CantidadUnidades: 1,
            PrecioVentaUnitario: prod.PrecioVenta,
            Productos: { Nombre: prod.Nombre },
            esNuevo: true // Flag para saber que hay que insertarlo
        }
        setForm({ ...form, DetalleVentas: [...form.DetalleVentas, nuevoDetalle] })
        setBusqueda('')
    }

    async function guardarCambios() {
        // 1. Actualizar estado de la venta
        await supabase.from('Ventas').update({ estado: form.estado }).eq('idVenta', id)

        for (const detalle of form.DetalleVentas) {
            if (detalle.esNuevo) {
                // 2. Insertar productos nuevos
                await supabase.from('DetalleVentas').insert([{
                    idVenta: id,
                    idProducto: detalle.idProducto,
                    CantidadUnidades: Number(detalle.CantidadUnidades),
                    PrecioVentaUnitario: Number(detalle.PrecioVentaUnitario)
                }])
            } else {
                // 3. Actualizar productos existentes (Cantidad y PRECIO)
                await supabase.from('DetalleVentas').update({
                    CantidadUnidades: Number(detalle.CantidadUnidades),
                    PrecioVentaUnitario: Number(detalle.PrecioVentaUnitario)
                }).eq('idDetalle', detalle.idDetalle)
            }
        }

        alert("Venta actualizada ✅")
        setEditando(false)
        traerVenta()
    }

    if (!venta || !form) return <p>Cargando...</p>
    // Función para calcular el total dinámico mientras se edita
    const totalVenta =
        form?.DetalleVentas?.reduce((acc, det) => {
            return acc + (
                Number(det.CantidadUnidades) *
                Number(det.PrecioVentaUnitario)
            )
        }, 0) || 0
    async function generarPDF() {
        const { default: jsPDF } = await import('jspdf')
        const doc = new jsPDF()

        doc.setFontSize(18)
        doc.text(`Venta #${venta.idVenta}`, 10, 15)

        doc.setFontSize(12)
        doc.text(
            `Cliente: ${venta.Clientes?.Nombre || ''} ${venta.Clientes?.Apellido || ''}`,
            10,
            25
        )

        doc.text(
            `Fecha: ${new Date(venta.fecha).toLocaleString('es-AR')}`,
            10,
            35
        )

        doc.text(
            `Estado: ${venta.estado}`,
            10,
            45
        )

        let y = 60

        doc.text('Productos:', 10, y)
        y += 10

        form.DetalleVentas.forEach(detalle => {
            doc.text(
                `${detalle.Productos?.Nombre} - ${detalle.CantidadUnidades} x $${detalle.PrecioVentaUnitario}`,
                10,
                y
            )

            y += 10
        })

        y += 10

        doc.setFontSize(14)
        doc.text(
            `Total: $${totalVenta.toLocaleString('es-AR')}`,
            10,
            y
        )

        doc.save(`venta-${venta.idVenta}.pdf`)
    }

    return (
        <div className="detalle-venta-page">
            <div className="detalle-venta-header">
                <p className="detalle-venta-id">Venta #{venta.idVenta}</p>
                <h2 className="detalle-venta-cliente">
                    {venta.Clientes?.Nombre} {venta.Clientes?.Apellido}
                </h2>

                <div className="detalle-venta-meta">
                    <div className="detalle-venta-meta-item">
                        <span className="detalle-venta-meta-label">Fecha: </span>
                        <span className="detalle-venta-meta-valor">
                            {new Date(venta.fecha).toLocaleDateString('es-AR', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                    </div>

                    <div className="detalle-venta-meta-item">
                        <span className="detalle-venta-meta-label">Estado: </span>
                        <select
                            disabled={!editando}
                            value={form.estado}
                            onChange={(e) => setForm({ ...form, estado: e.target.value })}
                        >
                            <option value="activa">Activa</option>
                            <option value="modificada">Modificada</option>
                            <option value="cancelada">Cancelada</option>
                        </select>
                    </div>
                </div>
            </div>

            <h3>Productos</h3>
            <div className="detalle-venta-productos">
                {form.DetalleVentas.map((detalle, index) => (
                    <div className="detalle-venta-producto-fila" key={index}>
                        <span className="detalle-venta-producto-nombre">{detalle.Productos?.Nombre}</span>

                        {editando ? (
                            <div className="detalle-venta-inputs">
                                <label>Cant:</label>
                                <input
                                    type="number"
                                    value={detalle.CantidadUnidades}
                                    onChange={(e) => {
                                        const nuevos = [...form.DetalleVentas]
                                        nuevos[index].CantidadUnidades = e.target.value
                                        setForm({ ...form, DetalleVentas: nuevos })
                                    }}
                                />
                                <label>Precio ($):</label>
                                <input
                                    type="number"
                                    value={detalle.PrecioVentaUnitario}
                                    onChange={(e) => {
                                        const nuevos = [...form.DetalleVentas]
                                        nuevos[index].PrecioVentaUnitario = e.target.value
                                        setForm({ ...form, DetalleVentas: nuevos })
                                    }}
                                />
                            </div>
                        ) : (
                            <span className="detalle-venta-producto-precio">
                                ${Number(detalle.PrecioVentaUnitario).toLocaleString()} x {detalle.CantidadUnidades}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {editando && (
                <div className="buscador-edicion">
                    <h4>Agregar más productos:</h4>
                    <input
                        type="text"
                        placeholder="Escribí para buscar..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                    {busqueda && sugerencias.length > 0 && (
                        <ul className="sugerencias-lista">
                            {sugerencias.map(p => (
                                <li key={p.idProducto} onClick={() => agregarProductoNuevo(p)}>
                                    {p.Nombre} (${p.PrecioVenta}) ➕
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="detalle-venta-total">
                <span className="detalle-venta-total-label">Total ganado:</span>
                <span className="detalle-venta-total-valor">
                    ${totalVenta.toLocaleString('es-AR')}
                </span>
            </div>

            <div className="detalle-venta-acciones">
                {editando ? (
                    <>
                        <button className="btn btn-primary" onClick={guardarCambios}>Guardar Cambios</button>
                        <button className="btn btn-secondary" onClick={() => { setEditando(false); traerVenta(); }}>Cancelar</button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-secondary" onClick={() => setEditando(true)}>Editar Venta</button>
                        <button className="btn btn-secondary" onClick={generarPDF}>Descargar PDF</button>
                    </>
                )}
            </div>
        </div>
    )

}

export default DetalleVenta
