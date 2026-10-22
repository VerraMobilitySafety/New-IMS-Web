const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),{renderNavigation,VERSION}=require('../nav.js');
test('every workspace ships the current shared menu, logo, icons and geometry before scripts',()=>{
 let count=0;
 for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.html'))){const html=fs.readFileSync(path.join(root,name),'utf8');if(!html.includes('id="vero-nav"'))continue;count++;
  const match=html.match(/<div id="vero-nav" data-vero-nav="([^"]+)">([\s\S]*?)<\/div><!-- vero-nav:end -->/);
  assert.ok(match,name+' initial menu');assert.equal(match[1],VERSION,name);assert.equal(match[2].replaceAll('\r\n','\n'),renderNavigation(name).replaceAll('\r\n','\n'),name+' regenerate with scripts/build-navigation.cjs');
  assert.equal((html.match(/href="vero-shell\.css\?/g)||[]).length,1,name);assert.ok(html.indexOf('href="vero-shell.css')<html.indexOf('<style'),name+' render blocking geometry');
  assert.equal((html.match(/src="nav\.js\?/g)||[]).length,1,name);assert.ok(html.indexOf('src="nav.js')<html.indexOf('<body'),name+' early shared boot');
  assert.ok(!html.includes('href="nav.css"'),name+' no duplicate shell');assert.ok(html.includes('class="vero-brand-logo"'),name+' static brand');
  assert.equal((match[2].match(/<svg /g)||[]).length,20,name+' initial icons');assert.ok(match[2].includes('vero-actions-slot'),name+' badge reserves space');
  assert.match(match[2],/id="continualImprovementNav" hidden style="display:none!important"/,name+' management link stays hidden until access is verified');
  if(/<body[^>]*data-register-layout=/.test(html))assert.match(html,/<body[^>]*class="[^"]*\bvr-page\b/,name+' mobile shell class is static');
 }
 assert.equal(count,41);
 const nav=fs.readFileSync(path.join(root,'nav.js'),'utf8');assert.doesNotMatch(nav,/style\.(width|marginLeft)|SIDEBAR_WIDTH|createElement\('style'\)/);
 const css=fs.readFileSync(path.join(root,'vero-shell.css'),'utf8');assert.match(css,/data:font\/woff2;base64/);assert.match(css,/data:image\/png;base64/);
});
