/* My Actions routes only server-returned, scoped risk work to the governed workspace.
 * No approval state or second action queue is kept in the browser. */
(() => {
 'use strict';
 const types = Object.freeze({
  'Project Risk Review': {mode:'review', label:'Review Project Risk'},
  'Project Risk Correction': {mode:'correct', label:'Update Project Risk Submission'},
  'Project Risk Assessment Review': {mode:'assessment_review', label:'Review Project Risk Assessment'},
  'Project Risk Assessment Correction': {mode:'assessment_correct', label:'Revise Project Risk Assessment'},
  'Project Risk Assessment Submission': {mode:'assessment_submit', label:'Complete Project Risk Assessment'},
  'Project Risk Treatment': {mode:'treatment', label:'Open Treatment Action'},
  'Project Risk Treatment Verification': {mode:'verify', label:'Review Treatment Completion'}
 });
 function positiveId(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? String(id) : null;
 }
 function isRiskAction(action) {
  return !!action && ['risk','risks'].includes(String(action.source || '').toLowerCase());
 }
 function normaliseActions(actions) {
  if (!Array.isArray(actions)) return [];
  const seen = new Set();
  return actions.filter(action => action && typeof action === 'object').flatMap(action => {
   if (!isRiskAction(action)) return [action];
   // Compatibility for the previous feed; the server owns lifecycle and identity.
   if (typeof action.id === 'string' && action.id) {
    if (seen.has(action.id)) return [];
    seen.add(action.id);
   }
   return [{...action, source:'Risks', due_at:action.due_at || action.due_date || null}];
  });
 }
 function destination(action) {
  if (!isRiskAction(action)) return null;
  const type = Object.hasOwn(types, action.action_type) ? types[action.action_type] : null;
  if (action.action_type === 'Central Risk Treatment') {
   const riskId = positiveId(action.risk_id);
   const treatmentId = positiveId(action.treatment_action_id);
   if (!riskId || !treatmentId) return null;
   return {href:'risk.html?' + new URLSearchParams({risk_id:riskId,central_treatment_id:treatmentId}).toString(),label:'Open Risk Treatment'};
  }
  const projectId = positiveId(action.project_id);
  const riskId = positiveId(action.risk_id);
  if (!type || !projectId || !riskId) return null;
  const params = new URLSearchParams({id:projectId, risk_id:riskId, risk_action:type.mode});
  if (type.mode.startsWith('assessment_')) {
   const assessmentId = positiveId(action.assessment_id);
   const applicabilityId = positiveId(action.applicability_id);
   if (!assessmentId || !applicabilityId) return null;
   params.set('projectRiskAssessmentId', assessmentId);
   params.set('applicability_id', applicabilityId);
  } else if (type.mode === 'review' || type.mode === 'correct') {
   const submissionId = positiveId(action.submission_id);
   if (!submissionId) return null;
   params.set('submission_id', submissionId);
  } else {
   const treatmentId = positiveId(action.treatment_action_id ?? action.source_id);
   if (!treatmentId) return null;
   params.set('treatment_action_id', treatmentId);
  }
  return {href:'project-workspace.html?' + params.toString(), label:type.label};
 }
 window.VeroRiskActions = Object.freeze({isRiskAction, normaliseActions, destination});
})();

