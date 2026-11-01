// StockMap · Plano 3D (prototipo).
// Muestra el mismo depósito de plano.js en tres dimensiones con Three.js (global THREE, en vendor/).
// Arrastrá con el mouse para girar y usá la rueda para acercar o alejar.
// Solo lee el plano y la ruta: no cambia datos.

(function () {
  const ALTO_ESTANTERIA = 2.2;
  let mot = null; // motor activo: renderer, escena, cámara, controles

  // Convierte coordenadas de celda (continuas) a coordenadas de la escena, centradas en el origen.
  const aMundo = (plano, xc, yc) => ({ x: xc - plano.W / 2, z: yc - plano.H / 2 });

  // Alto del lienzo del plano: acompaña al ancho, pero no supera casi toda la altura de la pantalla.
  const alturaPlano = (ancho) =>
    Math.max(420, Math.min(Math.round(ancho * 0.8), Math.round(window.innerHeight * 0.8)));

  // Pieza rectangular (poste, viga, tabla o caja) centrada en (x, y, z).
  const caja = (w, h, d, material, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    return m;
  };

  // Etiqueta con la letra de la estantería, siempre de cara a la cámara.
  function etiqueta(texto, escala = 1.1) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#14202b";
    g.font = "bold 92px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(texto, 64, 68);
    const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(escala, escala, 1);
    return sprite;
  }

  // Ruta: una franja plana por cada tramo recto entre dos puntos de la cuadrícula.
  function dibujarRuta(plano, puntos, escena) {
    const material = new THREE.MeshLambertMaterial({ color: 0x2ec4a6, emissive: 0x0b4a40 });
    for (let i = 1; i < puntos.length; i++) {
      const a = aMundo(plano, puntos[i - 1].x + 0.5, puntos[i - 1].y + 0.5);
      const b = aMundo(plano, puntos[i].x + 0.5, puntos[i].y + 0.5);
      const largo = Math.abs(a.x - b.x) + Math.abs(a.z - b.z) + 0.12;
      const franja = new THREE.Mesh(
        new THREE.BoxGeometry(Math.abs(a.x - b.x) > 0 ? largo : 0.22, 0.1, Math.abs(a.z - b.z) > 0 ? largo : 0.22),
        material
      );
      franja.position.set((a.x + b.x) / 2, 0.12, (a.z + b.z) / 2);
      escena.add(franja);
      // Flecha en el medio del tramo, apuntando hacia el siguiente punto de la ruta.
      const flecha = new THREE.Group();
      flecha.position.set((a.x + b.x) / 2, 0.2, (a.z + b.z) / 2);
      flecha.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      const punta = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 12), material);
      punta.rotation.x = Math.PI / 2;
      flecha.add(punta);
      escena.add(flecha);
    }
  }

  // Texturas dibujadas con canvas (sin imágenes externas): cartón y madera. Se crean una vez por vista.
  let TEX = null;
  function texturas() {
    if (TEX) return TEX;
    const hacer = (dibujar) => {
      const c = document.createElement("canvas");
      c.width = 128;
      c.height = 128;
      dibujar(c.getContext("2d"));
      return new THREE.CanvasTexture(c);
    };
    const carton = hacer((g) => {
      g.fillStyle = "#c8a26b";
      g.fillRect(0, 0, 128, 128);
      g.fillStyle = "#e4c995"; // cinta de embalar
      g.fillRect(52, 0, 24, 128);
      g.fillStyle = "rgba(90,60,25,0.25)"; // juntas de la caja
      g.fillRect(0, 0, 128, 3);
      g.fillRect(0, 125, 128, 3);
    });
    const madera = hacer((g) => {
      g.fillStyle = "#a67c52";
      g.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 16) {
        g.fillStyle = y % 32 ? "rgba(70,45,20,0.35)" : "rgba(230,200,150,0.25)";
        g.fillRect(0, y, 128, 6);
      }
    });
    TEX = { carton, madera };
    return TEX;
  }

  // Forma de cada tipo de contenedor, con la base en y = 0. Alturas de hasta ~0.45, para entrar en un nivel.
  function formaContenedor(tipo, ancho, fondo) {
    const g = new THREE.Group();
    const t = texturas();
    const liso = (color) => new THREE.MeshLambertMaterial({ color });
    const conTextura = (mapa) => new THREE.MeshLambertMaterial({ map: mapa });
    if (tipo === "bolsa") {
      // Bolsa tejida: cuerpo ancho que se angosta hacia un cuello, atado con un ajuste.
      const perfil = [[0.001, 0], [0.28, 0.01], [0.38, 0.15], [0.36, 0.32], [0.24, 0.44], [0.1, 0.5], [0.11, 0.55], [0.13, 0.58], [0.001, 0.6]]
        .map(([r, y]) => new THREE.Vector2(r, y));
      const bolsa = new THREE.Mesh(new THREE.LatheGeometry(perfil, 24), liso(0xe9e2d0));
      bolsa.scale.set(ancho * 1.3, 0.7, fondo * 1.3);
      g.add(bolsa);
      const ajuste = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 20), liso(0x9c8f72));
      ajuste.rotation.x = Math.PI / 2;
      ajuste.scale.set(ancho * 1.3, fondo * 1.3, 1);
      ajuste.position.y = 0.55 * 0.7;
      g.add(ajuste);
    } else if (tipo === "tambor") {
      // Tarro metálico: cilindro gris con aros arriba y abajo, y tapa.
      const r = Math.min(ancho, fondo) * 0.4;
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.42, 22), liso(0xdfe4ea));
      cuerpo.position.y = 0.21;
      g.add(cuerpo);
      const tapa = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.03, 22), liso(0x5f6b77));
      tapa.position.y = 0.435;
      g.add(tapa);
      [0.06, 0.36].forEach((y) => {
        const zuncho = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, 0.02, 6, 22), liso(0x4a5560));
        zuncho.rotation.x = Math.PI / 2;
        zuncho.position.y = y;
        g.add(zuncho);
      });
    } else if (tipo === "pallet") {
      // Pallet: tres patines de madera, tablas arriba y dos cajas de carga.
      const madera = conTextura(t.madera);
      [-0.35, 0, 0.35].forEach((f) => g.add(caja(0.08, 0.08, fondo * 0.8, madera, ancho * f * 0.5, 0.04, 0)));
      for (let i = 0; i < 4; i++) {
        g.add(caja(ancho * 0.92, 0.025, fondo * 0.18, madera, 0, 0.1, -fondo * 0.36 + i * fondo * 0.24));
      }
      const carton = conTextura(t.carton);
      g.add(caja(ancho * 0.7, 0.2, fondo * 0.5, carton, 0, 0.22, 0));
      g.add(caja(ancho * 0.6, 0.16, fondo * 0.45, carton, 0.03, 0.4, 0));
      // Film de embalaje transparente que envuelve la carga.
      g.add(caja(ancho * 0.74, 0.4, fondo * 0.52, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }), 0, 0.3, 0));
    } else if (tipo === "otro") {
      // Cubo genérico gris con tapa oscura.
      g.add(caja(ancho * 0.8, 0.4, fondo * 0.6, liso(0xd9dee4), 0, 0.2, 0));
      g.add(caja(ancho * 0.84, 0.04, fondo * 0.64, liso(0x5b636c), 0, 0.42, 0));
    } else {
      // Caja de cartón con cinta de embalar sobre la tapa.
      g.add(caja(ancho * 0.8, 0.4, fondo * 0.6, conTextura(t.carton), 0, 0.2, 0));
      g.add(caja(ancho * 0.16, 0.02, fondo * 0.62, liso(0xe8dcc0), 0, 0.41, 0));
    }
    return g;
  }

  // Una estantería de logística: postes, vigas al frente y al fondo, tablas por nivel y contenedores.
  // Niveles = estantes (el 1 abajo); bahías = divisiones (la a a la izquierda).
  function construirEstanteria3D(plano, letra, contenidoPorUbicacion, destacada) {
    const b = plano.bandas[letra];
    const grupo = new THREE.Group();
    const x0 = b.x0 - plano.W / 2;
    const x1 = b.x1 + 1 - plano.W / 2;
    const z0 = b.y0 - plano.H / 2;
    const z1 = b.y1 + 1 - plano.H / 2;
    const ancho = x1 - x0;
    const fondo = z1 - z0;

    const datos = Plano.construirEstanteria(plano.conPosicion, letra);
    const niveles = datos.estantes.length ? datos.estantes : [1];
    const bahias = datos.divisiones.length || 1;
    const n = niveles.length;
    const h = ALTO_ESTANTERIA / n;
    const anchoBahia = ancho / bahias;

    // Estructura metálica en gris medio: contrasta con el piso oscuro sin saturar la vista.
    const acero = new THREE.MeshLambertMaterial({ color: destacada ? 0x2a7a75 : 0x7a8591 });
    const poste = new THREE.MeshLambertMaterial({ color: destacada ? 0x2a7a75 : 0x5f6a76 });
    const tabla = new THREE.MeshLambertMaterial({ color: 0x9aa4af });

    // Postes en cada límite de bahía, al frente y al fondo.
    for (let i = 0; i <= bahias; i++) {
      const x = x0 + i * anchoBahia;
      [z0 + 0.05, z1 - 0.05].forEach((z) => grupo.add(caja(0.09, ALTO_ESTANTERIA, 0.09, poste, x, ALTO_ESTANTERIA / 2, z)));
    }
    // Tablas y vigas por nivel.
    for (let k = 0; k < n; k++) {
      const yTabla = k * h + 0.03;
      grupo.add(caja(ancho, 0.06, fondo, tabla, (x0 + x1) / 2, yTabla, (z0 + z1) / 2));
      const yViga = (k + 1) * h - 0.04;
      grupo.add(caja(ancho, 0.08, 0.08, acero, (x0 + x1) / 2, yViga, z0 + 0.05));
      grupo.add(caja(ancho, 0.08, 0.08, acero, (x0 + x1) / 2, yViga, z1 - 0.05));
    }
    // Contenedores: un objeto por contenedor, con la forma de su tipo; si hay varios en la ubicación, van uno al lado del otro.
    datos.celdas.forEach((u) => {
      const tipos = contenidoPorUbicacion.get(u.id);
      if (!tipos || !tipos.length) return;
      const k = niveles.indexOf(parseInt(u.estante, 10));
      const j = datos.divisiones.indexOf(u.nivel);
      if (k < 0 || j < 0) return;
      const anchoCaja = (anchoBahia * 0.85) / tipos.length;
      tipos.forEach((tipo, i) => {
        const forma = formaContenedor(tipo, anchoCaja * 0.9, fondo * 0.6);
        forma.position.set(x0 + j * anchoBahia + anchoBahia * 0.075 + anchoCaja * (i + 0.5), (n - 1 - k) * h + 0.06, (z0 + z1) / 2);
        grupo.add(forma);
      });
    });

    // Rótulos como en la vista de frente: número de estante a la izquierda (el 1 arriba), letra de división arriba.
    niveles.forEach((estante, k) => {
      const r = etiqueta(String(estante), 0.5);
      r.position.set(x0 - 0.45, (n - 1 - k) * h + h / 2, (z0 + z1) / 2);
      grupo.add(r);
    });
    datos.divisiones.forEach((division, j) => {
      const r = etiqueta(division, 0.55);
      r.position.set(x0 + (j + 0.5) * anchoBahia, ALTO_ESTANTERIA + 0.25, (z0 + z1) / 2);
      grupo.add(r);
    });
    return grupo;
  }

  // Número de parada en un círculo naranja, siempre visible (no se oculta detrás de las estanterías).
  function marcaParada(n) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d");
    g.beginPath();
    g.arc(64, 64, 54, 0, Math.PI * 2);
    g.fillStyle = "#e07a1f";
    g.fill();
    g.lineWidth = 8;
    g.strokeStyle = "#ffffff";
    g.stroke();
    g.fillStyle = "#ffffff";
    g.font = "bold 70px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(n), 64, 68);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })
    );
    sprite.scale.set(0.7, 0.7, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  // Entrada en forma de hueco: dos muros con un paso al centro, un dintel y un cartel verde "ENTRADA".
  function entradaHueco(x, z) {
    const g = new THREE.Group();
    const muro = new THREE.MeshLambertMaterial({ color: 0xdfe3e7 });
    g.add(caja(0.25, 2.4, 0.9, muro, x, 1.2, z - 1.0));
    g.add(caja(0.25, 2.4, 0.9, muro, x, 1.2, z + 1.0));
    g.add(caja(0.25, 0.4, 2.0, muro, x, 2.2, z));
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const cg = c.getContext("2d");
    cg.fillStyle = "#1f7a72";
    cg.fillRect(0, 0, 512, 128);
    cg.fillStyle = "#ffffff";
    cg.font = "bold 80px sans-serif";
    cg.textAlign = "center";
    cg.textBaseline = "middle";
    cg.fillText("ENTRADA", 256, 68);
    const cartel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.4),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })
    );
    cartel.position.set(x + 0.14, 2.7, z);
    cartel.rotation.y = Math.PI / 2;
    g.add(cartel);
    return g;
  }

  function desmontar() {
    desmontarDetalle();
    if (!mot) return;
    cancelAnimationFrame(mot.raf);
    window.removeEventListener("resize", mot.alCambiarTamano);
    mot.caja.innerHTML = "";
    mot.renderer.dispose();
    mot.renderer.forceContextLoss?.();
    mot = null;
  }

  // Dibuja el depósito en `caja`. `letraDestino` resalta una estantería; `puntosRuta` es el recorrido (celdas).
  // `contenidoPorUbicacion`: Map de id de ubicación -> lista de tipos de contenedor que hay en ella.
  function montar(contenedor, plano, letraDestino, puntosRuta, contenidoPorUbicacion, paradas) {
    desmontar();
    if (!plano.estanterias.length) {
      contenedor.textContent = "Todavía no hay estanterías para mostrar.";
      return;
    }

    const escena = new THREE.Scene();
    escena.background = new THREE.Color("#eceff3");
    escena.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 0.7);
    sol.position.set(6, 14, 8);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
    escena.add(sol);

    // Piso epóxico oscuro, con una franja blanca alrededor.
    const piso = new THREE.Mesh(
      new THREE.PlaneGeometry(plano.W, plano.H),
      new THREE.MeshLambertMaterial({ color: 0x3d4650 })
    );
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    escena.add(piso);
    const franjaBlanca = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
    const m = 0.12;
    escena.add(caja(plano.W, 0.02, m, franjaBlanca, 0, 0.011, -plano.H / 2 + m / 2));
    escena.add(caja(plano.W, 0.02, m, franjaBlanca, 0, 0.011, plano.H / 2 - m / 2));
    escena.add(caja(m, 0.02, plano.H, franjaBlanca, -plano.W / 2 + m / 2, 0.011, 0));
    escena.add(caja(m, 0.02, plano.H, franjaBlanca, plano.W / 2 - m / 2, 0.011, 0));

    // Estanterías de logística: estructura con postes, vigas y tablas por nivel; cajas donde hay contenedores.
    plano.estanterias.forEach((letra) => {
      const grupo = construirEstanteria3D(plano, letra, contenidoPorUbicacion, letra === letraDestino);
      escena.add(grupo);
      const b = plano.bandas[letra];
      const c = aMundo(plano, (b.x0 + b.x1 + 1) / 2, (b.y0 + b.y1 + 1) / 2);
      const et = etiqueta(letra);
      et.position.set(c.x, ALTO_ESTANTERIA + 1.15, c.z);
      escena.add(et);
    });

    // Entrada: hueco en la pared izquierda, a mitad de altura.
    const entrada = aMundo(plano, plano.entrada.x, plano.entrada.y + 0.5);
    escena.add(entradaHueco(entrada.x, entrada.z));

    if (puntosRuta && puntosRuta.length > 1) dibujarRuta(plano, puntosRuta, escena);
    // Recorrido con varias paradas: número de orden de cada parada, sobre el frente de su estantería.
    (paradas || []).forEach((p) => {
      const c = aMundo(plano, p.x + 0.5, p.y + 0.5);
      const marca = marcaParada(p.n);
      marca.position.set(c.x, 1.2, c.z);
      escena.add(marca);
    });

    // Sombras para todos los objetos (estanterías, contenedores, ruta).
    escena.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    // Cámara con órbita alrededor del centro del depósito
    const w = contenedor.clientWidth || 600;
    const h = alturaPlano(w);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    contenedor.innerHTML = "";
    contenedor.appendChild(renderer.domElement);
    const camara = new THREE.PerspectiveCamera(45, w / h, 0.1, 300);

    const estado = { theta: 2.7, phi: 0.85, radio: Math.max(plano.W, plano.H) * 1.6, arrastrando: false, x: 0, y: 0 };
    const actualizarCamara = () => {
      const { theta, phi, radio } = estado;
      camara.position.set(
        radio * Math.sin(phi) * Math.cos(theta),
        radio * Math.cos(phi),
        radio * Math.sin(phi) * Math.sin(theta)
      );
      camara.lookAt(0, 0.6, 0);
    };
    actualizarCamara();

    const elemento = renderer.domElement;
    elemento.style.touchAction = "none";
    elemento.style.cursor = "grab";
    elemento.addEventListener("pointerdown", (e) => {
      estado.arrastrando = true;
      estado.x = e.clientX;
      estado.y = e.clientY;
      elemento.setPointerCapture(e.pointerId);
    });
    elemento.addEventListener("pointermove", (e) => {
      if (!estado.arrastrando) return;
      estado.theta -= (e.clientX - estado.x) * 0.008;
      estado.phi = Math.min(1.4, Math.max(0.2, estado.phi - (e.clientY - estado.y) * 0.008));
      estado.x = e.clientX;
      estado.y = e.clientY;
      actualizarCamara();
    });
    const soltar = () => (estado.arrastrando = false);
    elemento.addEventListener("pointerup", soltar);
    elemento.addEventListener("pointercancel", soltar);
    elemento.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        // Zoom suave y proporcional al giro de la rueda (funciona igual con trackpad).
        estado.radio = Math.min(60, Math.max(4, estado.radio * Math.exp(e.deltaY * 0.0015)));
        actualizarCamara();
      },
      { passive: false }
    );

    const alCambiarTamano = () => {
      const nuevoW = contenedor.clientWidth || 600;
      const nuevoH = alturaPlano(nuevoW);
      renderer.setSize(nuevoW, nuevoH);
      camara.aspect = nuevoW / nuevoH;
      camara.updateProjectionMatrix();
    };
    window.addEventListener("resize", alCambiarTamano);

    mot = { caja: contenedor, renderer, alCambiarTamano, raf: 0 };
    const bucle = () => {
      if (!mot || mot.renderer !== renderer) return;
      renderer.render(escena, camara);
      mot.raf = requestAnimationFrame(bucle);
    };
    bucle();
  }

  // ------------------------------------------------------------------
  // Recuadro de detalle: foto fija de la estantería del contenedor buscado, con el contenedor marcado.
  // ------------------------------------------------------------------

  let det = null; // motor del recuadro de detalle

  // Geometría de una estantería, para ubicar sus celdas en la escena.
  function geometriaEstanteria(plano, letra) {
    const b = plano.bandas[letra];
    const x0 = b.x0 - plano.W / 2;
    const x1 = b.x1 + 1 - plano.W / 2;
    const z0 = b.y0 - plano.H / 2;
    const z1 = b.y1 + 1 - plano.H / 2;
    const datos = Plano.construirEstanteria(plano.conPosicion, letra);
    const niveles = datos.estantes.length ? datos.estantes : [1];
    const n = niveles.length;
    const anchoBahia = (x1 - x0) / (datos.divisiones.length || 1);
    return { x0, x1, z0, z1, datos, niveles, n, h: ALTO_ESTANTERIA / n, anchoBahia };
  }

  // Rótulo con borde naranja, para marcar el código del contenedor.
  function etiquetaTexto(texto, escala) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(255,255,255,0.96)";
    g.fillRect(4, 14, 504, 100);
    g.strokeStyle = "#e07a1f";
    g.lineWidth = 6;
    g.strokeRect(4, 14, 504, 100);
    g.fillStyle = "#14202b";
    g.font = "bold 62px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(texto, 256, 66);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })
    );
    sprite.scale.set(escala * 4, escala, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  function desmontarDetalle() {
    if (!det) return;
    cancelAnimationFrame(det.raf);
    det.caja.innerHTML = "";
    det.renderer.dispose();
    det.renderer.forceContextLoss?.();
    det = null;
  }

  // Foto fija del lugar del contenedor: la estantería de destino, un anillo que pulsa alrededor de la celda
  // y el código del contenedor encima.
  function montarDetalle(contenedor, plano, destino, codigo, contenidoPorUbicacion) {
    desmontarDetalle();
    if (!destino || !plano.bandas[destino.pasillo]) return;
    const g = geometriaEstanteria(plano, destino.pasillo);
    const k = g.niveles.indexOf(parseInt(destino.estante, 10));
    const j = g.datos.divisiones.indexOf(destino.nivel);
    if (k < 0 || j < 0) return;
    const cx = g.x0 + (j + 0.5) * g.anchoBahia;
    const cy = (g.n - 1 - k) * g.h; // base de la celda
    const cz = (g.z0 + g.z1) / 2;
    const fondo = g.z1 - g.z0;

    const escena = new THREE.Scene();
    escena.background = new THREE.Color("#eceff3");
    escena.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 0.7);
    sol.position.set(3, 6, 6);
    escena.add(sol);
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshLambertMaterial({ color: 0x3d4650 }));
    piso.rotation.x = -Math.PI / 2;
    escena.add(piso);
    escena.add(construirEstanteria3D(plano, destino.pasillo, contenidoPorUbicacion, true));

    // Anillo naranja delante de la celda, a la altura del contenedor.
    const anillo = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.05, 10, 32),
      new THREE.MeshLambertMaterial({ color: 0xffb020, emissive: 0x553300 })
    );
    anillo.position.set(cx, cy + g.h / 2, cz + fondo / 2 + 0.1);
    escena.add(anillo);
    if (codigo) {
      const rotulo = etiquetaTexto(codigo, 0.6);
      rotulo.position.set(cx, cy + g.h + 0.55, cz);
      escena.add(rotulo);
    }

    const w = contenedor.clientWidth || 600;
    const h = Math.max(300, Math.round(w * 0.55));
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    contenedor.innerHTML = "";
    contenedor.appendChild(renderer.domElement);
    const camara = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camara.position.set(cx + 0.6, cy + 1.7, cz + 6);
    camara.lookAt(cx, cy + g.h / 2 + 0.1, cz);

    det = { caja: contenedor, renderer, raf: 0 };
    const bucle = () => {
      if (!det || det.renderer !== renderer) return;
      const pulso = 1 + 0.08 * Math.sin(performance.now() / 300);
      anillo.scale.set(pulso, pulso, 1);
      renderer.render(escena, camara);
      det.raf = requestAnimationFrame(bucle);
    };
    bucle();
  }

  window.Plano3D = { montar, desmontar, montarDetalle, desmontarDetalle };
})();
