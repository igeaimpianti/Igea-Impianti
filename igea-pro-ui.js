/* IGEA PRO: application shell, navigation and read-only dashboard views. */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+({arrow:'<path d="M7 17 17 7M7 7h10v10"/>',chevron:'<path d="m9 5 7 7-7 7"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18"/>',plus:'<path d="M12 5v14M5 12h14"/>'}[name]||'')+'</svg>';
let activePage='dashboard';
let previousFocus=null;
const originalPage=window.showPage;
const titles={dashboard:'Panoramica',appointments:'Agenda',clients:'Clienti',quotes:'Preventivi',payments:'Pagamenti',expenses:'Movimenti',settings:'Impostazioni'};
function closeMore(){
 byId('moreMenu').classList.add('hidden');byId('menuBackdrop').classList.add('hidden');byId('moreButton').setAttribute('aria-expanded','false');
}
window.showPage=function(page){
 if(!titles[page])return;
 originalPage(page);activePage=page;
 byId('pageTitle').textContent=titles[page];
 document.querySelectorAll('[data-page]').forEach(b=>{const active=b.dataset.page===page;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 byId('moreButton').classList.toggle('active',['clients','expenses','settings'].includes(page));
 closeMore();window.scrollTo({top:0,behavior:'instant'});
};
function newRecord(page){
 window.showPage(page);
 if(page==='quotes'){
  window.showQuoteArea('create');
  if(!byId('cancelQuoteEditButton')?.classList.contains('hidden'))window.resetQuoteForm();
  byId('quoteSubject')?.focus();return;
 }
 const composer=byId(page+'Composer');if(composer)composer.open=true;
 const focus={clients:'clientName',appointments:'appointmentClient',expenses:'expenseDescription'}[page];
 byId(focus)?.focus({preventScroll:true});composer?.scrollIntoView({behavior:'smooth',block:'start'});
}
document.querySelectorAll('[data-new]').forEach(b=>b.addEventListener('click',()=>newRecord(b.dataset.new)));
byId('moreButton').addEventListener('click',()=>{
 const open=byId('moreMenu').classList.contains('hidden');byId('moreMenu').classList.toggle('hidden',!open);byId('menuBackdrop').classList.toggle('hidden',!open);byId('moreButton').setAttribute('aria-expanded',String(open));if(open)byId('closeMore').focus();
});
byId('closeMore').addEventListener('click',()=>{closeMore();byId('moreButton').focus();});
byId('menuBackdrop').addEventListener('click',closeMore);
byId('togglePassword').addEventListener('click',()=>{
 const field=byId('loginPassword'),show=field.type==='password';field.type=show?'text':'password';byId('togglePassword').textContent=show?'Nascondi':'Mostra';byId('togglePassword').setAttribute('aria-label',show?'Nascondi password':'Mostra password');
});
byId('customRangeToggle').addEventListener('click',()=>{
 const open=byId('customRange').classList.contains('hidden');byId('customRange').classList.toggle('hidden',!open);byId('customRangeToggle').setAttribute('aria-expanded',String(open));
});
byId('clearRange').addEventListener('click',()=>{byId('dashDateFrom').value='';byId('dashDateTo').value='';window.renderDashboard();});
byId('dashboardPeriod').addEventListener('change',()=>{byId('dashDateFrom').value='';byId('dashDateTo').value='';},true);
byId('todayLabel').textContent=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date()).toUpperCase();
byId('yearLabel').textContent=new Date().getFullYear();
function updateConnection(){
 const raw=byId('cloudStatus').textContent;
 const state=/Errore|non riuscita/i.test(raw)?'error':/connesso/i.test(raw)?'ready':'loading';
 const target=byId('connectionState');target.dataset.state=state;target.querySelector('span').textContent=!navigator.onLine?'Sei offline':state==='ready'?'Cloud connesso':state==='error'?'Errore connessione':'Caricamento…';target.title=raw;
}
new MutationObserver(updateConnection).observe(byId('cloudStatus'),{childList:true,subtree:true,characterData:true});
window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);updateConnection();
if(typeof window.login==='function'){
 const originalLogin=window.login;
 window.login=async function(){
  const b=byId('loginButton');if(b.disabled)return;b.disabled=true;b.setAttribute('aria-busy','true');
  try{await originalLogin();if(byId('loginScreen').classList.contains('hidden'))document.body.dataset.auth='ready';}
  catch(error){byId('loginMessage').textContent='Accesso non riuscito. Controlla la connessione e riprova.';console.error(error);}
  finally{b.disabled=false;b.removeAttribute('aria-busy');}
 };
}else{
 byId('loginMessage').textContent='Impossibile caricare il servizio di accesso. Controlla la rete e ricarica la pagina.';
 byId('loginButton').disabled=true;
}
// Keyboard access and focus restoration for every existing workflow modal.
const modal=byId('modal');
new MutationObserver(()=>{
 if(!modal.classList.contains('hidden')){
  previousFocus=document.activeElement;
  const focusable=modal.querySelector('input:not([type=hidden]),select,textarea,button');focusable?.focus({preventScroll:true});
 }else if(previousFocus?.isConnected){previousFocus.focus({preventScroll:true});previousFocus=null;}
}).observe(modal,{attributes:true,attributeFilter:['class']});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'){
  if(!byId('moreMenu').classList.contains('hidden')){closeMore();byId('moreButton').focus();}
  else if(!modal.classList.contains('hidden'))window.closeModal();
 }
 if(event.key==='Tab'&&!modal.classList.contains('hidden')){
  const els=[...modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(e=>!e.disabled&&e.getClientRects().length);
  const first=els[0],last=els[els.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }
});
// Existing data operations remain in app.js; these views only read loaded records.
function safeDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?new Date(value+'T12:00:00'):null;}
function dateParts(value){const d=safeDate(value);return d?{day:d.getDate(),month:d.toLocaleDateString('it-IT',{month:'short'}).replace('.',''),weekday:d.toLocaleDateString('it-IT',{weekday:'long'})}:{day:'—',month:'',weekday:''};}
function appointmentNotes(a){const c=findClient(a.client_id);return a.notes||[c?.address,c?.city].filter(Boolean).join(', ')||'Tutti i dettagli nell’agenda';}
window.renderDashboardAppointments=function(){
 const upcoming=appointments.filter(a=>a.status==='programmato').sort((a,b)=>String(a.date+(a.time||'')).localeCompare(String(b.date+(b.time||'')))).slice(0,5);
 byId('dashboardAppointments').innerHTML=upcoming.length?upcoming.map(a=>{
  const c=findClient(a.client_id),d=dateParts(a.date);
  return '<div class="agenda-entry"><div class="agenda-date"><b>'+d.day+'</b><span>'+escapeHTML(d.month)+'</span></div><div><div class="item-title">'+escapeHTML(c?.name||'Cliente')+'</div><div class="sub">'+escapeHTML((a.time||'').slice(0,5))+(a.time?' · ':'')+escapeHTML(appointmentNotes(a))+'</div></div><button class="agenda-open" data-appointment="'+escapeHTML(a.id)+'" aria-label="Apri appuntamento di '+escapeHTML(c?.name||'cliente')+'">'+icon('chevron')+'</button></div>';
 }).join(''):'<div class="empty">La tua agenda è libera.<br>Aggiungi un appuntamento per iniziare.</div>';
};
window.renderNextAppointment=function(){
 const now=new Date();
 const a=appointments.filter(a=>a.status==='programmato'&&new Date(a.date+'T'+(a.time||'23:59'))>=now).sort((a,b)=>String(a.date+(a.time||'')).localeCompare(String(b.date+(b.time||''))))[0];
 if(!a){byId('nextAppointmentCard').innerHTML='<div class="empty">Nessun appuntamento in arrivo.</div><button class="secondary" style="width:100%" data-new="appointments">'+icon('plus')+' Pianifica il prossimo lavoro</button>';return;}
 const d=dateParts(a.date),c=findClient(a.client_id);
 byId('nextAppointmentCard').innerHTML='<div class="next-date"><strong>'+d.day+'</strong><span>'+escapeHTML(d.month)+' · '+escapeHTML(d.weekday)+'</span><span class="next-time">'+escapeHTML((a.time||'').slice(0,5)||'Da definire')+'</span></div><h3 class="next-client">'+escapeHTML(c?.name||'Cliente')+'</h3><div class="next-note">'+escapeHTML(appointmentNotes(a))+'</div><div class="next-actions"><button class="primary" data-appointment="'+escapeHTML(a.id)+'">Apri appuntamento</button><button class="secondary" data-documents="'+escapeHTML(a.id)+'" aria-label="Documenti appuntamento">Documenti</button></div>';
};
function renderCashflow(){
 const now=new Date(),months=[];
 for(let offset=5;offset>=0;offset--){
  const date=new Date(now.getFullYear(),now.getMonth()-offset,1),key=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
  const incoming=expenses.filter(x=>x.type==='income'&&String(x.date).startsWith(key)).reduce((s,x)=>s+Number(x.amount||0),0)+payments.filter(x=>getPaymentStatus(x)==='pagato'&&String(x.payment_date||x.due_date).startsWith(key)).reduce((s,x)=>s+Number(x.amount||0),0);
  const outgoing=expenses.filter(x=>x.type!=='income'&&String(x.date).startsWith(key)).reduce((s,x)=>s+Number(x.amount||0),0);
  months.push({label:date.toLocaleDateString('it-IT',{month:'short'}).replace('.',''),incoming,outgoing});
 }
 const maximum=Math.max(...months.flatMap(x=>[x.incoming,x.outgoing]),1),scale=Math.ceil(maximum/4)*4;
 const w=540,h=190,left=53,right=12,top=12,plotH=143,groupW=(w-left-right)/6;
 let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-labelledby="cashflowTitle cashflowDesc"><title id="cashflowTitle">Entrate e uscite degli ultimi sei mesi</title><desc id="cashflowDesc">'+months.map(x=>escapeHTML(x.label+': entrate '+money(x.incoming)+', uscite '+money(x.outgoing))).join('; ')+'</desc>';
 for(let i=0;i<4;i++){const y=top+plotH*i/3,value=scale*(1-i/3);const label=new Intl.NumberFormat('it-IT',{notation:maximum>=10000?'compact':'standard',maximumFractionDigits:0}).format(value);svg+='<line x1="'+left+'" y1="'+y+'" x2="'+(w-right)+'" y2="'+y+'" stroke="#2d313c" stroke-dasharray="3 5"/><text x="'+(left-9)+'" y="'+(y+3)+'" text-anchor="end" fill="#7d899e" font-size="9" font-family="sans-serif">'+escapeHTML(label)+' €</text>';}
 months.forEach((m,i)=>{
  const cx=left+groupW*(i+.5),base=top+plotH,barW=14;
  for(const [idx,value,color] of [[0,m.incoming,'#458dff'],[1,m.outgoing,'#7c8aa5']]){const bh=value/scale*plotH;svg+='<rect x="'+(cx+(idx===0?-17:3))+'" y="'+(base-bh)+'" width="'+barW+'" height="'+Math.max(value>0?2:0,bh)+'" rx="3" fill="'+color+'"><title>'+escapeHTML(m.label+' · '+(idx===0?'Entrate: ':'Uscite: ')+money(value))+'</title></rect>';}
  svg+='<text x="'+cx+'" y="181" text-anchor="middle" fill="#909bae" font-size="10" font-family="sans-serif">'+escapeHTML(m.label.toUpperCase())+'</text>';
 });
 svg+='</svg>';byId('cashflowChart').innerHTML=svg;
 if(!months.some(m=>m.incoming||m.outgoing))byId('cashflowChart').innerHTML='<div class="chart-empty">Il grafico si popolerà con i tuoi incassi e le tue spese.</div>';
}
function renderRecent(){
 const records=expenses.map(x=>({date:x.date,description:x.description||'Movimento',amount:Number(x.amount||0),income:x.type==='income',page:'expenses'})).concat(payments.filter(x=>getPaymentStatus(x)==='pagato').map(x=>({date:x.payment_date||x.due_date,description:'Pagamento · '+(findClient(x.client_id)?.name||'Cliente'),amount:Number(x.amount||0),income:true,page:'payments'}))).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
 byId('recentMovements').innerHTML=records.length?records.map(r=>'<div class="movement-row"><span class="movement-icon '+(r.income?'':'expense')+'">'+icon('arrow')+'</span><div class="movement-info"><b>'+escapeHTML(r.description)+'</b><small>'+escapeHTML(formatDate(r.date))+' · '+(r.income?'Entrata':'Uscita')+'</small></div><strong class="'+(r.income?'green':'')+'">'+(r.income?'+':'−')+escapeHTML(money(r.amount))+'</strong></div>').join(''):'<div class="empty">Nessun movimento registrato.<br>Qui ritroverai le ultime entrate e uscite.</div>';
}
window.addEventListener('igea:render',()=>{
 renderCashflow();renderRecent();
 const from=byId('dashDateFrom').value,to=byId('dashDateTo').value;
 byId('rangeMessage').textContent=from&&to?(from>to?'La data iniziale deve precedere quella finale.':'Periodo personalizzato attivo.'):'Seleziona entrambe le date.';
});
// Delegate generated card actions without interpolating IDs into JavaScript.
document.addEventListener('click',event=>{
 const add=event.target.closest('[data-new]');if(add&&!add.closest('.page-heading,.quick-grid')){newRecord(add.dataset.new);return;}
 const appointment=event.target.closest('[data-appointment]');if(appointment){window.showPage('appointments');editProgrammedAppointment(appointment.dataset.appointment);return;}
 const docs=event.target.closest('[data-documents]');if(docs)openJobDocuments(docs.dataset.documents);
});
// Tasks transferred from the existing workflow must reveal their destination form.
if(typeof window.taskToAppointment==='function'){
 const originalTransfer=window.taskToAppointment;
 window.taskToAppointment=function(id){originalTransfer(id);byId('appointmentsComposer').open=true;};
}
// Associate visible labels with dynamically generated inputs and simplify control copy.
function enhanceForms(root){
 root.querySelectorAll('label:not([for])').forEach(label=>{
  const nested=label.querySelector('input,select,textarea');
  if(nested){if(nested.id)label.htmlFor=nested.id;return;}
  const next=label.nextElementSibling;
  const field=next?.matches('input,select,textarea')?next:next?.querySelector('input:not([type=hidden]),select,textarea');
  if(field?.id)label.htmlFor=field.id;
 });
 root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(field=>{
  if(!field.getAttribute('aria-label')&&(!field.id||!document.querySelector('label[for="'+field.id+'"]')))field.setAttribute('aria-label',field.placeholder.replace(/^[^\p{L}\p{N}]+/u,''));
 });
 root.querySelectorAll('h2,h3,button').forEach(control=>{
  for(const node of control.childNodes)if(node.nodeType===Node.TEXT_NODE){
   const clean=node.textContent.replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+(?=\p{L})/u,'');
   if(clean!==node.textContent)node.textContent=clean;
  }
 });
}
enhanceForms(document);
const formsObserver=new MutationObserver(records=>{
 const roots=new Set();for(const record of records)for(const node of record.addedNodes)if(node.nodeType===Node.ELEMENT_NODE)roots.add(node);
 for(const root of roots){enhanceForms(root);if(root.matches('label,input,textarea'))enhanceForms(root.parentElement);}
});
formsObserver.observe(byId('mainContent'),{childList:true,subtree:true});formsObserver.observe(byId('modalContent'),{childList:true,subtree:true});
const desktopForms=window.matchMedia('(min-width:1050px)');
function revealDesktopForms(){if(desktopForms.matches)for(const name of ['clients','appointments','expenses'])byId(name+'Composer').open=true;}
revealDesktopForms();desktopForms.addEventListener('change',revealDesktopForms);
const quoteSection=byId('quotes');
if(quoteSection){
 const heading=document.createElement('div');heading.className='page-heading';heading.innerHTML='<div><span class="eyebrow">IGEA IMPIANTI PRO / PREVENTIVI</span><h1>Il prossimo sì inizia qui.</h1><p>Preventivi curati, articoli pronti e PDF con la tua firma.</p></div>';quoteSection.prepend(heading);
}
if(typeof window.renderDashboard==='function'){
 const originalDashboard=window.renderDashboard;
 window.renderDashboard=function(){
  const from=byId('dashDateFrom').value,to=byId('dashDateTo').value;
  byId('dashDateTo').min=from;byId('dashDateFrom').max=to;
  if(from&&to&&from>to){byId('rangeMessage').textContent='La data iniziale deve precedere quella finale.';return;}
  originalDashboard();
 };
 window.renderDashboard();
}
// Load scanning only when needed; the SDK and PDF dependencies retain their existing versions.
let scannerRequested=false;
for(const name of ['openJobDocuments','openAllDocuments','startDocumentScan','startDocumentScanAndUpload'])if(typeof window[name]==='function'){
 const original=window[name];window[name]=function(...args){
  if(!scannerRequested){scannerRequested=true;const script=document.createElement('script');script.src='https://docs.opencv.org/4.x/opencv.js';script.async=true;document.head.appendChild(script);}
  return original.apply(this,args);
 };
}
// Register the same worker URL used by appointment notifications.
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=pro-1').catch(error=>console.warn('Service worker:',error)));}
// Reflect the visible page immediately on both navigation surfaces.
document.querySelectorAll('[data-page="dashboard"]').forEach(b=>b.setAttribute('aria-current','page'));
})();
