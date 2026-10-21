const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={window:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../system-reports.js'),'utf8'),context);const api=context.window.VeroSystemReports;
test('each register is authorised independently; unavailable data is not zero',async()=>{
 const calls=[];const sources=await api.load('projects,insurance',async path=>{calls.push(path);if(path.includes('insurance'))throw Object.assign(Error(),{status:403});return {projects:[{id:1,project_name:'Alpha',status:'Open',project_owner:'',target_end_date:'2026-01-01'}]};});
 assert.equal(calls.length,2);const result=api.analyse(sources,{group_by:'status'},'2026-10-21');assert.equal(result[0].total,1);assert.equal(result[0].missingOwner,1);assert.equal(result[0].pastDate,1);assert.equal(result[1].error,'Access unavailable');assert.equal(result[1].total,undefined);
});
test('restricted metadata excluded, duplicate applicability not double-counted, no raw content retained',async()=>{
 const sources=await api.load('records,compliance',async path=>path==='/records'?{records:[{id:1,restricted:true,record_title:'Restricted'},{id:2,record_title:'Accessible',owner:{user_id:7},file_contents:'NEVER RETAIN'}]}:{obligations:[{id:3,obligation_title:'Duty'},{id:3,obligation_title:'Duty'}]});
 assert.equal(sources[0].rows.length,1);assert.equal(sources[0].skipped,1);assert.equal(sources[1].rows.length,1);assert.ok(!JSON.stringify(sources).includes('NEVER RETAIN'));
});
test('search, exact status and grouping apply to selected population; invalid dates do not become flags',async()=>{
 const sources=await api.load('projects',async()=>({projects:[{id:1,project_name:'Alpha',project_owner:'Alex',status:'Open',target_end_date:'2026-02-30'},{id:2,project_name:'Alpha',status:'Closed'},{id:3,project_name:'Beta',status:'Open'}]}));
 const rows=api.analyse(sources,{search:'Alpha',status:'Open',group_by:'owner'},'2026-10-21');assert.equal(rows[0].total,1);assert.equal(rows[0].missingDate,1);assert.equal(rows[0].pastDate,0);assert.equal(rows[0].groups[0][0],'Alex');
});
test('unknown modules and groupings fail closed; session changes cancel aggregation',async()=>{
 assert.throws(()=>api.selected('database'));assert.throws(()=>api.selected('projects,projects'));assert.throws(()=>api.analyse([{id:'projects',rows:[]}],{group_by:'secret'},'2026-10-21'));
 await assert.rejects(api.load('projects',async()=>{throw Object.assign(Error('changed'),{sessionChanged:true});}));
});
test('combined render keeps populations separate and displays partial coverage',()=>{
 const ui={kpis:()=>'',table:(title,headers,rows)=>title+JSON.stringify(rows),note:s=>s};const result=api.render([{id:'projects',rows:[]},{id:'insurance',error:'Source unavailable'}],{},ui,'2026-10-21');assert.ok(result.html.includes('Source unavailable; no count available'));assert.ok(result.html.includes('must not be added'));assert.ok(result.html.includes('Projects'));assert.throws(()=>api.render([{id:'projects',error:'Source unavailable'}],{},ui,'2026-10-21'));
});
