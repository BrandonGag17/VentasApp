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
            Stock: Number(fila.Stock)
        }))

        const { error } = await supabase
            .from('Productos')
            .insert(productosParaInsertar)

        if (error) {
            alert('Error al importar los productos')
            setCargando(false)
            return
        }

        setCargando(false)
        alert(`${preview.length} productos importados ✅`)
        navigate('/')
    }

    return (
        <div className="form-page">
            <h2>Importar productos desde Excel</h2>

            <div className="form-campos">
                <div className="form-campo">
                    <label className="form-label">Archivo Excel (.xlsx)</label>
                    <input type="file" accept=".xlsx, .xls" onChange={handleArchivo} />
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

            <button
                className="btn btn-primary"
                onClick={importarProductos}
                disabled={cargando}
            >
                {cargando ? 'Importando...' : 'Importar productos'}
            </button>
        </div>
    )
}

export default ImportarProductos