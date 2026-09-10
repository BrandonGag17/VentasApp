import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './Form.css'

function CrearCliente() {

    const navigate = useNavigate()

    const [Nombre, setNombre] = useState('')
    const [Apellido, setApellido] = useState('')
    const [Telefono, setTelefono] = useState('')
    const [Email, setEmail] = useState('')
    const [guardando, setGuardando] = useState(false)

    function normalizar(texto) {
        return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')
    }

    async function agregarCliente(cliente) {
        setGuardando(true)
        const { data: posiblesDuplicados, error: errorBusqueda } = await supabase
            .from('Clientes')
            .select('idCliente, Nombre, Apellido')
            .ilike('Nombre', cliente.Nombre)
        if (errorBusqueda) {
            setGuardando(false)
            alert('No se pudo validar el cliente')
            return
        }
        if (posiblesDuplicados?.some(item => normalizar(item.Nombre) === normalizar(cliente.Nombre) && normalizar(item.Apellido) === normalizar(cliente.Apellido))) {
            setGuardando(false)
            alert('Ya existe un cliente con ese nombre y apellido')
            return
        }

        const { error } = await supabase
            .from('Clientes')
            .insert([cliente])
            .select()

        if (error) {
            setGuardando(false)
            alert("Error al crear cliente")
            return
        }

        alert("Cliente creado ✅")
        navigate('/clientes')
    }

    const manejarSubmit = (e) => {
        e.preventDefault()
        const nombre = Nombre.trim()
        const apellido = Apellido.trim()
        const email = Email.trim()
        if (!nombre) return alert('El nombre es obligatorio')
        if (email && !/^\S+@\S+\.\S+$/.test(email)) return alert('Ingresá un email válido')

        const cliente = {
            Nombre: nombre,
            Apellido: apellido,
            Telefono: Telefono.trim(),
            Email: email
        }

        agregarCliente(cliente)
    }

    return (
        <form className="form-page" onSubmit={manejarSubmit}>
            <h2>Nuevo cliente</h2>

            <div className="form-campos">

                <div className="form-campo">
                    <label className="form-label">Nombre</label>
                    <input placeholder="Nombre" required onChange={(e) => setNombre(e.target.value)} />
                </div>

                <div className="form-campo">
                    <label className="form-label">Apellido</label>
                    <input placeholder="Apellido" onChange={(e) => setApellido(e.target.value)} />
                </div>

                <div className="form-campo">
                    <label className="form-label">Teléfono</label>
                    <input placeholder="Teléfono" onChange={(e) => setTelefono(e.target.value)} />
                </div>

                <div className="form-campo">
                    <label className="form-label">Email</label>
                    <input placeholder="Email" type="email" onChange={(e) => setEmail(e.target.value)} />
                </div>

            </div>

            <button className="btn btn-primary" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Agregar cliente'}</button>

        </form>
    )
}

export default CrearCliente
