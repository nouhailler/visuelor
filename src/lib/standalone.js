// Exporte une présentation chiffrée sous forme de fichier HTML autonome :
// le destinataire ouvre le fichier hors ligne, saisit le mot de passe, et lit.
// Le contenu reste chiffré (AES-GCM) tant que le mot de passe n'est pas saisi.

// Le lecteur est écrit en JS vanilla SANS backticks ni template literals
// (contrainte d'injection dans le gabarit ci-dessous).

const VIEWER = [
  'var PAYLOAD = "%PAYLOAD%";',
  'function b64u(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";var b=atob(s),o=new Uint8Array(b.length);for(var i=0;i<b.length;i++)o[i]=b.charCodeAt(i);return o}',
  'function hex(b){return Array.prototype.map.call(b,function(x){return ("0"+x.toString(16)).slice(-2)}).join("")}',
  'var stage=document.getElementById("st"),shell=document.getElementById("sh"),msg=document.getElementById("msg"),pw=document.getElementById("pw"),btn=document.getElementById("go"),lock=document.getElementById("lock"),bar=document.getElementById("bar");',
  'function fail(t){msg.textContent=t;msg.style.color="#e5646c";btn.disabled=false;btn.textContent="Ouvrir"}',
  'btn.onclick=openIt;pw.addEventListener("keydown",function(ev){if(ev.key==="Enter")openIt()});pw.focus();',
  'function openIt(){'
  ,'  var password=pw.value;if(!password){fail("Saisissez le mot de passe.");return}'
  ,'  btn.disabled=true;btn.textContent="Déchiffrement…";msg.textContent="";msg.style.color="#9c9cb4";'
  ,'  crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"])'
  ,'  .then(function(base){return crypto.subtle.deriveKey({name:"PBKDF2",salt:b64u(PAYLOAD).slice(1,17),iterations:200000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["decrypt"])})'
  ,'  .then(function(key){return crypto.subtle.decrypt({name:"AES-GCM",iv:b64u(PAYLOAD).slice(17,29)},key,b64u(PAYLOAD).slice(29))})'
  ,'  .then(function(buf){var pres=JSON.parse(new TextDecoder().decode(buf));lock.style.display="none";bar.style.display="flex";start(pres)})'
  ,'  .catch(function(){fail("Mot de passe incorrect ou fichier corrompu.")})'
  ,'};',
  '// ── Lecteur ────────────────────────────────────────────────────────────',
  'var FONT={"Inter":"system-ui","Montserrat":"Segoe UI","Playfair Display":"Georgia","Lora":"Georgia","Caveat":"cursive","Roboto Mono":"monospace"};',
  'var slides=null,idx=0,popupEl=null;',
  'function start(pres){slides=pres.slides;render(0);document.addEventListener("keydown",function(ev){',
  '  if(ev.key==="ArrowRight"||ev.key===" "){ev.preventDefault();render(Math.min(idx+1,slides.length-1))}',
  '  else if(ev.key==="ArrowLeft"){ev.preventDefault();render(Math.max(idx-1,0))}',
  '  else if(ev.key==="Escape"){window.close()} });}',
  'function render(i){idx=i;closePop();stage.innerHTML="";stage.style.background=slides[i].background||"#fff";',
  '  slides[i].elements.forEach(function(el){stage.appendChild(build(el))});',
  '  document.getElementById("ct").textContent=(i+1)+" / "+slides.length;}',
  'function closePop(){if(popupEl){popupEl.remove();popupEl=null}}',
  'function build(el){'
  ,'  var w=document.createElement("div");w.style.cssText="position:absolute;left:"+el.x+"px;top:"+el.y+"px;width:"+el.w+"px;height:"+el.h+"px;";'
  ,'  var hasPop=el.popup&&el.popup.enabled;'
  ,'  if(el.type==="text"){w.innerHTML=esc(el.text);w.style.cssText+=lineStyle(el)+";font-family:"+FONT[el.fontFamily]+";font-size:"+el.fontSize+"px;color:"+(el.color||"#000")+";font-weight:"+(el.bold?700:400)+";font-style:"+(el.italic?"italic":"normal")+";text-align:"+(el.align||"left")+";line-height:1.25;background:"+(el.bg==="transparent"?"transparent":el.bg||"transparent")+";white-space:pre-wrap;word-break:break-word;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-start;"}'
  ,'  else if(el.type==="shape"){var inner=document.createElement("div");var s="width:100%;height:100%;background:"+el.fill+";opacity:"+el.opacity+";";'
  ,'    if(el.borderWidth>0)s+="border:"+el.borderWidth+"px solid "+el.borderColor+";";'
  ,'    if(el.shape==="ellipse")s+="border-radius:50%;";else if(el.shape!=="triangle")s+="border-radius:"+(el.radius||0)+"px;";'
  ,'    if(el.shape==="triangle"){var svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 100 100");svg.setAttribute("preserveAspectRatio","none");svg.style.cssText="width:100%;height:100%;display:block";var pol=document.createElementNS("http://www.w3.org/2000/svg","polygon");pol.setAttribute("points","50,0 100,100 0,100");pol.setAttribute("fill",el.fill);pol.setAttribute("opacity",el.opacity);svg.appendChild(pol);inner=svg;}'
  ,'    else{inner.style.cssText=s;} w.appendChild(inner);} '
  ,'  else if(el.type==="image"&&el.src){var img=new Image();img.src=el.src;img.style.cssText="width:100%;height:100%;object-fit:"+(el.fit||"cover")+";";w.appendChild(img);}'
  ,'  else if(el.type==="embed"&&el.url&&/youtube|vimeo/.test(el.url)){var f=document.createElement("iframe");f.src=embed(el.url);f.style.cssText="width:100%;height:100%;border:0;border-radius:8px";f.allow="autoplay;encrypted-media;fullscreen";f.allowFullscreen=true;w.appendChild(f);}'
  ,'  if(hasPop){'
  ,'    if(el.popup.trigger==="hover"){w.addEventListener("mouseenter",function(ev){showPop(w,el)});w.addEventListener("mouseleave",closePop);}'
  ,'    else{w.addEventListener("click",function(ev){ev.stopPropagation();if(popupEl){closePop();}else{showPop(w,el)}});}'
  ,'  }'
  ,'  if(el.link&&el.link.type!=="none"){w.addEventListener("click",function(ev){ev.stopPropagation();if(el.link.type==="url"){window.open(el.link.url,"_blank","noopener")}else if(el.link.type==="slide"){var t=findSlide(el.link.slideId);if(t>=0)render(t)}});}'
  ,'  return w;}',
  'function findSlide(id){for(var i=0;i<slides.length;i++)if(slides[i].id===id)return i;return -1}',
  'function lineStyle(el){return "display:flex"}',
  'function esc(s){var d=document.createElement("div");d.textContent=s==null?"":s;return d.innerHTML}',
  'function embed(u){var y=u.match(/(?:youtube\\.com\\/(?:watch\\?v=|embed\\/|shorts\\/)|youtu\\.be\\/)([\\w-]{11})/);if(y)return"https://www.youtube.com/embed/"+y[1];var v=u.match(/vimeo\\.com\\/(?:video\\/)?(\\d+)/);if(v)return"https://player.vimeo.com/video/"+v[1];return u}',
  'function showPop(host,el){'
  ,'  closePop();var pop=document.createElement("div");pop.style.cssText="position:absolute;left:calc(50% - 150px);width:300px;max-width:340px;background:#fff;color:#1c1c28;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,0.3);overflow:hidden;z-index:50;";'
  ,'  pop.style.cssText+=(el.popup.below?"top:calc(100% + 10px);":"bottom:calc(100% + 10px);");'
  ,'  if(el.popup.image){var im=new Image();im.src=el.popup.image;im.style.cssText="width:100%;max-height:200px;object-fit:cover;display:block";pop.appendChild(im)}'
  ,'  var body=document.createElement("div");body.style.cssText="padding:14px 16px";'
  ,'  if(el.popup.title){var tt=document.createElement("div");tt.style.cssText="font-weight:700;font-size:15px;margin-bottom:5px";tt.textContent=el.popup.title;body.appendChild(tt)}'
  ,'  if(el.popup.text){var tx=document.createElement("div");tx.style.cssText="font-size:13.5px;line-height:1.5";tx.style.whiteSpace="pre-wrap";tx.textContent=el.popup.text;body.appendChild(tx)}'
  ,'  var cl=document.createElement("button");cl.textContent="\\u2715";cl.style.cssText="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.45);color:#fff;width:24px;height:24px;border-radius:50%;border:0;font-size:13px;cursor:pointer";cl.onclick=function(ev){ev.stopPropagation();closePop()};pop.appendChild(cl);'
  ,'  host.appendChild(pop);popupEl=pop;}',
  'function fit(){var k=Math.min(document.documentElement.clientWidth/1280,document.documentElement.clientHeight/720);shell.style.width=(1280*k)+"px";shell.style.height=(720*k)+"px";stage.style.transform="scale("+k+")";window.__k=k;}',
  'window.addEventListener("resize",fit);fit();',
  'document.getElementById("pv").addEventListener("click",function(){render(Math.max(idx-1,0))});',
  'document.getElementById("nx").addEventListener("click",function(){render(Math.min(idx+1,slides.length-1))});',
].join('\n')

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;') }

