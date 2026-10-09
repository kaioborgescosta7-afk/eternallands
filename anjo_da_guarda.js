/* ════════════════════════════════════════════════════════════════════════
   ANJO DA GUARDA — script próprio (cosmético pago)

   Tudo o que diz respeito ao anjo mora aqui:
     1. CSS (masmorra + vitrine da loja)
     2. Posse da compra (Google Play via Kodular, SKU "anjo_da_guarda")
     3. Cartão no Mural de Compras: vitrine girando com as 4 poses + glow
        (o produto entra pela API do módulo da loja: Loja.registrarProduto)
     4. O anjo na masmorra: invocação, pouso, luz, partida

   Produto no Google Play: "pack_angel" (o mesmo texto que a loja manda ao
   Kodular pelo WebViewString). Ponto de entrada do Kodular, depois que o
   Google Play confirmar a compra:
       adicionarpackangelnojogo();
   (adicionarAnjoDaGuardaNoJogo() é o mesmo, com nome antigo.)
   É um item PERMANENTE: no Kodular, NÃO chame Consume para este SKU.

   Ligação numa masmorra (dentro de createDungeonRoom):
       const anjo = window.AnjoDaGuarda ? AnjoDaGuarda.criarNaMasmorra({
         eng, mount:cfg.mount, signal:ac.signal,
         ehParede:(r,c) => ch(r,c) === "#",
         lighting:() => lighting, syncLight
       }) : null;
     e no laço de quadros:  anjo.tick(now)  …  anjo.mask()
     e na névoa do minimapa: anjo.revelar((r,c) => revealedFog.add(key(r,c)))

   Opções globais (definir ANTES deste script, se quiser):
       window.ANJO_IMG_BASE = "";     pasta das imagens angel_*.png
       window.ANJO_LIBERADO = true;   botão ✧ sempre disponível, sem compra
                                      (laboratório); a posse da compra continua
                                      sendo contada à parte, para testar a loja
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if (window.AnjoDaGuarda && window.AnjoDaGuarda.__pronto) return;

  var SKU = "pack_angel";
  var PRECO = "R$ 9,90";
  var KEY_DONO = "arhen_anjo_guarda_adquirido";
  var KEY_PEND = "arhen_anjo_guarda_pendente";
  var NARRATIVA = "Um clarão não feito por mãos humanas fende a penumbra enxofre da masmorra. " +
    "As paredes úmidas de sangue e mofo reluzem como marfim sob o facho do celestial. " +
    "As sombras, antes famintas, recuam espavoridas para os cantos mais profundos, " +
    "pois a glória do Santíssimo fez da pedra escura o Seu santuário.";
  var GIRO = ["front", "right", "back", "left"];

  function base(){
    return window.ANJO_IMG_BASE != null ? String(window.ANJO_IMG_BASE)
      : "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/";
  }
  function imgUrl(nome){ return base() + "angel_" + nome + ".png"; }

  /* MEDIDAS DE CADA IMAGEM: [largura, altura do arquivo, x0, y0, x1, y1 da
     caixa onde o anjo realmente está (pixels não transparentes)].
     Os arquivos têm tamanhos e margens bem diferentes (a pose de frente é
     1024×1024, as laterais 305×607...). Com estas medidas toda pose é
     desenhada com a MESMA altura de anjo, pés no chão e centrada.
     Trocou ou adicionou uma imagem? Meça de novo e atualize aqui
     (ex.: Python/PIL → img.getchannel("A").getbbox()). */
  var MEDIDAS = {
    front_pose: [1024, 1024, 225, 24, 795, 996],
    right_pose: [305, 607, 18, 45, 234, 591],
    back_pose:  [343, 566, 13, 38, 336, 557],
    left_pose:  [305, 607, 71, 45, 287, 591],
    front1:     [316, 490, 12, 8, 300, 486],
    front2:     [1408, 2400, 60, 72, 1347, 2223],
    back1:      [608, 612, 16, 36, 600, 593],
    back2:      [608, 612, 8, 36, 592, 593]
  };
  /* background-size/position para caber numa caixa caixaL×caixaA com o anjo
     medindo `altura` px, centrado e apoiado no fundo da caixa */
  function encaixe(nome, caixaL, caixaA, altura){
    var m = MEDIDAS[nome];
    if (!m) return { size: "contain", pos: "center bottom" };
    var k = altura / (m[5] - m[3]);
    return {
      size: (m[0] * k).toFixed(1) + "px " + (m[1] * k).toFixed(1) + "px",
      pos: (caixaL / 2 - (m[2] + m[4]) / 2 * k).toFixed(1) + "px " + (caixaA - m[5] * k).toFixed(1) + "px"
    };
  }

  function ler(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function gravar(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  function apagar(k){ try { localStorage.removeItem(k); } catch(e){} }
  function aviso(msg, tipo){ if (typeof window.blog === "function") { try { window.blog(msg, tipo || "ll"); } catch(e){} } }
  var calmo = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───────────────────────── 1. CSS ───────────────────────── */
  var CSS = "" +
    /* botão da masmorra */
    ".dg-angel-btn{position:absolute;top:40px;right:8px;z-index:70;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,240,200,.55);background:radial-gradient(circle,rgba(255,250,230,.25),rgba(20,18,30,.85));color:#fff6d8;font:700 18px/1 serif;cursor:pointer;box-shadow:0 0 12px rgba(255,235,170,.45)}" +
    ".dg-angel-btn.on{box-shadow:0 0 18px rgba(255,245,200,.95);background:radial-gradient(circle,rgba(255,250,230,.6),rgba(60,50,30,.85))}" +
    /* anjo, sombra, círculo de luz */
    ".dg-angel{position:absolute;left:0;top:0;z-index:900;pointer-events:none;will-change:transform,opacity}" +
    ".dg-angel i{position:absolute;left:50%;bottom:0;transform:translateX(-50%);transform-origin:50% 100%;background:center bottom/contain no-repeat;filter:drop-shadow(0 0 6px rgba(255,248,215,.85));animation:dg-angel-hover 1.6s ease-in-out infinite alternate;will-change:filter,scale}" +
    "@keyframes dg-angel-hover{from{translate:0 0}to{translate:0 -6px}}" +
    ".dg-angel-shadow{position:absolute;left:0;top:0;z-index:897;pointer-events:none;border-radius:50%;background:radial-gradient(rgba(0,0,0,.38),transparent 70%);will-change:transform,opacity}" +
    ".dg-angel-pool{position:absolute;left:0;top:0;z-index:897;pointer-events:none;border-radius:50%;opacity:0;background:radial-gradient(ellipse,rgba(255,252,230,.95),rgba(255,222,140,.4) 42%,transparent 70%);mix-blend-mode:screen;will-change:transform,opacity}" +
    /* feixe: desce do céu e abre, pulsa no ::after, fecha numa linha */
    ".dg-angel-beam{position:absolute;top:0;z-index:899;pointer-events:none;transform:translateX(-50%);transform-origin:50% 0;background:linear-gradient(to bottom,rgba(255,255,255,.0),rgba(255,255,255,.75) 30%,rgba(255,250,225,.9));filter:blur(3px);box-shadow:0 0 40px 14px rgba(255,250,225,.55);animation:dg-beam-open .5s cubic-bezier(.2,.9,.3,1) both}" +
    ".dg-angel-beam.up{transform-origin:50% 100%}" +
    ".dg-angel-beam::after{content:'';position:absolute;inset:0;background:inherit;opacity:.35;animation:dg-beam-pulse 1.1s ease-in-out infinite alternate}" +
    ".dg-angel-beam.closing{animation:dg-beam-close .7s ease-in forwards}" +
    "@keyframes dg-beam-pulse{from{opacity:.15}to{opacity:.6}}" +
    "@keyframes dg-beam-open{from{transform:translateX(-50%) scale(.04,0);opacity:0}55%{transform:translateX(-50%) scale(1.25,1);opacity:1}to{transform:translateX(-50%) scale(1,1);opacity:1}}" +
    "@keyframes dg-beam-close{from{transform:translateX(-50%) scaleX(1);opacity:1}35%{transform:translateX(-50%) scaleX(.08);opacity:1}to{transform:translateX(-50%) scaleX(0);opacity:0}}" +
    /* onda de choque, faíscas, penas */
    ".dg-angel-ring{position:absolute;z-index:898;pointer-events:none;border-radius:50%;border:2px solid rgba(255,246,205,.95);box-shadow:0 0 14px 3px rgba(255,232,160,.7),inset 0 0 10px rgba(255,240,190,.6);transform:translate(-50%,-50%) scale(.1);animation:dg-angel-ring .65s cubic-bezier(.15,.8,.3,1) forwards}" +
    "@keyframes dg-angel-ring{60%{opacity:.9}to{transform:translate(-50%,-50%) scale(1);opacity:0}}" +
    ".dg-spark{position:absolute;z-index:901;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;pointer-events:none;background:#fffbe6;box-shadow:0 0 6px 2px rgba(255,235,170,.9);animation:dg-spark var(--t) ease-out forwards}" +
    "@keyframes dg-spark{to{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}" +
    ".dg-feather{position:absolute;z-index:901;width:5px;height:11px;margin:-5px 0 0 -2px;pointer-events:none;border-radius:50% 50% 50% 50%/70% 70% 30% 30%;background:linear-gradient(#fff,#fff3cf);box-shadow:0 0 6px 1px rgba(255,240,190,.8);animation:dg-feather var(--t) linear forwards}" +
    "@keyframes dg-feather{0%{transform:translate(0,0) rotate(-25deg);opacity:0}10%{opacity:1}25%{transform:translate(var(--sw),calc(var(--fall)*.25)) rotate(25deg)}50%{transform:translate(0,calc(var(--fall)*.5)) rotate(-25deg)}75%{transform:translate(var(--sw),calc(var(--fall)*.75)) rotate(25deg);opacity:.8}100%{transform:translate(0,var(--fall)) rotate(-15deg);opacity:0}}" +

    /* ── cartão celestial no Mural de Compras ── */
    ".loja-card.loja-card--celestial{grid-column:1/-1;order:-1;flex-direction:column;align-items:center;gap:0;text-align:center;padding:16px 14px;border:1px solid #fff0c0;background:radial-gradient(ellipse at 22% 45%,rgba(255,244,200,.16),transparent 60%),linear-gradient(160deg,#211a10,#0c0804);box-shadow:0 0 22px rgba(255,236,170,.38),inset 0 0 0 1px rgba(255,240,200,.08);overflow:hidden}" +
    ".loja-card--celestial:hover{transform:translateY(-2px)}" +
    ".loja-card--celestial::before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,transparent 40%,rgba(255,250,225,.22) 50%,transparent 60%);background-size:250% 100%;animation:lojaShimmer 3.4s linear infinite}" +
    ".loja-card--celestial .loja-card-badge-ribbon{background:linear-gradient(90deg,#fff3cf,#ffd36e);color:#3a2600;box-shadow:0 0 10px rgba(255,230,160,.6)}" +
    ".loja-card--celestial .loja-card-rarity{background:rgba(255,244,210,.12);color:#fff1c8;border:1px solid rgba(255,240,200,.5)}" +
    ".loja-card--celestial .loja-card-name{font-size:15px;color:#fff3d0;text-shadow:0 0 10px rgba(255,236,170,.55)}" +
    ".loja-card--celestial .loja-card-desc{min-height:0;color:#c9b48c}" +
    ".loja-card--celestial .loja-card-note{color:#ffe7a8}" +
    ".loja-card--celestial .loja-card-btn{background:linear-gradient(90deg,#ffe9a8,#fffaf0 50%,#ffe9a8);background-size:200% 100%;border:1px solid #fff0c0;color:#3a2600;box-shadow:0 0 16px rgba(255,236,170,.55);animation:anjoBtn 3s ease-in-out infinite}" +
    ".loja-card--celestial .loja-card-btn:hover{filter:brightness(1.06)}" +
    "@keyframes anjoBtn{50%{background-position:100% 0}}" +
    ".anjo-info{display:flex;flex-direction:column;align-items:center;width:100%;max-width:520px}" +
    ".anjo-info .loja-card-btn{margin-top:auto}" +
    ".anjo-narrativa{margin:4px 0 8px;text-align:left;padding:8px 10px;border-left:2px solid rgba(255,236,170,.7);background:linear-gradient(90deg,rgba(255,244,210,.08),transparent);font:italic 11.5px/1.55 Georgia,'Times New Roman',serif;color:#f1e3c0;text-shadow:0 0 8px rgba(0,0,0,.6)}" +
    ".anjo-narrativa::first-letter{font-size:20px;line-height:1;color:#fff3cf;text-shadow:0 0 10px rgba(255,236,170,.9)}" +
    /* vitrine girando */
    ".anjo-vitrine{position:relative;width:150px;height:190px;margin:0;display:flex;align-items:flex-end;justify-content:center;isolation:isolate}" +
    ".anjo-raios{position:absolute;left:50%;top:44%;width:230px;height:230px;margin:-115px 0 0 -115px;border-radius:50%;z-index:-2;background:repeating-conic-gradient(from 0deg,rgba(255,246,210,.30) 0deg 6deg,transparent 6deg 22deg);-webkit-mask:radial-gradient(circle,#000 18%,transparent 68%);mask:radial-gradient(circle,#000 18%,transparent 68%);animation:anjoRaios 22s linear infinite}" +
    "@keyframes anjoRaios{to{transform:rotate(360deg)}}" +
    ".anjo-halo{position:absolute;left:50%;top:44%;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;z-index:-1;background:radial-gradient(circle,rgba(255,252,235,.85),rgba(255,226,150,.35) 40%,transparent 70%);animation:anjoHalo 2.6s ease-in-out infinite alternate}" +
    "@keyframes anjoHalo{from{transform:scale(.88);opacity:.75}to{transform:scale(1.08);opacity:1}}" +
    ".anjo-pedestal{position:absolute;left:50%;bottom:2px;width:120px;height:26px;margin-left:-60px;border-radius:50%;z-index:-1;background:radial-gradient(ellipse,rgba(255,250,225,.9),rgba(255,214,120,.35) 45%,transparent 72%);filter:blur(1px);animation:anjoHalo 2.6s ease-in-out infinite alternate-reverse}" +
    ".anjo-figura{position:relative;width:118px;height:160px;margin-bottom:10px;animation:anjoFlutua 2.4s ease-in-out infinite alternate}" +
    "@keyframes anjoFlutua{from{transform:translateY(0)}to{transform:translateY(-8px)}}" +
    ".anjo-pose{position:absolute;inset:0;display:none;background-repeat:no-repeat;filter:drop-shadow(0 0 6px rgba(255,250,230,.95)) drop-shadow(0 0 16px rgba(255,226,150,.75))}" +
    ".anjo-pose.on{display:block}" +
    ".anjo-brilho{position:absolute;bottom:20px;width:4px;height:4px;border-radius:50%;background:#fffbe6;box-shadow:0 0 6px 2px rgba(255,236,170,.9);opacity:0;animation:anjoBrilho 3.2s ease-out infinite}" +
    "@keyframes anjoBrilho{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:1}100%{transform:translateY(-150px) scale(.2);opacity:0}}" +
    "@media (prefers-reduced-motion:reduce){.dg-angel i,.dg-angel-beam::after,.anjo-raios,.anjo-figura,.anjo-brilho,.loja-card--celestial::before,.loja-card--celestial .loja-card-btn{animation:none}.dg-spark,.dg-feather,.dg-angel-ring{display:none}}";

  function garantirCss(){
    if (document.getElementById("anjo-da-guarda-css")) return;
    var s = document.createElement("style");
    s.id = "anjo-da-guarda-css";
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  garantirCss();

  /* ───────────────────────── 2. Posse ─────────────────────────
     Item permanente. Fica gravado em dois lugares: no aparelho (localStorage)
     e no save (G.anjoDaGuarda), para atravessar reinstalação via nuvem. */
  function jogoPronto(){ return !!(window.G && G.hero && typeof G.hero.level === "number"); }
  /* comprou de verdade (é isto que a loja usa para a compra única: "✓ Já adquirido") */
  function possui(){
    return ler(KEY_DONO) === "1" || !!(window.G && G.anjoDaGuarda);
  }
  /* pode invocar: comprou, ou está liberado (laboratório) */
  function podeInvocar(){ return !!window.ANJO_LIBERADO || possui(); }
  /* aparelho ⇄ save: quem tiver a posse passa para o outro */
  function sincronizarPosse(){
    if (!window.G) return;
    if (G.anjoDaGuarda && ler(KEY_DONO) !== "1") gravar(KEY_DONO, "1");
    if (!G.anjoDaGuarda && ler(KEY_DONO) === "1" && jogoPronto()) {
      G.anjoDaGuarda = true;           /* vai para a nuvem no próximo save normal */
    }
  }

  function entregar(){
    gravar(KEY_DONO, "1");            /* a posse vale já, com ou sem save aberto */
    apagar(KEY_PEND);
    var st = document.getElementById("loja-frag-status");
    marcarAdquirido();
    if (!jogoPronto()) {
      if (st) st.textContent = "✅ Compra confirmada — o Anjo te acompanha ao abrir seu jogo.";
      return;
    }
    G.anjoDaGuarda = true;
    try { if (typeof window.saveGame === "function") window.saveGame(); }
    catch(e){ console.error("[anjo] erro ao salvar após entrega:", e); }
    aviso("✧ <b>O Anjo da Guarda agora te acompanha.</b> Toque em ✧ dentro das masmorras para invocá-lo.", "ll");
    if (st) st.textContent = "✅ Compra concluída!";
    marcarAdquirido();
    setTimeout(function(){
      if (typeof window.fecharLojaFragmentos === "function") window.fecharLojaFragmentos();
      if (typeof window.showO === "function") {
        window.showO("✧ Anjo da Guarda",
          "«" + NARRATIVA + "»\n\n" +
          "O Anjo da Guarda é seu para sempre.\n" +
          "Nas masmorras, toque no botão ✧ (ou aperte H) para invocá-lo — e toque de novo para que ele retorne aos céus.",
          [ { label: "🙏 Amém", cb: function(){} } ]);
      }
    }, 600);
  }

  /* PONTO DE ENTRADA DO KODULAR */
  window.adicionarAnjoDaGuardaNoJogo = function(){
    try { entregar(); }
    catch(e){
      console.error("[anjo] falha na entrega:", e);
      gravar(KEY_DONO, "1");
    }
  };
  window.adicionarpackangelnojogo = window.adicionarAnjoDaGuardaNoJogo;
  /* compra que chegou antes deste script (anotada pelo esboço do compra-bootstrap) */
  if (ler(KEY_PEND) === "1") window.adicionarAnjoDaGuardaNoJogo();
  setInterval(sincronizarPosse, 2000);

  /* ───────────────────────── 3. Loja ───────────────────────── */
  var PRODUTO = {
    sku: SKU,
    icon: "✧",
    image: imgUrl("front_pose"),
    priceLabel: PRECO,
    name: "Anjo da Guarda",
    desc: "Um guardião celestial desce à masmorra e caminha ao seu lado, rasgando as trevas num raio de luz ao redor dele. Cosmético permanente — não altera o combate.",
    tier: "celestial",
    tierLabel: "CELESTIAL",
    gems: "",
    badge: "NOVO · ITEM PERMANENTE",
    note: "Invoque e dispense quando quiser, em todas as masmorras."
  };
  /* o produto entra pelo módulo da loja (script loja-js); sem loja (laboratório), nada a fazer */
  var tentativasLoja = 0;
  function registrarNaLoja(){
    if (window.Loja && typeof window.Loja.registrarProduto === "function") {
      window.Loja.registrarProduto(PRODUTO, { decorar: decorarCartao, compraUnica: possui });
      return;
    }
    if (++tentativasLoja < 40) setTimeout(registrarNaLoja, 250);
  }

  var preload = [];
  function preCarregar(){
    if (preload.length) return;
    GIRO.forEach(function(d){ var im = new Image(); im.src = imgUrl(d + "_pose"); preload.push(im); });
  }

  /* vitrine: as 4 poses ficam empilhadas, já no mesmo tamanho; o giro só
     troca qual delas aparece, sem efeito de transição */
  var VITRINE_L = 118, VITRINE_A = 160, VITRINE_ANJO = 150, GIRO_MS = 1100;
  function montarPoses(fig){
    fig.innerHTML = GIRO.map(function(d, i){
      var e = encaixe(d + "_pose", VITRINE_L, VITRINE_A, VITRINE_ANJO);
      return '<div class="anjo-pose' + (i === 0 ? " on" : "") + '" role="img" aria-label="Anjo da Guarda" style="background-image:url(&quot;' +
        imgUrl(d + "_pose") + '&quot;);background-size:' + e.size + ";background-position:" + e.pos + '"></div>';
    }).join("");
  }
  function girarVitrine(fig){
    var poses = fig.querySelectorAll(".anjo-pose"), i = 0;
    if (calmo || !poses.length) return;
    var t = setInterval(function(){
      if (!fig.isConnected) { clearInterval(t); return; }
      poses[i].classList.remove("on");
      i = (i + 1) % poses.length;
      poses[i].classList.add("on");
    }, GIRO_MS);
  }

  function marcarAdquirido(){
    var btn = document.getElementById("loja-btn-" + SKU);
    if (!btn || !possui() || btn.dataset.anjoAdquirido === "1") return;
    btn.dataset.anjoAdquirido = "1";
    btn.textContent = "✓ Já adquirido";
    btn.disabled = true;
    btn.removeAttribute("onclick");
    btn.onclick = null;
    btn.style.cssText += ";background:#2a2a24;border:1px solid #8a8268;color:#e6dcc0;box-shadow:none;animation:none;cursor:default;filter:none;opacity:.92";
    var cartao = btn.closest ? btn.closest(".loja-card") : null;
    var nota = cartao && cartao.querySelector(".loja-card-note");
    if (nota) nota.textContent = "O Anjo já te acompanha. Toque em ✧ nas masmorras.";
  }

  function decorarCartao(cartao){
    if (!cartao || cartao.dataset.anjo === "1") return;
    cartao.dataset.anjo = "1";
    preCarregar();

    var bau = cartao.querySelector(".loja-card-chest");
    var vitrine = document.createElement("div");
    vitrine.className = "anjo-vitrine";
    var brilhos = "";
    for (var k = 0; k < 7; k++) {
      brilhos += '<b class="anjo-brilho" style="left:' + (18 + k * 11) + '%;animation-delay:' + (k * .47).toFixed(2) + 's"></b>';
    }
    vitrine.innerHTML = '<div class="anjo-raios"></div><div class="anjo-halo"></div><div class="anjo-pedestal"></div>' +
      '<div class="anjo-figura"></div>' + brilhos;
    if (bau) bau.parentNode.replaceChild(vitrine, bau); else cartao.insertBefore(vitrine, cartao.firstChild);
    var gemas = cartao.querySelector(".loja-card-gems");
    if (gemas) gemas.remove();

    /* bloco de texto abaixo da vitrine */
    var info = document.createElement("div");
    info.className = "anjo-info";
    [".loja-card-name", ".loja-card-rarity"].forEach(function(sel){
      var el = cartao.querySelector(sel); if (el) info.appendChild(el);
    });
    var narr = document.createElement("div");
    narr.className = "anjo-narrativa";
    narr.textContent = NARRATIVA;
    info.appendChild(narr);
    [".loja-card-desc", ".loja-card-note", ".loja-card-btn"].forEach(function(sel){
      var el = cartao.querySelector(sel); if (el) info.appendChild(el);
    });
    cartao.appendChild(info);

    montarPoses(vitrine.querySelector(".anjo-figura"));
    girarVitrine(vitrine.querySelector(".anjo-figura"));
    marcarAdquirido();
  }

  registrarNaLoja();

  /* ───────────────────────── 4. Masmorra ───────────────────────── */
  var ANGEL_SPEED = 2.6, ANGEL_LIGHT = 3;
  var ANGEL_OPEN = 450, ANGEL_FALL = 1800;                       /* invocação: céu abre, depois desce */
  var ANGEL_CHARGE = 450, ANGEL_CROUCH = 140, ANGEL_RISE = 1800; /* partida: carrega, agacha, sobe */
  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }

  function criarNaMasmorra(ctx){
    var eng = ctx.eng;
    var ehParede = ctx.ehParede || function(){ return false; };
    var getLighting = ctx.lighting || function(){ return null; };
    var syncLight = ctx.syncLight || function(){};
    var SPR = {};
    ["back","front","left","right"].forEach(function(d){
      (d === "left" || d === "right" ? ["_pose"] : ["_pose","1","2"]).forEach(function(f){
        var im = new Image(); im.src = imgUrl(d + f); SPR[d + f] = im;
      });
    });
    var angel = { on:false, el:null, img:null, beam:null, shadow:null, pool:null, x:0, y:0, y0:0, tr:0, tc:0, state:"off", t0:0, wait:0,
      dir:"front", moving:false, lastP:"", dismissAfterArrival:false, lightK:0, landT:0, fadeInT:0, fxT:0, opacity:1 };

    function angelFree(r, c){
      if (ehParede(r, c) || !eng.passable(r, c)) return false;
      var p = eng.player; return !(p && p.r === r && p.c === c);
    }
    function angelPick(minD, maxD){
      var p = eng.player, out = [];
      for (var dr = -maxD; dr <= maxD; dr++) for (var dc = -maxD; dc <= maxD; dc++) {
        var d = Math.hypot(dr, dc);
        if (d >= minD - .01 && d <= maxD + .01 && angelFree(p.r + dr, p.c + dc)) out.push([p.r + dr, p.c + dc]);
      }
      return out.length ? out[Math.floor(Math.random() * out.length)] : null;
    }
    function angelMount(){
      if (!angel.el) {
        angel.el = document.createElement("div"); angel.el.className = "dg-angel";
        angel.img = document.createElement("i"); angel.el.appendChild(angel.img);
        angel.shadow = document.createElement("div"); angel.shadow.className = "dg-angel-shadow";
        angel.pool = document.createElement("div"); angel.pool.className = "dg-angel-pool";
      }
      if (angel.el.parentNode !== eng.board) {
        eng.board.appendChild(angel.shadow); eng.board.appendChild(angel.pool); eng.board.appendChild(angel.el);
      }
    }
    function angelBeam(up){
      if (angel.beam) angel.beam.remove();
      var cell = eng.cell;
      angel.y0 = -eng.board.getBoundingClientRect().top - cell * 2;
      angel.beam = document.createElement("div"); angel.beam.className = "dg-angel-beam" + (up ? " up" : "");
      angel.beam.style.left = (angel.tc * cell + cell / 2) + "px"; angel.beam.style.width = (cell * .9) + "px";
      angel.beam.style.top = angel.y0 + "px"; angel.beam.style.height = ((angel.tr + 1) * cell - angel.y0) + "px";
      eng.board.appendChild(angel.beam);
    }
    function angelFadeBeam(){
      var b = angel.beam; if (!b) return;
      angel.beam = null;
      b.classList.add("closing");
      b.addEventListener("animationend", function(e){ if (e.animationName === "dg-beam-close") b.remove(); });
      setTimeout(function(){ b.remove(); }, 900); /* garantia caso a animação não dispare */
    }
    /* efeitos descartáveis: somem sozinhos ao fim da animação */
    function fx(cls, x, y, css){
      if (calmo || !eng.board) return;
      var n = document.createElement("b"); n.className = cls;
      n.style.cssText = "left:" + x + "px;top:" + y + "px;" + (css || "");
      n.addEventListener("animationend", function(){ n.remove(); }, { once:true });
      eng.board.appendChild(n);
    }
    function burst(x, y, n, up){
      for (var i = 0; i < n; i++) {
        var a = (up ? -Math.PI / 2 : 0) + (Math.random() - .5) * (up ? 2 : Math.PI * 2);
        var d = eng.cell * (.6 + Math.random() * 1.2);
        fx("dg-spark", x, y, "--dx:" + (Math.cos(a) * d).toFixed(1) + "px;--dy:" + (Math.sin(a) * d).toFixed(1) + "px;--t:" + (.6 + Math.random() * .6).toFixed(2) + "s");
      }
    }
    function ring(x, y){
      var w = eng.cell * 3.2;
      fx("dg-angel-ring", x, y, "width:" + w + "px;height:" + (w * .42) + "px");
    }
    function feather(x, y){
      var c = eng.cell;
      fx("dg-feather", x + (Math.random() - .5) * c * .6, y, "--fall:" + (c * (1.2 + Math.random())).toFixed(1) + "px;--sw:" + ((Math.random() < .5 ? -1 : 1) * c * (.2 + Math.random() * .25)).toFixed(1) + "px;--t:" + (1.4 + Math.random() * .9).toFixed(2) + "s");
    }

    function summon(){
      if (!eng.player || !eng.board) return;
      var t = angelPick(2, 2) || angelPick(1, 3); if (!t) return;
      angelMount();
      var cell = eng.cell;
      angel.on = true; angel.state = "descend"; angel.t0 = performance.now(); angel.dismissAfterArrival = false;
      angel.tr = t[0]; angel.tc = t[1]; angel.dir = "front"; angel.moving = false;
      angel.x = t[1] * cell + cell / 2; angel.lightK = 0; angel.landT = 0; angel.fadeInT = 0; angel.opacity = 1;
      angelBeam(false);
      angel.y = angel.y0;
      if (btn) btn.classList.add("on");
    }
    function remove(){
      angel.on = false; angel.state = "off"; angel.dismissAfterArrival = false; angel.lightK = 0;
      if (angel.el) { angel.el.remove(); angel.shadow.remove(); angel.pool.remove(); }
      if (angel.beam) angel.beam.remove(); angel.beam = null;
      if (btn) btn.classList.remove("on");
      syncLight(true);
    }
    function dismiss(){
      if (!angel.on || angel.state === "return" || angel.state === "ascend") return;
      if (angel.state === "descend") { angel.dismissAfterArrival = true; return; }
      if (!eng.player || !eng.board) { remove(); return; }
      var t = angelPick(2, 2) || angelPick(1, 3);
      if (!t) return;
      angel.tr = t[0]; angel.tc = t[1]; angel.state = "return"; angel.moving = false;
      if (btn) btn.classList.remove("on");
    }
    function toggle(){
      if (!podeInvocar()) return;
      angel.on ? dismiss() : summon();
    }

    var btn = null;
    if (ctx.mount) {
      btn = document.createElement("button"); btn.type = "button"; btn.className = "dg-angel-btn";
      btn.title = "Invocar Anjo da Guarda (H)"; btn.textContent = "✧";
      btn.addEventListener("click", function(e){ e.stopPropagation(); toggle(); btn.blur(); }, { signal: ctx.signal });
    }
    addEventListener("keydown", function(e){ if ((e.key === "h" || e.key === "H") && !e.repeat) toggle(); }, { signal: ctx.signal });
    if (ctx.signal) ctx.signal.addEventListener("abort", function(){ if (btn) btn.remove(); remove(); }, { once:true });

    var last = 0;
    function tick(now){
      /* o botão só existe para quem comprou */
      if (btn && ctx.mount) {
        var dono = podeInvocar();
        if (dono && btn.parentNode !== ctx.mount) ctx.mount.appendChild(btn);
        else if (!dono && btn.parentNode) btn.remove();
      }
      var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      if (!angel.on || !eng.player || !eng.board) return;
      var cell = eng.cell;
      if (angel.el.parentNode !== eng.board) { /* novo andar: reaparece perto do herói num lampejo */
        if (angel.state === "return" || angel.state === "ascend" || angel.dismissAfterArrival) { remove(); return; }
        angelMount(); var np = angelPick(2, 3) || angelPick(1, 4);
        if (np) { angel.tr = np[0]; angel.tc = np[1]; angel.x = np[1] * cell + cell / 2; angel.y = (np[0] + 1) * cell - cell * .1; }
        if (angel.beam) { angel.beam.remove(); angel.beam = null; }
        angel.state = "wait"; angel.wait = now + 2000; angel.fadeInT = now; angel.lightK = 0;
        burst(angel.x, angel.y - cell * .6, 10, false);
      }
      var tx = angel.tc * cell + cell / 2, ty = (angel.tr + 1) * cell - cell * .1;
      var bright = 1, glow = 6, sx = 1, sy = 1, op = 1, pool = 0, groundY = angel.y;
      if (angel.state === "descend") {
        /* o céu abre primeiro; o anjo desce como luz pura e vai ganhando cor */
        var k = clamp01((now - angel.t0 - ANGEL_OPEN) / ANGEL_FALL), e = 1 - Math.pow(1 - k, 3);
        angel.y = angel.y0 + (ty - angel.y0) * e; angel.x = tx; groundY = ty;
        angel.lightK = e;
        bright = 1 + (1 - e) * 1.5; glow = 6 + (1 - e) * 14; sx = sy = 1.15 - .15 * e;
        pool = clamp01((now - angel.t0) / ANGEL_OPEN) * (.35 + .65 * e);
        if (k > .15 && now - angel.fxT > 110) { angel.fxT = now; feather(angel.x, angel.y - cell * .9); }
        if (k >= 1) {
          angel.state = "wait"; angel.wait = now + 2000; angel.landT = now;
          angelFadeBeam();
          ring(tx, ty); burst(tx, ty - cell * .3, 16, true);
          if (angel.dismissAfterArrival) dismiss();
        }
      } else if (angel.state === "ascend") {
        var t = now - angel.t0;
        var charge = clamp01(t / ANGEL_CHARGE);
        var ka = clamp01((t - ANGEL_CHARGE - ANGEL_CROUCH) / ANGEL_RISE), kk = ka * ka * ka;
        groundY = ty; angel.moving = false; angel.dir = "front";
        if (!angel.beam) angelBeam(true);
        if (t < ANGEL_CHARGE) {
          /* carrega: brilho cresce e faíscas sobem devagar */
          angel.y = ty; bright = 1 + charge * .8; glow = 6 + charge * 10; pool = charge;
          if (now - angel.fxT > 90) { angel.fxT = now; burst(angel.x, ty - cell * .2, 1, true); }
        } else if (t < ANGEL_CHARGE + ANGEL_CROUCH) {
          /* agacha antes do impulso */
          var c = Math.sin((t - ANGEL_CHARGE) / ANGEL_CROUCH * Math.PI);
          angel.y = ty + c * 4; sx = 1 + c * .06; sy = 1 - c * .08;
          bright = 1.8; glow = 16; pool = 1;
        } else {
          /* sobe esticado, solta penas e se dissolve no feixe */
          angel.y = ty + (angel.y0 - ty) * kk;
          var st = Math.sin(clamp01(ka * 3) * Math.PI / 2) * (1 - ka);
          sx = 1 - .08 * st; sy = 1 + .12 * st;
          bright = 1.8 + ka * .8; glow = 16 + ka * 10; pool = 1 - ka;
          op = ka > .6 ? 1 - (ka - .6) / .4 : 1;
          if (now - angel.fxT > 120) { angel.fxT = now; feather(angel.x, angel.y - cell * .9); }
        }
        angel.lightK = 1 - kk * .4 - ka * .6;
        if (ka >= 1) { angelFadeBeam(); remove(); return; }
      } else {
        var p = eng.player, pk = p.r + "," + p.c;
        var far = Math.hypot(angel.tr - p.r, angel.tc - p.c);
        var moved = pk !== angel.lastP; angel.lastP = pk;
        /* jogador se afastou demais ou pisou no destino: escolhe outro ponto já */
        if (angel.state !== "return" && ((moved && (far > 4.2 || far < 1.5)) || (angel.state === "wait" && now >= angel.wait))) {
          var nt = angelPick(2, 4);
          if (nt) { angel.tr = nt[0]; angel.tc = nt[1]; angel.state = "go"; }
          else angel.wait = now + 600;
        }
        if (angel.state === "go" || angel.state === "return") {
          var gx = angel.tc * cell + cell / 2, gy = (angel.tr + 1) * cell - cell * .1;
          var dx = gx - angel.x, dy = gy - angel.y, dist = Math.hypot(dx, dy), step = ANGEL_SPEED * cell * dt;
          if (dist <= step) {
            angel.x = gx; angel.y = gy; angel.moving = false;
            if (angel.state === "return") { angel.state = "ascend"; angel.t0 = now; angel.fxT = 0; }
            else { angel.state = "wait"; angel.wait = now + 2000; }
          } else {
            angel.x += dx / dist * step; angel.y += dy / dist * step; angel.moving = true;
            angel.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "front" : "back");
          }
        } else angel.moving = false;
        groundY = angel.y;
        /* pouso: luz passa do ponto e volta, sprite dá um lampejo */
        var lt = angel.landT ? (now - angel.landT) / 500 : 1;
        if (lt < 1) { angel.lightK = 1 + .25 * Math.sin(lt * Math.PI) * (1 - lt); bright = 1 + 1.2 * (1 - lt); glow = 6 + 12 * (1 - lt); pool = 1 - lt; }
        else angel.lightK = Math.min(1, angel.lightK + dt * 2.5);
        if (angel.fadeInT) { var f = clamp01((now - angel.fadeInT) / 400); op = f; angel.lightK = Math.min(angel.lightK, f); if (f >= 1) angel.fadeInT = 0; }
        /* faíscas caindo das asas enquanto está presente */
        if (now - angel.fxT > 340) {
          angel.fxT = now;
          fx("dg-spark", angel.x + (Math.random() - .5) * cell * .9, angel.y - cell * (.7 + Math.random() * .5),
            "--dx:" + ((Math.random() - .5) * cell * .3).toFixed(1) + "px;--dy:" + (cell * .7).toFixed(1) + "px;--t:1.3s");
        }
      }
      var w = cell * 1.3, h = cell * 1.6;
      angel.el.style.width = w + "px"; angel.el.style.height = h + "px";
      angel.el.style.transform = "translate(" + (angel.x - w / 2) + "px," + (angel.y - h) + "px)";
      if (op !== angel.opacity) { angel.opacity = op; angel.el.style.opacity = op; }
      var iw = cell * 2;   /* mais larga que o anjo: a pose de costas abre as asas */
      angel.img.style.width = iw + "px"; angel.img.style.height = h + "px";
      angel.img.style.filter = "drop-shadow(0 0 " + glow.toFixed(1) + "px rgba(255,248,215,.9)) brightness(" + bright.toFixed(2) + ")";
      angel.img.style.scale = sx.toFixed(3) + " " + sy.toFixed(3);
      /* sombra no chão: menor e mais clara quanto mais alto */
      var alt = Math.max(0, groundY - angel.y), sk = clamp01(1 - alt / (cell * 6));
      var sw = w * .7, sh = h * .18;
      angel.shadow.style.width = sw + "px"; angel.shadow.style.height = sh + "px";
      angel.shadow.style.transform = "translate(" + (angel.x - sw / 2) + "px," + (groundY - sh * .35) + "px) scale(" + (.25 + .75 * sk).toFixed(3) + ")";
      angel.shadow.style.opacity = (sk * op).toFixed(3);
      /* círculo de luz no chão */
      var pw = cell * 2.6, ph = pw * .42;
      angel.pool.style.width = pw + "px"; angel.pool.style.height = ph + "px";
      angel.pool.style.transform = "translate(" + (angel.x - pw / 2) + "px," + (groundY - ph / 2) + "px) scale(" + (.3 + .7 * pool).toFixed(3) + ")";
      angel.pool.style.opacity = pool.toFixed(3);
      var fr = angel.moving && (angel.dir === "front" || angel.dir === "back") ? angel.dir + (Math.floor(now / 220) % 2 ? "2" : "1") : angel.dir + "_pose";
      var chave = fr + "@" + cell;
      if (angel.img.dataset.f !== chave) {
        /* todas as imagens com a mesma altura de anjo (ver MEDIDAS) */
        var e = encaixe(fr, iw, h, cell * 1.45);
        angel.img.dataset.f = chave;
        angel.img.style.backgroundImage = 'url("' + SPR[fr].src + '")';
        angel.img.style.backgroundSize = e.size; angel.img.style.backgroundPosition = e.pos;
      }
    }

    /* luz do anjo: recorta a escuridão ao redor dele; o raio acende/apaga junto com a chegada e a partida */
    var maskOn = false;
    function mask(){
      var lighting = getLighting();
      if (!lighting) return;
      if (!angel.on) {
        if (maskOn) { lighting.style.webkitMaskImage = lighting.style.maskImage = ""; maskOn = false; }
        return;
      }
      var r = Math.max(1, Math.round(eng.cell * ANGEL_LIGHT * angel.lightK)), x = angel.x, y = angel.y - eng.cell * .6;
      var m = "radial-gradient(circle " + r + "px at " + x + "px " + y + "px,rgba(0,0,0,0) 0,rgba(0,0,0,.25) 45%,rgba(0,0,0,.7) 78%,#000 100%)";
      lighting.style.webkitMaskImage = lighting.style.maskImage = m;
      maskOn = true;
    }

    /* névoa do minimapa: casas ao redor do anjo já pousado contam como vistas */
    function revelar(marcar){
      if (!angel.on || angel.state === "descend") return;
      for (var dr = -ANGEL_LIGHT; dr <= ANGEL_LIGHT; dr++) for (var dc = -ANGEL_LIGHT; dc <= ANGEL_LIGHT; dc++)
        if (dr * dr + dc * dc <= (ANGEL_LIGHT + .6) * (ANGEL_LIGHT + .6)) marcar(angel.tr + dr, angel.tc + dc);
    }

    return {
      tick: tick, mask: mask, revelar: revelar,
      invocar: summon, dispensar: dismiss, alternar: toggle, remover: remove,
      get ativo(){ return angel.on; }
    };
  }

  window.AnjoDaGuarda = {
    __pronto: true,
    SKU: SKU, PRECO: PRECO, NARRATIVA: NARRATIVA,
    possui: possui,
    entregar: window.adicionarAnjoDaGuardaNoJogo,
    criarNaMasmorra: criarNaMasmorra,
    /* útil no console para testar: AnjoDaGuarda.debug.revogar() */
    debug: {
      liberar: function(){ gravar(KEY_DONO, "1"); if (window.G) G.anjoDaGuarda = true; },
      revogar: function(){ apagar(KEY_DONO); apagar(KEY_PEND); if (window.G) G.anjoDaGuarda = false; }
    }
  };
})();
