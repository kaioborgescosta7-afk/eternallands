#!/usr/bin/env node
/**
 * i18n.js — pipeline de tradução para um jogo em arquivo HTML único.
 *
 * O arquivo em PORTUGUÊS continua sendo a fonte única que você edita.
 * Este script NUNCA altera o arquivo de origem: ele gera uma cópia traduzida.
 *
 * Fluxo do dia a dia (um jogo só, idioma trocado pelo botão Language):
 *   node i18n.js wrap    <jogo.html>                         marca textos novos com __t()/__T``
 *   node i18n.js extract <jogo.html> lang/en.master.json     junta textos novos (pendentes)
 *   node tsv.js next lang/en.master.json 24000 lote.tsv      (traduzir) → node tsv.js merge …
 *   node i18n.js export  lang/en.master.json <deploy>/lang/en.js <jogo.html>
 *
 * Outros comandos:
 *   node i18n.js extract <jogo.html> <lang/en.json>
 *       Varre o jogo, acha todo texto em português e atualiza o arquivo de
 *       tradução: textos novos entram com "en": "" (pendentes); textos que você
 *       editou no jogo viram chave nova (a antiga fica como "órfã").
 *
 *   node i18n.js status <jogo.html> <lang/en.json>
 *       Mostra quanto já foi traduzido e lista o que falta.
 *
 *   node i18n.js build <jogo.html> <lang/en.json> <saida.html> [codigo-idioma]
 *       Gera o jogo traduzido. Texto sem tradução continua em português
 *       (nunca aparece vazio).
 *
 * Dependência: npm i acorn acorn-walk
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const acorn = require('acorn');
const walk = require('acorn-walk');

// ───────────────────────── Heurísticas: o que é "texto traduzível" ─────────────────────────
const ACCENT = /[À-ÖØ-öø-ÿ]/;
const PT_WORDS = /(?<![\w-])(você|vocês|não|para|uma|está|estão|seu|sua|seus|suas|mais|como|com|dos|das|nos|nas|pelo|pela|que|ele|ela|eles|elas|isso|esse|essa|aqui|onde|quando|muito|todo|toda|sem|sobre|entre|depois|antes|ainda|já|só|mas|ou|de|da|do|em|no|na|os|as|um|se|foi|ser|tem|são|há)(?![\w-])/i;
const HAS_LOWER_RUN = /[a-zà-ÿ]{3,}/;
const ID_LIKE = /^[a-z0-9_\-:.#\/%@]+$/;
const CAP_PHRASE = /^[A-ZÀ-Ú][a-zà-ÿ]+([ '\-][A-Za-zÀ-ÿ]+){0,5}[.!?:…]?$/;
const CSS_OR_CODE = /[{};=]|^\s*(function|var|let|const|return)\b|\bpx\b|\brgba?\(|\bvar\(--/;

// campos de dados que são identificadores / configuração, nunca texto de jogador
const DENY_FIELDS = new Set(['id','_id','art','icon','image','bg','img','slot','cls','type','region','x','y','color',
  'special','stat','key','val','resolve','pool','nextId','final','cat','hide','next','done','active','chainId',
  'fragmentId','cityId','linkedCityId','linkedDungeonId','linkedGoldQuest','dungeonPool','dungeonBossPool',
  'questIds','tavernQuestId','dungeonQuestId','shop','extraTabs','_payout','onWin','_valChoice','branch',
  'cidadeOrigem','cidadeRevelada','emoji','leaderArt','secondDungeonId','_schema','_legacyAliasOf','pools','waves']);

// Vocabulário de palavras portuguesas (gerado a partir do próprio jogo) — usado como
// segunda chance para textos que as heurísticas acima deixam passar (ex.: HTML dentro de
// strings JS sem acento: '<button ...>Fechar</button>', '<span>vazio</span>').
let PT_VOCAB = new Set();
try { PT_VOCAB = new Set(fs.readFileSync(path.join(__dirname, 'pt_vocab.txt'), 'utf8').split(/\s+/).filter(Boolean)); } catch (e) {}
const vocabHit = (s) => (s.toLowerCase().match(/[a-zà-ÿ]{4,}/g) || []).some(w => PT_VOCAB.has(w));

function looksPT(t) {                                 // regra original para texto dentro do JS
  if (CSS_OR_CODE.test(t) && !ACCENT.test(t) && !PT_WORDS.test(t)) return false;
  return ACCENT.test(t) || PT_WORDS.test(t) || CAP_PHRASE.test(t);
}

function secondChance(t) {                            // HTML em string JS, ou frase sem acento
  const hasTag = /<\/?[a-z][^>]*>/i.test(t);
  const vis = hasTag ? t.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim() : t;
  if (!/[a-zà-ÿ]{3}/i.test(vis)) return false;
  if (!/\s/.test(vis) && (ID_LIKE.test(vis) || /[_\/\\.(){}=]/.test(vis))) return false;
  if (/^https?:\/\//.test(vis)) return false;
  if (hasTag && looksPT(vis)) return true;
  if (!hasTag && !/\s/.test(vis)) return false;       // palavra solta sem HTML: provavelmente id
  if (/[{}]|^\s*(function|var|let|const|return)\b|\bpx\b|\brgba?\(|\bvar\(--|=>|===|!==/.test(vis)) return false;
  return vocabHit(vis);
}

const ALWAYS = new Set(['SOR', 'DES', 'Nv.']);
function isTranslatable(s, strict) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 3) return false;
  if (ALWAYS.has(t)) return true;                     // rótulos curtos de atributo (SOR→LCK, DES→DEX)
  if (!HAS_LOWER_RUN.test(t)) {                       // só maiúsculas/números/símbolos: neutro…
    return /[A-ZÀ-Ú]{4,}/.test(t) && !/[_\/]/.test(t) && (ACCENT.test(t) || vocabHit(t)); // …salvo "CRÔNICAS"
  }
  if (/^https?:\/\//.test(t) || /^<img\b/i.test(t) && !/>[^<]*[a-zà-ÿ]{3}/i.test(t.replace(/<img[^>]*>/ig,''))) return false;
  if (ID_LIKE.test(t)) return false;                  // ids/classes/chaves
  if (strict) return looksPT(t) || secondChance(t);   // dentro do JS: exige cara de português
  return true;
}

const keyOf = (text, taken) => {
  let n = 8, k;
  do { k = 'k' + crypto.createHash('sha1').update(text).digest('hex').slice(0, n++); }
  while (taken && taken.has(k) && taken.get(k) !== text);
  if (taken) taken.set(k, text);
  return k;
};

// ───────────────────────── Leitura do HTML ─────────────────────────
function splitHtml(html) {
  const segs = [];
  const re = /<!--[\s\S]*?-->|<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let last = 0, m;
  while ((m = re.exec(html))) {
    if (!m[1]) continue; // comentário HTML
    const bodyStart = m.index + m[0].indexOf('>') + 1;
    segs.push({ kind: 'html', start: last, end: m.index });
    const isJson = /application\/(ld\+)?json/i.test(m[2]);
    segs.push({ kind: m[1].toLowerCase() === 'style' ? 'style' : (isJson ? 'json' : 'js'),
      start: bodyStart, end: bodyStart + m[3].length, id: (/id="([^"]+)"/.exec(m[2]) || [])[1] });
    last = bodyStart + m[3].length;
  }
  segs.push({ kind: 'html', start: last, end: html.length });
  return segs;
}

const LOGIC_METHODS = new Set(['includes','indexOf','lastIndexOf','startsWith','endsWith','test','match','split','replace',
  'replaceAll','getElementById','querySelector','querySelectorAll','getItem','setItem','removeItem','addEventListener',
  'hasOwnProperty','localeCompare','add','remove','toggle','contains','closest','getAttribute','setAttribute','matches']);

/** Coleta unidades de texto de um bloco <script> (JS). Posições absolutas. */
function scanJs(html, seg, out, logic) {
  const code = html.slice(seg.start, seg.end);
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, locations: false }); }
  catch (e) { out.warnings.push(`bloco JS em offset ${seg.start} não pôde ser lido (${e.message.split('\n')[0]}) — ignorado`); return; }
  const base = seg.start;
  const inTemplateExprDepth = new WeakSet();
  walk.fullAncestor(ast, (node, _s, anc) => {
    const parent = anc[anc.length - 2];
    const markLogic = (v) => { if (typeof v === 'string' && v.trim().length >= 3) logic.add(v); };

    if (node.type === 'Literal' && typeof node.value === 'string') {
      // já marcado pelo autor/ferramenta: __t('texto') — sempre entra, nunca é re-embrulhado
      if (parent && parent.type === 'CallExpression' && parent.callee.type === 'Identifier' && parent.callee.name === '__t' && parent.arguments[0] === node) {
        if (node.value.trim()) out.units.push({ kind: 'js', node: 'lit', start: base + node.start, end: base + node.end, text: node.value, wrapped: true, forced: true });
        return;
      }
      // el.setAttribute('aria-label'|'title'|'placeholder'|'alt', 'texto'): o 2º argumento é texto visível
      const visAttr = parent && parent.type === 'CallExpression' && parent.callee.type === 'MemberExpression' && !parent.callee.computed
        && parent.callee.property.name === 'setAttribute' && parent.arguments[1] === node && parent.arguments[0]
        && parent.arguments[0].type === 'Literal' && /^(aria-label|title|placeholder|alt)$/.test(parent.arguments[0].value);
      // posições de lógica: nunca traduzir
      if (parent && !visAttr) {
        if (parent.type === 'BinaryExpression' && ['==','===','!=','!==','in'].includes(parent.operator)) return markLogic(node.value);
        if (parent.type === 'SwitchCase' && parent.test === node) return markLogic(node.value);
        if (parent.type === 'MemberExpression' && parent.computed && parent.property === node) return markLogic(node.value);
        if ((parent.type === 'Property' || parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && parent.key === node) return markLogic(node.value);
        if (parent.type === 'CallExpression' && parent.callee.type === 'MemberExpression' && !parent.callee.computed
            && LOGIC_METHODS.has(parent.callee.property.name) && parent.arguments.includes(node)) return markLogic(node.value);
        if (parent.type === 'ArrayExpression') {
          const gp = anc[anc.length - 3], ggp = anc[anc.length - 4];
          if (gp && gp.type === 'MemberExpression' && gp.object === parent && ggp && ggp.type === 'CallExpression'
              && ['includes','indexOf'].includes(gp.property.name)) return markLogic(node.value);
        }
        if (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration') return;
      }
      if (!isTranslatable(node.value, true)) return;
      const concat = parent && parent.type === 'BinaryExpression' && parent.operator === '+';
      out.units.push({ kind: 'js', node: 'lit', start: base + node.start, end: base + node.end, text: node.value, concat });
    } else if (node.type === 'TemplateLiteral') {
      const exprs = node.expressions.map(e => ({ start: base + e.start, end: base + e.end }));
      let text = '';
      node.quasis.forEach((q, i) => { text += q.value.cooked == null ? q.value.raw : q.value.cooked; if (i < exprs.length) text += `{{${i}}}`; });
      // __T`...` = já marcado; outros tagged templates (css``, html`` etc.) são código
      if (parent && parent.type === 'TaggedTemplateExpression' && parent.quasi === node) {
        if (parent.tag.type === 'Identifier' && parent.tag.name === '__T' && text.trim())
          out.units.push({ kind: 'js', node: 'tpl', start: base + node.start, end: base + node.end, text, exprs, wrapped: true, forced: true,
            quasis: node.quasis.map(q => ({ start: base + q.start, end: base + q.end })) });
        return;
      }
      if (!isTranslatable(text.replace(/\{\{\d+\}\}/g, ' ').replace(/<[^>]+>/g, ' '), true)) return;
      out.units.push({ kind: 'js', node: 'tpl', start: base + node.start, end: base + node.end, text, exprs,
        quasis: node.quasis.map(q => ({ start: base + q.start, end: base + q.end })) });
    }
  });
}

/** Coleta unidades de um bloco <script type=application/json>. */
function scanJson(html, seg, out, logic) {
  let obj;
  try { obj = JSON.parse(html.slice(seg.start, seg.end)); } catch (e) { out.warnings.push(`JSON ${seg.id}: inválido — ignorado`); return; }
  const walkVal = (v, field, p) => {
    if (typeof v === 'string') {
      if (!DENY_FIELDS.has(field) && isTranslatable(v, false)) out.units.push({ kind: 'json', block: seg.id, path: p.slice(), text: v, field });
    } else if (Array.isArray(v)) v.forEach((x, i) => { p.push(i); walkVal(x, field, p); p.pop(); });
    else if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) {
        if (/[ À-ÿ]/.test(k) || ACCENT.test(k)) logic.add(k);        // chaves em PT são lógica
        p.push(k); walkVal(v[k], k, p); p.pop();
      }
    }
  };
  walkVal(obj, '', []);
}

