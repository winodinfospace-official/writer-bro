const KEY='writerbro-kannada-v2';
const PAGE_H=981; // content height in CSS px after padding
const state={title:'',blocks:[],active:null};
const pagesEl=document.getElementById('pages'), sceneList=document.getElementById('sceneList');
const TYPES=['scene','action','character','dialogue','parenthetical','transition'];
const LABEL={scene:'Scene Heading',action:'Action',character:'Character',dialogue:'Dialogue',parenthetical:'Parenthetical',transition:'Transition'};
let selectedType='scene';
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function defaultBlock(type='scene',text=''){return {id:uid(),type,text}}
function newScript(){state.title='';state.blocks=[defaultBlock('scene','')];state.active=state.blocks[0].id;render();save(false);focusActive()}
function load(){try{const raw=localStorage.getItem(KEY);if(raw){Object.assign(state,JSON.parse(raw)); if(!state.blocks?.length) newScript(); else render(); return}}catch(e){} newScript()}
function save(show=true){localStorage.setItem(KEY,JSON.stringify(state));document.getElementById('saveState').textContent=show?'Saved locally':'Local autosave on';setTimeout(()=>document.getElementById('saveState').textContent='Local autosave on',1400)}
function sanitize(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function blockHTML(b){return `<div class="block ${b.type}" contenteditable="true" data-id="${b.id}" data-type="${b.type}">${sanitize(b.text)}</div>`}
function render(){
 pagesEl.innerHTML=''; let page=makePage(1); pagesEl.appendChild(page); let container=page.querySelector('.blocks');
 state.blocks.forEach((b,i)=>{const temp=document.createElement('div');temp.innerHTML=blockHTML(b);const el=temp.firstElementChild;container.appendChild(el);
   if(container.scrollHeight>PAGE_H && container.children.length>1){container.removeChild(el);page=makePage(document.querySelectorAll('.page').length+1);pagesEl.appendChild(page);container=page.querySelector('.blocks');container.appendChild(el);}
 });
 bindBlocks();renderScenes();stats();
}
function makePage(n){const d=document.createElement('section');d.className='page';d.innerHTML=`<div class="blocks"></div><div class="page-number">${n}</div>`;return d}
function bindBlocks(){document.querySelectorAll('.block').forEach(el=>{el.addEventListener('focus',()=>{state.active=el.dataset.id;selectedType=el.dataset.type;updateFormat()});el.addEventListener('input',()=>{const b=state.blocks.find(x=>x.id===el.dataset.id);if(!b)return;b.text=el.innerText;paginateFrom(el);save(false);stats();});el.addEventListener('keydown',onKey)});}
function paginateFrom(el){
 const page=el.closest('.page'), container=page.querySelector('.blocks');
 if(container.scrollHeight<=PAGE_H)return;
 const b=state.blocks.find(x=>x.id===el.dataset.id); if(!b)return;
 // split oversized text; otherwise move the overflowing block to a new page through render
 if(el.offsetHeight>PAGE_H){splitOversized(b);return}
 render();focusActive();
}
function splitOversized(b){
 const words=b.text.split(/(\s+)/);let fit='',rest='';const test=document.createElement('div');test.className='block '+b.type;test.style.cssText='position:absolute;visibility:hidden;width:100%;font-size:14px;line-height:1.58;white-space:pre-wrap;word-break:break-word';document.body.appendChild(test);
 for(let i=0;i<words.length;i++){test.textContent=fit+words[i];if(test.offsetHeight>PAGE_H-8){rest=words.slice(i).join('');break}fit+=words[i]}
 test.remove(); if(!rest)return; b.text=fit.trimEnd();const idx=state.blocks.findIndex(x=>x.id===b.id);state.blocks.splice(idx+1,0,defaultBlock(b.type,rest.trimStart()));state.active=state.blocks[idx+1].id;render();focusActive()
}
function onKey(e){const id=this.dataset.id, idx=state.blocks.findIndex(b=>b.id===id);if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();const nextType=this.dataset.type==='character'?'dialogue':this.dataset.type==='dialogue'?'action':this.dataset.type;const nb=defaultBlock(nextType,'');state.blocks.splice(idx+1,0,nb);state.active=nb.id;render();focusActive()}else if(e.key==='Tab'){e.preventDefault();const t=TYPES[(TYPES.indexOf(this.dataset.type)+1)%TYPES.length];state.blocks[idx].type=t;selectedType=t;render();focusActive()}else if(e.key==='Backspace'&&this.innerText.trim()===''&&state.blocks.length>1){e.preventDefault();state.blocks.splice(idx,1);state.active=state.blocks[Math.max(0,idx-1)].id;render();focusActive()}}
function focusActive(){const el=document.querySelector(`[data-id="${CSS.escape(state.active||'')}"]`);if(el){el.focus();const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r)}}
function updateFormat(){document.querySelectorAll('.fmt').forEach(x=>x.classList.toggle('active',x.dataset.type===selectedType))}
function renderScenes(){sceneList.innerHTML='';let n=0;state.blocks.forEach(b=>{if(b.type==='scene'){n++;const d=document.createElement('div');d.className='scene '+(b.id===state.active?'selected':'');d.innerHTML=`<span class="scene-num">${n}</span><span>${sanitize((b.text||'(untitled scene)').slice(0,28))}</span>`;d.onclick=()=>{state.active=b.id;document.querySelector(`[data-id="${CSS.escape(b.id)}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});focusActive()};sceneList.appendChild(d)}});if(!n)sceneList.innerHTML='<div class="scene"><span class="scene-num">—</span><span>No scenes yet</span></div>'}
function stats(){const words=state.blocks.reduce((n,b)=>n+(b.text.trim()?b.text.trim().split(/\s+/).length:0),0);document.getElementById('stats').textContent=`${document.querySelectorAll('.page').length} page${document.querySelectorAll('.page').length!==1?'s':''} · ${words} words`}
function addScene(){const b=defaultBlock('scene','');state.blocks.push(b);state.active=b.id;render();focusActive();save(false)}
function exportWBS(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});download(blob,(state.title||'writer-bro')+'.wbs')}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function exportWord(){let html='<html><head><meta charset="utf-8"><style>body{font-family:Arial,"Nirmala UI";font-size:12pt} .scene{font-weight:bold;border-bottom:1px solid #aaa}.character{text-align:center;font-weight:bold}.dialogue{width:55%;margin:auto}.parenthetical{width:45%;margin:auto;font-style:italic}.transition{text-align:right;font-weight:bold}</style></head><body>';state.blocks.forEach(b=>html+=`<div class="${b.type}">${sanitize(b.text).replace(/\n/g,'<br>')||'&nbsp;'}</div><br>`);html+='</body></html>';download(new Blob([html],{type:'application/msword'}),(state.title||'writer-bro')+'.doc')}
function openFile(file){const r=new FileReader();r.onload=()=>{try{Object.assign(state,JSON.parse(r.result));if(!state.blocks?.length)throw 1;render();save(false)}catch(e){alert('Invalid .wbs file')}};r.readAsText(file)}
document.getElementById('wbsBtn').onclick=exportWBS;document.getElementById('newBtn').onclick=()=>{if(confirm('Start a new screenplay? Unsaved local content will be replaced.'))newScript()};document.getElementById('saveBtn').onclick=()=>save(true);document.getElementById('wordBtn').onclick=exportWord;document.getElementById('pdfBtn').onclick=()=>window.print();document.getElementById('openBtn').onclick=()=>document.getElementById('fileInput').click();document.getElementById('fileInput').onchange=e=>e.target.files[0]&&openFile(e.target.files[0]);document.getElementById('addScene').onclick=addScene;document.getElementById('title').oninput=e=>{state.title=e.target.value;save(false)};
document.querySelectorAll('.fmt').forEach(btn=>btn.onclick=()=>{selectedType=btn.dataset.type;const b=state.blocks.find(x=>x.id===state.active);if(b)b.type=selectedType;updateFormat();render();focusActive()});
document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;const m={'1':'scene','2':'action','3':'character','4':'dialogue','5':'parenthetical','6':'transition'};if(m[e.key]){e.preventDefault();selectedType=m[e.key];const b=state.blocks.find(x=>x.id===state.active);if(b){b.type=selectedType;render();focusActive()}}if(e.key.toLowerCase()==='s'){e.preventDefault();save(true)}});
window.addEventListener('beforeunload',()=>save(false));load();
