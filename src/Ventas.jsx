import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './Lista.css'

function Ventas() {

    const [ventas, setVentas] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        async function cargarVentas() {
            const { data, error } = await supabase
                .from('Ventas')
                .select('idVenta, fecha, total, estado, Clientes(Nombre, Apellido)')
                .order('fecha', { ascending: false })

            if (!error) setVentas(data)
        }
        cargarVentas()
    }, [])
    async function eliminarVenta(idVenta) {
        const confirmar = window.confirm(
            "¿Estás seguro de que querés eliminar esta venta?"
        )

        if (!confirmar) return

        const { error } = await supabase
            .from('Ventas')
            .delete()
            .eq('idVenta', idVenta)

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

            <div className="lista-items">
                {ventas.map(venta => (
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
            </div>

        </div>
    )
}

export default Ventas