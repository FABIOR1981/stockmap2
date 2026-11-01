// StockMap · Plano 3D (prototipo).
// Muestra el mismo depósito de plano.js en tres dimensiones con Three.js (global THREE, en vendor/).
// Arrastrá con el mouse para girar y usá la rueda para acercar o alejar.
// Solo lee el plano y la ruta: no cambia datos.

(function () {
  const ALTO_ESTANTERIA = 2.2;
  let mot = null; // motor activo: renderer, escena, cámara, controles

  // Convierte coordenadas de celda (continuas) a coordenadas de la escena, centradas en el origen.
  const aMundo = (plano, xc, yc) => ({ x: xc - plano.W / 2, z: yc - plano.H / 2 });

  // Pieza rectangular (poste, viga, tabla o caja) centrada en (x, y, z).
  const caja = (w, h, d, material, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    return m;
  };

  // Etiqueta con la letra de la estantería, siempre de cara a la cámara.
  function etiqueta(texto) {
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
    sprite.scale.set(1.1, 1.1, 1);
    return sprite;
  }

  // Ruta: una franja plana por cada tramo recto entre dos puntos de la cuadrícula.
  function dibujarRuta(plano, puntos, escena) {
    const material = new THREE.MeshLambertMaterial({ color: 0x1f5f5b, emissive: 0x0b2b28 });
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
    }
  }

  // Forma de cada tipo de contenedor, con la base en y = 0. Alturas de hasta ~0.45, para entrar en un nivel.
  function formaContenedor(tipo, ancho, fondo) {
    const g = new THREE.Group();
    const material = (color) => new THREE.MeshLambertMaterial({ color });
    if (tipo === "bolsa") {
      const bolsa = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 12), material(0xe9e2d0));
      bolsa.scale.set(ancho, 0.42, fondo * 0.8);
      bolsa.position.y = 0.21;
      g.add(bolsa);
    } else if (tipo === "tambor") {
      const r = Math.min(ancho, fondo) * 0.4;
      const tambor = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.42, 18), material(0x3d6fb0));
      tambor.position.y = 0.21;
      g.add(tambor);
    } else if (tipo === "pallet") {
      g.add(caja(ancho, 0.07, fondo * 0.8, material(0xa67c52), 0, 0.035, 0));
      g.add(caja(ancho * 0.8, 0.34, fondo * 0.6, material(0xc8a26b), 0, 0.24, 0));
    } else if (tipo === "otro") {
      g.add(caja(ancho * 0.8, 0.3, fondo * 0.6, material(0x7d8a96), 0, 0.15, 0));
    } else {
      g.add(caja(ancho * 0.8, 0.4, fondo * 0.6, material(0xc8a26b), 0, 0.2, 0));
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

    const acero = new THREE.MeshLambertMaterial({ color: destacada ? 0x2a7a75 : 0x1e4e8c });
    const poste = new THREE.MeshLambertMaterial({ color: destacada ? 0x2a7a75 : 0xe07a1f });
    const tabla = new THREE.MeshLambertMaterial({ color: 0xb8c2cc });

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
        forma.position.set(x0 + j * anchoBahia + anchoBahia * 0.075 + anchoCaja * (i + 0.5), k * h + 0.06, (z0 + z1) / 2);
        grupo.add(forma);
      });
    });
    return grupo;
  }

  function desmontar() {
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
  function montar(contenedor, plano, letraDestino, puntosRuta, contenidoPorUbicacion) {
    desmontar();
    if (!plano.estanterias.length) {
      contenedor.textContent = "Todavía no hay estanterías para mostrar.";
      return;
    }

    const escena = new THREE.Scene();
    escena.background = new THREE.Color("#eceff3");
    escena.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 0.6);
    sol.position.set(6, 14, 8);
    escena.add(sol);

    // Piso del depósito
    const piso = new THREE.Mesh(
      new THREE.PlaneGeometry(plano.W, plano.H),
      new THREE.MeshLambertMaterial({ color: 0xf4f7f9 })
    );
    piso.rotation.x = -Math.PI / 2;
    escena.add(piso);

    // Estanterías de logística: estructura con postes, vigas y tablas por nivel; cajas donde hay contenedores.
    plano.estanterias.forEach((letra) => {
      const grupo = construirEstanteria3D(plano, letra, contenidoPorUbicacion, letra === letraDestino);
      escena.add(grupo);
      const b = plano.bandas[letra];
      const c = aMundo(plano, (b.x0 + b.x1 + 1) / 2, (b.y0 + b.y1 + 1) / 2);
      const et = etiqueta(letra);
      et.position.set(c.x, ALTO_ESTANTERIA + 0.7, c.z);
      escena.add(et);
    });

    // Entrada: marcador en la pared izquierda, a mitad de altura.
    const entrada = aMundo(plano, plano.entrada.x + 0.5, plano.entrada.y + 0.5);
    const marcador = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshLambertMaterial({ color: 0x4f5c69 })
    );
    marcador.position.set(entrada.x, 0.35, entrada.z);
    escena.add(marcador);

    if (puntosRuta && puntosRuta.length > 1) dibujarRuta(plano, puntosRuta, escena);

    // Cámara con órbita alrededor del centro del depósito
    const w = contenedor.clientWidth || 600;
    const h = Math.max(380, Math.round(w * 0.75));
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    contenedor.innerHTML = "";
    contenedor.appendChild(renderer.domElement);
    const camara = new THREE.PerspectiveCamera(45, w / h, 0.1, 300);

    const estado = { theta: 2.7, phi: 0.85, radio: Math.max(plano.W, plano.H) * 1.9, arrastrando: false, x: 0, y: 0 };
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
      const nuevoH = Math.max(380, Math.round(nuevoW * 0.75));
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

  window.Plano3D = { montar, desmontar };
})();
