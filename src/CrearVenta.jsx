import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './CrearVenta.css'

function CrearVenta() {
    const navigate = useNavigate()
    const PRODUCTOS_POR_PAGINA = 1000

    const [productos, setProductos] = useState([])
    const [clientes, setClientes] = useState([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)

    // Estados para el buscador y selección
    const [busqueda, setBusqueda] = useState('')
    const [productoSeleccionado, setProductoSeleccionado] = useState(null)
    const [precioPersonalizado, setPrecioPersonalizado] = useState('') // El precio editable
    const [cantidad, setCantidad] = useState('')
    const [renglones, setRenglones] = useState([])

    useEffect(() => {
        async function cargarDatos() {
            const productosCargados = []
            let pagina = 0
            let hayMasProductos = true

            while (hayMasProductos) {
                const { data, error } = await supabase
                    .from('Productos')
                    .select('idProducto, Nombre, PrecioVenta, Stock')
                    .order('idProducto', { ascending: true })
                    .range(pagina * PRODUCTOS_POR_PAGINA, (pagina + 1) * PRODUCTOS_POR_PAGINA - 1)

                if (error) {
                    console.error(error)
                    break
                }

                productosCargados.push(...data)
                hayMasProductos = data.length === PRODUCTOS_POR_PAGINA
                pagina += 1
            }

            const { data: dataClientes } = await supabase
                .from('Clientes')
                .select('idCliente, Nombre, Apellido')

            setProductos(productosCargados)
            if (dataClientes) setClientes(dataClientes)
        }
        cargarDatos()
    }, [])

    // Filtrado de productos para el buscador
    const sugerencias = productos.filter(p =>
        busqueda !== '' && String(p.Nombre ?? '').toLowerCase().includes(busqueda.toLowerCase())
    )

    function seleccionarProducto(prod) {
        setProductoSeleccionado(prod)
        setPrecioPersonalizado(prod.PrecioVenta) // Carga el precio base, pero permite editarlo
        setBusqueda(prod.Nombre) // Setea el nombre en el input
    }

    function agregarRenglon() {
        if (!productoSeleccionado) return alert("Seleccioná un producto")
        if (!cantidad || Number(cantidad) <= 0) return alert("Cantidad inválida")

        // Buscamos si ya existe el producto con el MISMO precio en la lista
        const indexExistente = renglones.findIndex(
            r => r.producto.idProducto === productoSeleccionado.idProducto && r.precioFinal === Number(precioPersonalizado)
        )

        if (indexExistente !== -1) {
            const nuevos = [...renglones]
            nuevos[indexExistente].cantidad += Number(cantidad)
            setRenglones(nuevos)
        } else {
            setRenglones([
                ...renglones,
                {
                    producto: productoSeleccionado,
                    cantidad: Number(cantidad),
                    precioFinal: Number(precioPersonalizado) // Guardamos el precio que eligió el primo
                }
            ])
        }

        // Limpiar campos
        setProductoSeleccionado(null)
        setPrecioPersonalizado('')
        setCantidad('')
        setBusqueda('')
    }

    async function agregarVenta() {
        if (!clienteSeleccionado) return alert("Seleccioná un cliente")
        if (renglones.length === 0) return alert("Agregá al menos un producto")

        const { error } = await supabase.rpc('registrar_venta_fifo', {
            p_id_cliente: clienteSeleccionado.idCliente,
            p_renglones: renglones.map(renglon => ({
                idProducto: renglon.producto.idProducto,
                cantidad: renglon.cantidad,
                precioVenta: renglon.precioFinal
            }))
        })

        if (error) return alert(error.message || 'No se pudo crear la venta. Revisá el stock disponible.')

        alert("Venta creada ✅")
        navigate('/')
    }

    return (
        <div className="crear-venta-page">
            <h2>Nueva venta</h2>

            <div className="crear-venta-campos">
                {/* Selector de Cliente */}
                <div className="crear-venta-campo">
                    <label>Cliente</label>
                    <select onChange={(e) => setClienteSeleccionado(clientes.find(c => c.idCliente === Number(e.target.value)))} defaultValue="">
                        <option value="" disabled>Seleccioná un cliente</option>
                        {clientes.map(c => (
                            <option key={c.idCliente} value={c.idCliente}>{c.Nombre} {c.Apellido}</option>
                        ))}
                    </select>
                </div>

                {/* Buscador de Producto */}
                <div className="crear-venta-campo" style={{ position: 'relative' }}>
                    <label>Buscar Producto</label>
                    <input
                        type="text"
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setProductoSeleccionado(null); }}
                        placeholder="Escribí el nombre..."
                    />
                    {busqueda && !productoSeleccionado && sugerencias.length > 0 && (
                        <ul className="lista-sugerencias">
                            {sugerencias.map(p => (
                                <li key={p.idProducto} onClick={() => seleccionarProducto(p)}>
                                    {p.Nombre} (${p.PrecioVenta})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Campos de edición una vez seleccionado el producto */}
                {productoSeleccionado && (
                    <div className="detalle-edicion-producto">
                        <div className="crear-venta-campo">
                            <label>Precio de Venta ($)</label>
                            <input
                                type="number"
                                value={precioPersonalizado}
                                onChange={(e) => setPrecioPersonalizado(e.target.value)}
                            />
                        </div>
                        <div className="crear-venta-campo">
                            <label>Cantidad</label>
                            <input
                                type="number"
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                            />
                        </div>
                        <button type="button" onClick={agregarRenglon}>Agregar producto</button>
                    </div>
                )}

                {/* Tabla de Renglones */}
                {renglones.length > 0 && (
                    <div className="tabla-productos">
                        <h3>Productos en esta venta</h3>
                        {renglones.map((r, index) => (
                            <div key={index} className="renglon-item">
                                <span>{r.producto.Nombre}</span>
                                <span>Cant: {r.cantidad}</span>
                                <span>Precio: ${r.precioFinal}</span>
                                <span>Subtotal: ${r.cantidad * r.precioFinal}</span>
                                <button type="button" onClick={() => setRenglones(renglones.filter((_, i) => i !== index))}>❌</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button className="btn-finalizar" onClick={agregarVenta}>Finalizar Venta</button>
        </div>
    )
}

export default CrearVenta