/** Texto estático do HTML (fora de script/style) + atributos title/placeholder/alt. */
function scanHtml(html, seg, out) {
  const frag = html.slice(seg.start, seg.end);
  let m;
  const textRe = />([^<>]+)</g;
  while ((m = textRe.exec(frag))) {
    const raw = m[1], t = raw.trim();
    if (!isTranslatable(t.replace(/&[a-z#0-9]+;/gi, ' '), false) || !/[a-zà-ÿ]{3}/i.test(t)) continue;
    const lead = raw.length - raw.trimStart().length;
    out.units.push({ kind: 'html', start: seg.start + m.index + 1 + lead, end: seg.start + m.index + 1 + lead + t.length, text: t });
  }
  const attrRe = /\b(title|placeholder|alt|aria-label)="([^"<>]*)"/g;
  while ((m = attrRe.exec(frag))) {
    if (!isTranslatable(m[2], false)) continue;
    const s = seg.start + m.index + m[0].indexOf('"') + 1;
    out.units.push({ kind: 'html', start: s, end: s + m[2].length, text: m[2], attr: true });
  }
  // handlers inline (onclick="...") não são traduzidos automaticamente: só contamos
  const inl = frag.match(/\bon[a-z]+="[^"]*[À-ÿ][^"]*"/g);
  if (inl) out.inlineHandlers += inl.length;
}

function scan(html) {
  const out = { units: [], warnings: [], inlineHandlers: 0 };
  const logic = new Set();
  const segs = splitHtml(html);
  for (const s of segs) {
    if (s.id === 'i18n-loader') continue;                 // o próprio carregador de idioma não é texto do jogo
    if (s.kind === 'js') scanJs(html, s, out, logic);
    else if (s.kind === 'json') scanJson(html, s, out, logic);
    else if (s.kind === 'html') scanHtml(html, s, out);
  }
  out.logic = logic;
  out.segs = segs;
  // chave por texto único; textos em posição de lógica ficam fora
  const taken = new Map();
  out.excluded = new Map();
  for (const u of out.units) {
    if (!u.forced && (logic.has(u.text) || logic.has(u.text.trim()))) { u.skip = 'logic'; out.excluded.set(u.text, (out.excluded.get(u.text) || 0) + 1); continue; }
    u.key = keyOf(u.text, taken);
  }
  return out;
}

// ───────────────────────── Arquivo de tradução ─────────────────────────
function loadLang(file) {
  if (!fs.existsSync(file)) return { version: 1, entries: {} };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function saveLang(file, lang) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(lang, null, 1) + '\n');
}
const ctxOf = (u) => u.kind === 'json' ? `${u.block}:${u.field}` : u.kind === 'html' ? (u.attr ? 'html-attr' : 'html') : (u.concat ? 'js-concat' : u.node === 'tpl' ? 'js-template' : 'js');

// ───────────────────────── extract ─────────────────────────
function cmdExtract(gameFile, langFile) {
  const html = fs.readFileSync(gameFile, 'utf8');
  const sc = scan(html);
  const lang = loadLang(langFile);
  const seen = new Set();
  let added = 0;
  for (const u of sc.units) {
    if (u.skip) continue;
    seen.add(u.key);
    if (!lang.entries[u.key]) { lang.entries[u.key] = { pt: u.text, en: '', ctx: ctxOf(u) }; added++; }
    else { lang.entries[u.key].pt = u.text; lang.entries[u.key].ctx = ctxOf(u); delete lang.entries[u.key].orphan; }
  }
  let orphans = 0;
  for (const k of Object.keys(lang.entries)) if (!seen.has(k)) { lang.entries[k].orphan = true; orphans++; }
  saveLang(langFile, lang);
  const total = seen.size, done = [...seen].filter(k => lang.entries[k].en).length;
  console.log(`Textos únicos traduzíveis : ${total}`);
  console.log(`Novos nesta varredura     : ${added}`);
  console.log(`Já traduzidos             : ${done}`);
  console.log(`Órfãos (texto editado/removido no jogo): ${orphans}`);
  console.log(`Fora da tradução (usados como chave de lógica): ${sc.excluded.size} textos`);
  console.log(`Handlers inline com texto PT (onclick="..."): ${sc.inlineHandlers} (não automáticos)`);
  sc.warnings.forEach(w => console.log('AVISO:', w));
  const rep = path.join(path.dirname(langFile), '_excluded_logic.json');
  fs.writeFileSync(rep, JSON.stringify([...sc.excluded].map(([t, n]) => ({ text: t, occurrences: n })), null, 1));
  console.log(`Relatório de exclusões     : ${rep}`);
}

// ───────────────────────── status ─────────────────────────
function cmdStatus(gameFile, langFile) {
  const html = fs.readFileSync(gameFile, 'utf8');
  const sc = scan(html), lang = loadLang(langFile);
  const byCtx = {};
  const live = new Set(sc.units.filter(u => !u.skip).map(u => u.key));
  for (const k of live) {
    const e = lang.entries[k]; const c = (e && e.ctx) || '?';
    byCtx[c] = byCtx[c] || { total: 0, done: 0, chars: 0 };
    byCtx[c].total++; if (e && e.en) byCtx[c].done++; else byCtx[c].chars += (e ? e.pt.length : 0);
  }
  console.log('contexto'.padEnd(34), 'feito/total', ' chars pendentes');
  for (const [c, v] of Object.entries(byCtx).sort((a, b) => b[1].total - a[1].total))
    console.log(c.padEnd(34), `${v.done}/${v.total}`.padEnd(11), String(v.chars).padStart(10));
  const done = [...live].filter(k => lang.entries[k] && lang.entries[k].en).length;
  console.log(`\nTOTAL ${done}/${live.size} (${(100 * done / Math.max(1, live.size)).toFixed(1)}%)`);
  const fresh = [...live].filter(k => !lang.entries[k]).length;
  if (fresh) console.log(`ATENÇÃO: ${fresh} textos novos no jogo ainda não extraídos — rode "extract".`);
}


// ───────────────────────── wrap ─────────────────────────
// Marca, no próprio jogo em português, cada texto traduzível com __t('...') / __T`...`
// e injeta o carregador de idioma no <head>. Em português o jogo continua idêntico.
const LOADER_TPL = () => fs.readFileSync(path.join(__dirname, 'i18n-loader.js'), 'utf8');
function loaderScript(version, size) {
  return LOADER_TPL().replace('__I18N_VERSION__', version || 'dev').replace('__I18N_SIZE__', String(size || 0))
    .replace('__I18N_DENY__', JSON.stringify(Object.fromEntries([...DENY_FIELDS].map(f => [f, 1]))));
}
function injectLoader(html, version, size) {
  const tag = `<script id="i18n-loader">\n${loaderScript(version, size)}</script>`;
  const re = /<script id="i18n-loader">\n\/\* i18n-loader[\s\S]*?<\/script>/;
  if (re.test(html)) return html.replace(re, () => tag);
  const m = /<meta[^>]*charset[^>]*>/i.exec(html) || /<head[^>]*>/i.exec(html);
  if (!m) throw new Error('não achei <head> para injetar o carregador');
  const at = m.index + m[0].length;
  return html.slice(0, at) + '\n' + tag + '\n' + html.slice(at);
}
function checkJs(html) {
  const errs = [];
  for (const seg of splitHtml(html)) {
    if (seg.kind !== 'js') continue;
    try { acorn.parse(html.slice(seg.start, seg.end), { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true }); }
    catch (e) { errs.push(`offset ${seg.start}: ${e.message.split('\n')[0]}`); }
  }
  return errs;
}
function cmdWrap(gameFile, outFile) {
  const html = fs.readFileSync(gameFile, 'utf8');
  const before = new Set(checkJs(html));
  const sc = scan(html);
  const ins = [];
  const word = (i) => i > 0 && /[\w$]/.test(html[i - 1]);
  let nLit = 0, nTpl = 0, already = 0;
  for (const u of sc.units) {
    if (u.kind !== 'js' || u.skip) continue;
    if (u.wrapped) { already++; continue; }
    if (u.node === 'lit') { ins.push([u.start, (word(u.start) ? ' ' : '') + '__t(']); ins.push([u.end, ')']); nLit++; }
    else { ins.push([u.start, (word(u.start) ? ' ' : '') + '__T']); nTpl++; }
  }
  ins.sort((a, b) => a[0] - b[0] || (a[1] === ')' ? -1 : b[1] === ')' ? 1 : 0));
  const parts = []; let cur = 0;
  for (const [pos, txt] of ins) { parts.push(html.slice(cur, pos), txt); cur = pos; }
  parts.push(html.slice(cur));
  let out = parts.join('');
  const prev = /<script id="i18n-loader">\n\/\* i18n-loader[\s\S]*?var V = "([^"]*)"/.exec(out);
  out = injectLoader(out, prev ? prev[1] : 'dev', 0);
  const errs = checkJs(out).filter(e => !before.has(e));
  if (errs.length) { fs.writeFileSync((outFile || gameFile) + '.invalid', out); console.log('ERRO: o código ficaria inválido — nada foi gravado.'); errs.slice(0, 10).forEach(e => console.log('  ', e)); process.exitCode = 1; return; }
  fs.writeFileSync(outFile || gameFile, out);
  console.log(`Marcados agora: ${nLit} textos __t('…') + ${nTpl} templates __T\`…\` (já marcados antes: ${already})`);
  console.log(`Gravado: ${outFile || gameFile}`);
}

