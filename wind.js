(function () {

  /* ── SHARED WAVE MATH ─────────────────────────────────────────── */
  function renderWave(t, cols, rows, chars, threshold, xOff, yOff) {
    var windAngle = Math.sin(t * 0.15) * 1.5 + Math.cos(t * 0.11) * 1.5;
    var dx1 = Math.cos(windAngle),       dy1 = Math.sin(windAngle);
    var dx2 = Math.cos(windAngle + 0.8), dy2 = Math.sin(windAngle + 0.8);
    var dx3 = Math.cos(windAngle - 0.5), dy3 = Math.sin(windAngle - 0.5);
    var last = chars.length - 1;
    var lines = new Array(rows);
    for (var y = 0; y < rows; y++) {
      var row = '';
      var gy = y + (yOff || 0);
      for (var x = 0; x < cols; x++) {
        var gx = x + (xOff || 0);
        var w1 = Math.sin(gx * dx1 * 0.05 + gy * dy1 * 0.08 + t * 1.1);
        var w2 = Math.sin(gx * dx2 * 0.04 + gy * dy2 * 0.06 + t * 0.7);
        var w3 = Math.sin(gx * dx3 * 0.03 + gy * dy3 * 0.05 + t * 0.9);
        var v = ((w1 + w2 + w3) / 3 + 1) * 0.5;
        if (v < threshold) {
          row += ' ';
        } else {
          var mapped = (v - threshold) / (1 - threshold);
          row += chars[Math.min(last, Math.floor(mapped * (last + 1)))];
        }
      }
      lines[y] = row;
    }
    return lines;
  }

  function measureCharW() {
    var span = document.createElement('span');
    span.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;' +
      'font-family:"SF Mono","Fira Mono","Consolas","Menlo",monospace;' +
      'font-size:13px;line-height:16px;letter-spacing:0;';
    span.textContent = 'MMMMMMMMMM';
    document.body.appendChild(span);
    var w = span.getBoundingClientRect().width / 10;
    span.remove();
    return w;
  }

  /* ── initWind ─────────────────────────────────────────────────── */
  /*
   * config = {
   *   mode:      'fixed' | 'scroll'   — fixed: viewport-only; scroll: full page height
   *   element:   HTMLElement           — the pre/div to write into
   *   chars:     string[]              — sparse→dense char progression
   *   threshold: number (0–1)          — wave value below which cell is space
   *   speed:     number                — t increment per frame (default 0.006)
   *   onReady:   function              — called after first render
   * }
   * Returns controller: { stop, resize, setChars, setThreshold, setSpeed }
   */
  function initWind(config) {
    config = config || {};
    var el       = config.element;
    var mode     = config.mode || 'scroll';
    var chars    = config.chars    || [' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ','.','.',':','-','='];
    var threshold = config.threshold != null ? config.threshold : 0.10;
    var speed    = config.speed    != null ? config.speed    : 0.006;
    var CELL     = 16;
    var STEP_MS  = 1000 / 30;

    if (!el) return { stop: function(){}, resize: function(){}, setChars: function(){}, setThreshold: function(){}, setSpeed: function(){} };

    var charW = measureCharW();
    var t = 0, acc = 0, last = 0, rafId = null, stopped = false;
    var resizeTimer = null;

    /* Check reduced motion */
    var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function draw() {
      if (mode === 'fixed') {
        var cols = Math.floor(window.innerWidth / charW);
        var rows = Math.floor(window.innerHeight / CELL);
        if (cols < 1 || rows < 1) return;
        var lines = renderWave(t, cols, rows, chars, threshold, 0, 0);
        var out = lines.join('\n');
        if (el._last !== out) { el.textContent = out; el._last = out; }

      } else {
        /* scroll mode — render visible rows + buffer only */
        var cols2 = Math.floor(window.innerWidth / charW);
        var totalRows = Math.ceil(document.documentElement.scrollHeight / CELL);
        if (cols2 < 1 || totalRows < 1) return;
        var scrollY = window.scrollY || 0;
        var BUFFER = 5;
        var startRow = Math.max(0, Math.floor(scrollY / CELL) - BUFFER);
        var endRow = Math.min(totalRows - 1, Math.ceil((scrollY + window.innerHeight) / CELL) + BUFFER);
        var xOff = Math.round((el.getBoundingClientRect().left) / charW);
        /* empty lines above visible area keep content at correct page position */
        var out2 = startRow > 0 ? new Array(startRow).join('\n') + '\n' : '';
        var lines2 = renderWave(t, cols2, endRow - startRow + 1, chars, threshold, xOff, startRow);
        out2 += lines2.join('\n');
        if (el._last !== out2) { el.textContent = out2; el._last = out2; }
      }
    }

    function frame(now) {
      if (stopped) return;
      if (!last) last = now;
      var delta = Math.min(now - last, 100);
      last = now;
      if (!prefersReduced) {
        acc += delta;
        while (acc >= STEP_MS) { t += speed; acc -= STEP_MS; }
      }
      draw();
      rafId = requestAnimationFrame(frame);
    }

    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        charW = measureCharW();
        el._last = null;
      }, 150);
    }

    window.addEventListener('resize', onResize);
    rafId = requestAnimationFrame(frame);
    if (typeof config.onReady === 'function') config.onReady();

    return {
      stop: function () {
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (resizeTimer) clearTimeout(resizeTimer);
        window.removeEventListener('resize', onResize);
      },
      resize: function () { charW = measureCharW(); el._last = null; },
      setChars: function (c) { chars = c; el._last = null; },
      setThreshold: function (v) { threshold = v; el._last = null; },
      setSpeed: function (s) { speed = s; }
    };
  }

  /* ── initScramble ─────────────────────────────────────────────── */
  /*
   * Wraps .scramble elements in per-char spans with hover scramble effect.
   * Usage: window.initScramble(containerEl)
   *        window.initScramble({ element: containerEl, selector: '.scramble' })
   */
  function initScramble(containerOrConfig) {
    var container, selector;
    if (containerOrConfig && containerOrConfig.element) {
      container = containerOrConfig.element;
      selector  = containerOrConfig.selector || '.scramble';
    } else {
      container = containerOrConfig;
      selector  = '.scramble';
    }
    if (!container) return;

    var pool = '·-:/+=<>!?3I549680ON';

    function randomChar() { return pool.charAt(Math.floor(Math.random() * pool.length)); }
    function randomInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

    function triggerScramble(span, isNeighbor) {
      if (span._scrambleInterval) {
        clearInterval(span._scrambleInterval);
        span._scrambleInterval = null;
        span.textContent = span.dataset.char;
      }
      var frames = isNeighbor ? randomInt(10, 15) : randomInt(25, 35);
      var i = 0;
      span._scrambleInterval = setInterval(function () {
        i++;
        if (i >= frames) {
          clearInterval(span._scrambleInterval);
          span._scrambleInterval = null;
          span.textContent = span.dataset.char;
          return;
        }
        span.textContent = randomChar();
      }, 30);
    }

    var targets = container.querySelectorAll(selector);
    for (var n = 0; n < targets.length; n++) {
      var el = targets[n];
      var text = el.textContent || '';
      var frag = document.createDocumentFragment();
      var spans = new Array(text.length);
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        var s = document.createElement('span');
        s.dataset.char = ch;
        s.textContent = ch;
        spans[i] = s;
        frag.appendChild(s);
      }
      el.textContent = '';
      el.appendChild(frag);
      (function (spansArr) {
        for (var j = 0; j < spansArr.length; j++) {
          (function (idx) {
            spansArr[idx].addEventListener('mouseenter', function () {
              triggerScramble(spansArr[idx], false);
              if (idx - 1 >= 0) triggerScramble(spansArr[idx - 1], true);
              if (idx + 1 < spansArr.length) triggerScramble(spansArr[idx + 1], true);
            });
          })(j);
        }
      })(spans);
    }
  }

  /* ── initCasePage ─────────────────────────────────────────────── */
  /*
   * Standard case-page bootstrap: measure charW, snap layout, start wind,
   * snap section heights, init scramble.
   *
   * config = {
   *   wind: { chars, threshold, speed }   — passed to initWind
   *   heroBasePadding: number             — base paddingBottom for .hero (default 52)
   * }
   */
  function initCasePage(config) {
    config = config || {};
    var windCfg = config.wind || {};
    var heroBase = config.heroBasePadding != null ? config.heroBasePadding : 52;
    var CELL = 16;

    document.fonts.ready.then(function () {
      var charW = measureCharW();

      window.initWind({
        mode:      'scroll',
        element:   document.getElementById('wind-global'),
        chars:     windCfg.chars     || [' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ',' ','.','.',':','-','~','+'],
        threshold: windCfg.threshold != null ? windCfg.threshold : 0.12,
        speed:     windCfg.speed     != null ? windCfg.speed     : 0.006
      });

      var viewW = window.innerWidth;
      var snappedLeft = Math.round(((viewW - 720) / 2) / charW) * charW;
      var snappedPad  = Math.round(48 / charW) * charW;

      document.documentElement.style.setProperty('--snap-pad', snappedPad + 'px');

      document.querySelectorAll('section:not(.full):not(.wide)').forEach(function (el) {
        el.style.marginLeft  = snappedLeft + 'px';
        el.style.marginRight = 'auto';
        el.style.paddingLeft  = snappedPad + 'px';
        el.style.paddingRight = snappedPad + 'px';
      });

      var heroInner = document.querySelector('.hero-inner');
      if (heroInner) {
        heroInner.style.marginLeft  = snappedLeft + 'px';
        heroInner.style.marginRight = 'auto';
      }

      requestAnimationFrame(function () {
        var hero = document.querySelector('.hero');
        if (hero) {
          var heroH = hero.getBoundingClientRect().height;
          var extra = Math.ceil(heroH / CELL) * CELL - heroH;
          if (extra > 0) hero.style.paddingBottom = (heroBase + extra) + 'px';
        }

        requestAnimationFrame(function () {
          function snapNext(sections, idx) {
            if (idx >= sections.length) return;
            var el = sections[idx];
            var h  = el.getBoundingClientRect().height;
            var ex = Math.ceil(h / CELL) * CELL - h;
            if (ex > 0) {
              var curPB = parseFloat(window.getComputedStyle(el).paddingBottom) || 0;
              el.style.paddingBottom = (curPB + ex) + 'px';
            }
            requestAnimationFrame(function () { snapNext(sections, idx + 1); });
          }
          snapNext(Array.from(document.querySelectorAll('section')), 0);
        });
      });

      window.initScramble(document.querySelector('.page'));
    });
  }

  window.initWind = initWind;
  window.initScramble = initScramble;
  window.initCasePage = initCasePage;

})();
