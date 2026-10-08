/*! Riffast Intro 2.0 — animación de entrada / pantalla de carga
 *
 *  INTEGRACIÓN MÍNIMA (pégalo justo después de <body>):
 *
 *    <div id="riffast-intro" style="position:fixed;inset:0;z-index:9999;background:#008B5A"></div>
 *    <script src="riffast-intro.js"></script>
 *    <script>RiffastIntro.mount({ container: '#riffast-intro' });</script>
 *
 *  El div con estilo inline evita que se vea la web antes de que cargue el script.
 *
 *  QUÉ SE VE: el nombre sube letra por letra; cada grupo de letras vuela a su lugar y se
 *  convierte en una hoja del trébol; el trébol se asienta con una luz suave y la pantalla
 *  verde sube como telón para descubrir la página. Si la página tarda en cargar, el trébol
 *  respira hasta que llegue ready() (o hasta `maxWait`).
 *
 *  Todo se mueve con transform, opacity y filter (Web Animations API), que el navegador
 *  anima fuera del hilo principal: sigue fluido aunque la página cargue por detrás.
 *
 *  CONTROL MANUAL (SPA, datos propios, fuentes, etc.):
 *
 *    const intro = RiffastIntro.mount({ container: '#riffast-intro', autoReady: false });
 *    Promise.all([cargarDatos(), document.fonts.ready]).then(() => intro.ready());
 *
 *  OPCIONES (todas opcionales):
 *    container      Elemento o selector. Si se omite, se crea un overlay en <body>.
 *    background     '#008B5A'   Verde del fondo.
 *    ink            '#FFFFFF'   Color de las letras y del trébol.
 *    autoReady      true        Llama a ready() con window 'load'.
 *    minTime        0           Momento más temprano (s) en que puede empezar la salida.
 *                               Nunca sale antes de que el trébol termine de formarse (~1.4 s).
 *    maxWait        10          Segundos máximos de espera antes de salir sí o sí.
 *    reducedMotion  'auto'      'auto' respeta prefers-reduced-motion; true/false lo fuerza.
 *    speed          1           Velocidad de reproducción (útil para revisar la animación).
 *    zIndex         9999
 *    removeOnDone   true        Elimina el overlay del DOM al terminar.
 *    onDone         fn          Callback al terminar.
 *
 *  EVENTOS en document:
 *    'riffast-intro:reveal'   el telón empieza a descubrir la página: buen momento para
 *                             arrancar las animaciones del inicio.
 *    'riffast-intro:done'     la intro terminó y ya no está en pantalla.
 *
 *  Mientras la intro tapa la página, <html> lleva la clase `riffast-intro-active`
 *  (se quita en 'riffast-intro:reveal').
 *
 *  API de la instancia: ready(), replay(), destroy(), state ('playing'|'holding'|'exiting'|'done').
 */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  // Trazados exactos del logotipo (Riffast_logo_vectorial.svg, viewBox 0 0 1390 499)
  var LETTERS = [
    // R
    'M 488.245 235.75 L 488.5 131.5 541 131.511 C 581.023 131.52 595.282 131.848 601 132.89 C 630.661 138.294 649.789 153.278 658.796 178.165 C 661.217 184.855 661.448 186.776 661.422 200 C 661.396 213.103 661.128 215.299 658.64 222.792 C 655.151 233.3 647.369 244.885 639.456 251.35 C 633.8 255.971 621.023 263 618.278 263 C 615.366 263 616.122 264.166 659.191 326.089 C 663.535 332.335 666.643 337.767 666.334 338.573 C 665.876 339.766 660.73 340 634.916 340 L 604.045 340 596.084 327.75 C 591.706 321.012 581.903 305.825 574.3 294 L 560.478 272.5 551.489 272.5 L 542.5 272.5 542.237 306.25 L 541.973 340 514.982 340 L 487.991 340 488.245 235.75 Z M 589.577 225.885 C 597.294 222.998 602.465 217.649 604.583 210.361 C 608.468 197 603.459 184.25 592.064 178.492 C 586.764 175.814 554.142 173.822 545.125 175.625 L 542 176.25 542 202.125 L 542 228 562.962 228 C 581.856 228 584.483 227.791 589.577 225.885 Z',
    // punto de la i
    'M 697.404 173.234 C 677.988 166.291 671.53 142.04 685.017 126.718 C 697.554 112.476 721.491 113.557 732.165 128.849 C 742.688 143.922 737.864 163.433 721.563 171.734 C 714.81 175.173 704.6 175.807 697.404 173.234 Z',
    // asta de la i
    'M 682.244 262.75 L 682.5 185.5 708.5 185.5 L 734.5 185.5 734.756 262.75 L 735.012 340 708.5 340 L 681.988 340 682.244 262.75 Z',
    // f
    'M 765.657 339.25 C 765.404 338.837 765.318 317.575 765.466 292 C 765.615 266.425 765.503 241.562 765.218 236.75 L 764.701 228 758.6 227.985 C 755.245 227.976 751.928 227.606 751.229 227.163 C 750.253 226.543 750.021 221.602 750.229 205.928 L 750.5 185.5 758.25 185.208 L 766 184.916 766 177.118 C 766 172.626 766.837 166.046 767.975 161.596 C 776.145 129.654 803.518 115.245 844.5 121.315 L 852.5 122.5 852.5 144 L 852.5 165.5 842 165.181 C 832.611 164.896 831.026 165.108 827.023 167.181 C 821.842 169.865 819.267 173.771 818.371 180.308 L 817.736 184.942 831.618 185.221 L 845.5 185.5 845.771 205.773 C 845.98 221.452 845.754 226.154 844.771 226.52 C 844.072 226.781 837.875 227.108 831 227.247 L 818.5 227.5 818.242 283.75 L 817.983 340 792.051 340 C 777.788 340 765.911 339.663 765.657 339.25 Z',
    // f
    'M 874.758 283.767 L 874.5 227.5 867.5 227.31 C 863.65 227.206 859.928 227.094 859.23 227.06 C 858.236 227.013 858.018 222.477 858.23 206.25 L 858.5 185.5 866.75 185.21 L 875 184.919 875 176.62 C 875 141.648 897.786 120.032 934.678 120.007 C 946.101 119.999 959.847 121.632 961.77 123.226 C 962.737 124.027 962.976 129.079 962.77 144.389 L 962.5 164.5 951 164.5 C 933.921 164.5 928.151 168.128 927.212 179.459 L 926.752 185 942.676 185 C 953.728 185 958.967 185.367 959.8 186.2 C 961.542 187.942 961.495 225.562 959.75 226.691 C 959.062 227.136 951.416 227.401 942.758 227.281 L 927.017 227.061 926.758 283.281 L 926.5 339.5 900.758 339.767 L 875.017 340.034 874.758 283.767 Z',
    // a
    'M 998.161 342.972 C 975.497 339.859 960.538 325.975 956.954 304.727 C 953.914 286.702 960.635 268.629 974.241 258.243 C 988.413 247.424 1004.561 243.279 1036.25 242.327 L 1057 241.703 1056.996 238.602 C 1056.989 232.895 1052.589 227.317 1045.5 224.027 C 1032.524 218.004 1014.59 221.929 1000.153 233.95 C 992.441 240.371 993.553 240.764 978.265 226.202 C 964.816 213.392 964.862 213.873 976.048 202.895 C 992.63 186.622 1018.529 178.891 1046.679 181.812 C 1079.964 185.266 1099.397 199.261 1106.647 225 C 1108.318 230.932 1108.479 236.218 1108.489 285.5 L 1108.5 339.5 1083.5 339.5 L 1058.5 339.5 1058.207 331.698 L 1057.914 323.896 1051.559 328.953 C 1037.197 340.381 1017.309 345.603 998.161 342.972 Z M 1039.57 303.04 C 1043.125 301.29 1047.276 298.276 1048.985 296.205 C 1052.673 291.733 1056 283.252 1056 278.322 L 1056 274.72 1039.75 275.271 C 1028.497 275.652 1022.088 276.323 1018.907 277.451 C 1007.216 281.599 1003.1 294.176 1010.982 301.662 C 1017.49 307.843 1028.714 308.384 1039.57 303.04 Z',
    // s
    'M 1168.867 342.98 C 1157.562 341.699 1149.556 339.392 1139.5 334.517 C 1130.55 330.178 1119 321.148 1119 318.489 C 1119 316.098 1138.895 287 1140.53 287 C 1141.386 287 1144.436 288.774 1147.307 290.942 C 1159.479 300.132 1177.088 305.417 1187.654 303.053 C 1196.226 301.135 1199.881 296.384 1196.97 290.945 C 1195.405 288.021 1191.36 286.329 1175.489 281.963 C 1143.491 273.161 1132.948 266.624 1125.629 251.047 C 1119.886 238.825 1120.838 219.959 1127.796 208.086 C 1134.526 196.601 1149.264 186.808 1165 183.365 C 1181.202 179.819 1203.673 181.506 1219.476 187.455 C 1231.282 191.899 1244.904 202.201 1243.57 205.677 C 1242.11 209.483 1221.5 234 1219.761 234 C 1218.703 234 1215.961 232.5 1213.668 230.667 C 1201.401 220.859 1187.182 217.465 1177.251 221.973 C 1169.453 225.512 1168.995 232.179 1176.26 236.378 C 1178.592 237.725 1188.15 240.909 1197.5 243.452 C 1234.064 253.396 1246.618 264.756 1247.784 288.953 C 1249.319 320.846 1226.114 341.448 1186.5 343.361 C 1181 343.627 1173.065 343.455 1168.867 342.98 Z',
    // t
    'M 1300.782 341.506 C 1285.306 337.595 1275.972 329.313 1270.863 314.96 C 1268.636 308.704 1268.553 307.232 1268.203 268.25 L 1267.842 228 1265.171 227.849 C 1263.702 227.766 1261.211 227.802 1259.635 227.929 C 1258.059 228.055 1255.687 227.887 1254.364 227.555 L 1251.96 226.952 1252.23 206.226 L 1252.5 185.5 1260.25 185.208 L 1268 184.916 1268 165.58 C 1268 150.4 1268.295 146 1269.374 145.104 C 1270.341 144.302 1277.981 144.043 1295.124 144.232 L 1319.5 144.5 1319.771 164.723 L 1320.041 184.947 1334.771 185.223 L 1349.5 185.5 1349.5 206 L 1349.5 226.5 1336 227.132 C 1328.575 227.479 1321.938 227.817 1321.25 227.882 C 1319.627 228.035 1319.461 286.519 1321.067 292.302 C 1322.818 298.607 1326.575 300.261 1337.656 299.607 C 1345.067 299.169 1346.917 299.341 1347.365 300.508 C 1347.669 301.301 1347.641 310.29 1347.302 320.483 L 1346.685 339.016 1341.593 340.628 C 1334.39 342.908 1308.531 343.464 1300.782 341.506 Z'
  ];
  var LEAVES = [
    // hoja superior izquierda
    'M 102.787 218.98 C 78.303 212.893 55.675 193.602 46.147 170.691 C 35.408 144.866 39.417 113.587 55.459 98.04 L 59.029 94.58 61.909 98.073 C 69.468 107.244 83.27 110.068 94.23 104.686 C 110.577 96.659 113.9 77.003 101.283 62.97 L 96.75 57.928 100.625 54.457 C 106.166 49.494 119.224 43.392 128.208 41.566 C 163.78 34.338 198.876 52.708 216.447 87.751 C 224.048 102.911 224.414 105.707 224.459 149 C 224.496 183.819 224.324 188.023 222.658 192.969 C 218.678 204.785 210.414 213.662 199.153 218.215 C 193.612 220.455 192.681 220.504 152 220.698 C 114.043 220.88 109.842 220.733 102.787 218.98 Z',
    // hoja inferior izquierda
    'M 126.468 412.186 C 116.137 409.551 107.253 405.017 100.742 399.056 L 94.984 393.785 100.283 388.061 C 111.139 376.335 110.817 361.517 99.481 351.157 C 88.697 341.3 74.537 341.656 63.749 352.055 L 58.624 356.995 56.229 354.748 C 51.681 350.479 46.366 341.306 43.58 332.917 C 30.408 293.261 56.308 249.355 100.5 236.427 C 105.644 234.922 112.082 234.614 145.638 234.265 C 170.804 234.003 186.831 234.237 190.532 234.921 C 208.094 238.168 221.195 251.31 224.007 268.5 C 225.332 276.598 225.269 333.92 223.925 343.582 C 219.639 374.4 196.454 401.153 165.5 410.997 C 155.669 414.123 136.369 414.711 126.468 412.186 Z',
    // hoja superior derecha
    'M 273.746 219.914 C 262.801 217.335 252.789 208.996 247.674 198.201 L 244.5 191.5 244.195 153.823 C 243.911 118.709 244.03 115.559 245.939 107.522 C 252.161 81.322 270.814 58.215 294.493 47.374 C 319.757 35.808 350.964 38.487 367.928 53.678 L 372.356 57.644 368.231 61.769 C 362.5 67.5 360.75 71.383 360.221 79.54 C 359.147 96.094 370.888 107.854 387.417 106.782 C 395.459 106.26 398.547 104.922 405.164 99.091 L 409.828 94.981 413.947 99.741 C 422.959 110.156 427.441 123.907 427.395 141 C 427.31 172.225 408.923 200.379 379.678 214.064 C 365.726 220.592 361.922 221.011 317.59 220.9 C 295.541 220.844 275.811 220.401 273.746 219.914 Z',
    // hoja inferior derecha con tallo
    'M 335.5 457.764 C 326.109 454.389 306.556 438.603 292.395 422.964 C 270.461 398.74 250.859 366.822 245.96 347.352 C 244.042 339.73 243.928 336.761 244.205 301.352 L 244.5 263.5 247.18 257.782 C 252.645 246.123 263.742 237.519 276.54 235.019 C 286.528 233.069 359.828 234.131 367.5 236.337 C 394.662 244.15 415.064 263.526 424.171 290.158 C 431.547 311.73 426.671 337.267 412.563 350.939 L 409.015 354.378 405.636 350.43 C 395.429 338.505 377.157 338.512 366.157 350.445 C 357.48 359.858 357.81 375.227 366.896 384.906 C 370.913 389.185 370.489 390.219 363.216 393.891 C 346.139 402.511 326.383 402.197 304.75 392.962 C 299.938 390.907 296 389.544 296 389.932 C 296 391.418 313.878 407.972 321.793 413.814 C 326.354 417.18 336.254 422.948 343.793 426.631 C 360.38 434.734 362 436.033 362 441.234 C 362 444.532 361.234 445.93 356.932 450.478 C 349.294 458.555 343.336 460.58 335.5 457.764 Z'
  ];
  // El nombre se arma en 4 grupos; cada grupo vuela a una hoja del trébol y se convierte en ella.
  // Índices de LETTERS: 0 R · 1 punto de la i · 2 asta de la i · 3 f · 4 f · 5 a · 6 s · 7 t
  var GROUPS = [
    { letters: [0], leaf: 0, turn: -16 },      // R     → hoja sup. izq.
    { letters: [1, 2, 3], leaf: 1, turn: 14 }, // i + f → hoja inf. izq.
    { letters: [4, 5], leaf: 2, turn: 16 },    // f + a → hoja sup. der.
    { letters: [6, 7], leaf: 3, turn: -12 }    // s + t → hoja inf. der. con tallo
  ];
  var RISE_ORDER = [0, 1, 1, 2, 3, 4, 5, 6]; // turno de cada letra al subir
  var DOT = 1;                                // el punto de la i cae cuando ya subió el asta
  var VB = { w: 1000, h: 640 };               // espacio de trabajo
  var K = 1.3;                                // tamaño del trébol respecto al nombre
  var PAD = 6;                                // margen del recorte de cada letra (no corta el antialias)

  // ---- línea de tiempo (s) -----------------------------------------------------
  var TL = {
    rise: 0.05, riseStep: 0.035, riseDur: 0.6, // el nombre sube letra por letra
    fly: 0.64, flyStep: 0.05, flyDur: 0.64,    // cada grupo vuela y se vuelve hoja
    glow: 0.92, ring: 1.22,                    // luz detrás del trébol y un pulso al cerrarse
    formed: 1.42,                              // trébol completo: antes de esto nunca sale
    hold: 1.85,                                // si la página no ha cargado, respira
    reveal: 0.2,                               // ya en la salida, cuándo se avisa a la página
    exitDur: 0.8
  };
  var EASE = {
    rise: 'cubic-bezier(.2,.8,.2,1)',     // la misma curva de los titulares de la página
    drop: 'cubic-bezier(.34,1.56,.64,1)', // el punto de la i rebota apenas
    fly: 'cubic-bezier(.65,0,.35,1)',
    soft: 'cubic-bezier(.2,.8,.2,1)',
    breathe: 'cubic-bezier(.45,0,.55,1)',
    lift: 'cubic-bezier(.55,0,.8,.2)',
    curtain: 'cubic-bezier(.76,0,.24,1)'
  };
  var RM = { fadeIn: 0.3, minHold: 0.7, exitDur: 0.35 }; // alternativa con movimiento reducido
  var DEFAULTS = {
    container: null, background: '#008B5A', ink: '#FFFFFF', autoReady: true,
    minTime: 0, maxWait: 10, reducedMotion: 'auto', speed: 1, zIndex: 9999,
    removeOnDone: true, onDone: null
  };

  // ---- utilidades -----------------------------------------------------------
  var canAnimate = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  var px = function (n) { return (Math.round(n * 100) / 100) + 'px'; };
  var union = function (a, b) {
    if (!a) return b;
    var x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x: x, y: y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  };
  var mid = function (b) { return [b.x + b.w / 2, b.y + b.h / 2]; };
  var div = function (css) { var d = document.createElement('div'); d.style.cssText = css; return d; };
  var place = function (b, s) { return 'position:absolute;left:' + px(b.x * s) + ';top:' + px(b.y * s) + ';width:' + px(b.w * s) + ';height:' + px(b.h * s) + ';'; };
  var glyph = function (d, b, ink) {
    return '<svg xmlns="' + NS + '" viewBox="' + [b.x, b.y, b.w, b.h].join(' ') + '" width="100%" height="100%" style="display:block;overflow:visible" aria-hidden="true" focusable="false">' +
      '<path d="' + d + '" fill="' + ink + '" fill-rule="evenodd"/></svg>';
  };
  // Cajas de los trazados, en coordenadas del logotipo
  var measure = function (list) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '10'); svg.setAttribute('height', '10');
    svg.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;overflow:hidden;pointer-events:none';
    (document.body || document.documentElement).appendChild(svg);
    var out = list.map(function (d) {
      var p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); svg.appendChild(p);
      var b = p.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    svg.parentNode.removeChild(svg);
    return out;
  };
  var scaleOf = function (el) { // escala actual, también a mitad de una animación
    try {
      var m = /matrix\(([^)]+)\)/.exec(getComputedStyle(el).transform || '');
      if (m) { var v = m[1].split(','); return Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1; }
    } catch (e) {}
    return 1;
  };
  var opacityOf = function (el) { try { var o = parseFloat(getComputedStyle(el).opacity); return isNaN(o) ? 1 : o; } catch (e) { return 1; } };
  var shade = function (hex, amt) { // aclara (>0) u oscurece (<0) un color hex
    var m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return hex;
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt)))); };
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  };
  var uid = 0;

  // ---- instancia -------------------------------------------------------------
  function Intro(opts) {
    this.o = Object.assign({}, DEFAULTS, opts || {});
    this.id = 'ri' + (++uid);
    this.state = 'playing';
    this.isReady = false; this.revealed = false; this.anims = [];
    this.rm = !canAnimate || (this.o.reducedMotion === 'auto'
      ? !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches)
      : !!this.o.reducedMotion);
    this._container();
    this._build();
    document.documentElement.classList.add('riffast-intro-active');
    this._play();
    if (this.o.autoReady) {
      if (document.readyState === 'complete') this.ready();
      else global.addEventListener('load', this.ready.bind(this), { once: true });
    }
    if (this.o.maxWait > 0) this.maxTimer = setTimeout(this.ready.bind(this), this.o.maxWait * 1000);
  }

  Intro.prototype._container = function () {
    var c = this.o.container;
    if (typeof c === 'string') c = document.querySelector(c);
    this.created = !c;
    if (!c) { c = document.createElement('div'); (document.body || document.documentElement).appendChild(c); }
    this.el = c;
    var bg = this.o.background;
    var s = c.style;
    s.position = 'fixed'; s.top = s.right = s.bottom = s.left = '0'; s.zIndex = String(this.o.zIndex);
    s.display = 'flex'; s.alignItems = 'center'; s.justifyContent = 'center'; s.margin = '0'; s.padding = '0';
    s.background = bg;
    // Luz tenue al centro; los bordes quedan del verde exacto para que empaten con el telón
    s.background = 'radial-gradient(120% 70% at 50% 45%, ' + shade(bg, 0.07) + ' 0%, ' + bg + ' 62%)';
    s.opacity = '1'; s.transform = 'none';
  };

  Intro.prototype._build = function () {
    var self = this, ink = this.o.ink;
    var vw = global.innerWidth || document.documentElement.clientWidth || 390;
    var vh = global.innerHeight || document.documentElement.clientHeight || 844;
    var W = Math.min(Math.max(280, Math.min(0.72 * vw, 1.18 * vh)), 780), s = W / VB.w;

    // Borde inferior curvo del telón (queda fuera de pantalla hasta que sube)
    this.tailH = Math.round(Math.min(0.12 * vh, 110));
    this.tail = div('position:absolute;left:0;top:100%;width:100%;margin-top:-1px;height:' + this.tailH + 'px;background:' + this.o.background + ';border-radius:0 0 50% 50% / 0 0 100% 100%;pointer-events:none');
    this.el.appendChild(this.tail);

    var stage = this.stage = div('position:relative;flex:none;width:' + px(W) + ';height:' + px(VB.h * s) + ';margin-bottom:4vh');
    var lb = measure(LETTERS), fb = measure(LEAVES);
    var wc = mid(lb.reduce(union, null)), wo = [VB.w / 2 - wc[0], VB.h / 2 - wc[1]]; // nombre centrado
    var cc = mid(fb.reduce(union, null));                                              // trébol centrado
    var toClover = function (b) { return { x: VB.w / 2 + K * (b.x - cc[0]), y: VB.h / 2 + K * (b.y - cc[1]), w: K * b.w, h: K * b.h }; };
    var cb = toClover(fb.reduce(union, null)), cm = mid(cb), D = Math.max(cb.w, cb.h);

    // Luz detrás del trébol y el pulso que se abre al cerrarse
    this.glow = div(place({ x: cm[0] - D, y: cm[1] - D, w: 2 * D, h: 2 * D }, s) + 'border-radius:50%;opacity:0;background:radial-gradient(closest-side,rgba(255,255,255,.2),rgba(255,255,255,.06) 55%,rgba(255,255,255,0))');
    this.ring = div(place({ x: cm[0] - 0.62 * D, y: cm[1] - 0.62 * D, w: 1.24 * D, h: 1.24 * D }, s) + 'box-sizing:border-box;border-radius:50%;opacity:0;border:' + px(Math.max(1.5, 3 * s)) + ' solid rgba(255,255,255,.4)');

    // Trébol: cada hoja es su propia capa, en su lugar final
    this.clover = div('position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:' + px(cm[0] * s) + ' ' + px(cm[1] * s));
    this.leaves = LEAVES.map(function (d, j) {
      var b = toClover(fb[j]), e = div(place(b, s) + (self.rm ? '' : 'opacity:0'));
      e.innerHTML = glyph(d, fb[j], ink);
      self.clover.appendChild(e);
      return { el: e, box: b };
    });
    stage.appendChild(this.glow); stage.appendChild(this.ring); stage.appendChild(this.clover);

    // Nombre: grupos (vuelan) → recorte de cada letra → letra (sube desde su línea base)
    this.groups = [];
    if (this.rm) { this.clover.style.opacity = '0'; this.el.appendChild(stage); return; }
    var word = div('position:absolute;left:0;top:0;width:100%;height:100%');
    this.groups = GROUPS.map(function (g) {
      var gb = g.letters.map(function (i) { return lb[i]; }).reduce(union, null);
      var gv = { x: gb.x + wo[0], y: gb.y + wo[1], w: gb.w, h: gb.h };
      var ge = div(place({ x: gv.x - PAD, y: gv.y - PAD, w: gv.w + 2 * PAD, h: gv.h + 2 * PAD }, s));
      var letters = g.letters.map(function (i) {
        var b = { x: lb[i].x - PAD, y: lb[i].y - PAD, w: lb[i].w + 2 * PAD, h: lb[i].h + 2 * PAD };
        var clip = div(place({ x: lb[i].x - gb.x, y: lb[i].y - gb.y, w: b.w, h: b.h }, s) + (i === DOT ? '' : 'overflow:hidden'));
        var inner = div('width:100%;height:100%');
        inner.innerHTML = glyph(LETTERS[i], b, ink);
        clip.appendChild(inner); ge.appendChild(clip);
        return { i: i, el: inner };
      });
      word.appendChild(ge);
      var leaf = self.leaves[g.leaf], a = mid(gv), z = mid(leaf.box);
      return {
        el: ge, letters: letters, leaf: leaf, turn: g.turn,
        dx: (z[0] - a[0]) * s, dy: (z[1] - a[1]) * s,
        k: Math.sqrt((leaf.box.w * leaf.box.h) / (gv.w * gv.h)) // tamaño de la hoja respecto al grupo
      };
    });
    stage.appendChild(word);
    this.blur = Math.max(1.2, 6 * s);
    this.el.appendChild(stage);
  };

  // Una animación (tiempos en segundos). Sin Web Animations API salta al estado final.
  Intro.prototype._a = function (el, frames, t) {
    if (!canAnimate) {
      var last = frames[frames.length - 1], fake = { cancel: function () {}, onfinish: null };
      for (var k in last) if (k !== 'offset') el.style[k] = last[k];
      setTimeout(function () { if (fake.onfinish) fake.onfinish(); }, 0);
      return fake;
    }
    var a = el.animate(frames, {
      duration: t.dur * 1000, delay: (t.delay || 0) * 1000, easing: t.easing || 'linear',
      fill: t.fill || 'both', iterations: t.iterations || 1, direction: t.direction || 'normal'
    });
    a.playbackRate = this.o.speed;
    this.anims.push(a);
    return a;
  };

  Intro.prototype._play = function () {
    var self = this;
    this.t0 = performance.now();
    if (this.rm) { this._a(this.clover, [{ opacity: 0 }, { opacity: 1 }], { dur: RM.fadeIn, easing: EASE.soft }); return; }

    // 1) El nombre sube letra por letra; el punto de la i cae al final
    this.groups.forEach(function (g) {
      g.letters.forEach(function (L) {
        if (L.i === DOT) self._a(L.el, [{ transform: 'translateY(-70%)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { dur: 0.5, delay: TL.rise + 1.5 * TL.riseStep + 0.16, easing: EASE.drop });
        else self._a(L.el, [{ transform: 'translateY(112%)' }, { transform: 'translateY(0)' }], { dur: TL.riseDur, delay: TL.rise + RISE_ORDER[L.i] * TL.riseStep, easing: EASE.rise });
      });
    });

    // 2) Cada grupo vuela a su hoja y se convierte en ella: en todo momento comparten
    //    posición y tamaño (y giro en el cruce); solo cambia la silueta, con un desenfoque breve
    var still = 'translate(0px,0px) rotate(0deg) scale(1)';
    this.groups.forEach(function (g, n) {
      var t = { dur: TL.flyDur, delay: TL.fly + n * TL.flyStep, easing: EASE.fly };
      var to = 'translate(' + px(g.dx) + ',' + px(g.dy) + ') rotate(' + g.turn + 'deg) scale(' + g.k.toFixed(4) + ')';
      var from = 'translate(' + px(-g.dx) + ',' + px(-g.dy) + ') rotate(' + g.turn + 'deg) scale(' + (1 / g.k).toFixed(4) + ')';
      var blur = [{ filter: 'blur(0px)' }, { filter: 'blur(' + px(self.blur) + ')', offset: 0.48 }, { filter: 'blur(0px)' }];
      self._a(g.el, [{ transform: still, opacity: 1, offset: 0 }, { opacity: 1, offset: 0.36 }, { opacity: 0, offset: 0.6 }, { transform: to, opacity: 0, offset: 1 }], t);
      self._a(g.leaf.el, [{ transform: from, opacity: 0, offset: 0 }, { opacity: 0, offset: 0.36 }, { opacity: 1, offset: 0.6 }, { transform: still, opacity: 1, offset: 1 }], t);
      self._a(g.el, blur, t);
      self._a(g.leaf.el, blur, t);
    });

    // 3) Trébol completo: se asienta, se enciende una luz detrás y se abre un pulso
    this._a(this.clover, [{ transform: 'scale(1)' }, { transform: 'scale(1.035)', offset: 0.45 }, { transform: 'scale(1)' }], { dur: 0.6, delay: TL.formed - 0.22, easing: EASE.breathe, fill: 'none' });
    this._a(this.glow, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { dur: 0.9, delay: TL.glow, easing: EASE.soft });
    this._a(this.ring, [{ transform: 'scale(.8)', opacity: 0 }, { opacity: 0.7, offset: 0.12 }, { transform: 'scale(1.9)', opacity: 0 }], { dur: 1.1, delay: TL.ring, easing: EASE.soft });

    // 4) Si la página sigue cargando, el trébol respira. Esta animación también sirve de
    //    reloj de la intro: marca el mismo tiempo que se ve en pantalla.
    var loop = { dur: 1.3, delay: TL.hold, iterations: Infinity, direction: 'alternate', easing: EASE.breathe, fill: 'none' };
    this.breath = [
      this._a(this.clover, [{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }], loop),
      this._a(this.glow, [{ opacity: 1 }, { opacity: 0.55 }], loop)
    ];
    this.holdTimer = setTimeout(function () { if (self.state === 'playing') self.state = 'holding'; }, TL.hold * 1000 / this.o.speed);
  };

  // Segundos de intro ya reproducidos (en la escala de TL)
  Intro.prototype._elapsed = function () {
    var c = this.breath && this.breath[0];
    if (c && c.currentTime != null) return c.currentTime / 1000;
    return this.rm ? (performance.now() - this.t0) / 1000 * this.o.speed : 0;
  };

  Intro.prototype._check = function () {
    if (!this.isReady || this.state === 'exiting' || this.state === 'done') return;
    var at = Math.max(this.o.minTime || 0, this.rm ? RM.minHold : TL.formed);
    var wait = at - this._elapsed();
    clearTimeout(this.waitTimer);
    if (wait > 0.001) this.waitTimer = setTimeout(this._check.bind(this), Math.max(16, wait * 1000 / this.o.speed));
    else this._exit();
  };

  // 5) Salida: el trébol se adelanta hacia arriba y se desvanece; detrás sube el telón
  Intro.prototype._exit = function () {
    var self = this;
    this.state = 'exiting';
    clearTimeout(this.holdTimer); clearTimeout(this.maxTimer); clearTimeout(this.waitTimer);
    if (this.rm) {
      this._reveal();
      this._a(this.el, [{ opacity: 1 }, { opacity: 0 }], { dur: RM.exitDur, easing: EASE.soft, fill: 'forwards' }).onfinish = function () { self._finish(); };
      return;
    }
    var sc = scaleOf(this.clover), gl = opacityOf(this.glow);
    (this.breath || []).forEach(function (a) { a.cancel(); });
    this.breath = null;
    var H = this.el.getBoundingClientRect().height + this.tailH + 4;
    this._a(this.clover, [{ transform: 'translateY(0px) scale(' + sc.toFixed(4) + ')', opacity: 1 }, { transform: 'translateY(' + px(-0.14 * H) + ') scale(.9)', opacity: 0 }], { dur: 0.55, easing: EASE.lift, fill: 'forwards' });
    this._a(this.glow, [{ opacity: gl }, { opacity: 0 }], { dur: 0.4, easing: EASE.lift, fill: 'forwards' });
    this._a(this.el, [{ transform: 'translateY(0px)' }, { transform: 'translateY(' + px(-H) + ')' }], { dur: TL.exitDur, delay: 0.08, easing: EASE.curtain, fill: 'forwards' })
      .onfinish = function () { self._finish(); };
    this.revealTimer = setTimeout(function () { self._reveal(); }, TL.reveal * 1000 / this.o.speed);
  };

  // La página ya se empieza a ver: se libera el scroll y arrancan sus animaciones
  Intro.prototype._reveal = function () {
    if (this.revealed) return;
    this.revealed = true;
    document.documentElement.classList.remove('riffast-intro-active');
    try { document.dispatchEvent(new CustomEvent('riffast-intro:reveal', { detail: { intro: this } })); } catch (e) {}
  };

  Intro.prototype._clear = function () {
    clearTimeout(this.holdTimer); clearTimeout(this.maxTimer); clearTimeout(this.waitTimer); clearTimeout(this.revealTimer);
    this.anims.forEach(function (a) { a.cancel(); });
    this.anims = []; this.breath = null;
  };

  Intro.prototype._finish = function () {
    if (this.state === 'done') return;
    this._reveal();
    this.state = 'done';
    this._clear();
    if (this.o.removeOnDone && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    else this.el.style.display = 'none';
    try { document.dispatchEvent(new CustomEvent('riffast-intro:done', { detail: { intro: this } })); } catch (e) {}
    if (typeof this.o.onDone === 'function') this.o.onDone(this);
  };

  // ---- API pública -----------------------------------------------------------
  Intro.prototype.ready = function () { this.isReady = true; this._check(); return this; };

  Intro.prototype.replay = function (opts) { // solo para demostraciones
    var keepReady = opts && opts.keepReady;
    this._clear();
    if (this.stage && this.stage.parentNode) this.stage.parentNode.removeChild(this.stage);
    if (this.tail && this.tail.parentNode) this.tail.parentNode.removeChild(this.tail);
    this.state = 'playing'; this.revealed = false;
    if (!keepReady) this.isReady = false;
    if (!this.el.parentNode) (document.body || document.documentElement).appendChild(this.el);
    this.el.style.display = 'flex'; this.el.style.opacity = '1'; this.el.style.transform = 'none';
    this._build();
    document.documentElement.classList.add('riffast-intro-active');
    this._play();
    if (this.isReady) this._check();
    return this;
  };

  Intro.prototype.destroy = function () {
    this._clear();
    this.state = 'done';
    document.documentElement.classList.remove('riffast-intro-active');
    if (this.created) { if (this.el.parentNode) this.el.parentNode.removeChild(this.el); }
    else { this.el.innerHTML = ''; this.el.style.display = 'none'; }
  };

  function mount(opts) {
    var o = opts || {};
    if (!document.body && !(o.container instanceof Element)) {
      // script en <head>: esperamos al body para poder montar el overlay
      var pending = { _q: [], ready: function () { pending._q.push('ready'); return pending; }, state: 'init' };
      document.addEventListener('DOMContentLoaded', function () {
        var inst = new Intro(o);
        if (pending._q.length) inst.ready();
        Object.assign(pending, { ready: inst.ready.bind(inst), replay: inst.replay.bind(inst), destroy: inst.destroy.bind(inst), instance: inst });
      }, { once: true });
      return pending;
    }
    return new Intro(o);
  }

  global.RiffastIntro = { mount: mount, timeline: TL, version: '2.0.0' };
})(typeof window !== 'undefined' ? window : this);
