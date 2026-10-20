(function(root){
 'use strict';
 let generation=0;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 async function mount({project,fetch,baseUrl}){
  const host=document.getElementById('projectTeam');if(!host)return;
  const ticket=++generation,current=()=>ticket===generation;
  host.replaceChildren();host.className='panel';host.style.padding='18px';host.style.marginBottom='16px';
  host.append(el('h2','Project Team'),el('p','Team members can view this project and its documents. Membership does not grant uploads, editing or Risk approval.'));
  const status=el('p','Loading Project Team…');status.setAttribute('role','status');
  const list=el('div');host.append(status,list);
  const url=baseUrl+'/projects/'+encodeURIComponent(project.id)+'/team';
  async function request(path,options){
   const r=await fetch(path,{cache:'no-store',...options});const d=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(d.message||'Project Team request failed.');return d;
  }
  let busy=false,canManage=false,selected=null,searchVersion=0;
  const form=el('form'),search=el('input'),results=el('div'),reason=el('input'),add=el('button','Add viewer');
  search.type='search';search.placeholder='Search active VERO users';search.setAttribute('aria-label','Search active VERO users');
  reason.required=true;reason.maxLength=2000;reason.placeholder='Reason for adding or removing access';reason.setAttribute('aria-label','Membership change reason');
  add.type='submit';add.className='btn';add.disabled=true;
  form.hidden=true;form.append(search,results,reason,add);host.append(form);
  function buttons(){host.querySelectorAll('button').forEach(b=>b.disabled=busy);add.disabled=busy||!selected;}
  async function change(userId,action){
   if(busy||!canManage||!current())return;
   const why=reason.value.trim();if(!why){status.textContent='Enter a reason for the membership change.';reason.focus();return;}
   busy=true;buttons();
   try{
    await request(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:userId,action,reason:why})});
    if(!current())return;
    selected=null;search.value='';results.replaceChildren();searchVersion++;
    await reload();if(current())status.textContent=action==='Add'?'Viewer added.':'Viewer membership removed. Other valid Project relationships still apply.';
   }catch(error){if(current())status.textContent=error.message+' Reload the team before retrying.';}
   finally{if(current()){busy=false;buttons();}}
  }
  async function reload(){
   const data=await request(url);if(!current())return;
   canManage=data.can_manage===true;form.hidden=!canManage;list.replaceChildren();
   for(const member of data.members||[]){
    const row=el('div');row.className='team-member';row.append(el('span',member.name+' · '+member.email+(member.active?'':' · Inactive')));
    if(canManage){const remove=el('button','Remove');remove.type='button';remove.className='btn outline';remove.addEventListener('click',()=>change(member.user_id,'Remove'));row.append(remove);}
    list.append(row);
   }
   if(!data.members?.length)list.append(el('p','No additional Project viewers.'));
   status.textContent='';buttons();
  }
  search.addEventListener('input',async()=>{
   const seq=++searchVersion;selected=null;results.replaceChildren();buttons();const q=search.value.trim();
   if(q.length<2)return;
   try{
    const data=await request(url+'/users?q='+encodeURIComponent(q));if(!current()||seq!==searchVersion)return;
    for(const user of data.users||[]){
     const pick=el('button',user.name+' · '+user.email);pick.type='button';
     pick.addEventListener('click',()=>{if(busy)return;selected=user.id;search.value=user.name+' · '+user.email;results.replaceChildren();searchVersion++;buttons();});
     results.append(pick);
    }
    if(!data.users?.length)results.append(el('p','No matching active users.'));
   }catch(error){if(current()&&seq===searchVersion)status.textContent=error.message;}
  });
  form.addEventListener('submit',event=>{event.preventDefault();if(selected)void change(selected,'Add');});
  try{await reload();}catch(error){if(current())status.textContent=error.message;}
 }
 root.VeroProjectTeam={mount};
})(globalThis);
