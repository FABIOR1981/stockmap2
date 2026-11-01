// StockMap · Plano del depósito y cálculo de rutas.
//
// El depósito es una cuadrícula de celdas:
// - Las estanterías son bloques que no se pueden atravesar (cada una ocupa ANCHO x ALTO celdas).
// - Todo lo demás es espacio libre: calles, pasillos y los lados de cada estantería.
// - La entrada está en la pared izquierda, a mitad de altura.
// - La ruta es el camino más corto (búsqueda en anchura) desde la entrada hasta cualquier celda
//   libre que toque un lado de la estantería destino. Así la ruta rodea las estanterías por el lado más cercano.
// - Al agregar una estantería, solo cambia la cuadrícula: no hay caminos que recrear a mano.
//
// Las estanterías se agrupan de ESTANTERIAS_POR_PASILLO en ESTANTERIAS_POR_PASILLO (A–E, F–J, ...),
// y cada grupo es una columna de bloques.
//
// No depende de la interfaz de persistencia: recibe la lista de ubicaciones ya cargada.

(function () {
  const ESTANTERIAS_POR_PASILLO = 5;
  const ANCHO = 5; // celdas que ocupa una estantería (de izquierda a derecha)
  const ALTO = 2; // celdas que ocupa una estantería (de arriba abajo)
  const SEPARACION_PASILLOS = 8; // celdas desde el inicio de un pasillo al siguiente
  const ALTO_FILA = 3; // celdas por fila de estanterías: estantería + calle de paso
  const esNumero = (texto) => /^\d+$/.test(String(texto || "").trim());

  function construirPlano(ubicaciones) {
    const estanterias = [...new Set(ubicaciones.map((u) => u.pasillo))].sort((a, b) =>
      a.localeCompare(b, "es")
    );
    const bandas = {};
    estanterias.forEach((letra, k) => {
      const corredor = Math.floor(k / ESTANTERIAS_POR_PASILLO);
      const fila = k % ESTANTERIAS_POR_PASILLO;
      const x0 = 2 + SEPARACION_PASILLOS * corredor;
      const y0 = 1 + ALTO_FILA * fila;
      bandas[letra] = { corredor, fila, x0, y0, x1: x0 + ANCHO - 1, y1: y0 + ALTO - 1 };
    });

    const corredores = estanterias.length ? Math.floor((estanterias.length - 1) / ESTANTERIAS_POR_PASILLO) + 1 : 0;
    const filas = Math.min(ESTANTERIAS_POR_PASILLO, estanterias.length);
    const W = corredores ? 2 + SEPARACION_PASILLOS * (corredores - 1) + ANCHO + 2 : 4;
    const H = filas ? 1 + ALTO_FILA * filas + 1 : 4;

    const obstaculos = new Set();
    Object.values(bandas).forEach((b) => {
      for (let x = b.x0; x <= b.x1; x++) for (let y = b.y0; y <= b.y1; y++) obstaculos.add(`${x},${y}`);
    });

    const conPosicion = ubicaciones.filter((u) => esNumero(u.estante));
    const sinPosicion = ubicaciones.filter((u) => !esNumero(u.estante));
    const maxEstante = conPosicion.reduce((m, u) => Math.max(m, parseInt(u.estante, 10)), 0);

    return {
      estanterias,
      bandas,
      obstaculos,
      W,
      H,
      entrada: { x: 0, y: Math.floor(H / 2) },
      corredores,
      filasPorPasillo: filas,
      maxEstante,
      conPosicion,
      sinPosicion,
    };
  }

  // Camino más corto (en pasos de celda) desde la entrada hasta un lado libre de la estantería destino.
  // Devuelve { puntos, pasos } o null si la ubicación no tiene posición en el plano.
  function calcularRuta(plano, ubicacion) {
    const banda = plano.bandas[ubicacion.pasillo];
    if (!banda || !esNumero(ubicacion.estante)) return null;

    const dentroDeBanda = (x, y) => x >= banda.x0 && x <= banda.x1 && y >= banda.y0 && y <= banda.y1;
    const libre = (x, y) =>
      x >= 0 && y >= 0 && x < plano.W && y < plano.H && !plano.obstaculos.has(`${x},${y}`);
    const vecinos = (x, y) => [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    // Un lado de la estantería: celda libre que toca la estantería destino.
    const esLadoDestino = (x, y) => libre(x, y) && vecinos(x, y).some(([nx, ny]) => dentroDeBanda(nx, ny));

    const inicio = plano.entrada;
    const clave = (x, y) => `${x},${y}`;
    const previa = new Map([[clave(inicio.x, inicio.y), null]]);
    const cola = [inicio];
    let fin = null;

    while (cola.length) {
      const actual = cola.shift();
      if (esLadoDestino(actual.x, actual.y)) {
        fin = actual;
        break;
      }
      for (const [nx, ny] of vecinos(actual.x, actual.y)) {
        const k = clave(nx, ny);
        if (!previa.has(k) && libre(nx, ny)) {
          previa.set(k, actual);
          cola.push({ x: nx, y: ny });
        }
      }
    }
    if (!fin) return null;

    const puntos = [];
    for (let p = fin; p; p = previa.get(clave(p.x, p.y))) puntos.unshift({ x: p.x, y: p.y });

    return {
      puntos,
      pasos: [
        "Entrá por la entrada del depósito, por la pared izquierda.",
        `Caminá por el depósito hasta el lado más cercano de la estantería ${ubicacion.pasillo}.`,
        `Buscá el estante ${ubicacion.estante}, división ${ubicacion.nivel}, en la vista de frente de la estantería ${ubicacion.pasillo}.`,
      ],
    };
  }

  // Vista de frente de una estantería: estantes (filas) y divisiones (columnas).
  function construirEstanteria(ubicaciones, estanteria) {
    const propias = ubicaciones.filter((u) => u.pasillo === estanteria);
    const estantes = [...new Set(propias.filter((u) => esNumero(u.estante)).map((u) => parseInt(u.estante, 10)))].sort(
      (a, b) => a - b
    );
    const divisiones = [...new Set(propias.map((u) => u.nivel))].sort((a, b) => a.localeCompare(b, "es"));
    const celdas = propias.filter((u) => esNumero(u.estante));
    return { estanteria, estantes, divisiones, celdas };
  }

  window.Plano = { construirPlano, calcularRuta, construirEstanteria };
})();
