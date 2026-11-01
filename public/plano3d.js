// StockMap · Plano 3D (prototipo).
// Muestra el mismo depósito de plano.js en tres dimensiones con Three.js (global THREE, en vendor/).
// Arrastrá con el mouse para girar y usá la rueda para acercar o alejar.
// Solo lee el plano y la ruta: no cambia datos.

(function () {
  const ALTO_ESTANTERIA = 2.2;
  let mot = null; // motor activo: renderer, escena, cámara, controles

  // Convierte coordenadas de celda (continuas) a coordenadas de la escena, centradas en el origen.
  const aMundo = (plano, xc, yc) => ({ x: xc - plano.W / 2, z: yc - plano.H / 2 });

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
  function montar(caja, plano, letraDestino, puntosRuta) {
    desmontar();
    if (!plano.estanterias.length) {
      caja.textContent = "Todavía no hay estanterías para mostrar.";
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

    // Estanterías: bloques; la del destino se resalta.
    plano.estanterias.forEach((letra) => {
      const b = plano.bandas[letra];
      const ancho = b.x1 - b.x0 + 1;
      const fondo = b.y1 - b.y0 + 1;
      const c = aMundo(plano, (b.x0 + b.x1 + 1) / 2, (b.y0 + b.y1 + 1) / 2);
      const material = new THREE.MeshLambertMaterial({ color: letra === letraDestino ? 0x1f5f5b : 0x9aa8b6 });
      const bloque = new THREE.Mesh(new THREE.BoxGeometry(ancho * 0.92, ALTO_ESTANTERIA, fondo * 0.92), material);
      bloque.position.set(c.x, ALTO_ESTANTERIA / 2, c.z);
      escena.add(bloque);
      const et = etiqueta(letra);
      et.position.set(c.x, ALTO_ESTANTERIA + 0.9, c.z);
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
    const w = caja.clientWidth || 600;
    const h = Math.max(380, Math.round(w * 0.75));
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    caja.innerHTML = "";
    caja.appendChild(renderer.domElement);
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
        estado.radio = Math.min(60, Math.max(4, estado.radio * (e.deltaY > 0 ? 1.08 : 0.92)));
        actualizarCamara();
      },
      { passive: false }
    );

    const alCambiarTamano = () => {
      const nuevoW = caja.clientWidth || 600;
      const nuevoH = Math.max(380, Math.round(nuevoW * 0.75));
      renderer.setSize(nuevoW, nuevoH);
      camara.aspect = nuevoW / nuevoH;
      camara.updateProjectionMatrix();
    };
    window.addEventListener("resize", alCambiarTamano);

    mot = { caja, renderer, alCambiarTamano, raf: 0 };
    const bucle = () => {
      if (!mot || mot.renderer !== renderer) return;
      renderer.render(escena, camara);
      mot.raf = requestAnimationFrame(bucle);
    };
    bucle();
  }

  window.Plano3D = { montar, desmontar };
})();
