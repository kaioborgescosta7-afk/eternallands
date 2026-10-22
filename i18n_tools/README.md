# Tradução do Crônicas de Arhen

Um jogo só. O jogador escolhe o idioma no botão **Language** da tela inicial, e a escolha fica salva.
Na primeira vez que o jogo abre, ele usa o idioma do aparelho: celular em português abre em português,
qualquer outro idioma abre em inglês.

## O que vai para onde

| Arquivo | Onde fica | Para quê |
|---|---|---|
| `ArhenChronicles.html` | deploy do Firebase (o jogo) | o jogo em português, com os textos marcados com `__t(...)` |
| `lang/en.js` | deploy do Firebase, **na mesma pasta do jogo** (`<pasta>/lang/en.js`) | o dicionário que o jogo baixa quando está em inglês |
| esta pasta `i18n_tools/` | GitHub | ferramentas + `lang/en.master.json` (todas as traduções, com o texto em português ao lado) |

**Sempre faça o deploy do jogo e do `lang/en.js` juntos.** O jogo carrega a versão do dicionário
gravada nele. Se subir só um dos dois, os jogadores em inglês recebem um aviso e jogam em português,
até os dois estarem no ar. Nada quebra.

## Como funciona para o jogador

- **Português:** nada muda e nada a mais é baixado.
- **Inglês, na primeira vez:** antes da vinheta aparece uma tela preta com "Loading language…" e uma barrinha.
  O arquivo tem cerca de 1 MB comprimido. Assim que termina, o jogo segue já em inglês.
- **Inglês, das outras vezes:** abre direto, porque o dicionário fica no cache do aparelho. A barrinha só volta
  quando você publicar um dicionário novo.
- **Trocar o idioma no botão Language:** o jogo recarrega no novo idioma, sem a vinheta.
- **Sem internet na primeira vez:** o jogo tenta 3 vezes. Se não conseguir, abre em português com um aviso.

## Testar no computador

Basta abrir o `ArhenChronicles.html` com dois cliques, desde que a pasta `lang` esteja ao lado dele.
Não precisa de servidor.

## Mexendo no jogo

Edite o `ArhenChronicles.html` normalmente, em português. Os textos aparecem assim:

```js
btn.textContent = __t('Fechar');                    // texto simples
msg.innerHTML  = __T`Você derrotou ${nome}!`;       // texto com variáveis
```

Em português, `__t('Fechar')` devolve exatamente `'Fechar'`, então o jogo funciona igual.

**Criou textos novos?** Você pode escrever `__t('...')` em volta deles, ou não fazer nada e rodar o `wrap`,
que acha e marca sozinho. Texto que ficar sem marcação ou sem tradução só aparece em português para quem
joga em inglês. Nada quebra.

Não use `__t` em textos que servem de **lógica**, como comparações (`if (x === 'Ativo')`) ou chaves de
objeto. A ferramenta já evita esses casos sozinha.

## Passo a passo depois de mexer no jogo

Uma vez só, dentro desta pasta: `npm install`

```bash
# 1. marca os textos novos do jogo
node i18n.js wrap ../ArhenChronicles.html

# 2. junta os textos novos no arquivo de traduções (eles entram como pendentes)
node i18n.js extract ../ArhenChronicles.html lang/en.master.json

# 3. traduz os pendentes (ou peça para o Claude fazer isso)
node tsv.js next  lang/en.master.json 24000 lote.tsv     # gera um lote: chave<TAB>português
#    escreva lote.en.tsv no formato chave<TAB>inglês
node tsv.js merge lang/en.master.json lote.en.tsv

# 4. gera o dicionário do deploy e grava a versão nova dentro do jogo
node i18n.js export lang/en.master.json ../deploy/lang/en.js ../ArhenChronicles.html

# 5. deploy do jogo + lang/en.js juntos
```

`node i18n.js status ../ArhenChronicles.html lang/en.master.json` mostra quanto falta traduzir.

## Cache no Firebase (opcional, recomendado)

O jogo pede o dicionário como `lang/en.js?v=<versão>`. Como cada versão tem um endereço próprio,
dá para deixar o navegador guardar o arquivo por muito tempo. No `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      { "source": "/lang/**", "headers": [ { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] }
    ]
  }
}
```

## Arquivos desta pasta

- `i18n.js`: a ferramenta, com os comandos `wrap`, `extract`, `status`, `export` (e `build`, antigo, gera um
  segundo arquivo de jogo traduzido).
- `i18n-loader.js`: o carregador de idioma que o `wrap` e o `export` colocam no `<head>` do jogo.
  Não edite a cópia que fica dentro do jogo; edite este arquivo e rode o `export`.
- `tsv.js`: tradução em lotes.
- `pt_vocab.txt`: vocabulário em português que ajuda a ferramenta a reconhecer textos do jogo.
- `lang/en.master.json`: todas as traduções. É o arquivo mais importante; guarde-o no GitHub.
- `lang/_excluded_logic.json`: textos deixados de fora de propósito, porque o código usa como lógica.

## Limitações conhecidas

- Nomes que o código usa como chave de lógica continuam em português (a lista está em `_excluded_logic.json`).
- Algumas frases montadas em pedaços (`'Você derrotou ' + nome`) podem soar menos naturais em inglês por
  causa da ordem das palavras.
- Saves antigos guardam alguns nomes no idioma em que foram criados. Um item ganho em português continua com
  o nome em português se você trocar para inglês, e vice-versa.
