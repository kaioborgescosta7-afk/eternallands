/**
 * ================================================================
 * badge-catalog.js
 * Catálogo centralizado de todos os badges de status do jogo
 * ================================================================
 *
 * FONTE ÚNICA DE VERDADE para ícones, rótulos, cores e metadados
 * de todos os badges exibidos no combate e na interface.
 *
 * ── Como adicionar um novo badge ────────────────────────────────
 *  1. Adicione uma entrada em BADGE_CATALOG.entries (abaixo).
 *  2. Se o badge deve aparecer no painel de inimigo/herói via
 *     status-effect-badges.js, defina system: "effect_meta".
 *     A função syncEffectMeta() reconstrói window.EFFECT_META
 *     a partir deste catálogo — não edite EFFECT_META diretamente.
 *  3. Se o badge usa STATUS_EFFECT_DEFS (painel legado #bstatus),
 *     adicione também a entrada correspondente lá, referenciando
 *     o id deste catálogo.
 *
 * ── Campos obrigatórios ─────────────────────────────────────────
 *  id      {string}  — chave interna única (snake_case)
 *  icon    {string}  — emoji exibido no badge
 *  label   {string}  — nome legível PT-BR
 *  kind    {string}  — "buff" | "debuff" | "ui"
 *  color   {string}  — cor da borda/texto (hex)
 *  source  {string}  — onde é exibido:
 *                       "hero"  → painel do herói
 *                       "enemy" → acima do inimigo
 *                       "both"  → ambos
 *                       "ui"    → interface (não combate)
 *  system  {string}  — origem da implementação:
 *                       "effect_meta"        → EFFECT_META (status-effect-badges.js)
 *                       "status_effect_defs" → STATUS_EFFECT_DEFS (ui-systems-shared-core-js)
 *                       "legacy_collect"     → injetado via collectHeroLegacyBadges /
 *                                              collectEnemyLegacyBadges
 *                       "catalog_only"       → declarado aqui; sem implementação confirmada
 *
 * ── Campos opcionais ────────────────────────────────────────────
 *  notes   {string}  — observações / referências de variáveis
 *  alias   {string}  — id canônico quando esta entrada é um alias
 * ================================================================
 */

