import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './DetalleCliente.css'

function DetalleCliente() {
    const navigate = useNavigate()
    const { id } = useParams()
    const [cliente, setCliente] = useState(null)
    const [form, setForm] = useState(null)
    const [editando, setEditando] = useState(false)

    useEffect(() => {
        async function traerCliente() {
            const { data, error } = await supabase
                .from('Clientes')
                .select('idCliente, Nombre, Apellido, Telefono, Email')
                .eq('idCliente', id)
                .single()

            if (error) {
                console.error(error)
                return
            }

            setCliente(data)
            setForm(data)
        }

        traerCliente()
    }, [id])

    async function guardarCambios() {
        const datosActualizados = {
            Nombre: form.Nombre,
            Apellido: form.Apellido,
            Telefono: form.Telefono,
            Email: form.Email
        }

        const { data, error } = await supabase
            .from('Clientes')
            .update(datosActualizados)
            .eq('idCliente', id)
            .select('idCliente, Nombre, Apellido, Telefono, Email')
            .single()

        if (error) {
            alert('Error al guardar')
            return
        }

        setCliente(data)
        setForm(data)
        setEditando(false)
        alert('Cliente guardado ✅')
    }

    async function eliminarCliente() {
        if (!window.confirm(`¿Seguro que querés eliminar a ${cliente.Nombre}?`)) return

        const { data: ventas, error: errorVentas } = await supabase
            .from('Ventas')
            .select('idVenta')
            .eq('idCliente', id)

        if (errorVentas) {
            alert('Error al verificar las ventas del cliente')
            return
        }

        if (ventas.length > 0) {
            alert('No podés eliminar este cliente porque tiene ventas registradas.')
            return
        }

        const { error } = await supabase
            .from('Clientes')
            .delete()
            .eq('idCliente', id)

        if (error) {
            alert('Error al eliminar')
            return
        }

        alert('Cliente eliminado ✅')
        navigate('/clientes')
    }

    if (!cliente || !form) return <p>Cargando...</p>

    return (
        <div className="detalle-cliente-page">
            <p className="detalle-cliente-id">ID #{cliente.idCliente}</p>
            <h2>{cliente.Nombre} {cliente.Apellido}</h2>

            <div className="detalle-cliente-campos">
                <div className="campo-fila">
                    <span className="campo-label">Nombre</span>
                    {editando ? (
                        <input value={form.Nombre || ''} onChange={(e) => setForm({ ...form, Nombre: e.target.value })} />
                    ) : (
                        <p className="campo-valor">{cliente.Nombre}</p>
                    )}
                </div>

                <div className="campo-fila">
                    <span className="campo-label">Apellido</span>
                    {editando ? (
                        <input value={form.Apellido || ''} onChange={(e) => setForm({ ...form, Apellido: e.target.value })} />
                    ) : (
                        <p className="campo-valor">{cliente.Apellido || 'Sin apellido'}</p>
                    )}
                </div>

                <div className="campo-fila">
                    <span className="campo-label">Teléfono</span>
                    {editando ? (
                        <input value={form.Telefono || ''} onChange={(e) => setForm({ ...form, Telefono: e.target.value })} />
                    ) : (
                        <p className="campo-valor">{cliente.Telefono || 'Sin teléfono'}</p>
                    )}
                </div>

                <div className="campo-fila">
                    <span className="campo-label">Email</span>
                    {editando ? (
                        <input type="email" value={form.Email || ''} onChange={(e) => setForm({ ...form, Email: e.target.value })} />
                    ) : (
                        <p className="campo-valor">{cliente.Email || 'Sin email'}</p>
                    )}
                </div>
            </div>

            <div className="detalle-cliente-acciones">
                {editando ? (
                    <>
                        <button className="btn btn-primary" onClick={guardarCambios}>Guardar</button>
                        <button className="btn btn-secondary" onClick={() => { setForm(cliente); setEditando(false) }}>Cancelar</button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-secondary" onClick={() => setEditando(true)}>Editar</button>
                        <button className="btn btn-danger" onClick={eliminarCliente}>Eliminar</button>
                    </>
                )}
            </div>
        </div>
    )
}

export default DetalleCliente
