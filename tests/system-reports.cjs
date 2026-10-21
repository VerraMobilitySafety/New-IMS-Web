const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={window:{},URLSearchParams};for(const file of ['report-catalogue.js','report-query.js'])vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),context);vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../system-reports.js'),'utf8'),context);const api=context.window.VeroSystemReports;
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
test('fields omitted by source are not misreported as missing ownership or dates',async()=>{
 const sources=await api.load('events,actions',async path=>path==='/incidents'?{events:[{id:1,status:'Complete',report:{occurred_date:'2026-10-01'}}]}:{actions:[{id:1,title:'Check',assigned_to_user_id:7}]});
 const rows=api.analyse(sources,{},'2026-10-21');assert.equal(rows[0].missingOwner,null);assert.equal(rows[0].missingDate,0);assert.equal(rows[1].missingDate,null);assert.equal(rows[1].pastDate,null);
});
test('detail sample represents several topics instead of filling entirely with the first register',()=>{
 const sources=[{id:'risks',rows:Array.from({length:30},(_,i)=>({id:i,title:'Risk '+i}))},{id:'documents',rows:[{id:1,title:'Procedure'}]}];const tables=[];api.render(sources,{}, {kpis:()=>'',note:()=>'',table:(title,head,rows)=>{tables.push({title,rows});return '';}},'2026-10-21');const sample=tables.find(t=>t.title.startsWith('Matching register entries'));assert.equal(sample.rows.length,20);assert.ok(sample.rows.some(r=>r[0]==='Documents'));
});
test('combined render keeps populations separate and displays partial coverage',()=>{
 const ui={kpis:()=>'',table:(title,headers,rows)=>title+JSON.stringify(rows),note:s=>s};const result=api.render([{id:'projects',rows:[]},{id:'insurance',error:'Source unavailable'}],{},ui,'2026-10-21');assert.ok(result.html.includes('Source unavailable; no count available'));assert.ok(result.html.includes('must not be added'));assert.ok(result.html.includes('Projects'));assert.throws(()=>api.render([{id:'projects',error:'Source unavailable'}],{},ui,'2026-10-21'));
});

test('investigation sites use recorded Verra context, retain every site and separate historical holds',async()=>{
 const events=Array.from({length:6},(_,i)=>({id:i,status:'Under Investigation',investigator_name:'Investigator',report:{location:'Depot',vm_location_name:'Site '+i}}));
 events.push({id:10,status:'Under Investigation',migration_hold:true,report:{location:'Depot',reference_name:'Site 0'}},{id:11,status:'Complete',report:{location:'Client Site',reference_name:'Client Must Not Become Verra Site'}},{id:12,status:'Finding Investigator',report:{location:'Depot'}},{id:13,restricted:true,report:{location:'Depot',reference_name:'Restricted'}});
 const sources=await api.load('investigations',async path=>{assert.equal(path,'/incidents?reporting=monthly');return {events};});
 const result=api.analyse(sources,{group_by:'site'},'2026-10-21')[0];assert.equal(result.total,9);assert.equal(result.groups.length,8);assert.ok(!JSON.stringify(result).includes('Client Must Not Become Verra Site'));assert.ok(result.rows.some(r=>r.status==='Historical Hold'));assert.ok(result.groups.some(g=>g[0]==='Verra Site Not Recorded'));
 const tables=[];api.render(sources,{group_by:'site'},{kpis:()=>'',note:()=>'',table:(title,headers,rows)=>{tables.push({title,headers,rows});return '';}},'2026-10-21');
 const sites=tables.find(t=>t.title==='Investigations by Verra Mobility Site');assert.equal(sites.rows.length,8);assert.ok(!tables.some(t=>t.title.startsWith('Matching register entries')));assert.deepEqual(Array.from(sites.rows.find(r=>r[0]==='Site 0')),['Site 0',2,1,0,0,1,0]);
});

