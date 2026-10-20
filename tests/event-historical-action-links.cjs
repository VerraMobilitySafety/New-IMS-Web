const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const wait=async fn=>{for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw Error('UI timeout');};
(async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.invalid',runScripts:'outside-only'}),w=dom.window,root=w.document.querySelector('#root');w.eval(fs.readFileSync('historical-action-links.js','utf8'));
 const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),calls=[];let refreshed=false,notice='';
 const api=async(path,data)=>{calls.push({path,data});return data?{notice:'Linked; status and suppression unchanged'}:{links:[{action_id:'action',preview_token:'verified-token',title:'<script>Recovery action</script>',owner_name:'Historical owner',due_date:'2026-05-27',status:'Open',source_key:'archive:cognito/16/454',action_source_key:'archive:cognito/34/161'}],blocked:[],notice:'No notifications queued'};};
 await w.VeroHistoricalActionLinks.bind({event:{id:'event'},root,api,esc});assert.equal(root.children.length,0);assert.equal(calls.length,0);
 await w.VeroHistoricalActionLinks.bind({event:{id:'event',can_link_historical_actions:true},root,api,esc,refresh:async()=>{refreshed=true},message:m=>notice=m});
 assert.equal(calls.length,0,'No global source load until opened');const panel=root.querySelector('details');panel.open=true;await wait(()=>root.querySelector('form'));
 assert.match(panel.textContent,/Status Open/);assert.equal(root.querySelector('script'),null);assert.equal(calls.length,1);
 const form=root.querySelector('form');form.elements.reason.value='Verified original source relationship; preserve Open status';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await wait(()=>refreshed);
 assert.equal(calls[1].path,'/incidents/event/history/action-links');assert.equal(calls[1].data.action_id,'action');assert.equal(calls[1].data.preview_token,'verified-token');assert.ok(calls[1].data.request_id);assert.equal('status' in calls[1].data,false);assert.equal('owner_id' in calls[1].data,false);assert.match(notice,/suppression unchanged/);
 dom.window.close();console.log('PASS: admin gate, lazy source preview, escaped evidence, explicit audited link and no status/assignment changes.');
})().catch(e=>{console.error(e);process.exitCode=1});
