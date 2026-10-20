const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const dom=new JSDOM('<p id="message"></p><main id="content"></main>',{url:'https://example.invalid/incident-management.html?view=injuries',runScripts:'outside-only'}),w=dom.window;let opened,calls=[];global.location=w.location;global.history=w.history;global.document=w.document;global.FormData=w.FormData;
 w.eval(fs.readFileSync(__dirname+'/../injury-register.js','utf8'));
 const data={total:1,matching:1,open_claims:1,unverified:1,statuses:['Open Claim'],classifications:['Unverified'],records:[{id:'test',fields:{'IP Name':'Synthetic <Person>','Date of Injury':'2026-06-30','Claim Status':'Open Claim'},flags:['Injury classification unverified']}]};
 const api=async(path)=>{calls.push(path);return data;},esc=v=>String(v??'').replace(/</g,'&lt;');
 await w.VeroInjuryRegister.render({content:w.document.getElementById('content'),api,esc,administrator:false,openDetails:r=>opened=r});
 assert.equal(w.document.querySelector('#injury-preview'),null);assert.equal(w.document.querySelectorAll('tbody tr').length,1);assert.match(w.document.querySelector('tbody').textContent,/Synthetic <Person>/);assert.equal(w.document.querySelector('Person'),null);
 w.document.querySelector('[data-injury]').click();assert.equal(opened.id,'test');
 w.document.querySelector('[name="q"]').value='Synthetic';w.document.querySelector('[name="status"]').value='Open Claim';w.document.querySelector('#injury-filters').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,5));
 assert.match(calls.at(-1),/q=Synthetic/);assert.match(calls.at(-1),/status=Open\+Claim/);
 const s=fs.readFileSync(__dirname+'/../incident-management.js','utf8');assert.match(s,/if\(!options.injury_register\)/);assert.match(s,/hidden=!options.injury_register/);
 console.log('PASS: restricted register filters, escaped person names, detail panel, admin-only import and UI permission guard.');
})();
