const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const dom=new JSDOM('<div id="results"></div>',{runScripts:'outside-only'}),w=dom.window,d=w.document;
w.eval(fs.readFileSync(__dirname+'/../incident-analytics.js','utf8'));
const events=[
 {id:'early',legacy:{event_reference:'2',register_description:'Zulu'},report:{occurred_date:'2026-01-01',occurred_time:'12:00',description:'Original detailed narrative'},status:'Complete',investigator_name:'Beta'},
 {id:'late',legacy:{event_reference:'10',register_description:'Alpha'},report:{occurred_date:'2026-01-02',occurred_time:'08:00',classification:{due_date:'2099-01-01'}},status:'Under Investigation',investigator_name:'Zebra'},
 {id:'same',legacy:{event_reference:'3',register_description:'Beta'},report:{occurred_date:'2026-01-02',occurred_time:'2026-01-02T09:00:00',classification:{due_date:'2000-01-01'}},status:'Under Investigation',investigator_name:'Alpha'},
 {id:'unknown',legacy:{event_reference:'20',register_description:'Gamma'},report:{occurred_date:'2026-02-30'},status:'Complete',investigator_name:'Beta'}
];
let opened;const args={results:d.querySelector('#results'),events,esc:v=>String(v??''),openEvent:async id=>{opened=id;}};
w.VeroMonthlyReports.renderEvents(args);
const order=()=>[...d.querySelectorAll('[data-chart-event]')].map(e=>e.dataset.chartEvent),click=key=>d.querySelector('[data-event-sort="'+key+'"]').click();
assert.deepEqual(order(),['same','late','early','unknown'],'Actual occurrence date/time first, invalid dates last');
for(const [key,ascending,descending] of [
 ['ref',['early','same','late','unknown'],['unknown','late','same','early']],
 ['description',['late','same','unknown','early'],['early','unknown','same','late']],
 ['status',['early','unknown','late','same'],['same','late','early','unknown']]
]){click(key);assert.deepEqual(order(),ascending);assert.equal(d.querySelector('[aria-sort="ascending"] button').dataset.eventSort,key);click(key);assert.deepEqual(order(),descending);}
click('owner');assert.deepEqual(order(),['same','early','unknown','late']);assert.equal(d.activeElement.dataset.eventSort,'owner');
w.VeroMonthlyReports.renderEvents(args);assert.deepEqual(order(),['same','early','unknown','late'],'Keep chosen sort when selection results refresh');
d.querySelector('[data-chart-event]').click();assert.equal(opened,'same');assert.deepEqual(events.map(e=>e.id),['early','late','same','unknown'],'Do not mutate source rows');
const search=value=>{const input=d.querySelector('input[type=search]');input.focus();input.value=value;input.dispatchEvent(new w.Event('input'));assert.equal(d.activeElement,input,'Search focus survives filtering');return input;};
search('  ZEBRA ');assert.deepEqual(order(),['late'],'Owner is case insensitive and whitespace trimmed');
search('10');assert.deepEqual(order(),['late'],'Reference search');
search('Zulu');assert.deepEqual(order(),['early'],'Short description search');
search('detailed narrative');assert.deepEqual(order(),['early'],'Original description remains searchable');
search('Beta');assert.deepEqual(order(),['same','early','unknown']);click('ref');assert.deepEqual(order(),['early','same','unknown'],'Sort within matches');
w.VeroMonthlyReports.renderEvents(args);assert.equal(d.querySelector('input').value,'Beta');assert.deepEqual(order(),['early','same','unknown'],'Search and sort survive selection refresh');
search('no such event');assert.deepEqual(order(),[]);assert.match(d.querySelector('.event-list-table').textContent,/No events match your search/);assert.equal(d.querySelector('.event-search-count').textContent,'0 of 4 Events');
search('');assert.deepEqual(order(),['early','same','late','unknown']);
const many=Array.from({length:61},(_,i)=>({id:'row-'+i,legacy:{event_reference:String(i+1)},report:{description:'Example '+i,occurred_date:'2026-01-01'},status:'Complete'}));
w.VeroMonthlyReports.renderEvents({...args,events:many});assert.equal(order().length,25);assert.equal(d.querySelector('[data-page=previous]').disabled,true);
d.querySelector('[data-page=next]').click();assert.equal(order().length,25);assert.equal(order()[0],'row-25');d.querySelector('[data-page=next]').click();assert.equal(order().length,11);assert.equal(d.querySelector('[data-page=next]').disabled,true);
search('Example 60');assert.deepEqual(order(),['row-60'],'Search covers every page and resets pagination');search('');assert.equal(order().length,25);assert.equal(d.querySelector('[data-page=previous]').disabled,true);
dom.window.close();console.log('PASS: newest occurrence first, invalid dates last, all columns toggle, numeric references, stable ties, focus and event opening.');
