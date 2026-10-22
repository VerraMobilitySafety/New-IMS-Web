/* Display aliases only. Saved references, filter values and source names stay intact. */
(()=>{
 'use strict';
 const approved=[
  ['1924M','VIC DJCS Fixed Camera Operations',['DJCS','DJCS Fixed Camera Maintenance']],
  ['1775M','NSW TfNSW Fixed Camera Operations',['NSW Fixed Cameras','TfNSW Detection and Enforcement Systems Agreement']],
  ['1971OS','NSW TfNSW Mobile Speed Camera Operations',['NSW Mobile Speed Cameras','NSW Mobile Speed Cameras Management']],
  ['1843M','NZ NZTA Fixed Camera Operations',['NZTA','Fixed Camera Leasing and Maintenance']]
 ];
 const normal=value=>String(value??'').trim().replace(/\s+/g,' ').toLowerCase();
 const names=new Map(),codes=new Map();
 for(const [code,friendly,aliases] of approved){codes.set(normal(code),friendly);for(const alias of [friendly,...aliases])names.set(normal(alias),friendly);}
 function label(value){
  const text=String(value??'');
  const direct=names.get(normal(text));if(direct)return direct;
  const parts=text.match(/^\s*([^·]+?)\s*·\s*(.+)$/);
  if(parts){const friendly=codes.get(normal(parts[1]));if(friendly)return parts[1].trim()+' · '+friendly;}
  return text;
 }
 function record(item){return item.friendly_name||label(item.contract_name||item.name||item.label||'');}
 function choice(item){
  const text=record(item),parts=text.match(/^\s*([^·]+?)\s*·\s*(.+)$/);
  if(item.friendly_name)return item.friendly_name;
  if(parts&&codes.has(normal(parts[1])))return parts[2];
  if([...codes.values()].includes(text))return text;
  return text+(item.client?' · '+item.client:'');
 }
 window.VeroContractLabels={label,record,choice};
})();
