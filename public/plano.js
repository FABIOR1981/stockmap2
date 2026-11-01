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

  // Camino más corto (en pasos de celda) desde la entrada hasta el frente de la estantería destino.
  // Devuelve { puntos, pasos } o null si la ubicación no tiene posición en el plano.
  function calcularRuta(plano, ubicacion) {
    const banda = plano.bandas[ubicacion.pasillo];
    if (!banda || !esNumero(ubicacion.estante)) return null;

    const libre = (x, y) =>
      x >= 0 && y >= 0 && x < plano.W && y < plano.H && !plano.obstaculos.has(`${x},${y}`);
    const vecinos = (x, y) => [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    // Frente de la estantería: la cara donde se leen los estantes y las divisiones (la que se ve en la vista de frente
    // y en el recuadro de detalle). Es la fila libre justo debajo de la estantería en el plano.
    const esFrenteDestino = (x, y) => libre(x, y) && y === banda.y1 + 1 && x >= banda.x0 && x <= banda.x1;

    const inicio = plano.entrada;
    const clave = (x, y) => `${x},${y}`;
    const previa = new Map([[clave(inicio.x, inicio.y), null]]);
    const cola = [inicio];
    let fin = null;

    while (cola.length) {
      const actual = cola.shift();
      if (esFrenteDestino(actual.x, actual.y)) {
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
        `Caminá hasta el frente de la estantería ${ubicacion.pasillo}, donde se leen los estantes y las divisiones.`,
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

  // ---------------------------------------------------------------
  // Recorrido por varias ubicaciones: desde la entrada, pasando por el frente de cada una, en el orden más corto.
  // ---------------------------------------------------------------

  const MAX_PARADAS = 12; // con más paradas, el cálculo exacto se vuelve lento

  // Celdas libres delante del frente de una estantería.
  function celdasFrente(plano, letra) {
    const b = plano.bandas[letra];
    const celdas = [];
    if (!b) return celdas;
    const y = b.y1 + 1;
    for (let x = b.x0; x <= b.x1; x++) {
      if (y < plano.H && !plano.obstaculos.has(`${x},${y}`)) celdas.push({ x, y });
    }
    return celdas;
  }

  // Búsqueda en anchura desde uno o varios puntos de partida. Devuelve distancias y punto anterior de cada celda.
  function bfs(plano, origenes) {
    const clave = (x, y) => `${x},${y}`;
    const dist = new Map();
    const previa = new Map();
    const cola = [];
    origenes.forEach((c) => {
      dist.set(clave(c.x, c.y), 0);
      previa.set(clave(c.x, c.y), null);
      cola.push(c);
    });
    for (let i = 0; i < cola.length; i++) {
      const a = cola[i];
      const d = dist.get(clave(a.x, a.y));
      for (const [nx, ny] of [[a.x + 1, a.y], [a.x - 1, a.y], [a.x, a.y + 1], [a.x, a.y - 1]]) {
        const k = clave(nx, ny);
        if (dist.has(k) || nx < 0 || ny < 0 || nx >= plano.W || ny >= plano.H || plano.obstaculos.has(k)) continue;
        dist.set(k, d + 1);
        previa.set(k, a);
        cola.push({ x: nx, y: ny });
      }
    }
    return { dist, previa };
  }

  // Camino desde el origen de una búsqueda hasta `destino` (incluye ambos extremos).
  function caminoHasta(previa, destino) {
    const camino = [];
    for (let p = destino; p; p = previa.get(`${p.x},${p.y}`)) camino.unshift({ x: p.x, y: p.y });
    return camino;
  }

  // Orden de visita más corto (programación dinámica sobre subconjuntos): empieza en la entrada y no vuelve.
  function ordenOptimo(distancias, inicio) {
    const n = inicio.length;
    const llena = (1 << n) - 1;
    const costo = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));
    const anterior = Array.from({ length: 1 << n }, () => new Array(n).fill(-1));
    for (let i = 0; i < n; i++) costo[1 << i][i] = inicio[i];
    for (let mascara = 1; mascara <= llena; mascara++) {
      for (let ultimo = 0; ultimo < n; ultimo++) {
        const c = costo[mascara][ultimo];
        if (c === Infinity) continue;
        for (let sig = 0; sig < n; sig++) {
          if (mascara & (1 << sig)) continue;
          const nueva = mascara | (1 << sig);
          const valor = c + distancias[ultimo][sig];
          if (valor < costo[nueva][sig]) {
            costo[nueva][sig] = valor;
            anterior[nueva][sig] = ultimo;
          }
        }
      }
    }
    let fin = 0;
    for (let i = 1; i < n; i++) if (costo[llena][i] < costo[llena][fin]) fin = i;
    const orden = [];
    let mascara = llena;
    let actual = fin;
    while (actual !== -1) {
      orden.unshift(actual);
      const previo = anterior[mascara][actual];
      mascara ^= 1 << actual;
      actual = previo;
    }
    return orden;
  }

  // Recorrido por varias ubicaciones. Devuelve el orden de visita, el camino celda por celda y los pasos.
  // `ubicaciones`: lista de ubicaciones con posición en el plano (sin repetir). Devuelve null si no hay ruta posible.
  function planificarRecorrido(plano, ubicaciones, opciones = {}) {
    const paradas = ubicaciones.filter((u) => plano.bandas[u.pasillo] && esNumero(u.estante));
    if (!paradas.length) return null;
    if (paradas.length > MAX_PARADAS) throw new Error(`Hasta ${MAX_PARADAS} ubicaciones por recorrido.`);

    const frentes = paradas.map((u) => celdasFrente(plano, u.pasillo));
    const distanciaDesde = (origenes) => {
      const r = bfs(plano, origenes);
      return (celdas) => celdas.reduce((m, c) => Math.min(m, r.dist.get(`${c.x},${c.y}`) ?? Infinity), Infinity);
    };
    // Distancias entre paradas (aproximadas al frente más cercano) y desde la entrada, para elegir el orden.
    const matriz = paradas.map((_, i) => {
      const dA = distanciaDesde(frentes[i]);
      return frentes.map((f) => dA(f));
    });
    const desdeEntrada = distanciaDesde([plano.entrada]);
    const orden = ordenOptimo(matriz, frentes.map((f) => desdeEntrada(f)));

    // Camino real: desde la posición actual hasta el frente más cercano de la siguiente parada.
    const puntos = [{ x: plano.entrada.x, y: plano.entrada.y }];
    const paradasEnRuta = [];
    let actual = plano.entrada;
    let longitud = 0;
    orden.forEach((idx, n) => {
      const r = bfs(plano, [actual]);
      let mejor = null;
      frentes[idx].forEach((c) => {
        const d = r.dist.get(`${c.x},${c.y}`);
        if (d !== undefined && (!mejor || d < mejor.d)) mejor = { c, d };
      });
      if (!mejor) return;
      const tramo = caminoHasta(r.previa, mejor.c).slice(1);
      tramo.forEach((p) => puntos.push(p));
      longitud += mejor.d;
      actual = mejor.c;
      paradasEnRuta.push({ x: mejor.c.x, y: mejor.c.y, n: n + 1, ubicacion: paradas[idx] });
    });

    // Camino de vuelta: desde la última parada hasta la entrada.
    let retorno = [];
    if (opciones.retorno && paradasEnRuta.length) {
      const r = bfs(plano, [actual]);
      retorno = caminoHasta(r.previa, plano.entrada).slice(1);
      longitud += r.dist.get(`${plano.entrada.x},${plano.entrada.y}`) ?? 0;
    }

    const pasos = [
      "Entrá por la entrada del depósito, por la pared izquierda.",
      ...paradasEnRuta.map(
        (p) =>
          `${p.n}. Caminá hasta el frente de la estantería ${p.ubicacion.pasillo} y buscá el estante ${p.ubicacion.estante}, división ${p.ubicacion.nivel}.`
      ),
    ];
    if (retorno.length) pasos.push(`${paradasEnRuta.length + 1}. Volvé a la entrada por el mismo camino.`);
    return {
      orden: paradasEnRuta.map((p) => p.ubicacion),
      puntos,
      retorno,
      paradas: paradasEnRuta,
      pasos,
      longitud,
    };
  }

  window.Plano = { construirPlano, calcularRuta, construirEstanteria, planificarRecorrido };
})();
