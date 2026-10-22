/* Display aliases only. Saved references, filter values and source names stay intact. */
(()=>{
 'use strict';
 const approved=[
  ["6045","SA SAPOL Fixed Camera Operations",["SAPOL customer purchase order"]],
  ["1311OS:B","NT DPI Fixed Camera Operations",["Camera Enforcement Adjudication Services"]],
  ["1787UK:M","BE SecuRoad Fixed Camera Operations",["SecuRoad Camera Maintenance"]],
  ["1795C","VIC DJCS West Gate Fixed Camera Operations",["Westgate Freeway and Tunnel Camera Management"]],
  ["1824UK:M","UK Kirklees Fixed Camera Operations",["Yorkshire - Kirklees Council Camera Maintenance"]],
  ["1834UK:C","NL CVOM Fixed Camera Operations",["CVOM EG037 — Tranche 03 implementation"]],
  ["1835M","VIC TfV Fixed Camera Operations",["Kensington Camera Maintenance"]],
  ["1846C","WA WAPOL Fixed Camera Operations",["Camera Enforcement Adjudication Services"]],
  ["1876M","NT DIPL Fixed Camera Operations",["Camera Maintenance Management"]],
  ["1923C","VIC DJCS GVH PFE Fixed Camera Operations",["Goulburn Valley Highway and Princes Freeway East Camera Installation"]],
  ["1925UK:C","UK National Highways Fixed Camera Operations",["National Enforcement Camera Solution Management"]],
  ["1926C","VIC DJCS Geelong Road Fixed Camera Operations",["Geelong Road Site Upgrade"]],
  ['1924M','VIC DJCS Fixed Camera Operations',['DJCS','DJCS Fixed Camera Maintenance']],
  ['1775M','NSW TfNSW Fixed Camera Operations',['NSW Fixed Cameras','TfNSW Detection and Enforcement Systems Agreement']],
  ['1971OS','NSW TfNSW Mobile Speed Camera Operations',['NSW Mobile Speed Cameras','NSW Mobile Speed Cameras Management']],
  ['1843M','NZ NZTA Fixed Camera Operations',['NZTA','Fixed Camera Leasing and Maintenance']]
 ];
 const normal=value=>String(value??'').trim().replace(/\s+/g,' ').toLowerCase();
 const names=new Map(),codes=new Map();
 for(const [code,friendly,aliases] of approved){
  codes.set(normal(code),friendly);
  for(const alias of [friendly,...aliases]){
   const key=normal(alias);
   names.set(key,names.has(key)&&names.get(key)!==friendly?null:friendly);
  }
 }
 function label(value){
  const text=String(value??'');
  const direct=names.get(normal(text));if(direct)return direct;
  const parts=text.match(/^\s*([^·]+?)\s*·\s*(.+)$/);
  if(parts){const friendly=codes.get(normal(parts[1]));if(friendly)return parts[1].trim()+' · '+friendly;}
  return text;
 }
 function record(item){return item.friendly_name||codes.get(normal(item.contract_code||item.code))||label(item.contract_name||item.name||item.label||'');}
 function choice(item){
  const text=record(item),parts=text.match(/^\s*([^·]+?)\s*·\s*(.+)$/);
  if(item.friendly_name)return item.friendly_name;
  if(parts&&codes.has(normal(parts[1])))return parts[2];
  if([...codes.values()].includes(text))return text;
  return text+(item.client?' · '+item.client:'');
 }
 window.VeroContractLabels={label,record,choice};
})();
