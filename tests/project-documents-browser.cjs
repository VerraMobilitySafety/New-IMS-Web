const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.join(__dirname,'..');
test('project Documents tab combines all sources, retries and opens existing files on desktop and mobile',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);let fail=true;
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname.endsWith('/document-index'))return fail?route.fulfill({status:503,json:{message:'Temporary index failure'}}):route.fulfill({json:{documents:[{id:1,document_title:'Site safety plan',version_number:2,linked_via:['Site: Nine']}],records:[{id:1,title:'Signed agreement',record_code:'REC1',linked_via:['Linked project record']}],uploads:[{id:1,title:'Master contract',filename:'contract.txt',linked_via:['Project upload']}]}});
   if(u.pathname.endsWith('/content'))return route.fulfill({contentType:'text/plain',body:'Existing project contract contents'});
   if(u.hostname!=='vero.test')return route.abort();
   const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);
   if(file.endsWith('.html')){
    body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
    // On a narrow screen exercise the Documents panel independently of the existing fixed sidebar.
    if(width===390){const section=body.slice(body.indexOf('<section id="documents"'),body.indexOf('<section id="assurance"'));body='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;padding:12px}</style></head><body>'+section+'</body></html>';}
    body=body.replace('</body>','<script src="project-document-viewer.js"></script><script src="project-documents.js"></script><script>VeroProjectDocuments.mount(document.getElementById("projectDocumentsList"),4,(...args)=>fetch(...args),"/api",document.getElementById("projectDocumentCount"));document.querySelectorAll(".ws-view").forEach(e=>e.style.display="none");document.getElementById("documents").style.display="block";</script></body>');
   }
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/project-workspace.html?id=4');await page.getByText('Temporary index failure',{exact:false}).waitFor();fail=false;await page.getByRole('button',{name:'Retry',exact:true}).click();
  await page.getByRole('cell',{name:'Site safety plan',exact:true}).waitFor();assert.equal(await page.locator('#projectDocumentsList tbody tr').count(),3);
  await page.getByRole('searchbox',{name:'Search project documents'}).fill('Nine');assert.equal(await page.locator('#projectDocumentsList tbody tr').count(),1);
  await page.getByRole('searchbox',{name:'Search project documents'}).fill('');await page.getByRole('combobox',{name:'Document or record type'}).selectOption('upload');
  await page.getByRole('button',{name:'Open file',exact:true}).click();await page.getByText('Existing project contract contents',{exact:true}).waitFor();await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('combobox',{name:'Document or record type'}).selectOption('');assert.deepEqual(errors,[]);
  assert.ok(await page.locator('#projectDocumentsList').evaluate(e=>e.getBoundingClientRect().width)<=width);
  await page.close();
 }}finally{await browser.close();}
});