// ───────────────────────── export ─────────────────────────
// Gera o dicionário enxuto que vai para o deploy (lang/en.json) e grava a versão no jogo.
const decodeEnt = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|middot|mdash|ndash|hellip|rarr|larr);/gi, (m, e) => {
  const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', mdash: '—', ndash: '–', hellip: '…', rarr: '→', larr: '←' };
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return map[e.toLowerCase()] || m;
});
function cmdExport(langFile, outJson, gameFile) {
  const lang = loadLang(langFile);
  const t = {};
  let n = 0;
  for (const e of Object.values(lang.entries)) {
    if (e.orphan || !e.en || e.en === e.pt) continue;
    t[e.pt] = e.en; n++;
    if ((e.ctx === 'html' || e.ctx === 'html-attr') && /&[#a-z0-9]+;/i.test(e.pt)) t[decodeEnt(e.pt)] = decodeEnt(e.en);
  }
  const body = JSON.stringify(t);
  const v = crypto.createHash('sha1').update(body).digest('hex').slice(0, 10);
  const json = `window.__I18N_DATA={"v":"${v}","t":${body}};\n`;
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, json);
  const size = Buffer.byteLength(json);
  console.log(`Dicionário: ${outJson} — ${n} textos, ${(size / 1048576).toFixed(2)} MB, versão ${v}`);
  if (gameFile) {
    const html = fs.readFileSync(gameFile, 'utf8');
    fs.writeFileSync(gameFile, injectLoader(html, v, size));
    console.log(`Versão gravada no carregador do jogo: ${gameFile}`);
  }
}

// ───────────────────────── build ─────────────────────────
const escJsString = (s) => JSON.stringify(s).replace(/<\/(script)/gi, '<\\/$1').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const escTplText = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/<\/(script)/gi, '<\\/$1');
const escHtmlText = (s) => s.replace(/<\/(script)/gi, '<\\/$1');

