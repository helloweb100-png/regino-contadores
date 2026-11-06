/* =====================================================================
   REGINO CONTADORES · script.js
   Sin dependencias externas: todo el movimiento está hecho a mano
   (requestAnimationFrame + IntersectionObserver), así la página se ve
   completa aunque falle cualquier CDN.
   Cada módulo corre aislado: si uno falla, los demás siguen.
   ===================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------
     CONFIGURACIÓN DEL NEGOCIO
     WHATSAPP_NUMERO es el ÚNICO lugar donde vive el número (10 dígitos,
     sin lada de país). Si se deja vacío (''), el botón flotante y el
     envío del formulario se ocultan solos.
     --------------------------------------------------------------- */
  const WHATSAPP_NUMERO = '5531446878';
  const WHATSAPP_PAIS = '52';
  const MENSAJE_BASE = 'Hola, vi su página web de Regino Contadores y me gustaría recibir asesoría fiscal y contable.';

  /* ---------- Utilidades ---------- */
  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const safe = (nombre, fn) => {
    try { fn(); } catch (err) { console.warn('[Regino] módulo omitido:', nombre, err); }
  };

  // Marcas en <html>: .js-ready = el script corre; .fx = efectos de scroll fijados (pin); .rm = movimiento reducido
  root.classList.add('js-ready');
  root.classList.add(reduced ? 'rm' : 'fx');
  const fx = !reduced;

  /* ---------- Motor de scroll (un solo listener, throttled con rAF) ---------- */
  const scrollFns = [];
  const resizeFns = [];
  let pendiente = false;
  const correrScroll = () => {
    pendiente = false;
    for (const fn of scrollFns) { try { fn(); } catch (e) { /* un módulo no rompe a los demás */ } }
  };
  const pedirScroll = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(correrScroll); } };
  window.addEventListener('scroll', pedirScroll, { passive: true });
  let tResize = 0;
  window.addEventListener('resize', () => {
    clearTimeout(tResize);
    tResize = setTimeout(() => {
      for (const fn of resizeFns) { try { fn(); } catch (e) { /* noop */ } }
      pedirScroll();
    }, 140);
  });

  /* ---------- WhatsApp ---------- */
  const waActivo = () => /^\d{10}$/.test(WHATSAPP_NUMERO);
  const waLink = (texto) => {
    const base = 'https://wa.me/' + WHATSAPP_PAIS + WHATSAPP_NUMERO;
    return texto ? base + '?text=' + encodeURIComponent(texto) : base;
  };

  function initWhatsApp() {
    if (!waActivo()) {
      root.classList.add('sin-wa');
      $$('[data-sinwa]').forEach((e) => { e.hidden = false; });
      return;
    }
    $$('[data-wa]').forEach((a) => {
      a.href = waLink(a.getAttribute('data-wa-msg') || MENSAJE_BASE);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    // Globo "¿Hablamos?" una vez, a los pocos segundos
    const fab = $('[data-wa-fab]');
    if (fab && !reduced) {
      setTimeout(() => fab.classList.add('show-tip'), 8000);
      setTimeout(() => fab.classList.remove('show-tip'), 12500);
    }
  }

  /* ---------- Cargador ---------- */
  function initLoader() {
    const el = $('#cargador');
    if (!el) return;
    if (reduced) { el.remove(); root.classList.add('is-ready'); return; }
    const num = $('[data-load-num]', el);
    const bar = $('[data-load-bar]', el);
    const txt = $('[data-load-txt]', el);
    const mensajes = ['Verificando RFC', 'Sincronizando CFDI', 'Alineando obligaciones', 'Todo en orden'];
    const dur = 1300;
    const t0 = performance.now();
    let listo = false;
    const terminar = () => {
      if (listo) return;
      listo = true;
      if (num) num.textContent = '100';
      if (bar) bar.style.transform = 'scaleX(1)';
      el.classList.add('is-done');
      root.classList.add('is-ready');
      setTimeout(() => { el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); }, 950);
    };
    const tick = (ahora) => {
      const p = clamp((ahora - t0) / dur);
      const e = easeOut(p);
      if (num) num.textContent = String(Math.round(e * 100)).padStart(3, '0');
      if (bar) bar.style.transform = 'scaleX(' + e.toFixed(3) + ')';
      if (txt) txt.textContent = mensajes[Math.min(mensajes.length - 1, Math.floor(p * mensajes.length))];
      if (p < 1) requestAnimationFrame(tick); else terminar();
    };
    requestAnimationFrame(tick);
    setTimeout(terminar, 1800); // seguro por si el navegador pausa requestAnimationFrame
  }

  /* ---------- Encabezado, menú móvil y barra de progreso ---------- */
  function initHeader() {
    const bar = $('[data-topbar]');
    const prog = $('[data-progress]');
    const burger = $('.burger');
    const menu = $('#menu');
    scrollFns.push(() => {
      const y = window.scrollY || window.pageYOffset;
      if (bar) bar.classList.toggle('is-solid', y > 24);
      if (prog) {
        const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        prog.style.transform = 'scaleX(' + clamp(y / total).toFixed(4) + ')';
      }
    });
    if (!burger || !menu) return;
    let timer = 0;
    const abrir = () => {
      clearTimeout(timer);
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Cerrar menú');
      root.style.overflow = 'hidden';
      if (bar) bar.classList.add('is-solid');
    };
    const cerrar = () => {
      menu.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Abrir menú');
      root.style.overflow = '';
      timer = setTimeout(() => { menu.hidden = true; }, 420);
      pedirScroll();
    };
    burger.addEventListener('click', () => (burger.getAttribute('aria-expanded') === 'true' ? cerrar() : abrir()));
    $$('a', menu).forEach((a) => a.addEventListener('click', cerrar));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) cerrar(); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (m) => { if (m.matches && !menu.hidden) cerrar(); });
  }

  /* ---------- Revelado al hacer scroll ---------- */
  function initReveal() {
    $$('[data-stagger]').forEach((grupo) => {
      $$('[data-reveal]', grupo).forEach((el, i) => el.style.setProperty('--d', (i * 90) + 'ms'));
    });
    const items = $$('[data-reveal], [data-station]');
    if (!('IntersectionObserver' in window)) { items.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((e) => io.observe(e));
  }

  /* ---------- Hero: campo de partículas (canvas) ---------- */
  function initHeroCanvas() {
    const cv = $('[data-canvas]');
    const hero = $('.hero');
    if (!cv || !hero) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const glifos = ['$', '%', '§', 'IVA', 'ISR', 'SAT', 'RFC', 'CFDI', 'IMSS', 'Σ', '='];
    let W = 0, H = 0, particulas = [], raf = 0, visible = true;
    const mouse = { x: -999, y: -999 };

    const crear = () => {
      const n = W < 700 ? 34 : 72;
      particulas = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.28, vy: -0.08 - Math.random() * 0.28,
        r: 0.8 + Math.random() * 1.8,
        g: i % 6 === 0 ? glifos[(i / 6) % glifos.length | 0] : null,
        a: 0.35 + Math.random() * 0.5,
      }));
    };
    const medir = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      crear();
    };
    const dibujar = (mover) => {
      ctx.clearRect(0, 0, W, H);
      const maxD = W < 700 ? 90 : 128;
      for (const p of particulas) {
        if (mover) {
          p.x += p.vx; p.y += p.vy;
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 16000) { const d = Math.sqrt(d2) || 1; p.x += (dx / d) * 1.2; p.y += (dy / d) * 1.2; }
          if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
          if (p.x < -20) p.x = W + 20;
          if (p.x > W + 20) p.x = -20;
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < particulas.length; i++) {
        const a = particulas[i];
        for (let j = i + 1; j < particulas.length; j++) {
          const b = particulas[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxD) {
            ctx.strokeStyle = 'rgba(34,184,255,' + ((1 - d / maxD) * 0.26).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of particulas) {
        if (p.g) {
          ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
          ctx.fillStyle = 'rgba(255,210,31,' + (p.a * 0.75).toFixed(2) + ')';
          ctx.fillText(p.g, p.x, p.y);
        } else {
          ctx.fillStyle = 'rgba(175,215,255,' + p.a.toFixed(2) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
        }
      }
    };
    const bucle = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      dibujar(true);
      raf = requestAnimationFrame(bucle);
    };
    const arrancar = () => { if (!raf && !reduced) raf = requestAnimationFrame(bucle); };

    medir();
    dibujar(false);
    resizeFns.push(() => { medir(); dibujar(false); });
    if (reduced) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) arrancar(); }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) arrancar(); });
    if (finePointer) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      });
      hero.addEventListener('pointerleave', () => { mouse.x = -999; mouse.y = -999; });
    }
    arrancar();
  }

  /* ---------- Hero: radar de cumplimiento ---------- */
  function initRadar() {
    const radar = $('[data-radar]');
    if (!radar) return;
    const disc = $('.radar__disc', radar);
    const sweep = $('[data-sweep]', radar);
    const nodos = $$('[data-node]', radar);
    const orbes = $$('.orb', radar);
    const base = nodos.map((_, i) => (i * 360) / nodos.length);
    let size = disc.clientWidth || 340;
    let visible = true, raf = 0;

    const pintar = (t) => {
      const s = t / 1000;
      const barrido = (s * 52) % 360; // ≈ 7 s por vuelta
      if (sweep) sweep.style.transform = 'rotate(' + barrido.toFixed(2) + 'deg)';
      const R = size * 0.41;
      nodos.forEach((n, i) => {
        const a = (base[i] + s * 6) % 360;
        const rad = (a * Math.PI) / 180;
        const x = Math.sin(rad) * R, y = -Math.cos(rad) * R;
        n.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        const dif = (((barrido - a) % 360) + 360) % 360;
        n.style.setProperty('--hit', (dif < 70 ? 1 - dif / 70 : 0).toFixed(2));
      });
      orbes.forEach((o) => {
        const a = parseFloat(o.dataset.a) + s * parseFloat(o.dataset.s);
        const rad = (a * Math.PI) / 180, r = parseFloat(o.dataset.r) * size;
        o.style.transform = 'translate(' + (Math.sin(rad) * r).toFixed(1) + 'px,' + (-Math.cos(rad) * r).toFixed(1) + 'px)';
      });
    };
    const bucle = (t) => {
      raf = 0;
      if (!visible || document.hidden) return;
      pintar(t);
      raf = requestAnimationFrame(bucle);
    };
    const arrancar = () => { if (!raf && !reduced) raf = requestAnimationFrame(bucle); };
    resizeFns.push(() => { size = disc.clientWidth || size; if (reduced) pintar(0); });
    pintar(0);
    if (reduced) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) arrancar(); }, { threshold: 0 }).observe(radar);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) arrancar(); });
    arrancar();
  }

  /* ---------- Hero: puntero (luz y giro 3D del radar) y parallax ---------- */
  function initHeroPointer() {
    const hero = $('.hero');
    const disc = $('.radar__disc');
    const stage = $('.hero__stage');
    if (!hero) return;
    if (finePointer && !reduced) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        hero.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        hero.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        if (disc) {
          disc.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
          disc.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
        }
      });
      hero.addEventListener('pointerleave', () => {
        if (disc) { disc.style.setProperty('--ry', '0deg'); disc.style.setProperty('--rx', '0deg'); }
      });
    }
    if (stage && !reduced) {
      scrollFns.push(() => {
        const y = window.scrollY || 0;
        if (y < window.innerHeight * 1.2) stage.style.translate = '0 ' + (y * 0.09).toFixed(1) + 'px';
      });
    }
  }

  /* ---------- Hero: marcador "así se siente tenerlo al día" ---------- */
  function initTicker() {
    const caja = $('[data-ticker]');
    if (!caja || reduced) return;
    const txt = $('.ticker__txt', caja), nombre = $('[data-t-name]', caja), estado = $('[data-t-state]', caja);
    const items = [
      ['Declaración mensual', 'presentada'], ['CFDI de nómina', 'timbrado'], ['e.firma', 'vigente'],
      ['Alta en el IMSS', 'registrada'], ['Devolución de IVA', 'en seguimiento'], ['Requerimiento del SAT', 'atendido'],
    ];
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      txt.classList.add('is-out');
      setTimeout(() => {
        i = (i + 1) % items.length;
        nombre.textContent = items[i][0];
        estado.textContent = items[i][1];
        txt.classList.remove('is-out');
      }, 380);
    }, 2600);
  }

  /* ---------- Marquee: parallax con el scroll (sobre el movimiento continuo CSS) ---------- */
  function initMarquee() {
    const sec = $('.marquee');
    if (!sec || reduced) return;
    const filas = $$('[data-mq]', sec);
    scrollFns.push(() => {
      const r = sec.getBoundingClientRect();
      const p = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
      filas.forEach((fila) => {
        const pista = $('.marquee__track', fila);
        const dir = parseFloat(fila.dataset.mq) || 1;
        if (pista) pista.style.translate = (-(dir > 0 ? p : 1 - p) * 180).toFixed(1) + 'px 0';
      });
    });
  }

  /* ---------- Manifiesto: el texto se ilumina palabra por palabra ---------- */
  function initScrub() {
    const h = $('[data-scrub]');
    const track = $('[data-scrub-track]');
    if (!h || !track || reduced) return;
    const palabras = [];
    (function recorrer(nodo) {
      Array.from(nodo.childNodes).forEach((hijo) => {
        if (hijo.nodeType === 3) {
          const frag = document.createDocumentFragment();
          hijo.textContent.split(/(\s+)/).forEach((trozo) => {
            if (!trozo) return;
            if (/^\s+$/.test(trozo)) { frag.appendChild(document.createTextNode(trozo)); return; }
            const s = document.createElement('span');
            s.className = 'w'; s.textContent = trozo;
            frag.appendChild(s); palabras.push(s);
          });
          hijo.replaceWith(frag);
        } else if (hijo.nodeType === 1) recorrer(hijo);
      });
    })(h);
    h.classList.add('is-split');
    const n = palabras.length;
    scrollFns.push(() => {
      const r = track.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 1;
      const avance = p * 1.08;
      palabras.forEach((w, i) => {
        const o = clamp((avance - (i / n) * 0.88) / (3 / n));
        w.style.setProperty('--o', (0.13 + 0.87 * o).toFixed(3));
      });
    });
  }

  /* ---------- La ruta del cumplimiento: carretera SVG que se dibuja con el scroll ---------- */
  function initRoad() {
    const road = $('[data-road]');
    const svg = $('[data-road-svg]');
    const lista = $('.stations', road || document);
    if (!road || !svg || !lista) return;
    const estaciones = $$('[data-station]', road);
    const NS = 'http://www.w3.org/2000/svg';
    const crear = (tag, attrs, padre) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      (padre || svg).appendChild(e);
      return e;
    };
    let pts = [], muestras = [], total = 0, relleno = null, marcador = null, alto = 0;

    const construir = () => {
      const W = lista.offsetWidth, H = lista.offsetHeight;
      if (!W || !H || !estaciones.length) return;
      alto = H;
      const esc = window.matchMedia('(min-width: 900px)').matches;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('width', W); svg.setAttribute('height', H);

      const A = esc ? Math.min(70, W * 0.07) : 6;
      const cx = esc ? W / 2 : 24;
      pts = estaciones.map((li, i) => {
        const color = getComputedStyle(li).getPropertyValue('--c').trim() || '#1e9bff';
        const card = $('.card', li);
        const lado = i % 2 ? A : -A;
        return { x: cx + lado, y: li.offsetTop + 46, color, li, card };
      });

      let d = 'M ' + pts[0].x + ' 0 L ' + pts[0].x + ' ' + pts[0].y;
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k], my = (a.y + b.y) / 2;
        d += ' C ' + a.x + ' ' + my + ', ' + b.x + ' ' + my + ', ' + b.x + ' ' + b.y;
      }
      d += ' L ' + pts[pts.length - 1].x + ' ' + H;

      const defs = crear('defs', {});
      const grad = crear('linearGradient', { id: 'roadGrad', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: 0, y2: H }, defs);
      pts.forEach((p) => crear('stop', { offset: (clamp(p.y / H) * 100).toFixed(1) + '%', 'stop-color': p.color }, grad));

      const wBed = esc ? 36 : 24, wAsph = esc ? 30 : 19, wFill = esc ? 6 : 4;
      crear('path', { d, class: 'road__bed', 'stroke-width': wBed });
      crear('path', { d, class: 'road__asph', 'stroke-width': wAsph });
      crear('path', { d, class: 'road__dash', 'stroke-width': 2 });

      // Conectores nodo → tarjeta
      pts.forEach((p) => {
        if (!p.card) return;
        const izq = p.li.offsetLeft + p.card.offsetLeft;
        const der = izq + p.card.offsetWidth;
        const borde = p.x < izq + p.card.offsetWidth / 2 ? izq : der;
        crear('path', { d: 'M ' + p.x + ' ' + p.y + ' L ' + borde + ' ' + p.y, class: 'road__link', stroke: p.color, 'stroke-width': 1.5 });
      });

      relleno = crear('path', { d, class: 'road__fill', 'stroke-width': wFill, stroke: 'url(#roadGrad)' });
      total = relleno.getTotalLength();
      relleno.style.strokeDasharray = total + ' ' + total;
      relleno.style.strokeDashoffset = total;

      // Muestras para convertir "altura" en "longitud" del trazo
      const N = Math.min(1200, Math.max(60, Math.ceil(total / 5)));
      muestras = [];
      for (let i = 0; i <= N; i++) {
        const len = (total * i) / N, pt = relleno.getPointAtLength(len);
        muestras.push({ len, x: pt.x, y: pt.y });
      }

      marcador = crear('g', { class: 'road__marker' });
      crear('circle', { class: 'road__halo', r: 10, fill: 'rgba(255,255,255,.38)' }, marcador);
      crear('circle', { r: 7, fill: '#fff' }, marcador);
      crear('circle', { r: 3, fill: '#0a1224' }, marcador);

      // Nodos (puntos) sobre cada estación
      pts.forEach((p) => {
        const nodo = $('.node-dot', p.li);
        if (nodo) { nodo.style.left = (p.x - p.li.offsetLeft) + 'px'; nodo.style.top = (p.y - p.li.offsetTop) + 'px'; }
      });
      road.classList.add('road-ready');
      actualizar();
    };

    const actualizar = () => {
      if (!pts.length || !relleno) return;
      let objetivo;
      if (reduced) objetivo = alto + 1;
      else objetivo = window.innerHeight * 0.52 - road.getBoundingClientRect().top;
      const y = clamp(objetivo, 0, alto);
      // búsqueda binaria de la muestra más cercana a esa altura
      let lo = 0, hi = muestras.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (muestras[mid].y < y) lo = mid + 1; else hi = mid; }
      const m = muestras[lo];
      relleno.style.strokeDashoffset = (total - m.len).toFixed(1);
      if (marcador) {
        marcador.setAttribute('transform', 'translate(' + m.x.toFixed(1) + ' ' + m.y.toFixed(1) + ')');
        marcador.style.opacity = objetivo <= 0 || objetivo >= alto ? '0' : '1';
      }
      pts.forEach((p) => p.li.classList.toggle('is-reached', objetivo >= p.y - 6));
    };

    construir();
    scrollFns.push(actualizar);
    resizeFns.push(construir);
    window.addEventListener('load', () => { construir(); setTimeout(construir, 700); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(construir).catch(() => {});
    if ('ResizeObserver' in window) {
      let t = 0;
      new ResizeObserver(() => { clearTimeout(t); t = setTimeout(construir, 160); }).observe(lista);
    }
  }

  /* ---------- Cartel 3D que se endereza y crece con el scroll ---------- */
  function initFlyer() {
    const track = $('[data-flyer-track]');
    const fl = $('[data-flyer]');
    if (!track || !fl) return;
    let tiltX = 0, tiltY = 0;
    const actualizar = () => {
      let p = 1;
      if (fx) {
        const r = track.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        p = total > 0 ? clamp(-r.top / total) : 1;
      }
      const e = easeOut(clamp(p / 0.6));
      const movil = window.innerWidth < 720;
      fl.style.setProperty('--p-s', lerp(movil ? 0.62 : 0.5, 1, e).toFixed(3));
      fl.style.setProperty('--p-rx', (lerp(26, 0, e) + tiltX).toFixed(2));
      fl.style.setProperty('--p-ry', (lerp(-22, 0, e) + tiltY).toFixed(2));
      fl.style.setProperty('--p-rz', lerp(-9, 0, e).toFixed(2));
      fl.style.setProperty('--p-ty', lerp(70, 0, e).toFixed(1));
      fl.style.setProperty('--p-g', lerp(0.25, 0.95, e).toFixed(2));
      fl.style.setProperty('--p-glow', lerp(0.6, 1.05, e).toFixed(2));
    };
    if (reduced) { fl.style.setProperty('--p-s', '1'); return; }
    scrollFns.push(actualizar);
    if (finePointer) {
      fl.addEventListener('pointermove', (e) => {
        const r = fl.getBoundingClientRect();
        tiltY = ((e.clientX - r.left) / r.width - 0.5) * 12;
        tiltX = (0.5 - (e.clientY - r.top) / r.height) * 8;
        pedirScroll();
      });
      fl.addEventListener('pointerleave', () => { tiltX = 0; tiltY = 0; pedirScroll(); });
    }
    actualizar();
  }

  /* ---------- Visor de imagen ampliada ---------- */
  function initVisor() {
    const botones = $$('[data-visor]');
    const dlg = $('#visor');
    if (!botones.length) return;
    if (!dlg || typeof dlg.showModal !== 'function') {
      botones.forEach((b) => b.addEventListener('click', () => window.open(b.dataset.visor, '_blank', 'noopener')));
      return;
    }
    const img = $('[data-visor-img]', dlg);
    botones.forEach((b) => b.addEventListener('click', () => {
      img.src = b.dataset.visor;
      img.alt = b.dataset.visorAlt || 'Imagen ampliada';
      dlg.classList.remove('is-zoom');
      dlg.showModal();
    }));
    $('[data-visor-close]', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    img.addEventListener('click', () => dlg.classList.toggle('is-zoom'));
    dlg.addEventListener('close', () => { img.removeAttribute('src'); img.alt = ''; });
  }

  /* ---------- Banner que se abre en grande con el scroll ---------- */
  function initBanner() {
    const track = $('[data-banner-track]');
    const media = $('[data-banner-media]');
    if (!track || !media || !fx) return;
    scrollFns.push(() => {
      const r = track.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 1;
      const e = easeOut(clamp(p / 0.5));
      const movil = window.innerWidth < 720;
      media.style.setProperty('--ix', lerp(movil ? 6 : 16, 0, e).toFixed(2) + '%');
      media.style.setProperty('--iy', lerp(movil ? 9 : 13, 0, e).toFixed(2) + '%');
      media.style.setProperty('--ir', lerp(38, 0, e).toFixed(1) + 'px');
      media.style.setProperty('--is', lerp(1.28, 1, e).toFixed(3));
      media.style.setProperty('--ct', clamp((p - 0.3) / 0.25).toFixed(3));
    });
  }

  /* ---------- Carril horizontal fijado de los 4 pasos (solo escritorio) ---------- */
  function initMetodo() {
    const track = $('[data-metodo-track]');
    const rail = $('[data-metodo-rail]');
    if (!track || !rail || !fx) return;
    const escritorio = () => window.matchMedia('(min-width: 1024px)').matches;
    const medir = () => {
      if (!escritorio()) { track.style.removeProperty('--m-shift'); rail.style.removeProperty('--m-x'); return; }
      track.style.setProperty('--m-shift', Math.max(0, rail.offsetWidth - window.innerWidth) + 'px');
    };
    const actualizar = () => {
      if (!escritorio()) return;
      const r = track.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 0;
      const shift = parseFloat(track.style.getPropertyValue('--m-shift')) || 0;
      rail.style.setProperty('--m-x', (-shift * p).toFixed(1) + 'px');
      track.style.setProperty('--m-p', p.toFixed(4));
    };
    medir();
    scrollFns.push(actualizar);
    resizeFns.push(() => { medir(); actualizar(); });
    window.addEventListener('load', () => { medir(); actualizar(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { medir(); actualizar(); }).catch(() => {});
  }

  /* ---------- Carta convenio: balanza interactiva ---------- */
  function initBalance() {
    const b = $('[data-balance]');
    if (!b) return;
    const tabs = $$('[data-tab]', b);
    const paneles = { con: $('#panel-con', b), sin: $('#panel-sin', b) };
    let tocado = false, visible = false;
    const poner = (k) => {
      b.dataset.state = k;
      tabs.forEach((t) => {
        const on = t.dataset.tab === k;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      Object.keys(paneles).forEach((key) => {
        const p = paneles[key];
        const on = key === k;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
    };
    b.dataset.state = 'con';
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { tocado = true; poner(t.dataset.tab); });
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const sig = tabs[(i + 1) % tabs.length];
          tocado = true; poner(sig.dataset.tab); sig.focus();
        }
      });
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.4 }).observe(b);
    }
    if (!reduced) {
      setInterval(() => {
        if (tocado || !visible || document.hidden) return;
        poner(b.dataset.state === 'sin' ? 'con' : 'sin');
      }, 6500);
    }
  }

  /* ---------- Efectos de puntero: luz, inclinación 3D y botones magnéticos ---------- */
  function initPointerFx() {
    if (!finePointer || reduced) return;
    $$('.card, .caso').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      });
    });
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.transform = 'perspective(900px) rotateX(' + ((0.5 - y) * 6).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 8).toFixed(2) + 'deg)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    $$('.btn--mag').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.16, dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
        el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Formulario → WhatsApp ---------- */
  function initForm() {
    const f = $('#form-contacto');
    if (!f) return;
    const campo = f.elements.nombre;
    const err = $('[data-err="nombre"]', f);
    const caja = campo ? campo.closest('.field') : null;
    if (campo) {
      campo.addEventListener('input', () => { if (err) err.textContent = ''; if (caja) caja.classList.remove('has-err'); });
    }
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = campo ? campo.value.trim() : '';
      if (nombre.length < 2) {
        if (err) err.textContent = 'Cuéntanos tu nombre para saber con quién hablar.';
        if (caja) caja.classList.add('has-err');
        if (campo) campo.focus();
        return;
      }
      if (!waActivo()) return;
      const temas = $$('input[name="tema"]:checked', f).map((i) => i.value);
      const detalle = f.elements.mensaje ? f.elements.mensaje.value.trim() : '';
      const lineas = ['Hola, soy ' + nombre + '.'];
      lineas.push(temas.length ? 'Necesito ayuda con: ' + temas.join(', ') + '.' : 'Me gustaría recibir asesoría fiscal y contable.');
      if (detalle) lineas.push('Detalle: ' + detalle);
      lineas.push('Los contacto desde su página web. ¿Me pueden orientar?');
      const url = waLink(lineas.join('\n'));
      const w = window.open(url, '_blank', 'noopener');
      if (!w) window.location.href = url;
    });
  }

  /* ---------- Horario: "abierto ahora" según la hora de Ciudad de México ---------- */
  function initHorario() {
    const cortos = $$('[data-estado]');
    const largos = $$('[data-estado-largo]');
    const filas = $$('.horario dl > div');
    const ahora = () => {
      try {
        const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
        const g = (t) => partes.find((x) => x.type === t).value;
        const dia = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[g('weekday')];
        let h = parseInt(g('hour'), 10); if (h === 24) h = 0;
        return { dia, min: h * 60 + parseInt(g('minute'), 10) };
      } catch (e) {
        const d = new Date();
        return { dia: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
      }
    };
    const rango = (dia) => (dia >= 1 && dia <= 5 ? [540, 1080] : dia === 6 ? [540, 840] : null);
    const hora = (min) => Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0');
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const t = ahora();
    const hoy = rango(t.dia);
    let corto, largo;
    if (hoy && t.min >= hoy[0] && t.min < hoy[1]) {
      corto = 'Abierto ahora · atención hasta las ' + hora(hoy[1]);
      largo = 'Abierto ahora · cerramos a las ' + hora(hoy[1]);
    } else {
      let sig = null, d = t.dia, offset = 0;
      if (hoy && t.min < hoy[0]) { sig = { texto: 'hoy', min: hoy[0] }; }
      else {
        for (let i = 1; i <= 7 && !sig; i++) {
          d = (t.dia + i) % 7; offset = i;
          const r = rango(d);
          if (r) sig = { texto: offset === 1 ? 'mañana' : 'el ' + dias[d], min: r[0] };
        }
      }
      corto = 'Fuera de horario · abrimos ' + sig.texto + ' a las ' + hora(sig.min);
      largo = 'Cerrado por ahora · abrimos ' + sig.texto + ' a las ' + hora(sig.min) + '. Déjanos tu mensaje';
    }
    cortos.forEach((e) => { e.textContent = corto; });
    largos.forEach((e) => { e.textContent = largo; });
    const idx = t.dia >= 1 && t.dia <= 5 ? 0 : t.dia === 6 ? 1 : 2;
    if (filas[idx]) filas[idx].classList.add('is-today');
  }

  /* ---------- Pie: palabra gigante con parallax y año ---------- */
  function initFooter() {
    const year = $('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());
    const foot = $('.foot');
    const palabra = $('[data-foot-word]');
    if (!foot || !palabra || reduced) return;
    scrollFns.push(() => {
      const r = foot.getBoundingClientRect();
      const p = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
      palabra.style.transform = 'translate3d(' + ((p - 0.5) * -140).toFixed(1) + 'px,0,0)';
    });
  }

  /* ---------- Arranque ---------- */
  const iniciar = () => {
    safe('whatsapp', initWhatsApp);
    safe('cargador', initLoader);
    safe('encabezado', initHeader);
    safe('revelado', initReveal);
    safe('canvas', initHeroCanvas);
    safe('radar', initRadar);
    safe('puntero-hero', initHeroPointer);
    safe('ticker', initTicker);
    safe('marquee', initMarquee);
    safe('scrub', initScrub);
    safe('ruta', initRoad);
    safe('cartel', initFlyer);
    safe('visor', initVisor);
    safe('banner', initBanner);
    safe('metodo', initMetodo);
    safe('balanza', initBalance);
    safe('puntero', initPointerFx);
    safe('formulario', initForm);
    safe('horario', initHorario);
    safe('pie', initFooter);
    pedirScroll();
    window.addEventListener('load', pedirScroll);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
