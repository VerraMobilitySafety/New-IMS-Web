/* Approved residual-risk intervals, with earlier procedure/context constraints. */
window.VeroRiskReviewPolicy=(()=>{'use strict';
const months={Low:24,Moderate:12,High:6,Significant:1};
const matrix=[['Low','Low','Low','Moderate','Moderate'],['Low','Moderate','Moderate','Moderate','High'],['Low','Moderate','High','High','Significant'],['Moderate','Moderate','High','Significant','Significant'],['Moderate','High','Significant','Significant','Significant']];
function addMonths(value,count){const [y,m,d]=value.split('-').map(Number);const last=new Date(Date.UTC(y,m-1+count+1,0));const date=new Date(Date.UTC(last.getUTCFullYear(),last.getUTCMonth(),Math.min(d,last.getUTCDate())));return date.toISOString().slice(0,10);}
function schedule(likelihood,impact,config={}){
 if(!Number.isInteger(likelihood)||!Number.isInteger(impact)||likelihood<1||likelihood>5||impact<1||impact>5)return null;
 const reference=config.reference_date||new Date().toISOString().slice(0,10),band=matrix[likelihood-1][impact-1],interval=months[band],reasons=[];
 let due=addMonths(reference,interval);const context=config.context||'Master';
 if(context==='Master'){const limit=addMonths(reference,12);if(limit<due){due=limit;reasons.push('Annual overarching-risk review required by procedure');}}
 else if(context==='Project'){
  const start=config.project_start,end=config.project_end;
  if(!start||!end||end>addMonths(start,3)||end<start){const limit=addMonths(reference,3);if(limit<due){due=limit;reasons.push('Quarterly project review required; duration exceeds three months or is not yet confirmed');}}
  if(end&&end>=reference&&end<due){due=end;reasons.push('Project completion is an earlier review milestone');}
 }else if(context!=='Compliance'&&context!=='Maintenance Contract')throw Error('Unknown review context');
 if(config.earlier_date&&config.earlier_date<due){due=config.earlier_date;reasons.push('Earlier scheduled review retained');}
 return {policy_version:'2026-10-16',reference_date:reference,residual_rating:band,default_interval_months:interval,next_review_date:due,context,constraints:reasons,event_driven_review_required:true,immediate_escalation:band==='Significant'};
}
return {schedule,addMonths};
})();

