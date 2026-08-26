import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './Productos.css'

function Productos() {
    const PRODUCTOS_POR_PAGINA = 40
    const [productos, setProductos] = useState([])
    const navigate = useNavigate()
    const [busqueda, setBusqueda] = useState('')
    const [pagina, setPagina] = useState(0)
    const [hayMasProductos, setHayMasProductos] = useState(true)
    const [cargando, setCargando] = useState(false)

    useEffect(() => {
        const temporizador = setTimeout(() => {
            cargarProductos(0, false, busqueda)
        }, 300)

        return () => clearTimeout(temporizador)
    }, [busqueda])

    async function cargarProductos(numeroPagina, agregar, termino) {
        setCargando(true)
        const { data, error } = await supabase
            .from('Productos')
            .select('idProducto, Nombre, PrecioVenta, PrecioCompra, Stock, ImagenUrl')
            .ilike('Nombre', `%${termino}%`)
            .order('idProducto', { ascending: true })
            .range(numeroPagina * PRODUCTOS_POR_PAGINA, (numeroPagina + 1) * PRODUCTOS_POR_PAGINA - 1)

        if (!error) {
            setProductos(productosActuales => agregar ? [...productosActuales, ...data] : data)
            setPagina(numeroPagina)
            setHayMasProductos(data.length === PRODUCTOS_POR_PAGINA)
        }
        setCargando(false)
    }

    function cargarMasProductos() {
        cargarProductos(pagina + 1, true, busqueda)
    }

    async function exportExcel() {
        if (!productos || productos.length === 0) {
            alert('No hay productos para exportar')
            return
        }

        const XLSX = await import('xlsx')
        const rows = productos.map(p => [
            p.Nombre,
            p.PrecioVenta ?? '',
            p.PrecioCompra ?? ''
        ])

        const ws = XLSX.utils.aoa_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Productos')

        const fileName = `productos_${new Date().toISOString().slice(0,10)}.xlsx`
        XLSX.writeFile(wb, fileName)
    }

    return (
        <div className="productos-page">

            <div className="productos-header">
                <h2>Lista de productos</h2>
                <button className="btn btn-primary" onClick={() => navigate('/crear-producto')}>
                    Crear producto
                </button>
            </div>

            <div className="productos-toolbar">
                <input
                    placeholder="Buscar producto..."
                    onChange={(e) => setBusqueda(e.target.value)}
                />
                <button className="btn btn-secondary" onClick={() => navigate('/importar-productos')}>
                    Importar Excel
                </button>
                <button className="btn btn-secondary" onClick={exportExcel}>
                    Exportar Excel
                </button>
            </div>

            <div className="productos-lista">
                {productos.map(prod => (
                    <button className="producto-item" key={prod.idProducto} onClick={() => navigate(`/producto/${prod.idProducto}`)}>
                        {prod.ImagenUrl && (
                            <img src={prod.ImagenUrl} alt={prod.Nombre} />
                        )}
                        {prod.Nombre}
                    </button>
                ))}
            </div>

            {hayMasProductos && (
                <button className="btn btn-secondary" onClick={cargarMasProductos} disabled={cargando}>
                    {cargando ? 'Cargando...' : 'Cargar más'}
                </button>
            )}

        </div>
    )
}

export default Productos