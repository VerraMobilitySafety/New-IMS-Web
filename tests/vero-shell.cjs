/* Run with Playwright available and Chrome installed (or CHROME_PATH set). */
const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const pages = fs.readdirSync(root).filter(n=>n.endsWith('.html') && /src=["'][^"']*\bnav\.js/.test(fs.readFileSync(path.join(root,n),'utf8')));
const nav = fs.readFileSync(path.join(root,'nav.js'),'utf8');
for (const name of pages) {
  const html = fs.readFileSync(path.join(root,name),'utf8');
  assert.equal((html.match(/href="vero-shell.css"/g)||[]).length,1,name);
  assert.ok(html.indexOf('href="vero-shell.css"')<html.search(/<style|<script|href="nav.css"/),name+' early shell');
  assert.equal((html.match(/href="nav.css"/g)||[]).length,1,name+' duplicate nav CSS');
  if(/<body[^>]*data-register-layout=/.test(html))assert.match(html,/<body[^>]*class="[^"]*\bvr-page\b/,name+' responsive shell is static');
}
assert.ok(!/style\.(width|marginLeft)|SIDEBAR_WIDTH|createElement\('style'\)/.test(nav));
const geometry = () => {
  const rect = s => {const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(n=>Math.round(n*100)/100);};
  return {sidebar:rect('.sidebar'),brand:rect('.brand'),footer:rect('.side-foot'),main:rect('.main'),nav:rect('.sidebar .nav')};
};
(async()=>{
  const systemChrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || (fs.existsSync(systemChrome)?systemChrome:undefined)});
  try {
    for (const width of [1440,1024,720,390]) {
      const page = await browser.newPage({viewport:{width,height:900}});
      await page.route('https://**',r=>r.abort());
      await page.route('http://vero.test/**',async route=>{
        const filename = new URL(route.request().url()).pathname.slice(1);
        const file = path.join(root,filename);
        if(filename.endsWith('.js'))return route.fulfill({contentType:'text/javascript',body:''});
        if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
        const body=fs.readFileSync(file,'utf8');
        return route.fulfill({contentType:filename.endsWith('.css')?'text/css':'text/html',body:filename.endsWith('.html')?body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''):body});
      });
      for(const name of pages) {
        await page.goto(`http://vero.test/${name}`,{waitUntil:'load'});
        // Hold account and action responses until after initial geometry is recorded.
        await page.evaluate(()=>{
          document.querySelector('#vh')?.removeAttribute('hidden');
          localStorage.setItem('vero_session_token','synthetic');
          window.navResponses=[];
          window.fetch=url=>new Promise(resolve=>window.navResponses.push({url,resolve}));
        });
        const before=await page.evaluate(geometry);
        await page.evaluate(nav);
        const after=await page.evaluate(geometry);
        assert.deepEqual(after,before,`${name} ${width}: nav mount changed shell`);
        const rowGeometry=es=>es.filter(e=>e.id!=='clientServicesSiteNav'&&e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]});
        const rows=await page.locator('#vero-nav a').evaluateAll(rowGeometry);
        await page.evaluate(()=>{
          // Lucide replaces its placeholder with an SVG carrying the same class.
          document.querySelectorAll('#vero-nav [data-lucide]').forEach(e=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','ico');svg.setAttribute('width','24');svg.setAttribute('height','24');e.replaceWith(svg)});
          window.navResponses.forEach(({url,resolve})=>resolve({ok:true,json:async()=>url.endsWith('/auth/me')?{user:{vero_role:'Administrator'}}:{actions:Array.from({length:100})}}));
        });
        await page.waitForFunction(()=>document.getElementById('vero-my-actions-count').textContent==='99+');
        const resolvedRows=await page.locator('#vero-nav a').evaluateAll(rowGeometry);
        assert.deepEqual(resolvedRows,rows,`${name} ${width}: icons/auth/badge changed rows`);
        assert.deepEqual(await page.evaluate(geometry),after,`${name} ${width}: async changes moved shell`);
        if(name==='index.html') {
          for(const outcome of ['zero','error']) {
            await page.evaluate(outcome=>{
              window.fetch=async()=>({ok:outcome==='zero',status:503,json:async()=>({actions:[]})});
              window.dispatchEvent(new Event('focus'));
            },outcome);
            await page.waitForFunction(()=>document.getElementById('vero-my-actions-count').hidden);
            assert.deepEqual(await page.locator('#vero-nav a').evaluateAll(rowGeometry),rows,'hidden badge preserves row geometry');
          }
        }
        if(width<=720) {
          const overlayClass = await page.evaluate(()=>document.body.dataset.registerLayout?'vr-nav-open':document.querySelector('#vh')?'heights-nav-open':null);
          if(overlayClass) {
            await page.evaluate(c=>document.body.classList.add(c),overlayClass);
            assert.ok(await page.locator('.sidebar').evaluate(e=>e.checkVisibility()),name+' mobile menu opens');
            await page.evaluate(c=>document.body.classList.remove(c),overlayClass);
          }
          if(name==='reports.html') {
            await page.locator('.sidebar').evaluate(e=>e.classList.add('mobile-open'));
            assert.ok(await page.locator('.sidebar').evaluate(e=>e.checkVisibility()),'reports mobile menu opens');
            await page.locator('.sidebar').evaluate(e=>e.classList.remove('mobile-open'));
          }
        }
        if(process.env.VERO_SHELL_SCREENSHOTS && width===1440 && ['index.html','reports.html','working-at-heights.html'].includes(name)) {
          fs.mkdirSync(process.env.VERO_SHELL_SCREENSHOTS,{recursive:true});
          await page.screenshot({path:path.join(process.env.VERO_SHELL_SCREENSHOTS,name+'.png')});
        }
        const active=page.locator(`#vero-nav a[href="${name}"].active`);
        if(!['users.html','maintenance-workspace.html','project-workspace.html'].includes(name))assert.ok(await active.count(),name+' active link');
        const expand=page.locator('#riskNavGroup .vero-nav-expand');
        await expand.evaluate(e=>e.click());
        assert.equal(await page.locator('#riskNavGroup').evaluate(e=>e.classList.contains('open')),await expand.getAttribute('aria-expanded')==='true');
        if(width===1440) {
          assert.equal(after.sidebar[2],300,name+' sidebar width');
          assert.equal(after.main[0],300,name+' content offset');
          assert.ok(await page.locator('.sidebar .nav').evaluate(e=>e.clientHeight>0 && getComputedStyle(e).overflowY==='auto'),name+' scroll region');
        }
      }
      console.log(`PASS ${pages.length} pages at ${width}px: initial shell, icons, account, badge, active links, dropdowns`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
