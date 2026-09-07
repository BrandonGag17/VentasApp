export const CATEGORIAS = [
    { nombre: 'PS5', patrones: [/\bps\s*5\b/i, /\bplaystation\s*5\b/i] },
    { nombre: 'PS4', patrones: [/\bps\s*4\b/i, /\bplaystation\s*4\b/i] },
    { nombre: 'Switch 2', patrones: [/\bswitch\s*2\b/i] },
    { nombre: 'Switch', patrones: [/\bnintendo\s*switch\b/i, /\bswitch\b/i] },
    { nombre: '3DS', patrones: [/\b3ds\b/i, /\bnintendo\s*3ds\b/i] },
    { nombre: 'Xbox', patrones: [/\bxbox\b/i] },
    { nombre: 'Auricular', patrones: [/\bauriculares?\b/i, /\bheadsets?\b/i] },
    { nombre: 'POKEMON TCG', patrones: [/\bpokemon\s*tcg\b/i, /\bpokemon\s*(cards?|cartas)\b/i] },
    { nombre: 'TOPPS', patrones: [/\btopps\b/i] },
    { nombre: 'PANINI', patrones: [/\bpanini\b/i] },
    { nombre: 'Ultra Pro', patrones: [/\bultra\s*pro\b/i] },
    { nombre: 'World Tech', patrones: [/\bworld\s*tech\b/i] },
    { nombre: 'Royal Bubbles', patrones: [/\broyal\s*bubbles\b/i] },
    { nombre: 'Neca', patrones: [/\bneca\b/i] },
    { nombre: 'Lego', patrones: [/\blego\b/i] }
]

function normalizar(nombre) {
    return String(nombre ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
}

// El orden de CATEGORIAS define la prioridad: las plataformas se evalúan
// antes que las marcas, por ejemplo "Lego Batman PS4" queda en PS4.
export function obtenerCategoria(nombre) {
    const nombreNormalizado = normalizar(nombre)
    const categoria = CATEGORIAS.find(({ patrones }) =>
        patrones.some(patron => patron.test(nombreNormalizado))
    )

    return categoria?.nombre ?? 'Sin categoría'
}
