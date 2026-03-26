// ============================================================
// NULL_SECTOR.Z - RAMA: MEGA DISTRITO (Zonificación Avanzada)
// ============================================================

export const MEGA_DISTRITO = {
    estructuras: [
        // --- SECTOR COMERCIAL (TIENDAS ESPECÍFICAS) ---
        { id: "TIENDA_ARMAS_01", x: 50, z: 50, w: 20, h: 10, d: 25, color: 0x444444, tipo: "TIENDA", subTipo: "ARMERIA", col: true },
        { id: "FARMACIA_01", x: -50, z: 50, w: 15, h: 8, d: 20, color: 0xccffff, tipo: "TIENDA", subTipo: "FARMACIA", col: true },
        { id: "SUPER_01", x: 0, z: 150, w: 40, h: 12, d: 60, color: 0xaaaaaa, tipo: "TIENDA", subTipo: "SUPERMERCADO", col: true },

        // --- DISTRITO RESIDENCIAL MASIVO (CASAS ALEATORIAS) ---
        ...Array.from({length: 100}, (_, i) => ({
            id: `HOME_${i}`, 
            x: -200 + (Math.floor(i/10) * 45), 
            z: -200 - ((i % 10) * 45), 
            w: 15, h: 8, d: 15, 
            color: 0x3d2b1f, tipo: "RESIDENCIAL", subTipo: "CASA", col: true 
        })),

        // --- RASCACIELOS (OBSTÁCULOS Y ESTÉTICA) ---
        ...Array.from({length: 15}, (_, i) => ({
            id: `TOWER_${i}`, x: 300, z: (i * 80) - 400, w: 40, h: 100 + (i*10), d: 40, color: 0x111111, tipo: "DECOR", col: true
        }))
    ]
};
