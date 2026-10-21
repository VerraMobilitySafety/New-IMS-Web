/* Run after editing nav.js to keep every multi-page shell in sync. */
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),{renderNavigation,VERSION}=require('../nav.js');
let count=0;
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))){let html=fs.readFileSync(path.join(root,file),'utf8');if(!html.includes('id="vero-nav"'))continue;
 html=html.replace(/<div id="vero-nav"[^>]*>[\s\S]*?<\/div><!-- vero-nav:end -->/g,'<div id="vero-nav"></div>').replace('<div id="vero-nav"></div>','<div id="vero-nav" data-vero-nav="'+VERSION+'">'+renderNavigation(file)+'</div><!-- vero-nav:end -->');
 fs.writeFileSync(path.join(root,file),html);count++;}
console.log('Rendered shared navigation in '+count+' pages');