(function (root) {
  "use strict";

  /* ─────────────────────────────────────────────────────────────
   * ENTRADAS DO CATÁLOGO
   * ───────────────────────────────────────────────────────────── */
  var entries = [

    /* ════════════════════════════════════════════════════════════
     * 1. DEBUFFS — Dano / DoT
     * ════════════════════════════════════════════════════════════ */
    {
      id: "bleed",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_bleed.png",
      icon: "🩸", label: "Hemorragia",
      kind: "debuff", color: "#ff5050",
      source: "both", system: "effect_meta",
      notes: "5% HP-máx/turno, ignora DEF. Empilhável. " +
             "Inimigo: statusFx.bleed.stacks[]. Herói: h._bleedTurnsLeft."
    },
    {
      id: "burn",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_burn.png",
      icon: "🔥", label: "Queimadura",
      kind: "debuff", color: "#ff8800",
      source: "both", system: "effect_meta",
      notes: "40-80 dano fixo/turno, empilhável, sinergia Mago de Fogo. " +
             "Inimigo: statusFx.burn.stacks[]. Herói: h._burnStacks[]."
    },
    {
      id: "poison",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_poison.png",
      icon: "☠️", label: "Envenenado",
      kind: "debuff", color: "#9ccc65",
      source: "both", system: "effect_meta"
    },
    {
      id: "dark_dot",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/dark_dot.png",
      icon: "🌑", label: "DoT das Trevas",
      kind: "debuff", color: "#a080ff",
      source: "both", system: "effect_meta"
    },
    {
      id: "holy_dot",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_holy_dot.png",
      icon: "☀️", label: "Dano Sagrado",
      kind: "debuff", color: "#ffe080",
      source: "both", system: "effect_meta"
    },
    {
      id: "acid",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_acid.png",
      icon: "🧪", label: "Ácido",
      kind: "debuff", color: "#a0e000",
      source: "both", system: "effect_meta"
    },

    /* ════════════════════════════════════════════════════════════
     * 2. DEBUFFS — Controle de Cena (CC)
     * ════════════════════════════════════════════════════════════ */
    {
      id: "stun",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_stun.png",
      icon: "💫", label: "Atordoado",
      kind: "debuff", color: "#ffd060",
      source: "both", system: "effect_meta",
      notes: "Perde turno (hardCC). " +
             "Inimigo: statusFx.stun / statusEffects.ccs.stun."
    },
    {
      id: "silence",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_silence.png",
      icon: "🤐", label: "Silêncio",
      kind: "debuff", color: "#b080ff",
      source: "both", system: "effect_meta",
      notes: "Bloqueia magias (blocksMagic). " +
             "Herói: heroSilenceTurnsLeft(h) || h._silenceTurns."
    },
    {
      id: "slow",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_slow.png",
      icon: "🐌", label: "Lentidão",
      kind: "debuff", color: "#40e0e0",
      source: "both", system: "effect_meta",
      notes: "Reduz evasão 80%, até ser purgado. " +
             "Inimigo: statusFx.slow / statusEffects.ccs.slow."
    },
    {
      id: "root",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_root.png",
      icon: "🌿", label: "Enraizado",
      kind: "debuff", color: "#60c060",
      source: "both", system: "effect_meta",
      notes: "Bloqueia skills, evasão zero. " +
             "Inimigo: statusFx.root / statusFx.rooted / statusEffects.ccs.root."
    },
    {
      id: "freeze",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_freeze.png",
      icon: "❄️", label: "Congelado",
      kind: "debuff", color: "#60a0ff",
      source: "both", system: "effect_meta",
      notes: "Inimigo: statusEffects.ccs.freeze. " +
             "Excluído explicitamente do collectStatusFxBadges; tratado via collectEnemyLegacyBadges."
    },

    /* ════════════════════════════════════════════════════════════
     * 3. DEBUFFS — Redução de Atributos
     * ════════════════════════════════════════════════════════════ */
    {
      id: "vulnerability",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_vulnerability.png",
      icon: "💔", label: "Vulnerável",
      kind: "debuff", color: "#ff6090",
      source: "both", system: "effect_meta",
      notes: "+20-40% dano recebido."
    },
    {
      id: "weaken",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_weaken.png",
      icon: "📉", label: "Enfraquecido",
      kind: "debuff", color: "#ff9060",
      source: "both", system: "effect_meta",
      notes: "Herói: h._weakenTurns / h._weakenPct."
    },
    {
      id: "defense_down",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_defense_down.png",
      icon: "🛡️", label: "Defesa Quebrada",
      kind: "debuff", color: "#ff7040",
      source: "both", system: "effect_meta",
      notes: "Inimigo: statusEffects.debuffs.armorBreak / e._corrosionStacks / stealDefApplied. " +
             "Herói: h._defenseDownTurns / h._defenseDownPct."
    },
    {
      id: "atk_down",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_atk_down.png",
      icon: "⚔️", label: "ATK Reduzido",
      kind: "debuff", color: "#ff9060",
      source: "both", system: "effect_meta",
      notes: "Inimigo: _trapAtkDownTurns / _profanoAtkDownT / _alchAtkDownT / G.buffs.enemyAtkDownT."
    },
    {
      id: "sor_down",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_sor_down.png",
      icon: "🔮", label: "SOR Reduzida",
      kind: "debuff", color: "#c090ff",
      source: "enemy", system: "effect_meta",
      notes: "Inimigo: e._profanoSorDownT."
    },
    {
      id: "des_down",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_des_down.png",
      icon: "🎯", label: "DES Reduzida",
      kind: "debuff", color: "#80b0ff",
      source: "enemy", system: "effect_meta",
      notes: "Inimigo: e._alchDesDownT."
    },
    {
      id: "fragility",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_fragility.png",
      icon: "🕳️", label: "Fragilidade das Trevas",
      kind: "debuff", color: "#d070ff",
      source: "enemy", system: "effect_meta",
      notes: "Inimigo: e._fragTrevasTurns."
    },
    {
      id: "dodge_down",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_dodge_down.png",
      icon: "💨", label: "Evasão Reduzida",
      kind: "debuff", color: "#80c0c0",
      source: "enemy", system: "effect_meta",
      notes: "Inimigo: e._r2BleedDodge / statusEffects.debuffs.dodge_down.turnsLeft."
    },
    {
      id: "heal_block",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_heal_block.png",
      icon: "🚫", label: "Cura Bloqueada",
      kind: "debuff", color: "#ff7080",
      source: "enemy", system: "effect_meta",
      notes: "Inimigo: e._profanoHealBlock / e._r2HealBlock."
    },

    /* ════════════════════════════════════════════════════════════
     * 4. DEBUFFS — Controle de Recursos / Furto
     * ════════════════════════════════════════════════════════════ */
    {
      id: "pilhado",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_pilhado.png",
      icon: "💰", label: "Pilhado",
      kind: "debuff", color: "#ffd700",
      source: "enemy", system: "effect_meta",
      notes: "Mercador. Sem exibição de turnos (turnsMarkup retorna vazio)."
    },
    {
      id: "roubado",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_roubado.png",
      icon: "💰", label: "Alvo roubado",
      kind: "debuff", color: "#ffcc66",
      source: "enemy", system: "effect_meta",
      notes: "Ladrão. Sem exibição de turnos."
    },

    /* ════════════════════════════════════════════════════════════
     * 5. DEBUFFS — Chefes (aplicados ao herói)
     * ════════════════════════════════════════════════════════════ */
    {
      id: "grito",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_grito.png",
      icon: "😱", label: "Grito",
      kind: "debuff", color: "#ff8080",
      source: "hero", system: "status_effect_defs",
      notes: "Chefe Dunmare. G.buffs.dunmareDebuffTurns."
    },
    {
      id: "corrosao",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_corrosao.png",
      icon: "💀", label: "Corrosão",
      kind: "debuff", color: "#b0b0b0",
      source: "hero", system: "status_effect_defs",
      notes: "Chefe Arkenfall. G.buffs.arkenfallDebuffTurns."
    },
    {
      id: "sangramento",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_sangramento.png",
      icon: "🩸", label: "Sangramento",
      kind: "debuff", color: "#ff4444",
      source: "hero", system: "status_effect_defs",
      notes: "Thornwall. G.buffs.thornwallBleedTurns. -4% HP/turno. " +
             "STATUS_EFFECTS.thornwall_bleed."
    },
    {
      id: "atordoado",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_atordoado.png",
      icon: "💫", label: "Atordoado",
      kind: "debuff", color: "#ffd060",
      source: "hero", system: "status_effect_defs",
      notes: "Thornwall. G.buffs.thornwallStunTurns. " +
             "STATUS_EFFECTS.thornwall_stun. Alias legado de stun para o herói."
    },

    /* ════════════════════════════════════════════════════════════
     * 6. DEBUFFS — Stacks de Inimigo (Sacerdote Profano / Alquimista)
     * ════════════════════════════════════════════════════════════ */
    {
      id: "vinculo_sombrio",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_vinculo_sombrio.png",
      icon: "💀", label: "Vínculo Sombrio",
      kind: "debuff", color: "#E24B4A",
      source: "enemy", system: "legacy_collect",
      notes: "Sacerdote Profano / Necromante. e._corrupcaoStacks (máx 5). " +
             "+8% dano das trevas por stack. " +
             "Renderizado como skull-tracker com vs-pip. " +
             "renderEnemyStackCounterHtml / vinculoSombrioBadgeHtml."
    },
    {
      id: "reacao_quimica",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_reacao_quimica.png",
      icon: "⚗️", label: "Reação Química",
      kind: "debuff", color: "#FAC775",
      source: "enemy", system: "legacy_collect",
      notes: "Alquimista. e._reacaoStacks (máx 5). " +
             "+10% dano químico por stack. reacaoQuimicaBadgeHtml."
    },
    {
      id: "vulnerabilidade_quimica",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_vulnerabilidade_quimica.png",
      icon: "☣️", label: "Vulnerabilidade Química",
      kind: "debuff", color: "#FAC775",
      source: "enemy", system: "legacy_collect",
      notes: "Alquimista. e._vulnQuimTurns / e._vulnQuimPct. " +
             "+20% (Nv.1-6) ou +35% (Nv.7) dano químico. vulnQuimicaBadgeHtml."
    },

    /* ════════════════════════════════════════════════════════════
     * 7. BUFFS — Proteção / Defesa
     * ════════════════════════════════════════════════════════════ */
    {
      id: "thorns",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_thorns.png",
      icon: "🪞", label: "Reflexo",
      kind: "buff", color: "#7ac8ff",
      source: "both", system: "effect_meta",
      notes: "Reflete 40% dano (físico). STATUS_EFFECTS.thorns."
    },
    {
      id: "immunity",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_immunity.png",
      icon: "✨", label: "Imunidade",
      kind: "buff", color: "#ffe080",
      source: "both", system: "effect_meta",
      notes: "Bloqueia próximo debuff (consumedOnBlock). STATUS_EFFECTS.immunity."
    },
    {
      id: "shield_stance",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_shield_stance.png",
      icon: "🛡️", label: "Postura",
      kind: "buff", color: "#aaaaff",
      source: "hero", system: "effect_meta",
      notes: "Guerreiro. -60% dano físico (counter por golpe, não por turno). " +
             "G.buffs.shield. STATUS_EFFECTS.shield_stance. " +
             "Excluído do collectStatusFxBadges; tratado via collectHeroLegacyBadges."
    },
    {
      id: "escudo",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_escudo.png",
      icon: "🛡️", label: "Escudo",
      kind: "buff", color: "#aaaaff",
      source: "hero", system: "catalog_only",
      notes: "ID genérico da lista. Pode ser alias de shield_stance ou badge separado " +
             "(ex: escudo gerado pelo talento Banquete / Reserva Arcana). Verificar."
    },
    {
      id: "defend",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_defend.png",
      icon: "🛡️", label: "Defesa",
      kind: "buff", color: "#a9d4ff",
      source: "hero", system: "effect_meta",
      notes: "Guerreiro. +10% DEF, 2 turnos. G.buffs.defendTurns. STATUS_EFFECTS.defend."
    },
    {
      id: "casca",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_casca.png",
      icon: "🐢", label: "Casca",
      kind: "buff", color: "#9ad06a",
      source: "hero", system: "effect_meta",
      detail: function () {
        var p = (typeof G !== "undefined" && G && G.buffs && G.buffs.cascaReflectPct) || 0;
        return p ? " (reflete " + Math.round(p * 100) + "%)" : "";
      },
      notes: "Druida. Reflete % do dano (cascaReflectPct). " +
             "G.buffs.cascaTurns / G.buffs.cascaReflectPct."
    },
    {
      id: "couraca",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_couraca.png",
      icon: "🛡️", label: "Couraça",
      kind: "buff", color: "#8ab4ff",
      source: "hero", system: "effect_meta",
      detail: function () {
        var p = (typeof G !== "undefined" && G && G.buffs && G.buffs.couracaDefPct) || 0;
        return p ? " (+" + Math.round(p * 100) + "% DEF)" : "";
      },
      notes: "+% DEF variável. G.buffs.couracaTurns / G.buffs.couracaDefPct. " +
             "STATUS_EFFECTS.couraca."
    },
    {
      id: "egide_hp",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_egide_hp.png",
      icon: "✨", label: "Égide Sagrada",
      kind: "buff", color: "#ffe080",
      source: "hero", system: "effect_meta",
      notes: "Sacerdote. Exibe HP do escudo (não turnos). G.buffs.egideHp."
    },
    {
      id: "intervencao_hits",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_intervencao_hits.png",
      icon: "🛡️", label: "Intervenção",
      kind: "buff", color: "#a9d4ff",
      source: "hero", system: "effect_meta",
      notes: "Sacerdote. Absorve próximos golpes (counter por golpe). " +
             "G.buffs.intervencaoHits / intervencaoReflect. " +
             "STATUS_EFFECTS.intervencao_hits."
    },
    {
      id: "postura_ferro_reflect",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_postura_ferro_reflect.png",
      icon: "🪞", label: "Reflexo de Ferro",
      kind: "buff", color: "#9ec5ff",
      source: "hero", system: "effect_meta",
      notes: "Guerreiro. Counter por golpe. G.buffs.posturaFerroReflect."
    },
    {
      id: "cofre_blindado",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_cofre_blindado.png",
      icon: "🔒", label: "Cofre Blindado",
      kind: "buff", color: "#8ab4ff",
      source: "hero", system: "effect_meta",
      notes: "Mercador. Proteção contra efeitos de furto."
    },

    /* ════════════════════════════════════════════════════════════
     * 8. BUFFS — Ataque / Dano
     * ════════════════════════════════════════════════════════════ */
    {
      id: "berserker_atk",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_berserker_atk.png",
      icon: "🔥", label: "Berserker — ATK",
      kind: "buff", color: "#ffaf6e",
      source: "hero", system: "effect_meta",
      notes: "Talento Berserker (cb_berserker). Ativo abaixo de 25% HP: +35% ATK. " +
             "G.buffs.berserkerAtkTurns / berserkerAtkPct. STATUS_EFFECTS.berserker_atk."
    },
    {
      id: "berserker_def",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_berserker_def.png",
      icon: "🔥", label: "Berserker — DEF",
      kind: "debuff", color: "#ffaf6e",
      source: "hero", system: "effect_meta",
      notes: "Contrapartida do Berserker: -DEF%. " +
             "G.buffs.berserkerDefTurns. STATUS_EFFECTS.berserker_def."
    },
    {
      id: "berserker",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_beserker.png",
      icon: "🔥", label: "Berserker",
      kind: "buff", color: "#ffaf6e",
      source: "hero", system: "status_effect_defs",
      notes: "Alias legado de berserker_atk em STATUS_EFFECT_DEFS. " +
             "Exibe o bônus de ATK unificado."
    },
    {
      id: "atk_mod",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_atk_mod.png",
      icon: "📯", label: "Bônus de ATK",
      kind: "buff", color: "#ffd080",
      source: "hero", system: "effect_meta",
      notes: "Modificador temporário genérico de ATK. " +
             "G.buffs.atkUp / atkUpT. STATUS_EFFECTS.atk_mod."
    },
    {
      id: "supremacia_atk",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_supremacia_atk.png",
      icon: "👑", label: "Supremacia",
      kind: "buff", color: "#ffd35a",
      source: "hero", system: "effect_meta",
      notes: "Arqueiro. Armed: +25% ATK enquanto ativo. " +
             "G.buffs.supremaciaAtk. STATUS_EFFECTS.supremacia_atk."
    },
    {
      id: "kill_will",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_kill_will.png",
      icon: "💢", label: "Vontade de Matar",
      kind: "buff", color: "#ff7070",
      source: "hero", system: "legacy_collect",
      notes: "G.killWillPending / G.killWillTurns."
    },
    {
      id: "moeda_crit",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_moeda_crit.png",
      icon: "⚔️", label: "Crítico Garantido",
      kind: "buff", color: "#ffcc00",
      source: "hero", system: "effect_meta",
      notes: "Mercador — resultado Cara da Moeda da Sorte. " +
             "G.buffs.moedaTurns / G.dancaLaminasReady."
    },
    {
      id: "moeda_def",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_moeda_def.png",
      icon: "🛡️", label: "Guarda da Moeda",
      kind: "buff", color: "#ffcc00",
      source: "hero", system: "effect_meta",
      notes: "Mercador — resultado Coroa da Moeda da Sorte. G.buffs.moedaDef."
    },
    {
      id: "critico_garantido",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_critico_garantido.png",
      icon: "🗡️", label: "Crítico Garantido",
      kind: "buff", color: "#ffd700",
      source: "hero", system: "status_effect_defs",
      notes: "Badge legado unificado (STATUS_EFFECT_DEFS). Ativo quando: " +
             "G.dancaLaminasReady || G.buffs.falcaoGuaranteedCrit || " +
             "G.buffs.fantasmaGuaranteedCrit || G.assassinCritStreak > 0."
    },
    {
      id: "blood_follow",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_blood_follow.png",
      icon: "🩸", label: "Vida Roubada",
      kind: "buff", color: "#ff9c9c",
      source: "hero", system: "legacy_collect",
      notes: "G.bloodFollowHits (contagem de golpes com dreno)."
    },

    /* ════════════════════════════════════════════════════════════
     * 9. BUFFS — Reflexo / Contra-ataque
     * ════════════════════════════════════════════════════════════ */
    {
      id: "reflexos",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_reflexos.png",
      icon: "⚡", label: "Reflexos",
      kind: "buff", color: "#ffe080",
      source: "hero", system: "effect_meta",
      notes: "Guerreiro. Contra-ataque (reflexosChance)%. " +
             "G.buffs.reflexosTurns / reflexosChance. STATUS_EFFECTS.reflexos."
    },
    {
      id: "ult_thorns",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_ult_thorns.png",
      icon: "🪞", label: "Contrato Blindado",
      kind: "buff", color: "#7ac8ff",
      source: "hero", system: "effect_meta",
      notes: "Ultimate do Mercador. G.buffs.ultThornsTurns / ultThornsPct."
    },

    /* ════════════════════════════════════════════════════════════
     * 10. BUFFS — Cura / Regeneração
     * ════════════════════════════════════════════════════════════ */
    {
      id: "regeneration",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_regeneration.png",
      icon: "🌱", label: "Regeneração",
      kind: "buff", color: "#80ff90",
      source: "both", system: "effect_meta",
      notes: "5-10% HP/turno, 4-5 turnos. STATUS_EFFECTS.regeneration."
    },
    {
      id: "rejuv_hot",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_rejuv_hot.png",
      icon: "💧", label: "Rejuvenescer",
      kind: "buff", color: "#80ffb0",
      source: "hero", system: "effect_meta",
      notes: "Druida. HoT. G.buffs.rejuvHotTurns / rejuvHotAmt."
    },
    {
      id: "ult_regen",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_ult_regen.png",
      icon: "🌿", label: "Bênção da Floresta",
      kind: "buff", color: "#80ff90",
      source: "hero", system: "effect_meta",
      notes: "Ultimate do Druida. G.buffs.ultRegenTurns / ultRegenPct."
    },
    {
      id: "sangue",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_sangue.png",
      icon: "🩸", label: "Sangue por Sangue",
      kind: "buff", color: "#ff9c9c",
      source: "hero", system: "effect_meta",
      notes: "Guerreiro. Dreno de vida em golpes. G.buffs.sangueTurns."
    },
    {
      id: "purificado",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_purificado.png",
      icon: "🧼", label: "Purificado",
      kind: "buff", color: "#88ffff",
      source: "hero", system: "status_effect_defs",
      notes: "Remove debuffs. G.buffs.purificadoTurns."
    },
    {
      id: "bencao_guardiao",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_bencao_guardiao.png",
      icon: "🛡️", label: "Bênção do Guardião",
      kind: "buff", color: "#ffe080",
      source: "hero", system: "effect_meta",
      notes: "Sacerdote."
    },
    {
      id: "ultimo_suspiro",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_ultimo_suspiro.png",
      icon: "👼", label: "Último Suspiro",
      kind: "buff", color: "#ffd080",
      source: "hero", system: "status_effect_defs",
      notes: "Talento re_suspiro. Exibido como 'já usado'. " +
             "G.ultimoSuspiroUsado === true."
    },

    /* ════════════════════════════════════════════════════════════
     * 11. BUFFS — Evasão / Mobilidade
     * ════════════════════════════════════════════════════════════ */
    {
      id: "smoke_bomb",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_smoke_bomb.png",
      icon: "💨", label: "Fumaça evasiva",
      kind: "buff", color: "#9ec5d8",
      source: "hero", system: "effect_meta",
      notes: "Ladrão. +70% evasão, 2 turnos. G.buffs.smokeBombTurns. " +
             "STATUS_EFFECTS.smoke_bomb."
    },
    {
      id: "fumaca",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_fumaca.png",
      icon: "💨", label: "Fumaça",
      kind: "buff", color: "#9ec5d8",
      source: "hero", system: "status_effect_defs",
      alias: "smoke_bomb",
      notes: "Alias legado de smoke_bomb em STATUS_EFFECT_DEFS. " +
             "Também usado como enemyDebuffKey em classe-ladrao-js."
    },
    {
      id: "passo_fantasma",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_passo_fantasma.png",
      icon: "👻", label: "Passo Fantasma",
      kind: "buff", color: "#c4a7ff",
      source: "hero", system: "effect_meta",
      notes: "Ladrão. Esquiva total. G.buffs.fantasmaTurns."
    },
    {
      id: "falcao",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_falcao.png",
      icon: "🦅", label: "Falcão",
      kind: "buff", color: "#a8d8ff",
      source: "hero", system: "effect_meta",
      notes: "Arqueiro. +% chance de crítico variável por nível. G.buffs.falcaoTurns."
    },

    /* ════════════════════════════════════════════════════════════
     * 12. BUFFS — Classe / Sinergias
     * ════════════════════════════════════════════════════════════ */
    {
      id: "matilha",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_matilha.png",
      icon: "🐺", label: "Fúria da Matilha",
      kind: "buff", color: "#c7a0ff",
      source: "hero", system: "effect_meta",
      notes: "Druida. Lobos ativos no campo. G.buffs.matilhaTurns."
    },
    {
      id: "frenesi",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_frenesi.png",
      icon: "🐺", label: "Frenesi",
      kind: "buff", color: "#c7a0ff",
      source: "hero", system: "legacy_collect",
      notes: "Talento cb_frenesi. Stacks acumulados por abate (máx 5). " +
             "G.buffs.frenesiTurns / getFrenesiStacks() / getFrenesiAtkBonus(). " +
             "Injetado em collectHeroLegacyBadges."
    },
    {
      id: "veu_sombras",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_veu_sombras.png",
      icon: "🌑", label: "Véu das Sombras",
      kind: "buff", color: "#a080ff",
      source: "both", system: "effect_meta",
      notes: "Inimigo: e.veuTurns. Herói: G.buffs.veuSombrasTurns. " +
             "STATUS_EFFECTS.veu_sombras."
    },
    {
      id: "veu",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_veu.png",
      icon: "🌑", label: "Véu",
      kind: "buff", color: "#a080ff",
      source: "hero", system: "status_effect_defs",
      alias: "veu_sombras",
      notes: "Alias legado de veu_sombras em STATUS_EFFECT_DEFS."
    },
    {
      id: "elixir",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_elixir.png",
      icon: "✨", label: "Elixir",
      kind: "buff", color: "#ffd0f0",
      source: "hero", system: "effect_meta",
      detail: function () {
        var p = (typeof G !== "undefined" && G && G.buffs && G.buffs.elixirDmgReducePct) || .15;
        return " (-" + Math.round(p * 100) + "% dano)";
      },
      notes: "Alquimista. -15% dano recebido. G.buffs.elixirTurns / elixirDmgReducePct. " +
             "STATUS_EFFECTS.elixir."
    },
    {
      id: "amplificacao",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_amplificacao.png",
      icon: "🔮", label: "Amplificação",
      kind: "buff", color: "#b894ff",
      source: "hero", system: "status_effect_defs",
      alias: "spell_amp_ready",
      notes: "Alias legado de spell_amp_ready em STATUS_EFFECT_DEFS. G.buffs.spellAmpReady (bool)."
    },
    {
      id: "spell_amp_ready",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_spell_amp_ready.png",
      icon: "🔮", label: "Amplificação pronta",
      kind: "buff", color: "#b894ff",
      source: "hero", system: "effect_meta",
      notes: "Armed: próxima magia recebe bônus de dano. " +
             "G.buffs.spellAmpReady. STATUS_EFFECTS.spell_amp_ready."
    },
    {
      id: "trap_bleed_armed",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_trap_bleed_armed.png",
      icon: "🪤", label: "Armadilha preparada",
      kind: "buff", color: "#e3b27a",
      source: "hero", system: "effect_meta",
      notes: "Ladrão. Armed: próximo golpe no inimigo (com ATK reduzido) " +
             "dispara hemorragia. G.buffs.trapBleedArmed. STATUS_EFFECTS.trap_bleed_armed."
    },
    {
      id: "reabastecer_ready",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_reabastecer_ready.png",
      icon: "📦", label: "Reabastecer",
      kind: "buff", color: "#ffd080",
      source: "hero", system: "legacy_collect",
      notes: "Mercador. Próximo ataque ignora DEF. G.reabastecerIgnReady."
    },

    /* ════════════════════════════════════════════════════════════
     * 13. BUFFS — Stacks de Herói (Sacerdote Profano / Alquimista)
     * ════════════════════════════════════════════════════════════ */
    {
      id: "colheita",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_colheita.png",
      icon: "🖤", label: "Colheita",
      kind: "buff", color: "#E24B4A",
      source: "hero", system: "legacy_collect",
      notes: "Sacerdote Profano. G.buffs.colheitaCombo (máx 3). " +
             "Ao completar 3, próximo Pacto não custa HP. colheitaBadgeHtml."
    },
    {
      id: "pacto_vazio",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_pacto_vazio.png",
      icon: "🩻", label: "Pacto com o Vazio",
      kind: "buff", color: "#cc88ff",
      source: "hero", system: "legacy_collect",
      notes: "Sacerdote Profano. G.buffs.pactoVazioTurns (máx 4) / pactoVazioAccum. " +
             "Protege de golpe letal, devolve dano registrado ao expirar. " +
             "Renderizado como skull-tracker pv-pip. pactoVazioBadgeHtml."
    },
    {
      id: "catalisador",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_catalizador.png",
      icon: "⚗️", label: "Catalisador",
      kind: "buff", color: "#FAC775",
      source: "hero", system: "legacy_collect",
      notes: "Alquimista. G.buffs.catalisadorCombo (máx 3). " +
             "Ao completar 3, próxima skill química sai de graça. catalisadorBadgeHtml."
    },

    /* ════════════════════════════════════════════════════════════
     * 14. IDs SEM IMPLEMENTAÇÃO CONFIRMADA (catalog_only)
     *     Presentes na lista do usuário mas não encontrados
     *     em EFFECT_META, STATUS_EFFECT_DEFS, STATUS_EFFECTS
     *     nem nos collectores. Precisam de verificação.
     * ════════════════════════════════════════════════════════════ */
    {
      id: "sorte",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_sorte.png",
      icon: "🍀", label: "Sorte",
      kind: "buff", color: "#80ff80",
      source: "hero", system: "catalog_only",
      notes: "Não encontrado no código de badges. Possível badge futuro ou alias de " +
             "moeda_sorte (skill do Mercador). Verificar."
    },
    {
      id: "sabedoria",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_sabedoria.png",
      icon: "📖", label: "Sabedoria",
      kind: "buff", color: "#a0d0ff",
      source: "hero", system: "catalog_only",
      notes: "Não encontrado no código de badges. Verificar."
    },
    {
      id: "fortuna",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_fortuna.png",
      icon: "💫", label: "Fortuna",
      kind: "buff", color: "#ffd700",
      source: "hero", system: "catalog_only",
      notes: "Não encontrado no código de badges. Verificar."
    },
    {
      id: "coragem",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_coragem.png",
      icon: "🦁", label: "Coragem",
      kind: "buff", color: "#ffa040",
      source: "hero", system: "catalog_only",
      notes: "Não encontrado no código de badges. Verificar."
    },
    {
      id: "animo",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_animo.png",
      icon: "✨", label: "Ânimo",
      kind: "buff", color: "#ffe080",
      source: "hero", system: "catalog_only",
      notes: "Não encontrado no código de badges. Verificar."
    },

    /* ════════════════════════════════════════════════════════════
     * 15. BADGES DE INTERFACE (não são efeitos de combate)
     * ════════════════════════════════════════════════════════════ */
    {
      id: "cooldown",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_cooldown.png",
      icon: "⏳", label: "Cooldown",
      kind: "ui", color: "#808080",
      source: "ui", system: "catalog_only",
      notes: "Exibido sobre o ícone da skill no Painel de Combate. " +
             "Não é um efeito de status."
    },
    {
      id: "ranking_skill",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_ranking_skill.png",
      icon: "⭐", label: "Rank de Skill",
      kind: "ui", color: "#ffd700",
      source: "ui", system: "catalog_only",
      notes: "Badge de nível/rank da habilidade no painel de habilidades."
    },
    {
      id: "tutorial",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_tutorial.png",
      icon: "❓", label: "Tutorial",
      kind: "ui", color: "#80d0ff",
      source: "ui", system: "catalog_only",
      notes: "Indicador de tutorial ou dica de interface."
    },
    {
      id: "loja",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_loja.png",
      icon: "🛒", label: "Loja",
      kind: "ui", color: "#ffd080",
      source: "ui", system: "catalog_only",
      notes: "Ribbon de raridade em cards da loja (.loja-card-badge-ribbon)."
    },
    {
      id: "morto_vivo",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_morto_vivo.png",
      icon: "💀", label: "Morto-Vivo",
      kind: "ui", color: "#808080",
      source: "ui", system: "catalog_only",
      notes: "Tag de arquétipo de monstro (undead). Não é badge de combate."
    },
    {
      id: "guia_efeito",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_guia_efeito.png",
      icon: "📋", label: "Guia de Efeito",
      kind: "ui", color: "#a0c0ff",
      source: "ui", system: "catalog_only",
      notes: "Badge exibido no guia de efeitos de status " +
             "(renderDiscipuladorStatusFx / STATUSFX_GUIDE_ORDER)."
    },
    {
      id: "item_destaque",
      img:  "https://raw.githubusercontent.com/kaioborgescosta7-afk/eternallands/arhen/badge_item_destaque.png",
      icon: "✨", label: "Item em Destaque",
      kind: "ui", color: "#ffd700",
      source: "ui", system: "catalog_only",
      notes: "Badge de destaque de item em janelas de loja / inventário."
    }

  ]; /* fim de entries */

  /* ─────────────────────────────────────────────────────────────
   * API pública
   * ───────────────────────────────────────────────────────────── */

  /** Mapa rápido id → entrada (construído uma vez) */
  var _byId = {};
  entries.forEach(function (e) { if (e.id) _byId[e.id] = e; });

  /**
   * Retorna a entrada do catálogo para um id.
   * @param  {string} id
   * @return {object|null}
   */
  function get(id) {
    return _byId[id] || null;
  }

  /**
   * Lista entradas, opcionalmente filtradas por campo.
   * Exemplos:
   *   BADGE_CATALOG.list({ kind: "debuff" })
   *   BADGE_CATALOG.list({ source: "hero", system: "effect_meta" })
   * @param  {object} [filter]
   * @return {Array}
   */
  function list(filter) {
    if (!filter) return entries.slice();
    return entries.filter(function (e) {
      return Object.keys(filter).every(function (k) {
        return e[k] === filter[k];
      });
    });
  }

  /**
   * Reconstrói window.EFFECT_META a partir das entradas com
   * system "effect_meta" ou "legacy_collect".
   * Chame ao inicializar (antes de status-effect-badges.js) para
   * garantir que EFFECT_META reflita o catálogo.
   *
   * @return {object} O novo EFFECT_META
   */
  function syncEffectMeta() {
    var meta = {};
    entries.forEach(function (e) {
      if (e.system === "effect_meta" || e.system === "legacy_collect") {
        var m = {
          icon:  e.icon,
          label: e.label,
          kind:  e.kind,
          color: e.color
        };
        if (typeof e.detail === "function") m.detail = e.detail;
        meta[e.id] = m;
      }
    });
    try { root.EFFECT_META = meta; } catch (_) {}
    return meta;
  }

  /**
   * Retorna todos os IDs declarados no catálogo (útil para auditoria).
   * @param  {string} [system]  filtra por sistema (opcional)
   * @return {string[]}
   */
  function ids(system) {
    return entries
      .filter(function (e) { return !system || e.system === system; })
      .map(function (e) { return e.id; });
  }

  /**
   * Retorna o HTML do ícone de um badge: <img> apontando para o PNG
   * cadastrado (campo img), com fallback automático para o emoji
   * (campo icon) caso a imagem não exista ou falhe ao carregar.
   * Se o id não existir no catálogo ou não tiver "img", retorna
   * apenas o emoji (ou "" se o id for desconhecido).
   * @param  {string} id
   * @param  {number} [sizePx]  tamanho do ícone em px (padrão 14)
   * @return {string} HTML
   */
  function iconHtml(id, sizePx) {
    var e = get(id);
    if (!e) return "";
    if (!e.img) return e.icon || "";
    sizePx = sizePx || 14;
    var emojiAttr = String(e.icon || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return '<img src="' + e.img + '" alt="" ' +
      'style="width:' + sizePx + 'px;height:' + sizePx + 'px;object-fit:contain;vertical-align:middle;display:inline-block" ' +
      'data-fallback-emoji="' + emojiAttr + '" ' +
      'onerror="window.BADGE_CATALOG._imgFallback(this)">';
  }

  /** Chamado via onerror do <img> — troca a imagem quebrada pelo emoji. */
  function _imgFallback(imgEl) {
    try {
      var emoji = imgEl.getAttribute("data-fallback-emoji") || "❔";
      var span = document.createElement("span");
      span.textContent = emoji;
      imgEl.replaceWith ? imgEl.replaceWith(span) : imgEl.parentNode.replaceChild(span, imgEl);
    } catch (_) {}
  }

  /* Expõe no escopo global */
  root.BADGE_CATALOG = {
    entries:        entries,
    get:            get,
    list:           list,
    ids:            ids,
    syncEffectMeta: syncEffectMeta,
    iconHtml:       iconHtml,
    _imgFallback:   _imgFallback
  };

}(typeof window !== "undefined" ? window : this));
