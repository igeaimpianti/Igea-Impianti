/* IGEA IMPIANTI PRO 2.0 — UI only; original Supabase logic stays untouched */
(function(){'use strict';
function init(){
 const dashboard=document.getElementById('dashboard'); if(!dashboard||document.getElementById('igHero'))return;
 const hero=document.createElement('div');hero.className='ig-hero';hero.id='igHero';
 const date=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
 hero.innerHTML='<div class="ig-kicker">⚡ IGEA IMPIANTI / CONTROL CENTER</div><h2>Il tuo lavoro.<br> Sotto controllo.</h2><p>La tua attività, tutti i giorni, in un unico posto.</p><div class="ig-hero-meta"><span class="ig-pill">● GESTIONALE CLOUD</span><span class="ig-pill" id="igToday"></span></div>';
 dashboard.prepend(hero);document.getElementById('igToday').textContent=date;
 const actions=document.createElement('div');actions.className='ig-actions';actions.id='igQuickActions';
 const items=[['📅','Agenda','appointments'],['👥','Clienti','clients'],['🧾','Preventivi','quotes'],['💳','Incassi','payments']];
 for(const [icon,label,page] of items){const b=document.createElement('button');b.type='button';b.className='ig-action';b.innerHTML='<span aria-hidden="true">'+icon+'</span>'+label;b.addEventListener('click',()=>{if(typeof window.showPage==='function')window.showPage(page)});actions.appendChild(b)}
 hero.after(actions);
 const first=dashboard.querySelector('.card');if(first){const heading=document.createElement('div');heading.className='ig-section-title';heading.textContent='Panoramica finanziaria';first.before(heading)}
 document.querySelector('.brand h1')?.replaceChildren(document.createTextNode('IGEA PRO'));
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#07101d');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