export function buildStandaloneHtml(payload) {
  const viewer = VIEWER.replace('%PAYLOAD%', payload)
  return [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Présentation protégée — visuelor</title>',
    '<style>',
    'html,body{margin:0;height:100%;font-family:system-ui,sans-serif;background:#0b0b12;color:#ececf4}',
    '#lock{display:grid;place-items:center;height:100%}',
    '.card{background:#1e1e2b;border:1px solid #34344a;border-radius:14px;padding:28px;width:min(340px,86vw);text-align:center}',
    'h1{font-size:18px;margin:0 0 6px}.lockico{font-size:40px}.sub{color:#9c9cb4;font-size:13px;margin-bottom:18px}',
    'input{width:100%;box-sizing:border-box;background:#16161f;border:1px solid #34344a;color:#ececf4;border-radius:10px;padding:11px 12px;font-size:15px;outline:none;text-align:center}',
    'input:focus{border-color:#6c6ce5}',
    'button{margin-top:12px;width:100%;background:#6c6ce5;border:0;border-radius:10px;color:#fff;font-size:15px;font-weight:600;padding:11px;cursor:pointer}',
    'button:disabled{opacity:.6}',
    '#msg{font-size:13px;margin-top:10px;min-height:17px}',
    '#bar{display:none;position:fixed;bottom:16px;left:50%;transform:translateX(-50%);gap:10px;align-items:center;background:rgba(20,20,30,.72);border-radius:999px;padding:8px 14px;z-index:60}',
    '#bar button{width:auto;margin:0;padding:4px 12px;font-size:14px;background:rgba(255,255,255,.12)}',
    '#ct{color:#cfcfe6;font-size:13px}',
    '#wrap{display:grid;place-items:center;height:100%;overflow:hidden}',
    '</style></head><body>',
    '<div id="lock"><div class="card">',
    '<div class="lockico">🔒</div><h1>Présentation protégée</h1>',
    '<div class="sub">Entièrement chiffrée (AES-GCM). Saisissez le mot de passe pour l\'ouvrir — tout reste dans votre appareil.</div>',
    '<input id="pw" type="password" placeholder="Mot de passe" autofocus>',
    '<button id="go">Ouvrir</button><div id="msg"></div>',
    '</div></div>',
    '<div id="wrap"><div id="sh" style="position:relative"><div id="st" style="position:relative;width:1280px;height:720px;transform-origin:0 0;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4)"></div></div></div>',
    '<div id="bar"><button id="pv">←</button><span id="ct"></span><button id="nx">→</button><button onclick="window.close()" title="Refermer">✕</button></div>',
    '<script>', viewer, '</' + 'script></body></html>',
  ].join('\n')
}

export function downloadStandalone(payload, filename) {
  const html = buildStandaloneHtml(payload)
  const blob = new Blob([html], { type: 'text/html' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename || 'presentation-protegee.html'
  document.body.appendChild(a)
  a.click()
  URL.revokeObjectURL(a.href)
  a.remove()
}
