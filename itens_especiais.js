/* ════════════════════════════════════════════════════════════════════════
   ITENS ESPECIAIS — script próprio

   Quatro itens de utilidade, sem efeito em combate. Ficam no inventário
   (G.inventory, que já vai no save) e NÃO estão à venda: a regra de como o
   jogador recebe cada um ainda vai ser definida. Para dar um item:
       ItensEspeciais.conceder("vela_vigilia", 3);
       ItensEspeciais.conceder("almanaque_renhal", 1);
       ItensEspeciais.conceder("codice_ecos");          (permanente: só 1)
       ItensEspeciais.conceder("lanterna_cartografo");  (permanente: só 1)

   🕯️ Vela da Vigília (consumível) — protege o streak. Se o jogador ficar dias
      sem entrar, a sequência quebra; ao reivindicar a recompensa do dia, o
      jogo oferece gastar 1 vela por dia perdido para manter a sequência.
      A lógica mora no motor do streak (script streak-system-engine).
   📜 Almanaque de Renhal (consumível) — escolhe o efeito do dia. Um uso por
      dia; a escolha trava até a meia-noite (a mesma regra do Dia 6 do
      streak, que usa a mesma gravação). Botão no cartão "Efeito do Dia" do
      painel de Recompensas.
   📖 Códice dos Ecos (permanente) — relê as telas de lore já vistas
      (prólogos, visões, epílogos). As telas são anotadas no aparelho desde
      sempre; o códice só dá acesso. Botão 📖 ao lado da cartinha ✉️.
   🏮 Lanterna do Cartógrafo (permanente) — nas masmorras 2D: raio de luz do
      herói 35% maior e baús e chave do andar marcados no minimapa.
      A lógica mora no motor 2D (lightR e updateFogAndMinimap).
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if (window.ItensEspeciais && window.ItensEspeciais.__pronto) return;

  var ITENS = {
    vela_vigilia: { name:"Vela da Vigília", icon:"🕯️", permanente:false,
      desc:"Uma chama que não se apaga enquanto alguém vigia. Se você ficar dias sem voltar, gaste uma vela por dia perdido para manter seu streak." },
    almanaque_renhal: { name:"Almanaque de Renhal", icon:"📜", permanente:false,
      desc:"Um almanaque das caravanas de Renhal, com o céu de cada dia anotado. Use para escolher o efeito do dia (uma vez por dia)." },
    codice_ecos: { name:"Códice dos Ecos", icon:"📖", permanente:true,
      desc:"Um livro em branco que se escreve sozinho. Guarda cada visão, prólogo e epílogo que você já viu, para reler quando quiser (botão 📖)." },
    lanterna_cartografo: { name:"Lanterna do Cartógrafo", icon:"🏮", permanente:true,
      desc:"A lanterna de um cartógrafo que mapeou masmorras demais. Nas masmorras, sua luz alcança mais longe e os baús e a chave do andar aparecem no minimapa." }
  };

  function ler(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function gravar(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]; }); }

  /* ── registro no catálogo de itens do jogo (quest:true: não vende, não some) ── */
  function registrarItens(){
    if (!window.ITEMS) return false;
    Object.keys(ITENS).forEach(function(id){
      var d = ITENS[id];
      if (!ITEMS[id]) ITEMS[id] = { name:d.name, icon:d.icon, slot:null, cls:"any", quest:true, desc:d.desc, bonuses:{}, price:0 };
    });
    return true;
  }
  if (!registrarItens()) { var tr = 0, iv = setInterval(function(){ if (registrarItens() || ++tr > 80) clearInterval(iv); }, 250); }

  /* ── API ── */
  function quantidade(id){
    var inv = (window.G && G.inventory) || [];
    for (var i = 0; i < inv.length; i++) if (inv[i] && inv[i].id === id) return inv[i].qty || 0;
    return 0;
  }
  function tem(id){ return quantidade(id) > 0; }
  function conceder(id, qtd){
    var d = ITENS[id];
    if (!d || !window.G || !G.inventory || typeof window.addItem !== "function") return false;
    registrarItens();
    qtd = d.permanente ? 1 : Math.max(1, parseInt(qtd, 10) || 1);
    if (d.permanente && tem(id)) return false;
    window.addItem(id, qtd);
    if (typeof window.blog === "function") { try { window.blog(d.icon + " <b>" + d.name + "</b>" + (qtd > 1 ? " ×" + qtd : "") + " recebido.", "ll"); } catch(e){} }
    try { if (typeof window.saveGame === "function") window.saveGame(); } catch(e){}
    if (id === "codice_ecos") montarBotaoCodice();
    return true;
  }
  function consumir(id, qtd){
    qtd = qtd || 1;
    if (quantidade(id) < qtd || typeof window.removeItem !== "function") return false;
    for (var i = 0; i < qtd; i++) window.removeItem(id);
    try { if (typeof window.saveGame === "function") window.saveGame(); } catch(e){}
    return true;
  }

  /* ── CSS (Almanaque e Códice) ── */
  var CSS = "" +
    ".ie-modal{position:fixed;inset:0;z-index:10060;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.82)}" +
    ".ie-box{position:relative;width:100%;max-width:520px;max-height:86vh;overflow:auto;padding:16px;border-radius:14px;border:2px solid #c9a35a;background:linear-gradient(160deg,#241108,#0d0500);color:#f0e0c0;font-family:Georgia,serif;box-shadow:0 30px 80px rgba(0,0,0,.7)}" +
    ".ie-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}" +
    ".ie-tit{font-size:16px;color:#ffd080;font-weight:bold}" +
    ".ie-x{background:none;border:none;color:#c09060;font-size:18px;cursor:pointer}" +
    ".ie-sub{font-size:11px;color:#c09060;font-style:italic;margin-bottom:12px}" +
    ".ie-opcao{display:flex;gap:10px;align-items:flex-start;width:100%;margin:0 0 6px;padding:8px 10px;border:1px solid #5a3a14;border-radius:9px;background:#140a03;color:#f0e0c0;font:inherit;text-align:left;cursor:pointer}" +
    ".ie-opcao:hover{border-color:#c9a35a;background:#1d0f05}" +
    ".ie-opcao b{font-size:22px;line-height:1}" +
    ".ie-opcao span{font-size:12px;line-height:1.4}" +
    ".ie-opcao small{display:block;color:#bfa880;font-size:10.5px;margin-top:2px}" +
    ".ie-grupo{margin:10px 0 4px;font-size:12px;color:#ffd080;font-weight:bold;border-bottom:1px solid #5a3a14;padding-bottom:3px}" +
    ".ie-texto{font-size:12.5px;line-height:1.6;color:#e8d4ae}" +
    ".ie-voltar{margin-top:12px;background:#3a1e00;border:1px solid #ffb060;color:#ffb060;border-radius:6px;padding:7px 14px;font:12px Georgia,serif;cursor:pointer}" +
    "#codice-btn{position:absolute;left:44px;top:6px;z-index:50;background:transparent;border:none;padding:4px 6px;font-size:20px;line-height:1;cursor:pointer;filter:drop-shadow(0 0 6px rgba(255,208,128,.45))}";
  function garantirCss(){
    if (document.getElementById("itens-especiais-css")) return;
    var s = document.createElement("style"); s.id = "itens-especiais-css"; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  function modal(html){
    garantirCss();
    var old = document.getElementById("ie-modal"); if (old) old.remove();
    var m = document.createElement("div"); m.id = "ie-modal"; m.className = "ie-modal";
    m.innerHTML = '<div class="ie-box">' + html + "</div>";
    m.addEventListener("click", function(e){ if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    var x = m.querySelector(".ie-x"); if (x) x.onclick = function(){ m.remove(); };
    return m;
  }

  /* ═══════════════ 📜 Almanaque de Renhal ═══════════════
     Gravação compartilhada com o Dia 6 do streak (streak.wmChoice.<hoje>):
     uma escolha de efeito por dia, venha de onde vier. */
  function motivoAlmanaqueIndisponivel(){
    if (!tem("almanaque_renhal")) return "Você não tem nenhum Almanaque de Renhal.";
    if (!window.Streak || typeof window.Streak.escolherModificador !== "function") return "O efeito do dia ainda está carregando.";
    if (window.Streak.escolhaDeHoje()) return "O efeito de hoje já foi escolhido. Volte amanhã.";
    if (window.Streak.count === 6 && !window.Streak.claimedToday()) return "Hoje é o Dia 6 do seu streak: a escolha do efeito já vem de graça na recompensa de hoje. Guarde o Almanaque para outro dia.";
    return "";
  }
  function abrirAlmanaque(){
    var motivo = motivoAlmanaqueIndisponivel();
    if (motivo) { modal('<div class="ie-hdr"><div class="ie-tit">📜 Almanaque de Renhal</div><button class="ie-x" type="button">✕</button></div><div class="ie-texto">' + esc(motivo) + "</div>"); return; }
    var pool = (window.WorldMod && WorldMod.pool) || [];
    var m = modal('<div class="ie-hdr"><div class="ie-tit">📜 Almanaque de Renhal</div><button class="ie-x" type="button">✕</button></div>' +
      '<div class="ie-sub">Escolha o efeito de hoje. Gasta 1 Almanaque (você tem ' + quantidade("almanaque_renhal") + "). A escolha vale até a meia-noite e não pode ser trocada.</div>" +
      pool.map(function(w){ return '<button type="button" class="ie-opcao" data-wm="' + esc(w.id) + '"><b>' + esc(w.emoji) + "</b><span><b style=\"font-size:13px\">" + esc(w.name) + "</b><small>" + esc(w.eff) + "</small></span></button>"; }).join(""));
    Array.prototype.forEach.call(m.querySelectorAll("[data-wm]"), function(b){
      b.onclick = function(){
        if (motivoAlmanaqueIndisponivel()) { m.remove(); return; }
        var id = b.getAttribute("data-wm");
        if (!consumir("almanaque_renhal", 1)) { m.remove(); return; }
        if (!window.Streak.escolherModificador(id)) { if (typeof window.addItem === "function") window.addItem("almanaque_renhal", 1); m.remove(); return; }
        var w = pool.filter(function(x){ return x.id === id; })[0] || {};
        m.remove();
        if (typeof window.blog === "function") { try { window.blog("📜 <b>Almanaque de Renhal:</b> o efeito de hoje é " + esc(w.emoji) + " <b>" + esc(w.name) + "</b>.", "ll"); } catch(e){} }
        if (typeof window.showO === "function") window.showO("📜 " + (w.emoji || "") + " " + (w.name || ""), (w.eff || "") + "\n\nVale até a meia-noite.", [ { label:"OK", cb:function(){} } ]);
        var card = document.getElementById("worldmod-reward-card"); if (card) card.remove();   /* o painel recria com o efeito novo */
      };
    });
  }

  /* ═══════════════ 📖 Códice dos Ecos ═══════════════
     Toda tela de lore (showLoreOverlay) é anotada no aparelho, com ou sem o
     códice: quem recebe o códice depois já encontra o que viveu. */
  var KEY_CODICE = "arhen_codice_ecos", MAX_CODICE = 250;
  function lerCodice(){ try { var a = JSON.parse(ler(KEY_CODICE) || "[]"); return Array.isArray(a) ? a : []; } catch(e){ return []; } }
  function anotar(icone, local, titulo, texto){
    if (!texto) return;
    var lista = lerCodice(), chave = (local || "") + "|" + (titulo || "");
    if (lista.some(function(e){ return e.k === chave; })) return;
    lista.push({ k:chave, i:icone || "", l:local || "Arhen", t:titulo || "", x:String(texto), d:Date.now() });
    if (lista.length > MAX_CODICE) lista = lista.slice(-MAX_CODICE);
    gravar(KEY_CODICE, JSON.stringify(lista));
  }
  function embrulharLore(){
    var orig = window.showLoreOverlay;
    if (typeof orig !== "function" || orig.__codice) return !!(orig && orig.__codice);
    window.showLoreOverlay = function(icon, loc, title, bodyText){
      try { anotar(icon, loc, title, bodyText); } catch(e){}
      return orig.apply(this, arguments);
    };
    window.showLoreOverlay.__codice = true;
    return true;
  }
  if (!embrulharLore()) { var tl = 0, il = setInterval(function(){ if (embrulharLore() || ++tl > 80) clearInterval(il); }, 250); }

  function abrirCodice(){
    if (!tem("codice_ecos")) return;
    var lista = lerCodice(), grupos = {}, ordem = [];
    lista.forEach(function(e, i){ if (!grupos[e.l]) { grupos[e.l] = []; ordem.push(e.l); } grupos[e.l].push(i); });
    var corpo = ordem.length ? ordem.map(function(l){
      return '<div class="ie-grupo">' + esc(l) + "</div>" + grupos[l].map(function(i){
        var e = lista[i];
        return '<button type="button" class="ie-opcao" data-e="' + i + '"><b>' + esc(e.i || "📜") + "</b><span>" + esc(e.t || "Sem título") + "</span></button>";
      }).join("");
    }).join("") : '<div class="ie-texto">O códice ainda está em branco. Cada visão, prólogo e epílogo que você presenciar será escrito aqui.</div>';
    var m = modal('<div class="ie-hdr"><div class="ie-tit">📖 Códice dos Ecos</div><button class="ie-x" type="button">✕</button></div>' +
      '<div class="ie-sub">' + lista.length + " " + (lista.length === 1 ? "eco guardado" : "ecos guardados") + ".</div>" + corpo);
    Array.prototype.forEach.call(m.querySelectorAll("[data-e]"), function(b){
      b.onclick = function(){
        var e = lista[+b.getAttribute("data-e")];
        /* texto dos dados do próprio jogo (pode ter <b> e <br>) */
        var mm = modal('<div class="ie-hdr"><div class="ie-tit">' + esc(e.i) + " " + esc(e.t) + '</div><button class="ie-x" type="button">✕</button></div>' +
          '<div class="ie-sub">' + esc(e.l) + '</div><div class="ie-texto">' + String(e.x).replace(/\n/g, "<br>") + '</div><button type="button" class="ie-voltar">← Voltar ao códice</button>');
        mm.querySelector(".ie-voltar").onclick = function(){ mm.remove(); abrirCodice(); };
      };
    });
  }
  /* botão 📖 ao lado da cartinha ✉️, só para quem tem o códice; some junto com a barra do topo */
  function montarBotaoCodice(){
    garantirCss();
    var b = document.getElementById("codice-btn");
    if (!tem("codice_ecos")) { if (b) b.remove(); return; }
    var carta = document.getElementById("notas-btn");
    if (!b) {
      b = document.createElement("button"); b.type = "button"; b.id = "codice-btn";
      b.title = "Códice dos Ecos"; b.setAttribute("aria-label", "Códice dos Ecos"); b.textContent = "📖";
      b.addEventListener("click", function(e){ e.stopPropagation(); abrirCodice(); });
      document.body.appendChild(b);
    }
    if (carta) { b.style.display = carta.style.display; b.style.top = carta.style.top || "6px"; }
  }
  setInterval(montarBotaoCodice, 1500);

  window.ItensEspeciais = {
    __pronto: true,
    ITENS: ITENS,
    conceder: conceder, consumir: consumir, quantidade: quantidade, tem: tem,
    abrirAlmanaque: abrirAlmanaque, motivoAlmanaqueIndisponivel: motivoAlmanaqueIndisponivel,
    abrirCodice: abrirCodice, lerCodice: lerCodice
  };
})();
