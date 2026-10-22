/* i18n-loader — gerado por i18n_tools (não edite à mão: rode "node i18n.js export").
   Decide o idioma (escolha salva > idioma do aparelho), carrega lang/en.js ANTES do
   resto do jogo e define __t('texto') / __T`texto ${x}` usados pelo código.
   Funciona no Firebase e também abrindo o arquivo direto do computador. */
(function () {
  var V = "__I18N_VERSION__", FILE = "lang/en.js";
  var DENY = __I18N_DENY__;
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  var pref = ls("ec_lang");
  var lang = pref === "pt" || pref === "en" ? pref
    : (String(navigator.language || navigator.userLanguage || "pt").toLowerCase().indexOf("pt") === 0 ? "pt" : "en");
  var D = null;
  window.__lang = lang;
  window.__t = function (s) { var r = D && typeof s === "string" ? D[s] : null; return r == null ? s : r; };
  window.__T = function (q) {
    var a = arguments, n = q.length, i, k = q[0] == null ? q.raw[0] : q[0];
    for (i = 1; i < n; i++) k += "{{" + (i - 1) + "}}" + (q[i] == null ? q.raw[i] : q[i]);
    var tr = D ? D[k] : null;
    if (tr == null) { var r = q[0] == null ? q.raw[0] : q[0]; for (i = 1; i < n; i++) r += String(a[i]) + (q[i] == null ? q.raw[i] : q[i]); return r; }
    return tr.replace(/\{\{(\d+)\}\}/g, function (_, j) { return String(a[+j + 1]); });
  };
  window.__i18nSetLang = function (l) {                                     // usado pelo botão Language
    ls("ec_lang", l);
    if (l === window.__lang) return false;
    ss("ec_intro_played", "1");                                              // recarrega sem a vinheta
    location.reload(); return true;
  };
  function failNotice() {
    document.addEventListener("DOMContentLoaded", function () {
      var d = document.createElement("div");
      d.textContent = "Não foi possível carregar o inglês — jogando em português. / Couldn't load English — playing in Portuguese.";
      d.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;background:rgba(20,10,4,.95);color:#ffd080;border:1px solid #8b4a00;border-radius:8px;padding:10px 14px;font:13px Georgia,serif;max-width:90vw;text-align:center";
      document.body.appendChild(d); setTimeout(function () { d.remove(); }, 6000);
    });
  }
  if (lang !== "en") return;

  // Carrega o dicionário como <script> (bloqueia o jogo até chegar). Na primeira vez
  // (ou quando há dicionário novo) mostra a tela preta com a barrinha.
  var first = ls("ec_lang_v") !== V, tries = 0, shown = 0, fake = null;
  window.__i18nAfter = function () {
    var data = window.__I18N_DATA;
    if (data && data.v === V && data.t) {
      D = data.t; ls("ec_lang_v", V);
      document.documentElement.lang = "en";
      done(); translateStatic(); return;
    }
    if (tries < 3) { load(); return; }                                        // tenta de novo
    window.__lang = "pt"; D = null; done(); failNotice();                    // desiste: joga em português
  };
  function done() {
    if (fake) clearInterval(fake);
    var b = document.getElementById("i18n-load-bar"); if (b) b.style.width = "100%";
    var o = document.getElementById("i18n-load");
    if (o) setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, first ? 200 : 0);
  }
  function load() {
    tries++; window.__I18N_DATA = null;
    document.write('<script src="' + FILE + '?v=' + V + (tries > 1 ? "&r=" + tries : "") + '" onerror="window.__I18N_DATA=null"><\/script>' +
                   '<script>window.__i18nAfter()<\/script>');
  }
  document.write(
    '<div id="i18n-load" style="position:fixed;inset:0;z-index:2147483647;background:#000;display:' + (first ? "flex" : "none") + ';flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,serif;color:#c0a878">' +
    '<div style="font-size:13px;letter-spacing:2px;margin-bottom:12px">Loading language…</div>' +
    '<div style="width:min(260px,70vw);height:6px;border:1px solid #4a3010;border-radius:4px;overflow:hidden;background:#140a02">' +
    '<div id="i18n-load-bar" style="height:100%;width:0;background:linear-gradient(90deg,#8b4a00,#ffd080);transition:width .25s"></div></div></div>');
  if (first) fake = setInterval(function () {
    shown = Math.min(0.92, shown + (0.92 - shown) * 0.05);
    var b = document.getElementById("i18n-load-bar"); if (b) b.style.width = Math.round(shown * 100) + "%";
  }, 150);
  load();
  return;

  // ── Texto fixo do HTML e blocos de dados JSON: traduzidos enquanto a página é lida ──
  function translateStatic() {
    var ATTRS = ["title", "placeholder", "alt", "aria-label"];
    var pending = [];
    function trText(n) {
      var v = n.nodeValue; if (!v || v.length < 2) return;
      var t = v.trim(); if (!t) return;
      var r = D[t]; if (r == null || r === t) return;
      var i = v.indexOf(t); n.nodeValue = v.slice(0, i) + r + v.slice(i + t.length);
    }
    function trEl(el) {
      for (var i = 0; i < ATTRS.length; i++) {
        var a = ATTRS[i]; if (!el.hasAttribute(a)) continue;
        var v = el.getAttribute(a), r = D[v.trim()]; if (r != null && r !== v) el.setAttribute(a, r);
      }
    }
    function isJson(el) { return el.tagName === "SCRIPT" && /json/i.test(el.type || ""); }
    function walkObj(o, field) {
      if (typeof o === "string") { if (!DENY[field] && D[o] != null) return D[o]; return o; }
      if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) o[i] = walkObj(o[i], field); return o; }
      if (o && typeof o === "object") { for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) o[k] = walkObj(o[k], k); }
      return o;
    }
    function trJson(el) {
      if (el.__i18nDone) return true;
      var obj; try { obj = JSON.parse(el.textContent); } catch (e) { return false; }   // ainda incompleto
      el.__i18nDone = true;
      try { el.textContent = JSON.stringify(walkObj(obj, "")); } catch (e) {}
      return true;
    }
    function visit(n) {
      if (n.nodeType === 3) {
        var p = n.parentNode;
        if (p && p.tagName === "SCRIPT") { if (isJson(p) && !p.__i18nDone) pending.push(p); return; }
        if (p && p.tagName === "STYLE") return;
        trText(n); return;
      }
      if (n.nodeType !== 1) return;
      if (n.tagName === "SCRIPT") { if (isJson(n) && !n.__i18nDone) pending.push(n); return; }
      if (n.tagName === "STYLE" || n.id === "i18n-load") return;
      trEl(n);
      for (var c = n.firstChild; c; c = c.nextSibling) visit(c);
    }
    function flush() {
      var keep = [];
      for (var i = 0; i < pending.length; i++) if (!trJson(pending[i])) keep.push(pending[i]);
      pending = keep;
    }
    if (document.body) visit(document.body);
    var mo = new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) { var ad = recs[i].addedNodes; for (var j = 0; j < ad.length; j++) visit(ad[j]); }
      flush();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", function () {
      var recs = mo.takeRecords();
      for (var i = 0; i < recs.length; i++) { var ad = recs[i].addedNodes; for (var j = 0; j < ad.length; j++) visit(ad[j]); }
      document.querySelectorAll('script[type*="json"]').forEach(function (s) { if (!s.__i18nDone) pending.push(s); });
      flush(); mo.disconnect();
    }, true);
  }
})();