function cmdBuild(gameFile, langFile, outFile, code) {
  code = code || path.basename(langFile, '.json');
  const html = fs.readFileSync(gameFile, 'utf8');
  const sc = scan(html), lang = loadLang(langFile);
  const warnings = [...sc.warnings];
  let applied = 0;
  const tr = (u) => {
    if (u.skip || !u.key) return null;
    const e = lang.entries[u.key];
    if (!e || !e.en || e.en === u.text) return null;
    return e.en;
  };

  // ---- JS / HTML (substituição por posição, com aninhamento) ----
  const posUnits = sc.units.filter(u => u.kind === 'js' || u.kind === 'html').sort((a, b) => a.start - b.start || b.end - a.end);
  function applyRange(src, start, end, list) {
    let out = '', cur = start, i = 0;
    while (i < list.length) {
      const u = list[i];
      if (u.start < cur) { i++; continue; }
      if (u.start >= end) break;
      out += src.slice(cur, u.start);
      // filhos = unidades totalmente contidas em u
      let j = i + 1; const kids = [];
      while (j < list.length && list[j].end <= u.end) { kids.push(list[j]); j++; }
      out += renderUnit(src, u, kids);
      cur = u.end; i = j;
    }
    return out + src.slice(cur, end);
  }
  function renderUnit(src, u, kids) {
    const t = tr(u);
    if (u.kind === 'html') { if (t == null) return src.slice(u.start, u.end); applied++; return escHtmlText(t); }
    if (u.node === 'lit') { if (t == null) return src.slice(u.start, u.end); applied++; return escJsString(t); }
    // template literal
    const exprSrc = u.exprs.map(ex => applyRange(src, ex.start, ex.end, kids.filter(k => k.start >= ex.start && k.end <= ex.end)));
    if (t != null) {
      const need = u.exprs.map((_, i) => `{{${i}}}`), have = (t.match(/\{\{\d+\}\}/g) || []).sort(), want = need.slice().sort();
      if (JSON.stringify(have) === JSON.stringify(want)) {
        applied++;
        return '`' + t.split(/(\{\{\d+\}\})/).map(p => { const m = /^\{\{(\d+)\}\}$/.exec(p); return m ? '${' + exprSrc[+m[1]] + '}' : escTplText(p); }).join('') + '`';
      }
      warnings.push(`template com marcadores {{n}} inconsistentes, mantido em PT: "${u.text.slice(0, 60)}"`);
    }
    // sem tradução (ou inválida): mantém original, mas processa filhos
    let out = '', cur = u.start;
    u.exprs.forEach((ex, i) => { out += src.slice(cur, ex.start) + exprSrc[i]; cur = ex.end; });
    return out + src.slice(cur, u.end);
  }

  // ---- JSON ----
  const jsonUnits = {};
  for (const u of sc.units) if (u.kind === 'json') (jsonUnits[u.block] = jsonUnits[u.block] || []).push(u);
  const jsonRepl = new Map(); // seg.start -> novo texto
  for (const seg of sc.segs.filter(s => s.kind === 'json')) {
    const list = (jsonUnits[seg.id] || []).filter(u => tr(u) != null);
    if (!list.length) continue;
    const obj = JSON.parse(html.slice(seg.start, seg.end));
    for (const u of list) {
      let o = obj; for (let i = 0; i < u.path.length - 1; i++) o = o[u.path[i]];
      o[u.path[u.path.length - 1]] = tr(u); applied++;
    }
    jsonRepl.set(seg.start, JSON.stringify(obj).replace(/<\/(script)/gi, '<\\/$1'));
  }

  // ---- monta o arquivo final ----
  let result = '', cur = 0;
  for (const seg of sc.segs) {
    result += html.slice(cur, seg.start); cur = seg.start;
    if (seg.kind === 'json' && jsonRepl.has(seg.start)) result += jsonRepl.get(seg.start);
    else if (seg.kind === 'json' || seg.kind === 'style') result += html.slice(seg.start, seg.end);
    else result += applyRange(html, seg.start, seg.end, posUnits.filter(u => u.start >= seg.start && u.end <= seg.end));
    cur = seg.end;
  }
  result += html.slice(cur);
  result = result.replace(/<html lang="[^"]*"/i, `<html lang="${code}"`);

  // ---- verificação: o jogo gerado continua sendo JS/JSON válido? ----
  let bad = 0;
  for (const seg of splitHtml(result)) {
    if (seg.kind === 'js') { try { acorn.parse(result.slice(seg.start, seg.end), { ecmaVersion: 'latest', allowReturnOutsideFunction: true }); } catch (e) { bad++; warnings.push('ERRO DE SINTAXE no jogo gerado: ' + e.message); } }
    if (seg.kind === 'json') { try { JSON.parse(result.slice(seg.start, seg.end)); } catch (e) { bad++; warnings.push(`JSON ${seg.id} inválido no jogo gerado`); } }
  }
  fs.writeFileSync(outFile, result);
  console.log(`Gerado: ${outFile}  (${(result.length / 1e6).toFixed(2)} MB)`);
  console.log(`Textos traduzidos aplicados: ${applied}`);
  warnings.slice(0, 20).forEach(w => console.log('AVISO:', w));
  if (bad) { console.error(`\n${bad} bloco(s) inválido(s) — NÃO publique este arquivo.`); process.exit(2); }
}

// ───────────────────────── CLI ─────────────────────────
const [cmd, a, b, c, d] = process.argv.slice(2);
if (cmd === 'extract' && a && b) cmdExtract(a, b);
else if (cmd === 'wrap' && a) cmdWrap(a, b);
else if (cmd === 'export' && a && b) cmdExport(a, b, c);
else if (cmd === 'status' && a && b) cmdStatus(a, b);
else if (cmd === 'build' && a && b && c) cmdBuild(a, b, c, d);
else { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n/, '').replace(/^\/\*\*?/, '')); process.exit(cmd ? 1 : 0); }
