import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { obtenerCategoria, obtenerCategorias } from './categorias'
import './ExportarProductos.css'

const COLUMNAS = [
    { clave: 'idProducto', etiqueta: 'ID' },
    { clave: 'Nombre', etiqueta: 'Nombre' },
    { clave: 'PrecioCompra', etiqueta: 'Precio de compra' },
    { clave: 'PrecioVenta', etiqueta: 'Precio de venta' },
    { clave: 'Stock', etiqueta: 'Stock' },
    { clave: 'NombreProveedor', etiqueta: 'Proveedor' },
    { clave: 'TipoProducto', etiqueta: 'Tipo' }
]

async function obtenerTodosLosProductos() {
    const productos = []
    const tamanoLote = 1000
    let pagina = 0
    let quedanProductos = true

    while (quedanProductos) {
        const { data, error } = await supabase
            .from('Productos')
            .select('idProducto, Nombre, PrecioCompra, PrecioVenta, Stock, NombreProveedor, TipoProducto')
            .order('idProducto', { ascending: true })
            .range(pagina * tamanoLote, (pagina + 1) * tamanoLote - 1)
        if (error) throw error
        productos.push(...data)
        quedanProductos = data.length === tamanoLote
        pagina += 1
    }
    return productos
}

function ExportarProductos() {
    const navigate = useNavigate()
    const [productos, setProductos] = useState([])
    const [seleccionados, setSeleccionados] = useState([])
    const [columnas, setColumnas] = useState(['Nombre', 'PrecioCompra', 'PrecioVenta', 'Stock'])
    const [busqueda, setBusqueda] = useState('')
    const [categoria, setCategoria] = useState('Todas')
    const [cargando, setCargando] = useState(true)
    const [exportando, setExportando] = useState(false)

    useEffect(() => {
        obtenerTodosLosProductos()
            .then(setProductos)
            .catch(() => alert('No se pudieron cargar los productos'))
            .finally(() => setCargando(false))
    }, [])

    const productosFiltrados = useMemo(() => {
        const termino = busqueda.trim().toLocaleLowerCase('es')
        return productos.filter(producto =>
            (categoria === 'Todas' || obtenerCategoria(producto.Nombre, producto.TipoProducto) === categoria) &&
            (!termino || String(producto.Nombre ?? '').toLocaleLowerCase('es').includes(termino))
        )
    }, [productos, busqueda, categoria])

    const idsCategoria = productos
        .filter(producto => categoria === 'Todas' || obtenerCategoria(producto.Nombre, producto.TipoProducto) === categoria)
        .map(producto => producto.idProducto)

    function alternarProducto(idProducto) {
        setSeleccionados(actuales => actuales.includes(idProducto)
            ? actuales.filter(id => id !== idProducto)
            : [...actuales, idProducto])
    }

    function alternarColumna(clave) {
        setColumnas(actuales => actuales.includes(clave)
            ? actuales.filter(columna => columna !== clave)
            : [...actuales, clave])
    }

    async function exportar() {
        if (seleccionados.length === 0) return alert('Seleccioná al menos un producto')
        if (columnas.length === 0) return alert('Elegí al menos un atributo para exportar')

        setExportando(true)
        const seleccion = productos.filter(producto => seleccionados.includes(producto.idProducto))
        const columnasElegidas = COLUMNAS.filter(columna => columnas.includes(columna.clave))
        const XLSX = await import('xlsx')
        const filas = seleccion.map(producto => Object.fromEntries(
            columnasElegidas.map(columna => [columna.etiqueta, producto[columna.clave] ?? ''])
        ))
        const hoja = XLSX.utils.json_to_sheet(filas, { header: columnasElegidas.map(columna => columna.etiqueta) })
        const libro = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(libro, hoja, 'Productos')
        XLSX.writeFile(libro, `productos_${new Date().toISOString().slice(0, 10)}.xlsx`)
        setExportando(false)
    }

    return (
        <div className="exportar-page">
            <div className="exportar-header">
                <div><h2>Exportar productos</h2><p>Elegí productos y las columnas del archivo Excel.</p></div>
                <button className="btn btn-secondary" onClick={() => navigate('/')}>Volver</button>
            </div>

            <section className="exportar-panel">
                <h3>Columnas del Excel</h3>
                <div className="exportar-columnas">
                    {COLUMNAS.map(columna => <label key={columna.clave}><input type="checkbox" checked={columnas.includes(columna.clave)} onChange={() => alternarColumna(columna.clave)} /> {columna.etiqueta}</label>)}
                </div>
            </section>

            <section className="exportar-panel">
                <div className="exportar-filtros"><input type="search" placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} /><select value={categoria} onChange={e => setCategoria(e.target.value)}><option>Todas</option>{obtenerCategorias(productos).map(item => <option key={item}>{item}</option>)}</select></div>
                <div className="exportar-acciones"><button type="button" className="btn btn-secondary" onClick={() => setSeleccionados(actuales => [...new Set([...actuales, ...idsCategoria])])}>Seleccionar toda la categoría</button><button type="button" className="btn btn-secondary" onClick={() => setSeleccionados(actuales => actuales.filter(id => !idsCategoria.includes(id)))}>Deseleccionar categoría</button><span>{seleccionados.length} producto(s) seleccionado(s)</span></div>
                <div className="exportar-productos">
                    {cargando ? <p>Cargando productos...</p> : productosFiltrados.map(producto => <label className="exportar-producto" key={producto.idProducto}><input type="checkbox" checked={seleccionados.includes(producto.idProducto)} onChange={() => alternarProducto(producto.idProducto)} /><span>{producto.Nombre}</span><small>{obtenerCategoria(producto.Nombre, producto.TipoProducto)}</small></label>)}
                </div>
            </section>
            <button className="btn btn-primary" onClick={exportar} disabled={exportando}>{exportando ? 'Exportando...' : 'Descargar Excel'}</button>
        </div>
    )
}

export default ExportarProductos
