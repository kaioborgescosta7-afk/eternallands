/* ════════════════════════════════════════════════════════════════════════
   NOTAS DE ATUALIZAÇÃO — cartinha ✉️ no canto superior esquerdo

   ┌─ REGRA PARA QUEM FOR ESCREVER A PRÓXIMA NOTA (IA ou pessoa) ──────────┐
   │ 1. APAGUE a nota que está em NOTA_ATUAL e escreva só a nova no lugar.  │
   │    No código fica sempre UMA nota: a da última atualização.            │
   │ 2. Data nova → "id" novo (AAAA-MM-DD). Outra atualização no MESMO dia  │
   │    → mantenha o id e junte tudo nesta mesma nota.                      │
   │ 3. Não guarde notas antigas aqui. O histórico dos jogadores já fica    │
   │    salvo no aparelho de cada um (localStorage "arhen_notas_log"),      │
   │    acumulando a cada nota que eles recebem.                            │
   │ 4. Produto novo na loja? A bolinha do botão "Comprar" é do módulo da   │
   │    loja (script loja-js): troque lá o NOVIDADE pelo SKU do produto.    │
   └────────────────────────────────────────────────────────────────────────┘
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";

  var NOTA_ATUAL = {
    id: "2026-10-09",
    data: "09/10/2026",
    titulo: "Um clarão nas masmorras",
    itens: [
      "✧ <b>Anjo da Guarda</b> chegou ao 🛒 Mural de Compras. Um guardião celestial que desce à masmorra num facho de luz e caminha ao seu lado, rasgando as trevas ao redor dele.",
      "Invoque e dispense quando quiser pelo botão ✧ dentro das masmorras. A chegada e a partida têm feixe celestial, penas de luz e onda de choque no pouso.",
      "É cosmético e permanente: não altera o combate e fica salvo na sua conta, inclusive no save da nuvem.",
      "✉️ Esta cartinha é nova: toda atualização do jogo passa a ser anunciada aqui, e o histórico fica guardado para você reler."
    ]
  };

  var KEY_LOG = "arhen_notas_log";
  var KEY_VISTA = "arhen_notas_vista";

  function ler(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function gravar(k, v){ try { localStorage.setItem(k, v); } catch(e){} }

  /* assinatura da nota: muda quando a nota do dia é editada, e a bolinha volta */
  function assinatura(n){
    var s = n.id + "|" + n.titulo + "|" + n.itens.join("|"), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return n.id + ":" + (h >>> 0).toString(36);
  }
  var ASS = assinatura(NOTA_ATUAL);

  /* histórico do jogador: a nota atual entra (ou substitui a do mesmo dia) */
  function lerLog(){
    try { var l = JSON.parse(ler(KEY_LOG) || "[]"); return Array.isArray(l) ? l : []; } catch(e){ return []; }
  }
  var log = lerLog().filter(function(n){ return n && n.id && n.id !== NOTA_ATUAL.id; });
  log.unshift({ id: NOTA_ATUAL.id, data: NOTA_ATUAL.data, titulo: NOTA_ATUAL.titulo, itens: NOTA_ATUAL.itens });
  log.sort(function(a, b){ return a.id < b.id ? 1 : a.id > b.id ? -1 : 0; });
  gravar(KEY_LOG, JSON.stringify(log.slice(0, 60)));

  var CSS = "" +
    "#notas-btn{position:absolute;left:8px;top:6px;z-index:50;background:transparent;border:none;padding:4px 6px;font-size:20px;line-height:1;cursor:pointer;filter:drop-shadow(0 0 6px rgba(255,208,128,.45));transition:transform .12s ease}" +
    "#notas-btn:hover{transform:scale(1.12) rotate(-6deg)}" +
    "#notas-btn .notif-dot{top:0;right:0}" +
    "#notas-modal{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px;background:radial-gradient(ellipse at 50% 30%,rgba(60,30,8,.55),rgba(0,0,0,.9));animation:notasFadeIn .2s ease-out}" +
    "@keyframes notasFadeIn{from{opacity:0}to{opacity:1}}" +
    "#notas-box{position:relative;background:linear-gradient(160deg,#241108,#0d0500);border:2px solid #c9a35a;border-radius:16px;max-width:520px;width:100%;max-height:86vh;overflow:auto;padding:18px 18px 14px;color:#f0e0c0;font-family:Georgia,serif;box-shadow:0 30px 80px rgba(0,0,0,.7),0 0 0 4px rgba(201,163,90,.10) inset}" +
    "#notas-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}" +
    "#notas-title{font-size:17px;color:#ffd080;font-weight:bold;text-shadow:0 0 10px rgba(255,208,128,.35)}" +
    "#notas-close{background:none;border:none;color:#c09060;font-size:18px;cursor:pointer;padding:0 4px}" +
    "#notas-close:hover{color:#ffd080}" +
    "#notas-sub{font-size:11px;color:#c09060;font-style:italic;margin-bottom:12px}" +
    ".nota{border:1px solid #5a3a14;background:#140a03;border-radius:10px;padding:10px 12px;margin-bottom:10px}" +
    ".nota--atual{border-color:#c9a35a;box-shadow:0 0 14px rgba(255,208,128,.18)}" +
    ".nota-data{font-size:10px;color:#a08060;letter-spacing:.5px}" +
    ".nota-tag{display:inline-block;margin-left:6px;font-size:8px;font-weight:bold;letter-spacing:.4px;padding:1px 7px;border-radius:999px;background:#dc2626;color:#fff;vertical-align:1px}" +
    ".nota-titulo{font-size:13px;color:#ffd080;font-weight:bold;margin:3px 0 6px}" +
    ".nota ul{margin:0;padding-left:16px}" +
    ".nota li{font-size:11.5px;line-height:1.5;color:#e8d4ae;margin-bottom:4px}" +
    ".nota--antiga .nota-titulo{color:#d9b880}" +
    ".nota--antiga li{color:#bfa880}";
  function garantirCss(){
    if (document.getElementById("notas-css")) return;
    var s = document.createElement("style"); s.id = "notas-css"; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ── cartinha ── */
  function notaNova(){ return ler(KEY_VISTA) !== ASS; }
  /* a barra do topo (#save-bar) só tem a largura dos botões e fica centrada;
     a cartinha vai no canto esquerdo da TELA, na altura da barra, e some
     junto com ela (batalha, masmorra em tela cheia etc.) */
  function posicionarCartinha(){
    var bar = document.getElementById("save-bar"), b = document.getElementById("notas-btn");
    if (!bar || !b) return;
    var visivel = bar.offsetParent !== null || getComputedStyle(bar).position === "fixed";
    b.style.display = visivel ? "" : "none";
    if (visivel) b.style.top = Math.round(bar.getBoundingClientRect().top + window.scrollY + 2) + "px";
  }
  function montarCartinha(){
    var bar = document.getElementById("save-bar");
    if (!bar || !document.body) return;
    if (document.getElementById("notas-btn")) { posicionarCartinha(); return; }
    var b = document.createElement("button");
    b.type = "button"; b.id = "notas-btn"; b.title = "Notas de atualização";
    b.setAttribute("aria-label", "Notas de atualização");
    b.innerHTML = "✉️<span class=\"notif-dot" + (notaNova() ? " visible" : "") + "\"></span>";
    b.addEventListener("click", function(e){ e.stopPropagation(); abrirNotas(); });
    document.body.appendChild(b);
    posicionarCartinha();
  }

  function esc(s){ return String(s == null ? "" : s); }
  function abrirNotas(){
    garantirCss();
    gravar(KEY_VISTA, ASS);
    var dot = document.querySelector("#notas-btn .notif-dot");
    if (dot) dot.classList.remove("visible");
    var old = document.getElementById("notas-modal"); if (old) old.remove();
    var html = lerLog().map(function(n, i){
      var atual = n.id === NOTA_ATUAL.id;
      return '<div class="nota ' + (atual ? "nota--atual" : "nota--antiga") + '">' +
        '<div class="nota-data">📅 ' + esc(n.data || n.id) + (atual && i === 0 ? '<span class="nota-tag">NOVO</span>' : "") + "</div>" +
        '<div class="nota-titulo">' + esc(n.titulo) + "</div>" +
        "<ul>" + (n.itens || []).map(function(t){ return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>";
    }).join("");
    var m = document.createElement("div");
    m.id = "notas-modal";
    m.innerHTML = '<div id="notas-box" role="dialog" aria-label="Notas de atualização">' +
      '<div id="notas-hdr"><div id="notas-title">✉️ Notas de Atualização</div><button id="notas-close" type="button" aria-label="Fechar">✕</button></div>' +
      '<div id="notas-sub">Cartas do desenvolvedor sobre o que mudou em Arhen.</div>' + html + "</div>";
    m.addEventListener("click", function(e){ if (e.target === m) fecharNotas(); });
    m.querySelector("#notas-close").addEventListener("click", fecharNotas);
    document.body.appendChild(m);
  }
  function fecharNotas(){ var m = document.getElementById("notas-modal"); if (m) m.remove(); }
  window.abrirNotasAtualizacao = abrirNotas;
  document.addEventListener("keydown", function(e){ if (e.key === "Escape") fecharNotas(); });

  function iniciar(){
    garantirCss();
    montarCartinha();
    setInterval(montarCartinha, 1500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once:true });
  else iniciar();
})();
