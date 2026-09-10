import { useMemo, useState } from 'react'
import { obtenerCategoria, obtenerCategorias } from './categorias'
import './FiltroProductos.css'

function FiltroProductos({ productos, seleccionados, onChange }) {
    const [busqueda, setBusqueda] = useState('')
    const [categoria, setCategoria] = useState('Todas')

    const productosFiltrados = useMemo(() => {
        const termino = busqueda.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')
        return productos.filter(producto =>
            (categoria === 'Todas' || obtenerCategoria(producto.Nombre, producto.TipoProducto) === categoria) &&
            (!termino || String(producto.Nombre ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').includes(termino))
        )
    }, [productos, busqueda, categoria])

    const idsDeCategoria = productos
        .filter(producto => categoria === 'Todas' || obtenerCategoria(producto.Nombre, producto.TipoProducto) === categoria)
        .map(producto => producto.idProducto)

    const productosSeleccionados = productos.filter(producto => seleccionados.includes(producto.idProducto))

    function alternarProducto(idProducto) {
        onChange(seleccionados.includes(idProducto)
            ? seleccionados.filter(id => id !== idProducto)
            : [...seleccionados, idProducto]
        )
    }

    function seleccionarCategoria() {
        onChange([...new Set([...seleccionados, ...idsDeCategoria])])
    }

    return (
        <>
            <div className="filtro-productos">
                <label className="filtro-productos-label" htmlFor="buscar-producto">Filtrar por producto</label>
                <input
                    id="buscar-producto"
                    type="search"
                    value={busqueda}
                    onChange={evento => setBusqueda(evento.target.value)}
                    placeholder="Buscar producto..."
                />
                <select value={categoria} onChange={evento => setCategoria(evento.target.value)} aria-label="Filtrar productos por categoría">
                    <option value="Todas">Todas las categorías</option>
                    {obtenerCategorias(productos).map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                <div className="filtro-productos-acciones">
                    <button type="button" onClick={seleccionarCategoria} disabled={idsDeCategoria.length === 0}>
                        Seleccionar toda la categoría
                    </button>
                    <button type="button" onClick={() => onChange([])} disabled={seleccionados.length === 0}>
                        Deseleccionar todos
                    </button>
                </div>
                <div className="filtro-productos-lista">
                    {productosFiltrados.map(producto => (
                        <label key={producto.idProducto}>
                            <input
                                type="checkbox"
                                checked={seleccionados.includes(producto.idProducto)}
                                onChange={() => alternarProducto(producto.idProducto)}
                            />
                            <span>{producto.Nombre}</span>
                            <small>{obtenerCategoria(producto.Nombre, producto.TipoProducto)}</small>
                        </label>
                    ))}
                    {productosFiltrados.length === 0 && <span className="filtro-productos-vacio">No hay productos para mostrar.</span>}
                </div>
            </div>

            {productosSeleccionados.length > 0 && (
                <aside className="productos-seleccionados-popup" aria-label="Productos seleccionados">
                    <strong>Productos seleccionados ({productosSeleccionados.length})</strong>
                    <div>
                        {productosSeleccionados.map(producto => (
                            <label key={producto.idProducto}>
                                <input type="checkbox" checked onChange={() => alternarProducto(producto.idProducto)} />
                                <span>{producto.Nombre}</span>
                            </label>
                        ))}
                    </div>
                </aside>
            )}
        </>
    )
}

export default FiltroProductos
