const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){({chromium}=require('C:/Users/dbleasel/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.join(__dirname,'..');
test('maintenance Documents tab combines accessible contract, client, site documents and records on desktop and mobile',async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
 try{for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('vero_session_token','fixture-only'));
  const items={documents:[{id:40,document_number:'OP40',document_title:'Site safety plan',document_type:'Safety Management Plan',version_number:'1.1',linked_via:['Site: Nine']},{id:41,document_title:'Client operating manual',version_number:'2.0',linked_via:['Shared client document']}],records:[{id:22,record_code:'REC22',title:'Contract agreement',kind:'Contract source record',linked_via:['Contract source file'],content_path:'/maintenance-contracts/4/sources/7',filename:'contract.txt'}]};
  let fail=true;
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname.endsWith('/maintenance-contracts'))return route.fulfill({json:{contracts:[{id:4,contract_code:'CT4',contract_name:'Contract Four',customer_name:'Client A'}]}});
   if(u.pathname.endsWith('/details'))return route.fulfill({json:{sources:[],requirements:[]}});
   if(u.pathname.endsWith('/4/documents'))return fail?route.fulfill({status:503,json:{message:'Temporary index failure'}}):route.fulfill({json:items});
   if(u.pathname.endsWith('/sources/7'))return route.fulfill({contentType:'text/plain',body:'Existing contract source contents'});
   if(u.hostname!=='vero.test')return route.abort();
   const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(file);
   if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>','<script src="project-document-viewer.js"></script><script src="maintenance-documents.js"></script><script src="customer-contracts.js"></script><script>loadContractWorkspace()</script></body>');
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});
  });
  await page.goto('https://vero.test/maintenance-workspace.html?id=4');
  await page.getByRole('button',{name:'Documents',exact:true}).click();
  await page.getByText('Temporary index failure',{exact:false}).waitFor();
  fail=false;await page.getByRole('button',{name:'Retry',exact:true}).click();
  await page.getByRole('cell',{name:'OP40 · Site safety plan',exact:true}).waitFor();
  assert.equal(await page.locator('.maintenance-documents tbody tr').count(),3);
  assert.equal(await page.getByRole('link',{name:'View record',exact:true}).getAttribute('href'),'records.html?record_id=22');
  await page.getByRole('searchbox',{name:'Search linked documents'}).fill('Nine');
  assert.equal(await page.locator('.maintenance-documents tbody tr').count(),1);
  await page.getByRole('searchbox',{name:'Search linked documents'}).fill('');
  await page.getByRole('combobox',{name:'Document or record type'}).selectOption('record');
  assert.equal(await page.locator('.maintenance-documents tbody tr').count(),1);
  await page.getByRole('button',{name:'Open file',exact:true}).click();
  await page.getByText('Existing contract source contents',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  assert.deepEqual(errors,[]);
  if(width===1500){fs.mkdirSync(path.join(root,'../maintenance-document-preview'),{recursive:true});await page.screenshot({path:path.join(root,'../maintenance-document-preview/desktop.png')});}
  await page.close();
 }}finally{await browser.close();}
});
