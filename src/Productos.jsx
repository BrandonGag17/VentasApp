import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { CATEGORIAS, obtenerCategoria } from './categorias'
import './Productos.css'

function Productos() {
    const PRODUCTOS_POR_PAGINA = 40
    const [productos, setProductos] = useState([])
    const navigate = useNavigate()
    const [busqueda, setBusqueda] = useState('')
    const [pagina, setPagina] = useState(0)
    const [hayMasProductos, setHayMasProductos] = useState(true)
    const [cargando, setCargando] = useState(false)
    const [categoriaActiva, setCategoriaActiva] = useState('Todas')
    const productosDeCategoria = useRef([])
    const solicitudActual = useRef(0)

    useEffect(() => {
        const temporizador = setTimeout(() => {
            cargarProductos(0, false, busqueda, categoriaActiva)
        }, 300)

        return () => clearTimeout(temporizador)
        // cargarProductos se declara en el componente porque usa el estado actual.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busqueda, categoriaActiva])

    async function cargarProductos(numeroPagina, agregar, termino, categoria = categoriaActiva) {
        if (agregar && categoria !== 'Todas') {
            const inicio = numeroPagina * PRODUCTOS_POR_PAGINA
            const siguientePagina = productosDeCategoria.current.slice(inicio, inicio + PRODUCTOS_POR_PAGINA)
            setProductos(productosActuales => [...productosActuales, ...siguientePagina])
            setPagina(numeroPagina)
            setHayMasProductos(productosDeCategoria.current.length > inicio + PRODUCTOS_POR_PAGINA)
            return
        }

        setCargando(true)
        const idSolicitud = ++solicitudActual.current

        if (categoria !== 'Todas') {
            const productosCoincidentes = []
            const TAMANO_LOTE = 1000
            let paginaConsulta = 0
            let quedanProductos = true

            while (quedanProductos) {
                const { data, error } = await supabase
                    .from('Productos')
                    .select('idProducto, Nombre, PrecioVenta, PrecioCompra, Stock, ImagenUrl')
                    .ilike('Nombre', `%${termino}%`)
                    .order('idProducto', { ascending: true })
                    .range(paginaConsulta * TAMANO_LOTE, (paginaConsulta + 1) * TAMANO_LOTE - 1)

                if (error || idSolicitud !== solicitudActual.current) {
                    if (idSolicitud === solicitudActual.current) setCargando(false)
                    return
                }

                productosCoincidentes.push(...data.filter(producto => obtenerCategoria(producto.Nombre) === categoria))
                quedanProductos = data.length === TAMANO_LOTE
                paginaConsulta += 1
            }

            productosDeCategoria.current = productosCoincidentes
            setProductos(productosCoincidentes.slice(0, PRODUCTOS_POR_PAGINA))
            setPagina(0)
            setHayMasProductos(productosCoincidentes.length > PRODUCTOS_POR_PAGINA)
            setCargando(false)
            return
        }

        const { data, error } = await supabase
            .from('Productos')
            .select('idProducto, Nombre, PrecioVenta, PrecioCompra, Stock, ImagenUrl')
            .ilike('Nombre', `%${termino}%`)
            .order('idProducto', { ascending: true })
            .range(numeroPagina * PRODUCTOS_POR_PAGINA, (numeroPagina + 1) * PRODUCTOS_POR_PAGINA - 1)

        if (!error && idSolicitud === solicitudActual.current) {
            setProductos(productosActuales => agregar ? [...productosActuales, ...data] : data)
            setPagina(numeroPagina)
            setHayMasProductos(data.length === PRODUCTOS_POR_PAGINA)
        }
        setCargando(false)
    }

    function cargarMasProductos() {
        cargarProductos(pagina + 1, true, busqueda, categoriaActiva)
    }

    return (
        <div className="productos-page">
            <div className="productos-header">
                <h2>Lista de productos</h2>
                <button className="btn btn-primary" onClick={() => navigate('/crear-producto')}>Crear producto</button>
            </div>

            <div className="productos-toolbar">
                <input placeholder="Buscar producto..." onChange={(e) => setBusqueda(e.target.value)} />
                <button className="btn btn-secondary" onClick={() => navigate('/importar-productos')}>Importar Excel</button>
                <button className="btn btn-secondary" onClick={() => navigate('/exportar-productos')}>Exportar Excel</button>
            </div>

            <div className="categorias" aria-label="Filtrar productos por categoría">
                <button className={`categoria-filtro ${categoriaActiva === 'Todas' ? 'categoria-filtro-activa' : ''}`} onClick={() => setCategoriaActiva('Todas')}>Todas</button>
                {CATEGORIAS.map(categoria => (
                    <button
                        className={`categoria-filtro ${categoriaActiva === categoria.nombre ? 'categoria-filtro-activa' : ''}`}
                        key={categoria.nombre}
                        onClick={() => setCategoriaActiva(categoria.nombre)}
                    >
                        {categoria.nombre}
                    </button>
                ))}
            </div>

            <div className="productos-lista">
                {productos.map(prod => (
                    <button className="producto-item" key={prod.idProducto} onClick={() => navigate(`/producto/${prod.idProducto}`)}>
                        {prod.ImagenUrl && <img src={prod.ImagenUrl} alt={prod.Nombre} />}
                        <span>{prod.Nombre}</span>
                        <span className="producto-categoria">{obtenerCategoria(prod.Nombre)}</span>
                    </button>
                ))}
            </div>

            {!cargando && productos.length === 0 && <p className="productos-vacios">No hay productos en esta categoría.</p>}

            {hayMasProductos && (
                <button className="btn btn-secondary" onClick={cargarMasProductos} disabled={cargando}>
                    {cargando ? 'Cargando...' : 'Cargar más'}
                </button>
            )}
        </div>
    )
}

export default Productos
