// node tsv.js next <lang.json> <n_chars> <outfile>   -> grava próximo lote pendente (TSV)
// node tsv.js merge <lang.json> <arquivo.tsv>        -> aplica traduções do lote
const fs=require('fs');
const esc=s=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/\t/g,'\\t');
const unesc=s=>s.replace(/\\(\\|n|t)/g,(m,c)=>c==='n'?'\n':c==='t'?'\t':'\\');
const [cmd,f,a,b]=process.argv.slice(2);
const L=JSON.parse(fs.readFileSync(f,'utf8'));
const prio=e=>{const c=e.ctx;
 if(/^html/.test(c))return 0; if(/^data-(LOCS|PRACA_DATA|ITEMS|RACES|TALENT|QUIZ|LORE|CITY|DUNGEON|GOSSIP|FERREIRO|ITEM_LORE)/.test(c))return 1;
 if(/^data-QUESTS:(title|label|name|loc|reward|shortDesc)/.test(c))return 1; if(/^data-QUEST/.test(c))return 2; if(c==='js'||c==='js-template')return 3; return 4;};
if(cmd==='next'){
 const todo=Object.entries(L.entries).filter(([k,e])=>!e.orphan&&!e.en).sort((x,y)=>prio(x[1])-prio(y[1])||x[1].ctx.localeCompare(y[1].ctx));
 let n=0,out=[];for(const [k,e] of todo){if(n>+a&&out.length)break;out.push(k+'\t'+esc(e.pt));n+=e.pt.length;}
 fs.writeFileSync(b,out.join('\n')+'\n');console.log(`lote: ${out.length} textos, ${n} chars; pendentes totais: ${todo.length}; ctx do 1º: ${todo[0]&&todo[0][1].ctx}`);
}else if(cmd==='merge'){
 let ok=0,bad=0;
 for(const line of fs.readFileSync(a,'utf8').split('\n')){ if(!line.trim())continue; const i=line.indexOf('\t'); const k=line.slice(0,i), en=unesc(line.slice(i+1));
  const e=L.entries[k]; if(!e){console.log('chave desconhecida',k);bad++;continue;}
  const ph=s=>(s.match(/\{\{\d+\}\}/g)||[]).sort().join(); 
  if(ph(e.pt)!==ph(en)){console.log('PLACEHOLDER diferente',k,e.pt.slice(0,50));bad++;continue;}
  if(e.en&&e.en!==en&&!process.env.FORCE){console.log('JA TRADUZIDA (chave errada?)',k,'|',e.pt.slice(0,40),'|',en.slice(0,40));bad++;continue;}
  e.en=en;ok++;}
 fs.writeFileSync(f,JSON.stringify(L,null,1)+'\n');console.log(`aplicados ${ok}, rejeitados ${bad}`);
}
