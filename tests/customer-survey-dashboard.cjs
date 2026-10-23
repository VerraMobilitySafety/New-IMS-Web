const {test}=require('node:test'),assert=require('node:assert/strict');
const {calculate}=require('../customer-survey-dashboard.js');
test('native metrics use saved responses, not screenshot values or repeated reminder sends',()=>{
 const invitations=Array.from({length:50},(_,i)=>({round_id:'r',sent_at:'2026-09-01',...(i<8?{responded_at:'2026-09-12',answers:[[5],[4],[4],[5],[3],[3],[1],[2]][i]}:{})}));
 const model=calculate({rounds:[{id:'r',scheduled_for:'2026-09-01'}],invitations});
 assert.equal(model.sent,50);assert.equal(model.responses,8);assert.equal(model.csat,50);assert.equal(model.responseRate,16);assert.equal(model.average,27/8);
 assert.deepEqual(model.breakdown.map(s=>s.percentage),[50,25,25]);assert.equal(model.quarters[0].label,'Q3 2026');assert.equal(model.quarters[0].csat,50);
});
test('no responses are missing scores, not zero; unsent and queued invitations are not sent surveys',()=>{
 const model=calculate({rounds:[{id:'r',scheduled_for:'2026-10-01'}],invitations:[{round_id:'r',delivery_status:'Queued'},{round_id:'r',sent_at:'2026-10-02'}]});
 assert.equal(model.sent,1);assert.equal(model.responseRate,0);assert.equal(model.csat,null);assert.equal(model.average,null);assert.equal(model.quarters[0].csat,null);
 assert.equal(calculate({}).responseRate,null);
});
test('quarters use scheduled survey date and missing-response quarters preserve gaps',()=>{
 const model=calculate({rounds:[{id:'a',scheduled_for:'2026-09-30'},{id:'b',scheduled_for:'2026-12-01'},{id:'c',scheduled_for:'2027-01-01'}],invitations:[{round_id:'a',responded_at:'2026-10-15',answers:[4,2]},{round_id:'c',responded_at:'2027-02-01',answers:[1,3]}]});
 assert.deepEqual(model.quarters.map(q=>q.label),['Q3 2026','Q4 2026','Q1 2027']);assert.deepEqual(model.quarters.map(q=>q.csat),[100,null,0]);
 assert.equal(model.csat,50);assert.equal(model.average,2.5);
});
test('unanswered and malformed ratings do not contribute satisfaction scores',()=>{
 const model=calculate({invitations:[{responded_at:'2026-01-01',answers:[0,5]},{responded_at:'2026-01-01',answers:[]},{answers:[5]},{responded_at:'2026-01-01',answers:[true]},{responded_at:'2026-01-01',answers:[5,4]}]});
 assert.equal(model.responses,1);assert.equal(model.csat,100);assert.equal(model.average,4.5);
});
