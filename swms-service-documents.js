/* Client service view of the same DMS; pending drafts stay in Document Control. */
window.VeroSwmsService={async mount(host,contract,base,request){
 host.replaceChildren();const controlled=document.createElement('div'),section=document.createElement('section');host.append(controlled,section);
 void window.VeroLinkedDocuments.mount(controlled,{type:'Contract',id:Number(contract.id)},null,base,request);
 const heading=document.createElement('h3');heading.textContent='SWMS';const link=document.createElement('a');link.className='btn';link.textContent='Generate or view SWMS';link.href='safe-work-method-statement.html?contract_id='+encodeURIComponent(contract.id);
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Loading SWMS…';section.append(heading,link,status);
 try{const data=await request('/swms?contract_id='+encodeURIComponent(contract.id));if(!section.isConnected)return;
 const pending=(data.items||[]).filter(x=>x.kind==='request'&&!['Rejected','Cancelled','Withdrawn'].includes(x.status));
 status.textContent=(data.items||[]).length+' SWMS linked to this service · '+pending.length+' awaiting approval';
 for(const item of pending){const p=document.createElement('p');p.textContent=item.reference+' · '+item.title+' · '+item.status;section.append(p);}
 }catch(e){if(section.isConnected){status.textContent=e.message;const retry=document.createElement('button');retry.type='button';retry.textContent='Retry SWMS';retry.onclick=()=>this.mount(host,contract,base,request);status.append(' ',retry);}}
}};
