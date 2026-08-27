import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './Ganancias.css'

function fechaLocalAISO(fecha, diasAdicionales = 0) {
    const [anio, mes, dia] = fecha.split('-').map(Number)
    return new Date(anio, mes - 1, dia + diasAdicionales).toISOString()
}

function Ganancias() {

    const PRODUCTOS_POR_PAGINA = 1000
    const [desdeFecha, setDesdeFecha] = useState('')
    const [hastaFecha, setHastaFecha] = useState('')
    const [productos, setProductos] = useState([])
    const [busquedaProducto, setBusquedaProducto] = useState('')
    const [productosSeleccionados, setProductosSeleccionados] = useState([])
    const [resultado, setResultado] = useState(null)

    useEffect(() => {
        async function cargarProductos() {
            const productosCargados = []
            let pagina = 0
            let hayMasProductos = true

            while (hayMasProductos) {
                const { data, error } = await supabase
                    .from('Productos')
                    .select('idProducto, Nombre')
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

            productosCargados.sort((productoA, productoB) =>
                String(productoA.Nombre ?? '').localeCompare(String(productoB.Nombre ?? ''), 'es')
            )
            setProductos(productosCargados)
        }

        cargarProductos()
    }, [])

    const productosFiltrados = productos.filter(producto =>
        String(producto.Nombre ?? '').toLowerCase().includes(busquedaProducto.toLowerCase())
    )

    function alternarProducto(idProducto) {
        setProductosSeleccionados(productosActuales =>
            productosActuales.includes(idProducto)
                ? productosActuales.filter(id => id !== idProducto)
                : [...productosActuales, idProducto]
        )
    }

    async function consultarGanancias() {
        if (!desdeFecha || !hastaFecha) {
            alert("Seleccioná las fechas del período")
            return
        }

        if (desdeFecha > hastaFecha) {
            alert("La fecha inicial no puede ser posterior a la fecha final")
            return
        }

        let consulta = supabase
            .from('DetalleVentas')
            .select(`
                CantidadUnidades,
                PrecioVentaUnitario,
                Productos(PrecioCompra),
                Ventas!inner(fecha, estado)
            `)
            .gte('Ventas.fecha', fechaLocalAISO(desdeFecha))
            .lt('Ventas.fecha', fechaLocalAISO(hastaFecha, 1))
            .neq('Ventas.estado', 'cancelada')

        if (productosSeleccionados.length > 0) {
            consulta = consulta.in('idProducto', productosSeleccionados)
        }

        const { data, error } = await consulta

        if (error || !data) {
            alert("Error al consultar")
            return
        }

        let ingresos = 0
        let costos = 0

        data.forEach(detalle => {
            ingresos += Number(detalle.PrecioVentaUnitario) * Number(detalle.CantidadUnidades)
            costos += Number(detalle.Productos?.PrecioCompra ?? 0) * Number(detalle.CantidadUnidades)
        })

        setResultado({
            ingresos,
            costos,
            ganancia: ingresos - costos
        })
    }

    return (
        <div className="ganancias-page">
            <h2>Ganancias</h2>

            <div className="ganancias-filtros">
                <div className="ganancias-filtro-campo">
                    <label className="ganancias-filtro-label">Desde</label>
                    <input type="date" onChange={(e) => setDesdeFecha(e.target.value)} />
                </div>
                <div className="ganancias-filtro-campo">
                    <label className="ganancias-filtro-label">Hasta</label>
                    <input type="date" onChange={(e) => setHastaFecha(e.target.value)} />
                </div>
                <div className="ganancias-filtro-campo ganancias-filtro-producto">
                    <label className="ganancias-filtro-label">Producto</label>
                    <input
                        type="search"
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                        placeholder="Buscar producto..."
                    />
                    <button
                        type="button"
                        className={`ganancias-todos ${productosSeleccionados.length === 0 ? 'activo' : ''}`}
                        onClick={() => setProductosSeleccionados([])}
                    >
                        Todos los productos
                    </button>
                    <div className="ganancias-productos-lista">
                        {productosFiltrados.map(producto => (
                            <label key={producto.idProducto} className="ganancias-producto-opcion">
                                <input
                                    type="checkbox"
                                    checked={productosSeleccionados.includes(producto.idProducto)}
                                    onChange={() => alternarProducto(producto.idProducto)}
                                />
                                <span>{producto.Nombre}</span>
                            </label>
                        ))}
                    </div>
                    {productosSeleccionados.length > 0 && (
                        <span className="ganancias-productos-seleccionados">
                            {productosSeleccionados.length} producto(s) seleccionado(s)
                        </span>
                    )}
                </div>
                <button className="btn btn-primary" onClick={consultarGanancias}>
                    Consultar
                </button>
            </div>

            {resultado && (
                <div className="ganancias-resultados">
                    <div className="ganancia-card">
                        <span className="ganancia-card-label">Ingresos</span>
                        <span className="ganancia-card-valor neutro">${resultado.ingresos}</span>
                    </div>
                    <div className="ganancia-card">
                        <span className="ganancia-card-label">Costos</span>
                        <span className="ganancia-card-valor neutro">${resultado.costos}</span>
                    </div>
                    <div className="ganancia-card">
                        <span className="ganancia-card-label">Ganancia neta</span>
                        <span className={`ganancia-card-valor ${resultado.ganancia >= 0 ? 'positivo' : 'negativo'}`}>
                            ${resultado.ganancia}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Ganancias