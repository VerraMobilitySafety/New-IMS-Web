(function(root){
  'use strict';
  const initiation=['New Project Request','Project Approval','Project Setup','Finance Approval','Leadership Approval'];
  const execution=['Project Execution','Project Execution Checklist','Project Delivery'];
  const completion=['Project Completion','Project Completion Checklist','Maintenance Handover','Operations Handover','Project Closure','Project Closed','Closed','Archived','Completed'];
  const labels={'New Project Request':'Complete New Project Request','Project Approval':'Review Project Approval','Project Setup':'Complete Project Setup','Finance Approval':'Review Finance Approval','Leadership Approval':'Review Leadership Approval','Project Execution':'Open Project','Project Execution Checklist':'Open Project'};
  function resolve(project){
    const p=project||{};
    const stage=String(p.current_stage||p.workflow_stage||'').trim();
    const status=String(p.status||'').trim().toLowerCase();
    // Only records without a workflow stage use the legacy status mapping.
    const legacy={'draft':'New Project Request','submitted':'Project Approval','planning':'New Project Request','in progress':'Project Execution','completed':'Completed','closed':'Closed','archived':'Archived'};
    const current=stage||legacy[status]||'';
    const lifecycle=initiation.includes(current)?'initiation':execution.includes(current)?'execution':completion.includes(current)?'completion':'unknown';
    const id=Number(p.action_required_by_user_id);
    return {stage:current||'Workflow unavailable',lifecycle,nextStep:p.next_step||labels[current]||'—',responsible:p.action_required_by||'—',ownerId:Number.isInteger(id)&&id>0?id:null,actionLabel:labels[current]||null,terminal:['Project Closed','Closed','Archived','Completed'].includes(current)};
  }
  function owns(project,user){const w=resolve(project);return w.ownerId!==null&&w.ownerId===Number(user?.id);}
  const api={resolve,owns};
  root.VeroProjectWorkflow=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
