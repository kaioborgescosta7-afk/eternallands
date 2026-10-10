/* ════════════════════════════════════════════════════════════════════════
   FAMILIARES — script próprio (cosméticos pagos, um por SKU)

   Um bichinho que segue o herói nas masmorras 2D, dois passos atrás.
   100% cosmético: não luta, não ilumina, não mexe em nada do combate.
   Tudo o que diz respeito aos familiares mora aqui:
     1. Catálogo (nome, SKU, preço, cor, jeito de andar, rastro, narrativa)
     2. CSS (masmorra + vitrine da loja)
     3. Imagens: carregadas e MEDIDAS sozinhas (não precisa tabela de medidas)
     4. Posse da compra (Google Play via Kodular), um item permanente por SKU
     5. Cartões no Mural de Compras (Loja.registrarProduto)
     6. O familiar na masmorra: chamar, seguir, dispensar, trocar

   ── SPRITES (o que falta da parte do artista) ──
   Para cada familiar, 4 PNGs com fundo transparente, nomeados assim:
       familiar_<id>_front_pose.png   (de frente, vindo na direção da tela)
       familiar_<id>_back_pose.png    (de costas)
       familiar_<id>_left_pose.png    (andando para a esquerda)
       familiar_<id>_right_pose.png   (andando para a direita)
   ids: coruja, corvo, lobo. Qualquer tamanho e qualquer margem: o script mede
   onde o bicho está na imagem (canal alfa) e desenha todas as poses com a
   mesma altura, pés no chão e centradas. Enquanto uma imagem não existir, o
   familiar aparece como o emoji do catálogo — dá para testar tudo sem arte.

   ── GOOGLE PLAY / KODULAR ──
   Um produto por familiar (SKU no catálogo abaixo). Depois que o Google Play
   confirmar a compra, o Kodular chama a função de entrega do familiar:
       adicionarpackfamiliarcorujanojogo();
       adicionarpackfamiliarcorvonojogo();
       adicionarpackfamiliarlobonojogo();
   Cada uma tem esboço no script#compra-bootstrap (compra que chega antes do
   jogo carregar fica anotada e é entregue quando este script sobe).

   ── LIGAÇÃO NUMA MASMORRA (dentro de createDungeonRoom) ──
       const familiar = window.Familiares ? Familiares.criarNaMasmorra({
         eng, mount:cfg.mount, signal:ac.signal, ehParede:(r,c) => ch(r,c) === "#"
       }) : null;
     e no laço de quadros:  familiar.tick(now)

   ── NO JOGO PRINCIPAL (ao portar) ──
     · salvar/carregar G.familiares no save, como G.anjoDaGuarda;
     · esboços no compra-bootstrap (os mesmos do Motor2D);
     · OFERTAS do módulo da loja, se quiser prazo ou escassez.

   Opções globais (definir ANTES deste script, se quiser):
       window.FAMILIAR_IMG_BASE = "";   pasta das imagens familiar_*.png
       window.FAMILIAR_LIBERADO = true; todos disponíveis na masmorra sem compra
                                        (laboratório); a posse da compra continua
                                        sendo contada à parte, para testar a loja
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if (window.Familiares && window.Familiares.__pronto) return;

  /* ───────────────────────── 1. Catálogo ─────────────────────────
     voa:    true = paira no ar e balança; false = anda no chão e trota
     cor:    "r,g,b" do brilho, da vitrine e dos efeitos
     rastro: "brilho" (pontos de luz), "pena" (penas escuras caindo),
             "nevoa" (baforadas de névoa no chão)
     emoji:  o que aparece enquanto o sprite não existe
     filtro: ajuste CSS do emoji provisório (ex.: escurecer o pássaro) */
  var CATALOGO = [
    { id:"coruja", nome:"Coruja de Sylvara", emoji:"🦉", filtro:"", voa:true, rastro:"brilho",
      cor:"255,210,120", sku:"pack_familiar_coruja", preco:"R$ 9,90",
      narrativa:"Nas noites em que a floresta de Sylvara ainda cantava, as corujas velavam as raízes. " +
        "Esta sobreviveu ao silêncio e escolheu você. Seus olhos dourados enxergam o que a penumbra esconde, " +
        "e ela não desvia o olhar.",
      desc:"Uma coruja de olhos dourados que voa dois passos atrás de você nas masmorras, deixando pontos de luz no ar." },
    { id:"corvo", nome:"Corvo de Thornwall", emoji:"🐦", filtro:"brightness(.35) saturate(.4)", voa:true, rastro:"pena",
      cor:"175,130,255", sku:"pack_familiar_corvo", preco:"R$ 9,90",
      narrativa:"Os corvos de Thornwall comeram das muralhas caídas e aprenderam o nome de cada morto. " +
        "Este pousou no seu ombro na primeira noite e nunca mais foi embora. Ele sabe o seu nome também, " +
        "mas ainda não o disse.",
      desc:"Um corvo de penas violáceas que segue você pelas masmorras, soltando penas escuras pelo caminho." },
    { id:"lobo", nome:"Lobo de Névoa", emoji:"🐺", filtro:"", voa:false, rastro:"nevoa",
      cor:"170,215,255", sku:"pack_familiar_lobo", preco:"R$ 9,90",
      narrativa:"Nasceu da bruma que sobe das campinas de Arhen antes do amanhecer. Não deixa pegadas, " +
        "só um rastro frio onde pisa, e nunca se afasta mais que três passos de você.",
      desc:"Um lobo feito de bruma que trota ao seu lado nas masmorras, soltando névoa a cada passo." }
  ];
  var POSES = ["front", "right", "back", "left"];
  var KEY_ATIVO = "arhen_familiar_ativo";
  function chaveDono(id){ return "arhen_familiar_" + id + "_adquirido"; }
  function chavePend(id){ return "arhen_familiar_" + id + "_pendente"; }
  function porId(id){ for (var i = 0; i < CATALOGO.length; i++) if (CATALOGO[i].id === id) return CATALOGO[i]; return null; }
  function porSku(sku){ for (var i = 0; i < CATALOGO.length; i++) if (CATALOGO[i].sku === sku) return CATALOGO[i]; return null; }

  function ler(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function gravar(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  function apagar(k){ try { localStorage.removeItem(k); } catch(e){} }
  function aviso(msg){ if (typeof window.blog === "function") { try { window.blog(msg, "ll"); } catch(e){} } }
  var calmo = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───────────────────────── 2. CSS ───────────────────────── */
  var CSS = "" +
    /* botão 🐾 e menu de escolha, abaixo do ✧ do anjo */
    ".dg-fam-btn{position:absolute;top:88px;right:8px;z-index:70;width:40px;height:40px;border-radius:50%;border:1px solid rgba(200,225,255,.5);background:radial-gradient(circle,rgba(200,225,255,.18),rgba(14,16,26,.88));color:#e8f0ff;font:18px/1 serif;cursor:pointer;box-shadow:0 0 10px rgba(170,200,255,.35)}" +
    ".dg-fam-btn.on{box-shadow:0 0 16px rgba(var(--fc),.95);border-color:rgba(var(--fc),.9);background:radial-gradient(circle,rgba(var(--fc),.45),rgba(20,18,30,.88))}" +
    ".dg-fam-menu{position:absolute;top:132px;right:8px;z-index:71;min-width:170px;padding:6px;border-radius:10px;border:1px solid rgba(200,225,255,.35);background:rgba(10,12,20,.94);box-shadow:0 6px 18px rgba(0,0,0,.55);font:12px Georgia,serif}" +
    ".dg-fam-menu button{display:flex;align-items:center;gap:8px;width:100%;margin:0;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:#e8eefc;font:inherit;text-align:left;cursor:pointer}" +
    ".dg-fam-menu button:hover,.dg-fam-menu button.ativo{background:rgba(var(--fc),.18)}" +
    ".dg-fam-menu button b{font-size:16px;width:20px;text-align:center}" +
    ".dg-fam-menu .sair{color:#c9b8b8;border-top:1px solid rgba(255,255,255,.08);border-radius:0 0 7px 7px;margin-top:2px}" +
    /* o familiar, sombra e efeitos (abaixo do anjo, z 900) */
    ".dg-fam{position:absolute;left:0;top:0;z-index:896;pointer-events:none;will-change:transform,opacity}" +
    ".dg-fam i{position:absolute;left:50%;bottom:0;transform:translateX(-50%);transform-origin:50% 100%;background-repeat:no-repeat}" +
    ".dg-fam span{position:absolute;left:0;right:0;bottom:0;text-align:center;line-height:1;transform-origin:50% 100%}" +
    ".dg-fam-shadow{position:absolute;left:0;top:0;z-index:895;pointer-events:none;border-radius:50%;background:radial-gradient(rgba(0,0,0,.42),transparent 70%);will-change:transform,opacity}" +
    ".dg-fam-puff{position:absolute;z-index:897;pointer-events:none;border-radius:50%;border:2px solid rgba(var(--fc),.95);box-shadow:0 0 12px 3px rgba(var(--fc),.6);transform:translate(-50%,-50%) scale(.15);animation:dgFamPuff .55s cubic-bezier(.15,.8,.3,1) forwards}" +
    "@keyframes dgFamPuff{60%{opacity:.9}to{transform:translate(-50%,-50%) scale(1);opacity:0}}" +
    ".dg-fam-p{position:absolute;z-index:897;pointer-events:none;animation:dgFamP var(--t) ease-out forwards}" +
    "@keyframes dgFamP{0%{opacity:0}15%{opacity:1}to{transform:translate(var(--dx),var(--dy)) rotate(var(--rot,0deg)) scale(var(--s1,.3));opacity:0}}" +
    ".dg-fam-p.brilho{width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:rgb(var(--fc));box-shadow:0 0 6px 2px rgba(var(--fc),.85)}" +
    ".dg-fam-p.pena{width:4px;height:10px;margin:-5px 0 0 -2px;border-radius:50% 50% 50% 50%/70% 70% 30% 30%;background:linear-gradient(#2a1f3d,#6b4fa0);box-shadow:0 0 4px rgba(var(--fc),.5)}" +
    ".dg-fam-p.nevoa{width:14px;height:8px;margin:-4px 0 0 -7px;border-radius:50%;background:radial-gradient(rgba(var(--fc),.55),transparent 70%);filter:blur(1px)}" +

    /* ── cartão no Mural de Compras ── */
    ".loja-card.loja-card--familiar{grid-column:1/-1;flex-direction:column;align-items:center;gap:0;text-align:center;padding:14px;border:1px solid rgba(var(--fc),.75);background:radial-gradient(ellipse at 50% 30%,rgba(var(--fc),.16),transparent 62%),linear-gradient(160deg,#141826,#07080e);box-shadow:0 0 18px rgba(var(--fc),.3);overflow:hidden}" +
    ".loja-card--familiar .loja-card-badge-ribbon{background:rgb(var(--fc));color:#10121c}" +
    ".loja-card--familiar .loja-card-rarity{background:rgba(var(--fc),.12);color:rgb(var(--fc));border:1px solid rgba(var(--fc),.5)}" +
    ".loja-card--familiar .loja-card-name{font-size:15px;color:#f2f5ff;text-shadow:0 0 10px rgba(var(--fc),.55)}" +
    ".loja-card--familiar .loja-card-desc{min-height:0;color:#b9c0d6}" +
    ".loja-card--familiar .loja-card-note{color:rgb(var(--fc))}" +
    ".loja-card--familiar .loja-card-btn{background:linear-gradient(90deg,rgba(var(--fc),.85),#fff 50%,rgba(var(--fc),.85));background-size:200% 100%;border:1px solid rgb(var(--fc));color:#10121c;box-shadow:0 0 14px rgba(var(--fc),.5);animation:famBtn 3s ease-in-out infinite}" +
    "@keyframes famBtn{50%{background-position:100% 0}}" +
    ".fam-info{display:flex;flex-direction:column;align-items:center;width:100%;max-width:520px}" +
    ".fam-narrativa{margin:4px 0 8px;text-align:left;padding:8px 10px;border-left:2px solid rgba(var(--fc),.75);background:linear-gradient(90deg,rgba(var(--fc),.08),transparent);font:italic 11.5px/1.55 Georgia,'Times New Roman',serif;color:#e4e8f6}" +
    ".fam-vitrine{position:relative;width:140px;height:150px;display:flex;align-items:flex-end;justify-content:center;isolation:isolate}" +
    ".fam-halo{position:absolute;left:50%;top:48%;width:130px;height:130px;margin:-65px 0 0 -65px;border-radius:50%;z-index:-1;background:radial-gradient(circle,rgba(var(--fc),.55),rgba(var(--fc),.15) 45%,transparent 70%);animation:famHalo 2.6s ease-in-out infinite alternate}" +
    "@keyframes famHalo{from{transform:scale(.88);opacity:.7}to{transform:scale(1.06);opacity:1}}" +
    ".fam-pedestal{position:absolute;left:50%;bottom:2px;width:100px;height:22px;margin-left:-50px;border-radius:50%;z-index:-1;background:radial-gradient(ellipse,rgba(var(--fc),.7),transparent 72%)}" +
    ".fam-figura{position:relative;width:110px;height:120px;margin-bottom:10px}" +
    ".fam-figura.voa{animation:famVoa 2.2s ease-in-out infinite alternate}" +
    "@keyframes famVoa{from{transform:translateY(0)}to{transform:translateY(-9px)}}" +
    ".fam-pose{position:absolute;inset:0;display:none;background-repeat:no-repeat;filter:drop-shadow(0 0 6px rgba(var(--fc),.9))}" +
    ".fam-pose.on{display:block}" +
    ".fam-pose span{position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:84px;line-height:1}" +
    "@media (prefers-reduced-motion:reduce){.fam-halo,.fam-figura.voa,.loja-card--familiar .loja-card-btn{animation:none}.dg-fam-p,.dg-fam-puff{display:none}}";
  function garantirCss(){
    if (document.getElementById("familiares-css")) return;
    var s = document.createElement("style"); s.id = "familiares-css"; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  garantirCss();

  /* ───────────────────────── 3. Imagens ─────────────────────────
     Cada pose é carregada uma vez. Ao carregar, mede a caixa onde o bicho
     está (pixels com alfa) para desenhar todas as poses do mesmo tamanho. */
  function base(){
    return window.FAMILIAR_IMG_BASE != null ? String(window.FAMILIAR_IMG_BASE)
      : "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/";
  }
  function imgUrl(id, pose){ return base() + "familiar_" + id + "_" + pose + "_pose.png"; }
  var SPR = {};
  function medir(im){
    var w = im.naturalWidth, h = im.naturalHeight;
    try {
      var k = Math.min(1, 256 / Math.max(w, h)), cw = Math.max(1, Math.round(w * k)), chh = Math.max(1, Math.round(h * k));
      var cv = document.createElement("canvas"); cv.width = cw; cv.height = chh;
      var cx = cv.getContext("2d"); cx.drawImage(im, 0, 0, cw, chh);
      var px = cx.getImageData(0, 0, cw, chh).data, x0 = cw, y0 = chh, x1 = -1, y1 = -1;
      for (var y = 0; y < chh; y++) for (var x = 0; x < cw; x++) {
        if (px[(y * cw + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 < 0) return [w, h, 0, 0, w, h];
      return [w, h, x0 / k, y0 / k, (x1 + 1) / k, (y1 + 1) / k];
    } catch(e){ return [w, h, 0, 0, w, h]; }   /* imagem sem CORS: usa a imagem inteira */
  }
  function sprite(id, pose){
    var k = id + "_" + pose;
    if (SPR[k]) return SPR[k];
    var s = SPR[k] = { url: imgUrl(id, pose), ok:false, falhou:false, box:null };
    var im = new Image(); im.crossOrigin = "anonymous";
    im.onload = function(){ s.box = medir(im); s.ok = true; };
    im.onerror = function(){ s.falhou = true; };
    im.src = s.url;
    return s;
  }
  /* background-size/position para caber numa caixa L×A com o bicho medindo `altura` px */
  function encaixe(s, L, A, altura){
    var m = s.box, k = altura / Math.max(1, m[5] - m[3]);
    return {
      size: (m[0] * k).toFixed(1) + "px " + (m[1] * k).toFixed(1) + "px",
      pos: (L / 2 - (m[2] + m[4]) / 2 * k).toFixed(1) + "px " + (A - m[5] * k).toFixed(1) + "px"
    };
  }

  /* ───────────────────────── 4. Posse ─────────────────────────
     Item permanente por familiar. Gravado no aparelho (localStorage) e no
     save (G.familiares = { coruja:true, ... }), para atravessar reinstalação. */
  function jogoPronto(){ return !!(window.G && G.hero && typeof G.hero.level === "number"); }
  function possui(id){ return ler(chaveDono(id)) === "1" || !!(window.G && G.familiares && G.familiares[id]); }
  function disponiveis(){ return CATALOGO.filter(function(f){ return !!window.FAMILIAR_LIBERADO || possui(f.id); }); }
  function sincronizarPosse(){
    if (!window.G) return;
    CATALOGO.forEach(function(f){
      var noSave = !!(G.familiares && G.familiares[f.id]);
      if (noSave && ler(chaveDono(f.id)) !== "1") gravar(chaveDono(f.id), "1");
      if (!noSave && ler(chaveDono(f.id)) === "1" && jogoPronto()) { G.familiares = G.familiares || {}; G.familiares[f.id] = true; }
    });
  }
  function entregar(id){
    var f = porId(id); if (!f) return;
    gravar(chaveDono(id), "1");
    apagar(chavePend(id));
    if (!ler(KEY_ATIVO)) gravar(KEY_ATIVO, id);
    var st = document.getElementById("loja-frag-status");
    if (!jogoPronto()) { if (st) st.textContent = "✅ Compra confirmada — o familiar te acompanha ao abrir seu jogo."; return; }
    G.familiares = G.familiares || {}; G.familiares[id] = true;
    try { if (typeof window.saveGame === "function") window.saveGame(); } catch(e){ console.error("[familiar] erro ao salvar após entrega:", e); }
    aviso("🐾 <b>" + f.nome + "</b> agora te acompanha. Toque em 🐾 dentro das masmorras para chamá-lo.");
    if (st) st.textContent = "✅ Compra concluída!";
    setTimeout(function(){
      if (typeof window.fecharLojaFragmentos === "function") window.fecharLojaFragmentos();
      if (typeof window.showO === "function") {
        window.showO(f.emoji + " " + f.nome, "«" + f.narrativa + "»\n\n" + f.nome + " é seu para sempre.\n" +
          "Nas masmorras, toque no botão 🐾 para chamá-lo, e toque de novo para dispensá-lo ou trocar de familiar.",
          [ { label: "🐾 Vamos juntos", cb: function(){} } ]);
      }
    }, 600);
  }
  /* PONTOS DE ENTRADA DO KODULAR: adicionarpackfamiliar<id>nojogo() */
  CATALOGO.forEach(function(f){
    window["adicionarpackfamiliar" + f.id + "nojogo"] = function(){
      try { entregar(f.id); } catch(e){ console.error("[familiar] falha na entrega:", e); gravar(chaveDono(f.id), "1"); }
    };
    /* compra que chegou antes deste script (anotada pelo esboço do compra-bootstrap) */
    if (ler(chavePend(f.id)) === "1") window["adicionarpackfamiliar" + f.id + "nojogo"]();
  });
  setInterval(sincronizarPosse, 2000);

  /* ───────────────────────── 5. Loja ───────────────────────── */
  var VIT_L = 110, VIT_A = 120, VIT_ALT = 100, GIRO_MS = 1100;
  function poseHtml(f, pose, on){
    var s = sprite(f.id, pose);
    var cls = '<div class="fam-pose' + (on ? " on" : "") + '" data-pose="' + pose + '"';
    if (s.ok) {
      var e = encaixe(s, VIT_L, VIT_A, VIT_ALT);
      return cls + ' style="background-image:url(&quot;' + s.url + '&quot;);background-size:' + e.size + ";background-position:" + e.pos + '"></div>';
    }
    return cls + '><span style="filter:' + f.filtro + '">' + f.emoji + "</span></div>";
  }
  function montarVitrine(fig, f){
    fig.innerHTML = POSES.map(function(p, i){ return poseHtml(f, p, i === 0); }).join("");
    /* sprites que terminarem de carregar depois trocam o emoji pela imagem */
    var tentativas = 0, t = setInterval(function(){
      if (!fig.isConnected || ++tentativas > 40) { clearInterval(t); return; }
      var pend = POSES.some(function(p){ var s = sprite(f.id, p); return !s.ok && !s.falhou; });
      var trocar = POSES.some(function(p){ return sprite(f.id, p).ok && !fig.querySelector('[data-pose="' + p + '"][style]'); });
      if (trocar) {
        var atual = fig.querySelector(".fam-pose.on"), ap = atual ? atual.dataset.pose : "front";
        fig.innerHTML = POSES.map(function(p){ return poseHtml(f, p, p === ap); }).join("");
      }
      if (!pend) clearInterval(t);
    }, 250);
    if (calmo) return;
    var giro = setInterval(function(){
      if (!fig.isConnected) { clearInterval(giro); return; }
      var poses = fig.querySelectorAll(".fam-pose"), i = 0;
      for (var k = 0; k < poses.length; k++) if (poses[k].classList.contains("on")) i = k;
      if (!poses.length) return;
      poses[i].classList.remove("on"); poses[(i + 1) % poses.length].classList.add("on");
    }, GIRO_MS);
  }
  function decorarCartao(f){
    return function(cartao){
      if (!cartao || cartao.dataset.familiar === "1") return;
      cartao.dataset.familiar = "1";
      cartao.style.setProperty("--fc", f.cor);
      var bau = cartao.querySelector(".loja-card-chest");
      var vit = document.createElement("div"); vit.className = "fam-vitrine";
      vit.innerHTML = '<div class="fam-halo"></div><div class="fam-pedestal"></div><div class="fam-figura' + (f.voa ? " voa" : "") + '"></div>';
      if (bau) bau.parentNode.replaceChild(vit, bau); else cartao.insertBefore(vit, cartao.firstChild);
      var gemas = cartao.querySelector(".loja-card-gems"); if (gemas) gemas.remove();
      var info = document.createElement("div"); info.className = "fam-info";
      [".loja-card-name", ".loja-card-rarity"].forEach(function(sel){ var el = cartao.querySelector(sel); if (el) info.appendChild(el); });
      var narr = document.createElement("div"); narr.className = "fam-narrativa"; narr.textContent = f.narrativa; info.appendChild(narr);
      [".loja-card-desc", ".loja-card-note", ".loja-card-btn"].forEach(function(sel){ var el = cartao.querySelector(sel); if (el) info.appendChild(el); });
      cartao.appendChild(info);
      montarVitrine(vit.querySelector(".fam-figura"), f);
      if (possui(f.id)) { var nota = cartao.querySelector(".loja-card-note"); if (nota) nota.textContent = f.nome + " já te acompanha. Toque em 🐾 nas masmorras."; }
    };
  }
  var tentativasLoja = 0;
  function registrarNaLoja(){
    if (!(window.Loja && typeof window.Loja.registrarProduto === "function")) {
      if (++tentativasLoja < 40) setTimeout(registrarNaLoja, 250);
      return;
    }
    /* registra do último para o primeiro: a loja põe cada novo no topo, então a ordem do catálogo fica */
    CATALOGO.slice().reverse().forEach(function(f){
      window.Loja.registrarProduto({
        sku: f.sku, icon: f.emoji, image: imgUrl(f.id, "front"), priceLabel: f.preco,
        name: f.nome, desc: f.desc + " Cosmético permanente — não altera o combate.",
        tier: "familiar", tierLabel: "FAMILIAR", gems: "", badge: "NOVO · FAMILIAR",
        note: "Chame e dispense quando quiser, em todas as masmorras."
      }, { decorar: decorarCartao(f), compraUnica: function(){ return possui(f.id); } });
    });
  }
  registrarNaLoja();

  /* ───────────────────────── 6. Masmorra ───────────────────────── */
  var VEL_VOA = 3.6, VEL_CHAO = 4.4;   /* casas por segundo */
  var ATRAS = 2;                        /* quantos passos atrás do herói */
  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }

  function criarNaMasmorra(ctx){
    var eng = ctx.eng;
    var ehParede = ctx.ehParede || function(){ return false; };
    var fam = { f:null, on:false, state:"off", el:null, vis:null, shadow:null, x:0, y:0, tr:0, tc:0,
      dir:"front", moving:false, hist:[], lastP:"", t0:0, fxT:0, opacity:1, chave:"" };

    function livre(r, c){
      if (ehParede(r, c) || !eng.passable(r, c)) return false;
      var p = eng.player; return !(p && p.r === r && p.c === c);
    }
    function vizinhoLivre(){
      var p = eng.player; if (!p) return null;
      var op = [[1,0],[0,-1],[0,1],[-1,0],[1,-1],[1,1],[-1,-1],[-1,1],[2,0],[0,2],[0,-2],[-2,0]];
      for (var i = 0; i < op.length; i++) if (livre(p.r + op[i][0], p.c + op[i][1])) return [p.r + op[i][0], p.c + op[i][1]];
      return null;
    }
    function montar(){
      if (!fam.el) {
        fam.el = document.createElement("div"); fam.el.className = "dg-fam";
        fam.shadow = document.createElement("div"); fam.shadow.className = "dg-fam-shadow";
      }
      if (fam.el.parentNode !== eng.board) { eng.board.appendChild(fam.shadow); eng.board.appendChild(fam.el); }
    }
    function cor(){ return fam.f ? fam.f.cor : "200,225,255"; }
    function fx(cls, x, y, css){
      if (calmo || !eng.board) return;
      var n = document.createElement("b"); n.className = cls;
      n.style.cssText = "--fc:" + cor() + ";left:" + x + "px;top:" + y + "px;" + (css || "");
      n.addEventListener("animationend", function(){ n.remove(); }, { once:true });
      eng.board.appendChild(n);
    }
    function puff(x, y){
      var w = eng.cell * 2.2;
      fx("dg-fam-puff", x, y, "width:" + w + "px;height:" + (w * .45) + "px");
      for (var i = 0; i < 10; i++) {
        var a = Math.random() * Math.PI * 2, d = eng.cell * (.4 + Math.random() * .8);
        fx("dg-fam-p brilho", x, y - eng.cell * .3, "--dx:" + (Math.cos(a) * d).toFixed(1) + "px;--dy:" + (Math.sin(a) * d * .6 - eng.cell * .3).toFixed(1) + "px;--t:" + (.5 + Math.random() * .4).toFixed(2) + "s");
      }
    }
    function rastro(now){
      var f = fam.f, c = eng.cell, intervalo = f.rastro === "nevoa" ? (fam.moving ? 160 : 900) : (fam.moving ? 260 : 700);
      if (now - fam.fxT < intervalo) return;
      fam.fxT = now;
      if (f.rastro === "brilho") {
        fx("dg-fam-p brilho", fam.x + (Math.random() - .5) * c * .6, fam.y - c * (.5 + Math.random() * .4),
          "--dx:" + ((Math.random() - .5) * c * .3).toFixed(1) + "px;--dy:" + (c * .5).toFixed(1) + "px;--t:1.2s");
      } else if (f.rastro === "pena") {
        fx("dg-fam-p pena", fam.x + (Math.random() - .5) * c * .5, fam.y - c * .55,
          "--dx:" + ((Math.random() < .5 ? -1 : 1) * c * .25).toFixed(1) + "px;--dy:" + (c * .75).toFixed(1) + "px;--rot:" + (Math.random() * 120 - 60).toFixed(0) + "deg;--s1:.8;--t:1.6s");
      } else {
        fx("dg-fam-p nevoa", fam.x + (Math.random() - .5) * c * .5, fam.y - c * .05,
          "--dx:" + ((Math.random() - .5) * c * .5).toFixed(1) + "px;--dy:" + (-c * .15).toFixed(1) + "px;--s1:2.2;--t:1.1s");
      }
    }

    function chamar(f){
      if (!eng.player || !eng.board || !f) return;
      if (fam.on && fam.f && fam.f.id !== f.id) remover(true);
      var t = vizinhoLivre(); if (!t) return;
      fam.f = f; gravar(KEY_ATIVO, f.id);
      montar();
      var c = eng.cell;
      fam.on = true; fam.state = "chega"; fam.t0 = performance.now(); fam.chave = "";
      fam.tr = t[0]; fam.tc = t[1]; fam.x = t[1] * c + c / 2; fam.y = (t[0] + 1) * c - c * .12;
      fam.dir = "front"; fam.moving = false; fam.hist = []; fam.opacity = 0;
      puff(fam.x, fam.y);
      atualizarBotao();
    }
    function remover(semEfeito){
      if (fam.on && !semEfeito && eng.board) puff(fam.x, fam.y);
      fam.on = false; fam.state = "off";
      if (fam.el) { fam.el.remove(); fam.shadow.remove(); }
      atualizarBotao();
    }
    function dispensar(){
      if (!fam.on || fam.state === "sai") return;
      fam.state = "sai"; fam.t0 = performance.now();
      atualizarBotao();
    }

    /* ── botão 🐾 e menu ── */
    var btn = null, menu = null;
    function fecharMenu(){ if (menu) { menu.remove(); menu = null; } }
    function atualizarBotao(){
      if (!btn) return;
      var ligado = fam.on && fam.state !== "sai";
      btn.classList.toggle("on", ligado);
      btn.style.setProperty("--fc", cor());
      btn.textContent = ligado && fam.f ? fam.f.emoji : "🐾";
      btn.title = ligado ? "Dispensar ou trocar familiar (F)" : "Chamar familiar (F)";
    }
    function preferido(lista){
      var id = ler(KEY_ATIVO);
      for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
      return lista[0] || null;
    }
    function abrirMenu(){
      fecharMenu();
      var lista = disponiveis(); if (!lista.length) return;
      menu = document.createElement("div"); menu.className = "dg-fam-menu";
      menu.style.setProperty("--fc", cor());
      lista.forEach(function(f){
        var b = document.createElement("button"); b.type = "button";
        var ativo = fam.on && fam.f && fam.f.id === f.id && fam.state !== "sai";
        if (ativo) b.className = "ativo";
        b.innerHTML = '<b style="filter:' + f.filtro + '">' + f.emoji + "</b>" + f.nome;
        b.addEventListener("click", function(e){ e.stopPropagation(); fecharMenu(); if (!ativo) chamar(f); });
        menu.appendChild(b);
      });
      if (fam.on && fam.state !== "sai") {
        var s = document.createElement("button"); s.type = "button"; s.className = "sair";
        s.innerHTML = "<b>✕</b>Dispensar";
        s.addEventListener("click", function(e){ e.stopPropagation(); fecharMenu(); dispensar(); });
        menu.appendChild(s);
      }
      ["pointerdown", "touchstart", "mousedown"].forEach(function(t){ menu.addEventListener(t, function(e){ e.stopPropagation(); }); });
      ctx.mount.appendChild(menu);
    }
    /* toque no 🐾: com um familiar só, chama/dispensa direto; com mais de um, abre a escolha */
    function alternar(){
      var lista = disponiveis(); if (!lista.length) return;
      if (menu) { fecharMenu(); return; }
      if (lista.length === 1) { fam.on && fam.state !== "sai" ? dispensar() : chamar(lista[0]); return; }
      abrirMenu();
    }
    if (ctx.mount) {
      btn = document.createElement("button"); btn.type = "button"; btn.className = "dg-fam-btn";
      btn.addEventListener("click", function(e){ e.stopPropagation(); alternar(); btn.blur(); }, { signal: ctx.signal });
      ["pointerdown", "touchstart", "mousedown"].forEach(function(t){ btn.addEventListener(t, function(e){ e.stopPropagation(); }, { signal: ctx.signal }); });
      atualizarBotao();
    }
    /* toque fora do menu fecha o menu (o menu e o botão não deixam o toque passar) */
    document.addEventListener("pointerdown", fecharMenu, { signal: ctx.signal });
    addEventListener("keydown", function(e){
      if ((e.key === "f" || e.key === "F") && !e.repeat) {
        var lista = disponiveis(); if (!lista.length) return;
        fam.on && fam.state !== "sai" ? dispensar() : chamar(preferido(lista));
      }
    }, { signal: ctx.signal });
    if (ctx.signal) ctx.signal.addEventListener("abort", function(){ fecharMenu(); if (btn) btn.remove(); remover(true); }, { once:true });

    var ultimo = 0;
    function tick(now){
      /* o botão só existe para quem tem algum familiar */
      if (btn && ctx.mount) {
        var tem = disponiveis().length > 0;
        if (tem && btn.parentNode !== ctx.mount) ctx.mount.appendChild(btn);
        else if (!tem && btn.parentNode) { btn.remove(); fecharMenu(); }
      }
      var dt = Math.min(.05, (now - (ultimo || now)) / 1000); ultimo = now;
      var p = eng.player;
      if (!p) return;
      /* trilha do herói: o familiar vai sempre para onde o herói esteve ATRAS passos antes */
      var pk = p.r + "," + p.c;
      if (pk !== fam.lastP) {
        fam.lastP = pk; fam.hist.push([p.r, p.c]);
        if (fam.hist.length > 8) fam.hist.shift();
      }
      if (!fam.on || !eng.board) return;
      var f = fam.f, c = eng.cell;
      if (fam.el.parentNode !== eng.board) {   /* novo andar: reaparece ao lado do herói */
        if (fam.state === "sai") { remover(true); return; }
        montar(); fam.hist = [[p.r, p.c]];
        var np = vizinhoLivre();
        if (np) { fam.tr = np[0]; fam.tc = np[1]; fam.x = np[1] * c + c / 2; fam.y = (np[0] + 1) * c - c * .12; }
        fam.state = "chega"; fam.t0 = now; fam.opacity = 0; fam.chave = "";
        puff(fam.x, fam.y);
      }
      var op = 1, sx = 1, sy = 1;
      if (fam.state === "chega") {
        var k = clamp01((now - fam.t0) / 350); op = k; sx = sy = .6 + .4 * k;
        if (k >= 1) fam.state = "segue";
      } else if (fam.state === "sai") {
        var ks = clamp01((now - fam.t0) / 350); op = 1 - ks; sx = sy = 1 - .4 * ks;
        if (ks >= 1) { remover(false); return; }
      }
      if (fam.state === "segue" || fam.state === "chega") {
        var alvo = fam.hist.length > ATRAS ? fam.hist[fam.hist.length - 1 - ATRAS] : null;
        if (alvo && (alvo[0] !== p.r || alvo[1] !== p.c) && eng.passable(alvo[0], alvo[1])) { fam.tr = alvo[0]; fam.tc = alvo[1]; }
        else if (Math.abs(fam.tr - p.r) + Math.abs(fam.tc - p.c) > 4) { var v = vizinhoLivre(); if (v) { fam.tr = v[0]; fam.tc = v[1]; } }
      }
      var gx = fam.tc * c + c / 2, gy = (fam.tr + 1) * c - c * .12;
      var dx = gx - fam.x, dy = gy - fam.y, dist = Math.hypot(dx, dy);
      var passo = (f.voa ? VEL_VOA : VEL_CHAO) * c * dt * (dist > c * 3 ? 2.2 : 1);   /* ficou longe: corre para alcançar */
      if (dist <= passo || dist < .5) { fam.x = gx; fam.y = gy; fam.moving = false; }
      else {
        fam.x += dx / dist * passo; fam.y += dy / dist * passo; fam.moving = true;
        fam.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "front" : "back");
      }
      if (!fam.moving && fam.state === "segue") {
        /* parado: olha para o herói */
        var hx = p.c * c + c / 2 - fam.x, hy = (p.r + 1) * c - fam.y;
        if (Math.abs(hx) > c * .4 || Math.abs(hy) > c * .4) fam.dir = Math.abs(hx) > Math.abs(hy) ? (hx > 0 ? "right" : "left") : (hy > 0 ? "front" : "back");
      }
      /* voadores pairam e balançam; o lobo trota quando anda */
      var alt = 0, giro = 0;
      if (f.voa) { alt = c * (.38 + .08 * Math.sin(now / 380)); giro = Math.sin(now / 520) * 4; }
      else if (fam.moving) alt = Math.abs(Math.sin(now / 95)) * c * .07;
      if (fam.state !== "sai") rastro(now);

      var tam = c * (f.voa ? .78 : .92), w = c * 1.4, h = tam * 1.15;
      fam.el.style.width = w + "px"; fam.el.style.height = h + "px";
      fam.el.style.transform = "translate(" + (fam.x - w / 2) + "px," + (fam.y - h - alt) + "px) rotate(" + giro.toFixed(1) + "deg) scale(" + sx.toFixed(3) + "," + sy.toFixed(3) + ")";
      if (op !== fam.opacity) { fam.opacity = op; fam.el.style.opacity = op; }
      var sw = c * (f.voa ? .55 : .75), sh = c * .18, sk = f.voa ? .65 - .15 * Math.sin(now / 380) : 1;
      fam.shadow.style.width = sw + "px"; fam.shadow.style.height = sh + "px";
      fam.shadow.style.transform = "translate(" + (fam.x - sw / 2) + "px," + (fam.y - sh * .4) + "px) scale(" + sk.toFixed(3) + ")";
      fam.shadow.style.opacity = (op * (f.voa ? .7 : 1)).toFixed(3);

      /* desenho: sprite da pose (medido) ou o emoji enquanto a arte não existe */
      var s = sprite(f.id, fam.dir), usaSprite = s.ok;
      var chave = f.id + fam.dir + (usaSprite ? "s" : "e") + "@" + c;
      if (fam.chave !== chave) {
        fam.chave = chave;
        fam.el.innerHTML = "";
        if (usaSprite) {
          var i = document.createElement("i"), e = encaixe(s, w, h, tam);
          i.style.width = w + "px"; i.style.height = h + "px";
          i.style.backgroundImage = 'url("' + s.url + '")'; i.style.backgroundSize = e.size; i.style.backgroundPosition = e.pos;
          i.style.filter = "drop-shadow(0 0 5px rgba(" + f.cor + ",.85))";
          fam.el.appendChild(i);
        } else {
          var sp = document.createElement("span");
          sp.textContent = f.emoji; sp.style.fontSize = Math.round(tam * .9) + "px";
          sp.style.filter = (f.filtro ? f.filtro + " " : "") + "drop-shadow(0 0 5px rgba(" + f.cor + ",.9))";
          /* emoji olha para a esquerda por padrão: espelha quando anda para a direita */
          if (fam.dir === "right") sp.style.transform = "scaleX(-1)";
          fam.el.appendChild(sp);
        }
      }
    }

    var api = {
      tick: tick, chamar: function(id){ chamar(porId(id) || preferido(disponiveis())); },
      dispensar: dispensar, alternar: alternar, remover: remover,
      get ativo(){ return fam.on ? fam.f.id : null; },
      /* para testes: onde está o familiar, para onde vai e onde está o herói */
      get estado(){ var p = eng.player; return { casa:[fam.tr, fam.tc], heroi: p ? [p.r, p.c] : null, estado: fam.state, rastro: fam.hist.slice() }; }
    };
    window.Familiares.ultimo = api;
    return api;
  }

  window.Familiares = {
    __pronto: true,
    CATALOGO: CATALOGO,
    possui: possui,
    disponiveis: disponiveis,
    porSku: porSku,
    entregar: entregar,
    criarNaMasmorra: criarNaMasmorra,
    /* útil no console para testar: Familiares.debug.liberar("corvo") / revogar("corvo") */
    debug: {
      liberar: function(id){ gravar(chaveDono(id), "1"); if (window.G) { G.familiares = G.familiares || {}; G.familiares[id] = true; } },
      revogar: function(id){ apagar(chaveDono(id)); apagar(chavePend(id)); if (window.G && G.familiares) delete G.familiares[id]; }
    }
  };
})();
