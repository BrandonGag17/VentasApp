import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import FiltroProductos from './FiltroProductos'
import './Lista.css'

function Ventas() {

    const [ventas, setVentas] = useState([])
    const [clientes, setClientes] = useState([])
    const [busquedaCliente, setBusquedaCliente] = useState('')
    const [clientesSeleccionados, setClientesSeleccionados] = useState([])
    const [productos, setProductos] = useState([])
    const [productosSeleccionados, setProductosSeleccionados] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        async function cargarVentas() {
            const { data, error } = await supabase
                .from('Ventas')
                .select('idVenta, idCliente, fecha, total, estado, Clientes(Nombre, Apellido), DetalleVentas(idProducto)')
                .order('fecha', { ascending: false })

            if (!error) setVentas(data)

            const clientesCargados = []
            const clientesPorPagina = 1000
            let pagina = 0
            let hayMasClientes = true

            while (hayMasClientes) {
                const { data: paginaClientes, error: errorClientes } = await supabase
                    .from('Clientes')
                    .select('idCliente, Nombre, Apellido')
                    .order('idCliente', { ascending: true })
                    .range(pagina * clientesPorPagina, (pagina + 1) * clientesPorPagina - 1)

                if (errorClientes) {
                    console.error(errorClientes)
                    break
                }

                clientesCargados.push(...paginaClientes)
                hayMasClientes = paginaClientes.length === clientesPorPagina
                pagina += 1
            }

            clientesCargados.sort((clienteA, clienteB) =>
                `${clienteA.Nombre ?? ''} ${clienteA.Apellido ?? ''}`.localeCompare(
                    `${clienteB.Nombre ?? ''} ${clienteB.Apellido ?? ''}`,
                    'es'
                )
            )
            setClientes(clientesCargados)

            const productosCargados = []
            const productosPorPagina = 1000
            pagina = 0
            let hayMasProductos = true

            while (hayMasProductos) {
                const { data: paginaProductos, error: errorProductos } = await supabase
                    .from('Productos')
                    .select('idProducto, Nombre, TipoProducto')
                    .order('Nombre', { ascending: true })
                    .order('idProducto', { ascending: true })
                    .range(pagina * productosPorPagina, (pagina + 1) * productosPorPagina - 1)

                if (errorProductos) {
                    console.error(errorProductos)
                    break
                }

                productosCargados.push(...paginaProductos)
                hayMasProductos = paginaProductos.length === productosPorPagina
                pagina += 1
            }

            setProductos(productosCargados)
        }
        cargarVentas()
    }, [])

    const clientesFiltrados = clientes.filter(cliente =>
        `${cliente.Nombre ?? ''} ${cliente.Apellido ?? ''}`.toLowerCase().includes(busquedaCliente.toLowerCase())
    )
    const ventasFiltradas = ventas.filter(venta =>
        (clientesSeleccionados.length === 0 || clientesSeleccionados.includes(venta.idCliente)) &&
        (productosSeleccionados.length === 0 || venta.DetalleVentas?.some(detalle => productosSeleccionados.includes(detalle.idProducto)))
    )

    function alternarCliente(idCliente) {
        setClientesSeleccionados(actuales =>
            actuales.includes(idCliente)
                ? actuales.filter(id => id !== idCliente)
                : [...actuales, idCliente]
        )
    }
    async function eliminarVenta(idVenta) {
        const confirmar = window.confirm(
            "¿Estás seguro de que querés eliminar esta venta?"
        )

        if (!confirmar) return

        const { error } = await supabase.rpc('eliminar_venta_fifo', { p_id_venta: idVenta })

        if (error) {
            alert("Error al eliminar la venta")
            console.error(error)
            return
        }

        setVentas(ventasActuales => ventasActuales.filter(v => v.idVenta !== idVenta))
    }

    return (
        <div className="lista-page">

            <div className="lista-header">
                <h2>Ventas</h2>
                <button className="btn btn-primary" onClick={() => navigate('/crear-venta')}>
                    Nueva venta
                </button>
            </div>

            <div className="filtros-ventas">
                <div className="filtro-ventas-clientes">
                    <label htmlFor="buscar-cliente-ventas">Filtrar por cliente</label>
                    <input
                        id="buscar-cliente-ventas"
                        type="search"
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                        placeholder="Buscar cliente..."
                    />
                    <div className="filtro-ventas-acciones">
                        <button
                            type="button"
                            className={clientes.length > 0 && clientesSeleccionados.length === clientes.length ? 'activo' : ''}
                            onClick={() => setClientesSeleccionados(clientes.map(cliente => cliente.idCliente))}
                        >
                            Todos los clientes
                        </button>
                        <button
                            type="button"
                            onClick={() => setClientesSeleccionados([])}
                            disabled={clientesSeleccionados.length === 0}
                        >
                            Deseleccionar todos
                        </button>
                    </div>
                    <div className="filtro-ventas-lista-clientes">
                        {clientesFiltrados.map(cliente => (
                            <label key={cliente.idCliente}>
                                <input
                                    type="checkbox"
                                    checked={clientesSeleccionados.includes(cliente.idCliente)}
                                    onChange={() => alternarCliente(cliente.idCliente)}
                                />
                                <span>{cliente.Nombre} {cliente.Apellido}</span>
                            </label>
                        ))}
                    </div>
                    {clientesSeleccionados.length > 0 && (
                        <span className="filtro-ventas-resumen">
                            Mostrando ventas de {clientesSeleccionados.length} cliente(s)
                        </span>
                    )}
                </div>

                <FiltroProductos
                    productos={productos}
                    seleccionados={productosSeleccionados}
                    onChange={setProductosSeleccionados}
                />
            </div>

            <div className="lista-items">
                {ventasFiltradas.map(venta => (
                    <button className="lista-item" key={venta.idVenta} onClick={() => navigate(`/venta/${venta.idVenta}`)}>
                        <div className="lista-item-info">
                            <span className="lista-item-titulo">
                                {venta.Clientes?.Nombre} {venta.Clientes?.Apellido}
                            </span>
                            <span className="lista-item-subtitulo">
                                {new Date(venta.fecha).toLocaleDateString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                        <div className="lista-item-derecha">
                            <span className="lista-item-total">${venta.total}</span>

                            <span className={`badge badge-${venta.estado}`}>
                                {venta.estado}
                            </span>

                            <button
                                className="btn-eliminar"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    eliminarVenta(venta.idVenta)
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="100" viewBox="0 0 30 30">
                                    <path fill="white" d="M 13 3 A 1.0001 1.0001 0 0 0 11.986328 4 L 6 4 A 1.0001 1.0001 0 1 0 6 6 L 24 6 A 1.0001 1.0001 0 1 0 24 4 L 18.013672 4 A 1.0001 1.0001 0 0 0 17 3 L 13 3 z M 6 8 L 6 24 C 6 25.105 6.895 26 8 26 L 22 26 C 23.105 26 24 25.105 24 24 L 24 8 L 6 8 z"></path>
                                </svg>
                            </button>
                        </div>
                    </button>
                ))}
                {ventasFiltradas.length === 0 && <p className="lista-vacia">No hay ventas para los filtros seleccionados.</p>}
            </div>

        </div>
    )
}

export default Ventas
