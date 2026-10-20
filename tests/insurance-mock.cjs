// Local browser fixture: every request is intercepted; no live API requests.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function savedPolicy(v,id){
 const {coverage_limit,deductible_amount,insured_entity_name,...base}=v;
 return {...base,id,policy_scope:'Local',status:'Draft',
  annual_premium:v.annual_premium,insured_entities:v.insured_entity_name?[v.insured_entity_name]:[],
  coverages:v.coverage_limit!=null||v.deductible_amount!=null?[{
   coverage_name:v.insurance_class,limit_amount:v.coverage_limit,deductible_amount:v.deductible_amount,
   currency:v.currency}]:[]};
}
async function mockInsurance(page,options={}){
 const server={policies:[],posts:[],decisions:[],getMode:'ok',postMode:'ok',office:false,financialAccess:true,linkingAccess:false,...options};
 await page.addInitScript(()=>localStorage.setItem('vero_session_token','synthetic'));
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.hostname==='verra-ims-api-dev-eegmeab6c5haetdv.westus3-01.azurewebsites.net'){
   if(url.pathname==='/api/auth/me')return route.fulfill({json:{user:{
    first_name:'Synthetic',last_name:'Tester',email:'synthetic@example.test',vero_role:'User'}}});
   if(url.pathname==='/api/insurance/policies'){
    if(req.method()==='POST'){
     server.posts.push(req.postDataJSON());
     if(req.postDataJSON().parent_policy_id!=null&&!server.linkingAccess)
      return route.fulfill({status:403,json:{message:'Synthetic Insurance Manager membership required'}});
     if(req.postDataJSON().parent_policy_id!=null&&!server.policies.some(p=>p.id===req.postDataJSON().parent_policy_id))
      return route.fulfill({status:404,json:{message:'Parent policy not found or not accessible.'}});
     if(!server.financialAccess&&['annual_premium','coverage_limit','deductible_amount','coverages'].some(k=>Object.hasOwn(req.postDataJSON(),k)))
      return route.fulfill({status:403,json:{message:'Synthetic financial access denied'}});
     if(server.postGate)await server.postGate;
     if(server.postMode==='error')return route.fulfill({status:500,json:{message:'Synthetic save failure'}});
     if(server.postMode==='network')return route.abort();
     if(server.postMode==='malformed')return route.fulfill({json:{status:'success'}});
     const p=savedPolicy(req.postDataJSON(),server.policies.length+1);server.policies.unshift(p);
     if(server.failReload)server.getMode='error';
     return route.fulfill({status:201,json:{status:'success',id:p.id,policy_status:'Draft'}});
    }
    if(server.getGate)await server.getGate;
    if(server.getMode==='error')return route.fulfill({status:503,json:{message:'Synthetic unavailable'}});
    if(server.getMode==='malformed')return route.fulfill({json:{status:'success',policies:null}});
    const policies=server.policies.map(p=>{const copy={...p};if(!server.financialAccess){delete copy.annual_premium;delete copy.coverages}return copy});
    return route.fulfill({json:{status:'success',policies,
     insurance_office:server.office,financial_access:server.financialAccess,
     can_link_parent_policies:server.linkingAccess,can_link_programmes:false,limited:Boolean(server.limited)}});
   }
   if(/^\/api\/insurance\/policies\/\d+\/decision$/.test(url.pathname)){
    server.decisions.push(req.postDataJSON());
    return route.fulfill({json:{status:'success',policy_id:1,policy_status:'Submitted'}});
   }
   return route.abort();
  }
  if(url.hostname!=='vero.test')return route.abort();
  if(url.pathname==='/insurance-live.js'&&server.noAdapter)return route.abort();
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(file),contentType:({
   '.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'
  })[path.extname(file)]||'application/octet-stream'});
 });
 return server;
}
module.exports={mockInsurance,savedPolicy};
