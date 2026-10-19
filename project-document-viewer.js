(function(root){
 'use strict';
 let dialog,body,title,status,download,ticket=0,objectUrl=null,controller=null,pdfDocument=null;
 const assetBase=new URL('.',document.currentScript?.src||document.baseURI);
 async function loadPdf(){const library=await import(new URL('vendor/pdfjs/pdf.mjs',assetBase).href);library.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.mjs',assetBase).href;return library;}
 function clear(){controller?.abort();controller=null;if(pdfDocument){pdfDocument.destroy().catch(()=>{});pdfDocument=null;}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}}
 function ensure(){
  if(dialog)return;
  const style=document.createElement('style');
  style.textContent='.project-file-viewer{width:min(1100px,94vw);height:min(850px,92vh);padding:0;border:1px solid #d8d4cf;border-radius:12px;color:#3d3935;background:#fff}.project-file-viewer::backdrop{background:rgba(25,24,22,.6)}.project-file-viewer[open]{display:flex;flex-direction:column}.project-file-viewer header{display:flex;align-items:center;gap:16px;padding:18px 22px;border-bottom:1px solid #ddd}.project-file-viewer h2{font:700 18px/1.4 Montserrat,Arial,sans-serif;margin:0;overflow-wrap:anywhere;flex:1}.project-file-viewer button,.project-file-viewer a{font:700 12px Arial,sans-serif;padding:9px 14px;border:1px solid #ccc;border-radius:7px;background:#fff;color:#3d3935;text-decoration:none;cursor:pointer}.project-file-viewer a[hidden]{display:none}.project-file-viewer .file-status{padding:12px 22px;margin:0;font:14px/1.5 Arial,sans-serif}.project-file-viewer .file-body{flex:1;min-height:0;overflow:auto;padding:0 22px 20px}.project-file-viewer pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 monospace;margin:0}.project-file-viewer iframe{width:100%;height:100%;min-height:300px;border:0}.project-file-viewer img{display:block;max-width:100%;max-height:100%;object-fit:contain;margin:auto}';
  document.head.appendChild(style);
  dialog=document.createElement('dialog');dialog.className='project-file-viewer';dialog.setAttribute('aria-labelledby','projectFileViewerTitle');
  const header=document.createElement('header');title=document.createElement('h2');title.id='projectFileViewerTitle';
  download=document.createElement('a');download.textContent='Download';download.hidden=true;
  const close=document.createElement('button');close.type='button';close.textContent='Close';close.addEventListener('click',()=>dialog.close());
  header.append(title,download,close);status=document.createElement('p');status.className='file-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');body=document.createElement('div');body.className='file-body';
  dialog.append(header,status,body);dialog.addEventListener('close',()=>{ticket++;clear();body.replaceChildren();download.hidden=true;download.removeAttribute('href');});document.body.appendChild(dialog);
 }
 function filename(header){
  const value=/filename\*=UTF-8''([^;]+)/i.exec(header||'');
  let name='Project document';
  try{name=value?decodeURIComponent(value[1]):/filename="([^"]+)"/i.exec(header||'')?.[1]||/filename=([^;]+)/i.exec(header||'')?.[1]||name;}catch{}
  return name.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g,'').trim()||'Project document';
 }
 async function open(options){
  ensure();const current=++ticket;clear();body.replaceChildren();title.textContent='Project document';status.textContent='Loading document…';download.hidden=true;download.removeAttribute('href');
  if(!dialog.open)dialog.showModal();
  controller=new AbortController();
  try{
   const response=await options.fetch(options.contentUrl,{cache:'no-store',signal:controller.signal});
   if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.message||'Unable to load document ('+response.status+').');}
   const blob=await response.blob();if(current!==ticket||!dialog.open)return;
   if(!blob.size)throw Error('The document is empty.');
   const name=options.fileName||filename(response.headers.get('Content-Disposition'));
   const type=(blob.type||response.headers.get('Content-Type')||'').split(';')[0].toLowerCase();
   title.textContent=name;
   const prefix=await blob.slice(0,5).text();if(current!==ticket||!dialog.open)return;
   const pdf=prefix==='%PDF-';
   // Active formats, including HTML and SVG, never execute in the VERO origin.
   objectUrl=URL.createObjectURL(pdf?new Blob([blob],{type:'application/pdf'}):blob);download.href=objectUrl;download.download=name;download.hidden=false;
   if(pdf){
    status.textContent='Rendering PDF…';
    const library=await (options.loadPdf||loadPdf)();if(current!==ticket||!dialog.open)return;
    const task=library.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false,enableXfa:false,cMapUrl:new URL('vendor/pdfjs/cmaps/',assetBase).href,cMapPacked:true,standardFontDataUrl:new URL('vendor/pdfjs/standard_fonts/',assetBase).href,wasmUrl:new URL('vendor/pdfjs/wasm/',assetBase).href});
    const pdf=await task.promise;if(current!==ticket||!dialog.open){await pdf.destroy();return;}pdfDocument=pdf;
    const controls=document.createElement('div'),previous=document.createElement('button'),next=document.createElement('button'),counter=document.createElement('span'),canvas=document.createElement('canvas'),text=document.createElement('p');
    previous.type=next.type='button';previous.textContent='Previous page';next.textContent='Next page';controls.style.cssText='display:flex;align-items:center;gap:14px;margin:0 0 14px';canvas.style.cssText='display:block;max-width:100%;height:auto;margin:auto';canvas.setAttribute('role','img');text.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';controls.append(previous,counter,next);body.append(controls,canvas,text);
    let pageNumber=1;
    async function renderPage(){
     previous.disabled=next.disabled=true;
     try{
      const page=await pdf.getPage(pageNumber);if(current!==ticket||!dialog.open)return;
      const natural=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(2,Math.max(1,(body.clientWidth||900)/natural.width))});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;if(current!==ticket||!dialog.open)return;
      const content=await page.getTextContent();if(current!==ticket||!dialog.open)return;text.textContent=content.items.map(item=>item.str||'').join(' ');canvas.setAttribute('aria-label',name+' page '+pageNumber);counter.textContent='Page '+pageNumber+' of '+pdf.numPages;status.textContent='Document loaded.';previous.disabled=pageNumber===1;next.disabled=pageNumber===pdf.numPages;
     }catch(error){if(current===ticket)status.textContent='PDF preview unavailable: '+error.message+'. Use Download to open the file.';}
    }
    previous.addEventListener('click',()=>{if(pageNumber>1){pageNumber--;renderPage();}});next.addEventListener('click',()=>{if(pageNumber<pdf.numPages){pageNumber++;renderPage();}});await renderPage();
   }
   else if(['image/png','image/jpeg','image/gif','image/webp'].includes(type)){const img=document.createElement('img');img.alt=name;img.src=objectUrl;img.addEventListener('error',()=>{if(current===ticket)status.textContent='Image preview unavailable. Use Download to open the file.';});body.appendChild(img);status.textContent='Document loaded.';}
   else if((type.startsWith('text/')||['application/json','application/xml'].includes(type)||/\.(txt|csv|json|xml|log)$/i.test(name))&&blob.size<=2*1024*1024){const content=await blob.text();if(current!==ticket||!dialog.open)return;const pre=document.createElement('pre');pre.textContent=content;body.appendChild(pre);status.textContent='Document loaded.';}
   else{status.textContent='This file needs a separate application. Use Download to open it.';}
  }catch(error){if(current!==ticket||!dialog.open)return;clear();download.hidden=true;status.textContent=error.message||'Unable to load document. Close this viewer and try again.';}
 }
 root.VeroProjectDocumentViewer={open};
 if(typeof module!=='undefined'&&module.exports)module.exports={open,filename};
})(typeof globalThis!=='undefined'?globalThis:this);
