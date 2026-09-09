import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'
import './Form.css'

function esNo(valor) {
    return String(valor ?? '').trim().toLowerCase() === 'no'
}

function convertirNumero(valor) {
    if (typeof valor === 'number') return valor
    return Number(String(valor ?? '').trim().replace(',', '.'))
}

function ImportarProductos() {

    const navigate = useNavigate()
    const [preview, setPreview] = useState([])
    const [cargando, setCargando] = useState(false)
    const [productosImportados, setProductosImportados] = useState([])
    function handleArchivo(e) {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = async (event) => {
            const XLSX = await import('xlsx')
            const workbook = XLSX.read(event.target.result, { type: 'binary' })
            const hoja = workbook.Sheets[workbook.SheetNames[0]]
            const filas = XLSX.utils.sheet_to_json(hoja, { header: 1 })

            const productos = filas
                .filter(fila => fila[0] && fila[1] && fila[0] !== 'Tabla 1')
                .map(fila => {
                    const sinPrecioCompra = esNo(fila[2]) || fila[2] === '' || fila[2] == null
                    const cuartoValorEsNo = esNo(fila[3])
                    const stockImportado = convertirNumero(fila[3])

                    return {
                        Nombre: fila[0],
                        PrecioVenta: convertirNumero(fila[1]),
                        PrecioCompra: sinPrecioCompra ? null : convertirNumero(fila[2]),
                        Stock: sinPrecioCompra || cuartoValorEsNo || !Number.isFinite(stockImportado) ? 0 : stockImportado,
                        NombreProveedor: '',
                        TipoProducto: ''
                    }
                })

            setPreview(productos)
        }
        reader.readAsBinaryString(file)
    }

    async function importarProductos() {
        if (preview.length === 0) {
            alert("Primero subí un archivo")
            return
        }

        setCargando(true)

        const productosParaInsertar = preview.map(fila => ({
            Nombre: fila.Nombre,
            PrecioCompra: fila.PrecioCompra == null ? 0 : Number(fila.PrecioCompra),
            PrecioVenta: Number(fila.PrecioVenta),
            NombreProveedor: fila.NombreProveedor,
            TipoProducto: fila.TipoProducto,
            // El stock se agrega por lote luego de crear el producto para que
            // conserve su costo y precio de venta para el cálculo FIFO.
            Stock: 0
        }))

        const { data: productosCreados, error } = await supabase
            .from('Productos')
            .insert(productosParaInsertar)
            .select('idProducto, PrecioCompra, PrecioVenta')

        if (error) {
            alert('Error al importar los productos')
            setCargando(false)
            return
        }

        for (let indice = 0; indice < productosCreados.length; indice += 1) {
            const fila = preview[indice]
            if (Number(fila.Stock) <= 0) continue
            const { error: errorLote } = await supabase.rpc('agregar_lote_stock', {
                p_id_producto: productosCreados[indice].idProducto,
                p_cantidad: Number(fila.Stock),
                p_precio_compra: Number(fila.PrecioCompra ?? 0),
                p_precio_venta: Number(fila.PrecioVenta)
            })
            if (errorLote) {
                alert(`Se importó el producto ${fila.Nombre}, pero no se pudo cargar su lote de stock: ${errorLote.message}`)
            }
        }

        setProductosImportados(productosCreados.map(producto => producto.idProducto))
        setCargando(false)
    }

    async function cancelarImportacion() {
        if (productosImportados.length === 0 || cargando) return

        const confirmar = window.confirm(
            `Se eliminarán los ${productosImportados.length} productos creados por esta importación. ¿Querés continuar?`
        )
        if (!confirmar) return

        setCargando(true)
        const { error } = await supabase
            .from('Productos')
            .delete()
            .in('idProducto', productosImportados)

        setCargando(false)
        if (error) {
            alert(`No se pudo cancelar la importación: ${error.message}`)
            return
        }

        setProductosImportados([])
        setPreview([])
        alert('Importación cancelada. Los productos fueron eliminados.')
    }

    return (
        <div className="form-page">
            <h2>Importar productos desde Excel</h2>

            <div className="form-campos">
                <div className="form-campo">
                    <label className="form-label">Archivo Excel (.xlsx)</label>
                    <input type="file" accept=".xlsx, .xls" onChange={handleArchivo} disabled={cargando || productosImportados.length > 0} />
                </div>
            </div>

            {preview.length > 0 && (
                <div className="form-campo">
                    <label className="form-label">{preview.length} productos encontrados</label>
                    {preview.map((fila, index) => (
                        <p key={index}>
                            {fila.Nombre} — venta: ${fila.PrecioVenta} — compra: {fila.PrecioCompra == null ? 'sin precio' : `$${fila.PrecioCompra}`} — stock: {fila.Stock}
                        </p>
                    ))}
                </div>
            )}

            {productosImportados.length > 0 ? (
                <>
                    <p>{productosImportados.length} productos importados correctamente.</p>
                    <div className="form-acciones">
                        <button className="btn btn-danger" onClick={cancelarImportacion} disabled={cargando}>
                            {cargando ? 'Cancelando...' : 'Cancelar importación'}
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate('/')} disabled={cargando}>
                            Conservar productos
                        </button>
                    </div>
                </>
            ) : (
                <button
                    className="btn btn-primary"
                    onClick={importarProductos}
                    disabled={cargando}
                >
                    {cargando ? 'Importando...' : 'Importar productos'}
                </button>
            )}
        </div>
    )
}

export default ImportarProductos
