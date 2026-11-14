const puppeteer=require('puppeteer');const path=require('path');const {execFileSync}=require('child_process');
const D=__dirname;
(async()=>{const br=await puppeteer.launch({headless:'new'});try{const p=await br.newPage();
await p.setViewport({width:1920,height:1080,deviceScaleFactor:1});
await p.goto('file://'+path.join(D,'variants.html'),{waitUntil:'networkidle0'});await p.evaluate(()=>document.fonts.ready);
await new Promise(r=>setTimeout(r,600));const s=await p.$$('.slide');
for(let i=0;i<s.length;i++)await s[i].screenshot({path:path.join(D,`v${i+1}.png`)});}finally{await br.close();}
execFileSync('python3',[path.join(D,'sheet.py'),D],{stdio:'inherit'});})().catch(e=>{console.error(e);process.exit(1)});