test('typed questions paginate assets, apply source-specific date filters and group without question-specific code',async()=>{
 const calls=[];const sources=await api.load('assets',async path=>{calls.push(path);return {total:3,assets:path.includes('offset=2')?[{id:3,asset_tag:'A3',asset_name:'Van',category:'Vehicle',next_service_date:'2027-01-01',owner_name:'Sam',site_name:'Sydney'}]:[{id:1,asset_tag:'A1',asset_name:'Car',category:'Vehicle',next_service_date:'2026-01-01',owner_name:'Alex',site_name:'Sydney'},{id:2,asset_tag:'A2',asset_name:'Tool',category:'Equipment',next_service_date:null,owner_name:'Sam',site_name:'Melbourne'}]};});
 assert.equal(calls.length,2);assert.equal(sources[0].rows.length,3);assert.equal(sources[0].limited,false);
 const result=api.analyse(sources,{group_by:'owner',where:JSON.stringify([{source:'assets',field:'next_service_date',op:'before',value:'2026-10-21'}])},'2026-10-21')[0];assert.equal(result.total,1);assert.equal(result.groups[0][0],'Alex');
});
test('contractor relationships use authorised company metadata and parent failures retain partial coverage',async()=>{
 const data={data:{contractors:[{id:1,company_name:'Company A'}],workers:[{id:2,contractor_id:1,first_name:'Alex',last_name:'Smith',induction_status:'Complete',status:'Active'}]}};
 const sources=await api.load('contractor-workers',async()=>data);assert.equal(sources[0].rows[0].contractor,'Company A');assert.equal(sources[0].rows[0].title,'Alex Smith');
 const child=await api.load('project-milestones',async path=>{if(path==='/projects')return {projects:[{id:1,project_name:'A'},{id:2,project_name:'B'}]};if(path.includes('/1/'))return {milestones:[{id:1,milestone_name:'Gate',target_date:'2026-12-01'}]};throw Object.assign(Error(),{status:403});});assert.equal(child[0].partial,1);assert.equal(child[0].rows[0].project,'A');
});
test('numeric aggregation excludes unrecorded values and runs separately per group',async()=>{
 const sources=await api.load('retention-rules',async()=>({rules:[{id:1,rule_name:'A',record_category:'Finance',retention_period_months:12},{id:2,rule_name:'B',record_category:'Finance',retention_period_months:24},{id:3,rule_name:'C',record_category:'Operations',retention_period_months:null}]}));const result=api.analyse(sources,{group_by:'type',aggregate:'average',measure:'retention_period_months'},'2026-10-21')[0];assert.equal(result.groups.find(r=>r[0]==='Finance')[1],18);assert.equal(result.groups.find(r=>r[0]==='Operations')[1],'Not supplied');
});
test('unconnected topics and protected injury details never become zero counts or sample evidence',async()=>{
 const sources=await api.load('assurance,injury-register',async()=>({records:[{id:1,fields:{'IP Name':'PRIVATE NAME','Description of Injury':'PRIVATE MEDICAL DETAIL','Injury Classification':'First Aid','Claim Status':'Closed','Date of Injury':'2026-01-01'}}]}));assert.ok(sources[0].error);assert.ok(!JSON.stringify(sources).includes('PRIVATE'));const tables=[];api.render(sources,{}, {kpis:()=>'',note:()=>'',table:(title,headers,rows)=>{tables.push({title,rows});return '';}},'2026-10-21');assert.ok(!tables.some(t=>t.title.startsWith('Matching register entries')));
});

test('percentage groups retain boolean false and use matching source population',()=>{
 const rows=[{id:1,overdue:true},{id:2,overdue:false},{id:3,overdue:false}];const result=api.analyse([{id:'all-actions',rows}],{group_by:'overdue',aggregate:'percentage'},'2026-10-21')[0];assert.equal(result.groups.find(r=>r[0]==='false')[1],66.67);assert.equal(result.groups.find(r=>r[0]==='true')[1],33.33);
});
test('new catalogue sources use the same reader and grouping engine without a preset question',async()=>{
 const catalogue=JSON.parse(JSON.stringify(context.window.VeroReportQuery.catalogue));catalogue.sources['new-register']={name:'New Register',path:'/new-register',key:'items',page:'index.html',title:'name',code:'id',fields:{id:{path:'id',type:'text',label:'ID'},title:{path:'name',type:'text',label:'Name'},region:{path:'region',type:'text',label:'Region'}}};api.configure(catalogue);const sources=await api.load('new-register',async()=>({items:[{id:1,name:'One',region:'North'},{id:2,name:'Two',region:'North'}]}));assert.equal(api.analyse(sources,{group_by:'region'},'2026-10-21')[0].groups[0][1],2);
});
const {test:coverageTest}=require('node:test');
coverageTest('unassessed risk query uses assessment state independently of lifecycle and retains named details',async()=>{
 const seen=[]; const sources=await api.load('risks',async path=>{seen.push(path);return {risks:[{id:1,risk_code:'R1',risk_title:'Unassessed open risk',risk_owner:'Alex',status:'Open',assessment_state:'Not Assessed',assessment_basis:'No Recorded Assessment In Accessible Scope',awaiting_assessment:2},{id:2,risk_title:'Assessed draft',status:'Draft',assessment_state:'Assessed',awaiting_assessment:0}]};});
 assert.equal(seen[0],'/risks?assessment_coverage=true');
 const filters={group_by:'assessment_state',where:JSON.stringify([{source:'risks',field:'assessment_state',op:'equals',value:'Not Assessed'}]),columns:'code,title,owner,status,assessment_state,assessment_basis,awaiting_assessment'};
 const result=api.analyse(sources,filters,'2026-10-21');assert.equal(result[0].total,1);assert.equal(result[0].rows[0].owner,'Alex');assert.equal(result[0].rows[0].status,'Open');
 const tables=[];api.render(sources,filters,{kpis:()=>'',note:()=>'',table:(title,headers,rows)=>{tables.push({title,headers,rows});return '';}},'2026-10-21');
 assert.ok(tables.find(t=>t.title.includes('requested details')).rows[0].includes('Unassessed open risk'));
});
