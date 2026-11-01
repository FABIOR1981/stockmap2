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
      // Bolsa: esfera achatada con la superficie levemente irregular y un cierre arriba.
      const geo = new THREE.SphereGeometry(0.5, 20, 14);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const ruido = 1 + 0.05 * Math.sin(x * 9 + z * 5) * Math.cos(y * 7);
        pos.setXYZ(i, x * ruido, y * ruido, z * ruido);
      }
      geo.computeVertexNormals();
      const bolsa = new THREE.Mesh(geo, liso(0xe9e2d0));
      bolsa.scale.set(ancho, 0.4, fondo * 0.8);
      bolsa.position.y = 0.2;
      g.add(bolsa);
      const cierre = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 10), liso(0xc9bfa8));
      cierre.scale.set(ancho, 1, fondo * 0.8);
      cierre.position.y = 0.42;
      g.add(cierre);
    } else if (tipo === "tambor") {
      // Tambor: cilindro con dos zunchos metálicos.
      const r = Math.min(ancho, fondo) * 0.4;
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.42, 22), liso(0x3d6fb0));
      cuerpo.position.y = 0.21;
      g.add(cuerpo);
      [0.06, 0.36].forEach((y) => {
        const zuncho = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, 0.02, 6, 22), liso(0xb8c2cc));
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
    } else if (tipo === "otro") {
      // Cajón de madera: cuerpo de tablas y marco.
      g.add(caja(ancho * 0.8, 0.3, fondo * 0.6, conTextura(t.madera), 0, 0.15, 0));
      g.add(caja(ancho * 0.84, 0.03, fondo * 0.64, liso(0x6b4e30), 0, 0.3, 0));
    } else {
      // Caja de cartón con cinta.
      g.add(caja(ancho * 0.8, 0.4, fondo * 0.6, conTextura(t.carton), 0, 0.2, 0));
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
  function montar(contenedor, plano, letraDestino, puntosRuta, contenidoPorUbicacion) {
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

    // Piso del depósito, con la línea amarilla de seguridad alrededor.
    const piso = new THREE.Mesh(
      new THREE.PlaneGeometry(plano.W, plano.H),
      new THREE.MeshLambertMaterial({ color: 0xe6eaee })
    );
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    escena.add(piso);
    const amarillo = new THREE.MeshLambertMaterial({ color: 0xe8b82a });
    const m = 0.12;
    escena.add(caja(plano.W, 0.02, m, amarillo, 0, 0.011, -plano.H / 2 + m / 2));
    escena.add(caja(plano.W, 0.02, m, amarillo, 0, 0.011, plano.H / 2 - m / 2));
    escena.add(caja(m, 0.02, plano.H, amarillo, -plano.W / 2 + m / 2, 0.011, 0));
    escena.add(caja(m, 0.02, plano.H, amarillo, plano.W / 2 - m / 2, 0.011, 0));

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

    // Entrada: marcador en la pared izquierda, a mitad de altura.
    const entrada = aMundo(plano, plano.entrada.x + 0.5, plano.entrada.y + 0.5);
    const marcador = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshLambertMaterial({ color: 0x4f5c69 })
    );
    marcador.position.set(entrada.x, 0.35, entrada.z);
    escena.add(marcador);

    if (puntosRuta && puntosRuta.length > 1) dibujarRuta(plano, puntosRuta, escena);

    // Sombras para todos los objetos (estanterías, contenedores, ruta).
    escena.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    // Cámara con órbita alrededor del centro del depósito
    const w = contenedor.clientWidth || 600;
    const h = Math.max(380, Math.round(w * 0.75));
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshLambertMaterial({ color: 0xe6eaee }));
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
