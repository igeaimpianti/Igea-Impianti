"use strict";
let galleryAlbum=null;
let galleryViewerItems=[];
let galleryViewerIndex=0;
const ge=(id)=>document.getElementById(id);
async function galleryOpen(){
 showPage("gallery");
 ge("galleryPanel").classList.remove("hidden");
 galleryAlbum=null;
 await galleryRender();

}
async function galleryRender(){
 const root=ge("galleryContent");root.textContent="Caricamento...";
 const {data:albums,error}=await supabaseClient.from("photo_albums").select("*").order("created_at",{ascending:false});
 if(error){root.textContent="Errore: "+error.message;return;}
 if(!galleryAlbum){
 ge("galleryBackSlot")?.replaceChildren();
 root.innerHTML=albums.length?'<div class="gallery-album-list">'+albums.map(a=>'<button class="gallery-album" data-album="'+a.id+'"><span class="gallery-album-symbol" data-cover="'+a.id+'">▦</span><span class="gallery-album-name">'+escapeHTML(a.title)+'</span><span class="gallery-album-arrow">›</span></button>').join("")+'</div>':'<div class="empty">Nessun album. Crea il primo o carica foto in un lavoro.</div>';
 // Retrieve one cover for each album without touching the original photos.
 if(albums.length){
  try{
   const ids=albums.map(a=>a.id);
   const {data:covers,error:coverError}=await supabaseClient.from("gallery_photos").select("album_id,storage_path,name,created_at").in("album_id",ids).order("created_at",{ascending:false}).limit(300);
   if(!coverError&&covers){
    const seen=new Set();
    await Promise.all(covers.filter(p=>{if(seen.has(p.album_id))return false;seen.add(p.album_id);return !/\\.(dng|raw|cr2|nef|arw)$/i.test(p.name||"");}).map(async p=>{
     const {data}=await supabaseClient.storage.from("job-documents").createSignedUrl(p.storage_path,3600);
     const cover=Array.from(root.querySelectorAll("[data-cover]")).find(el=>el.dataset.cover===String(p.album_id));
     if(data?.signedUrl&&cover){const img=document.createElement("img");img.src=data.signedUrl;img.alt="Anteprima album";img.loading="lazy";img.decoding="async";cover.replaceChildren(img);}
    }));
   }
  }catch(e){console.warn("Anteprime album:",e);}
 }
 root.querySelectorAll("[data-album]").forEach(b=>b.onclick=()=>{galleryAlbum=b.dataset.album;galleryRender();});
 return;
 }
 const album=albums.find(a=>a.id===galleryAlbum);if(!album){galleryAlbum=null;return galleryRender();}
 const {data:photos,error:err}=await supabaseClient.from("gallery_photos").select("*").eq("album_id",galleryAlbum).order("created_at",{ascending:false});
 if(err){root.textContent=err.message;return;}
 root.innerHTML='<div class="gallery-album-toolbar"><button id="galleryBack" class="secondary">← Album</button><h3>'+escapeHTML(album.title)+'</h3></div><label class="gallery-upload-label" for="galleryFiles">＋ Carica foto</label><input id="galleryFiles" type="file" accept="image/*" multiple><div id="galleryStatus" class="sub"></div><div class="gallery-grid" id="galleryGrid"></div>';
 ge("galleryBack").onclick=()=>{galleryAlbum=null;galleryRender();};
 ge("galleryBackSlot")?.append(ge("galleryBack"));
 ge("galleryFiles").onchange=async(e)=>{
  const input=e.target, files=Array.from(input.files||[]), status=ge("galleryStatus");
  if(!files.length)return;
  input.disabled=true;
  status.textContent="Ottimizzazione delle foto compatibili e caricamento di "+files.length+" file...";
  try{
    const result=await galleryUpload(files,galleryAlbum,null,(done,total,name)=>{const el=ge("galleryStatus");if(el)el.textContent="Elaborazione foto: "+done+"/"+total+" · "+name;});
    if(result.done){await galleryRender();const updated=ge("galleryStatus");if(updated)updated.textContent=result.done+" foto caricate correttamente"+(result.errors.length?" · "+result.errors.join(" | "):"");}
    else status.textContent="Caricamento non riuscito: "+(result.errors.join(" | ")||"errore sconosciuto");
  }catch(error){status.textContent="Errore caricamento: "+(error.message||String(error));}
  finally{if(input.isConnected){input.disabled=false;input.value="";}}
 };
 const grid=ge("galleryGrid");
 const viewable=[];
 if(!photos.length)grid.textContent="Nessuna foto";
 const signed=await Promise.all(photos.map(async p=>({p, result:await supabaseClient.storage.from("job-documents").createSignedUrl(p.storage_path,3600)})));
 for(const {p,result} of signed){
 const {data,error:e}=result;
 if(e)continue;
 const box=document.createElement("div");box.className="gallery-photo gallery-tile";
 const img=document.createElement("img");const raw=/\.(dng|raw|cr2|nef|arw)$/i.test(p.name||"");if(raw){img.alt="Originale RAW";img.style.display="none";const label=document.createElement("div");label.className="gallery-raw-label";label.textContent="📷 RAW · "+p.name;box.append(label);}else{img.src=data.signedUrl;img.alt=p.name;img.loading="lazy";img.decoding="async";img.fetchPriority="low";}const photoIndex=viewable.push({url:data.signedUrl,name:p.name,raw,id:p.id,storagePath:p.storage_path})-1;
 img.onclick=()=>galleryShowViewer(viewable,photoIndex);img.tabIndex=0;img.setAttribute("role","button");img.setAttribute("aria-label","Apri "+(p.name||"foto"));img.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();galleryShowViewer(viewable,photoIndex);}};if(raw)box.querySelector(".gallery-raw-label").onclick=()=>galleryShowViewer(viewable,photoIndex);
 box.append(img);grid.append(box);
 }
}
function galleryShowViewer(items,index){
 galleryViewerItems=items.slice();galleryViewerIndex=index;
 let viewer=ge("galleryViewer");
 if(!viewer){
  viewer=document.createElement("div");viewer.id="galleryViewer";viewer.className="gallery-viewer";
  viewer.innerHTML='<button type="button" class="gallery-viewer-close" aria-label="Chiudi">✕</button><div class="gallery-viewer-count"></div><button type="button" class="gallery-viewer-menu-button" aria-label="Opzioni foto" aria-expanded="false" title="Opzioni foto">•••</button><div class="gallery-viewer-menu" hidden><button type="button" class="gallery-menu-download">↓ Scarica foto</button><button type="button" class="gallery-menu-delete">Elimina foto</button></div><div class="gallery-viewer-stage"><img alt="Foto ingrandita"></div><button type="button" class="gallery-viewer-prev" aria-label="Foto precedente">‹</button><button type="button" class="gallery-viewer-next" aria-label="Foto successiva">›</button>';
  document.body.appendChild(viewer);
  viewer.querySelector(".gallery-viewer-close").onclick=galleryCloseViewer;
  viewer.querySelector(".gallery-viewer-menu-button").onclick=()=>{const menu=viewer.querySelector(".gallery-viewer-menu");menu.hidden=!menu.hidden;viewer.querySelector(".gallery-viewer-menu-button").setAttribute("aria-expanded",String(!menu.hidden));};
  viewer.querySelector(".gallery-menu-download").onclick=()=>{galleryHideMenu();galleryDownloadCurrent();};
  viewer.querySelector(".gallery-menu-delete").onclick=()=>{galleryHideMenu();galleryDeleteCurrent();};
  viewer.querySelector(".gallery-viewer-prev").onclick=()=>galleryMoveViewer(-1);
  viewer.querySelector(".gallery-viewer-next").onclick=()=>galleryMoveViewer(1);
  let touchX=null;
  viewer.addEventListener("touchstart",e=>{if(e.touches.length===1)touchX=e.touches[0].clientX;else touchX=null;},{passive:true});
  viewer.addEventListener("touchend",e=>{if(touchX===null||!e.changedTouches.length)return;const delta=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(delta)>55)galleryMoveViewer(delta<0?1:-1);},{passive:true});
 }
 galleryHideMenu();viewer.style.display="flex";document.body.style.overflow="hidden";
 galleryUpdateViewer();
}
function galleryUpdateViewer(){
 const viewer=ge("galleryViewer");if(!viewer||!galleryViewerItems.length)return;
 const item=galleryViewerItems[galleryViewerIndex],img=viewer.querySelector("img");
 img.style.display=item.raw?"none":"block";if(!item.raw)img.src=item.url;img.alt=item.name||"Foto";let rawNote=viewer.querySelector(".gallery-raw-note");if(!rawNote){rawNote=document.createElement("div");rawNote.className="gallery-raw-note";viewer.querySelector(".gallery-viewer-stage").append(rawNote);}rawNote.style.display=item.raw?"block":"none";rawNote.textContent=item.raw?"Originale DNG conservato senza modifiche. Usa la freccia in alto per scaricare l’originale.":"";
 viewer.querySelector(".gallery-viewer-count").textContent=(galleryViewerIndex+1)+" / "+galleryViewerItems.length;
 viewer.querySelector(".gallery-viewer-prev").disabled=galleryViewerIndex===0;
 viewer.querySelector(".gallery-viewer-next").disabled=galleryViewerIndex===galleryViewerItems.length-1;
}
async function galleryDownloadCurrent(){
 const item=galleryViewerItems[galleryViewerIndex];if(!item)return;
 const btn=ge("galleryViewer")?.querySelector(".gallery-menu-download");
 if(btn)btn.disabled=true;
 try{
  const response=await fetch(item.url);if(!response.ok)throw Error("Download non riuscito");
  const blob=await response.blob();const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=item.name||"foto.jpg";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){const a=document.createElement("a");a.href=item.url;a.download=item.name||"foto";a.target="_blank";a.rel="noopener";document.body.append(a);a.click();a.remove();}
 finally{if(btn)btn.disabled=false;}
}
function galleryMoveViewer(delta){
 const next=galleryViewerIndex+delta;
 if(next<0||next>=galleryViewerItems.length)return;
 galleryViewerIndex=next;galleryHideMenu();galleryUpdateViewer();
}
function galleryHideMenu(){const v=ge("galleryViewer");if(!v)return;const menu=v.querySelector(".gallery-viewer-menu");if(menu)menu.hidden=true;v.querySelector(".gallery-viewer-menu-button")?.setAttribute("aria-expanded","false");}
async function galleryDeleteCurrent(){
 const item=galleryViewerItems[galleryViewerIndex];if(!item?.id)return;
 if(!confirm("Vuoi eliminare definitivamente questa fotografia? Questa operazione non può essere annullata."))return;
 const result=await supabaseClient.from("gallery_photos").delete().eq("id",item.id);
 if(result.error){toast("Eliminazione non riuscita: "+result.error.message);return;}
 const storage=await supabaseClient.storage.from("job-documents").remove([item.storagePath]);
 if(storage.error)toast("Foto rimossa dall’album, ma eliminazione del file non riuscita: "+storage.error.message);
 galleryCloseViewer();await galleryRender();toast("Foto eliminata");
}
function galleryCloseViewer(){
 galleryHideMenu();
 const viewer=ge("galleryViewer");if(viewer)viewer.style.display="none";
 document.body.style.overflow="";
}

async function galleryCreate(){
 const title=prompt("Nome del nuovo album");if(!title?.trim())return;
 const {data,error}=await supabaseClient.from("photo_albums").insert({title:title.trim(),user_id:currentUser.id}).select().single();
 if(error){toast(error.message);return;}galleryAlbum=data.id;galleryRender();
}
async function galleryClientAlbum(clientId){
 const name=clientName(clientId);
 let q=await supabaseClient.from("photo_albums").select("id").eq("client_id",clientId).maybeSingle();
 if(q.error)throw q.error;
 if(q.data)return q.data.id;
 q=await supabaseClient.from("photo_albums").insert({title:name,client_id:clientId,user_id:currentUser.id}).select("id").single();
 if(q.error){const retry=await supabaseClient.from("photo_albums").select("id").eq("client_id",clientId).single();if(retry.error)throw q.error;return retry.data.id;}
 return q.data.id;
}
async function galleryOptimize(file){
 const raw=/\.(dng|raw|cr2|nef|arw)$/i.test(file.name);
 if(raw)throw Error("RAW/DNG: conversione non disponibile su questo dispositivo. Il file originale non è stato caricato.");
 if(file.type==="image/png"||file.type==="image/jpeg"||file.type==="image/webp")return file;
 if(!/^image\/(jpeg|webp|heic|heif)$/i.test(file.type))throw Error("Formato immagine non supportato");
 let bitmap;
 try{
  bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});
  const canvas=document.createElement("canvas");
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("Impossibile preparare la foto");
  ctx.drawImage(bitmap,0,0);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.98));
  if(!blob)throw Error("Conversione JPEG non riuscita");
  return new File([blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg",lastModified:file.lastModified});
 }catch(e){throw Error("Conversione non riuscita: "+e.message);}
 finally{bitmap?.close?.();}
}
async function galleryUpload(files,albumId,appointmentId,onProgress){
 if(!currentUser)throw Error("Accesso richiesto");
 let done=0;const errors=[];const allFiles=Array.from(files||[]);let processed=0;
 const queue=allFiles.slice();
 const uploadOne=async(file)=>{
  if(!file.type.startsWith("image/")&&!/\.(dng|raw|cr2|nef|arw)$/i.test(file.name)){errors.push(file.name+": formato non riconosciuto");processed++;onProgress?.(processed,allFiles.length,file.name);return;}
  try{
   const prepared=await galleryOptimize(file);
   const ext=(prepared.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
   const path=currentUser.id+"/gallery/"+albumId+"/"+crypto.randomUUID()+"."+ext;
   const up=await supabaseClient.storage.from("job-documents").upload(path,prepared,{contentType:prepared.type||"application/octet-stream",upsert:false,cacheControl:"3600"});
   if(up.error)throw Error("Storage: "+up.error.message);
   const ins=await supabaseClient.from("gallery_photos").insert({user_id:currentUser.id,album_id:albumId,appointment_id:appointmentId,name:prepared.name,storage_path:path});
   if(ins.error){await supabaseClient.storage.from("job-documents").remove([path]);throw Error("Database: "+ins.error.message);}
   done++;
  }catch(error){errors.push(file.name+": "+(error.message||String(error))+" (verifica limite file del bucket Supabase)");}finally{processed++;onProgress?.(processed,allFiles.length,file.name);}
 };
 await Promise.all(Array.from({length:Math.min(2,queue.length)},async()=>{while(queue.length){await uploadOne(queue.shift());}}));
 if(errors.length)toast("Foto non caricate: "+errors.join(" | "));
 else if(done)toast(done+" foto caricate");
 return {done,errors};
}

function galleryForJob(appointmentId){
 const a=appointments.find(x=>String(x.id)===String(appointmentId));
 if(!a?.client_id){toast("Seleziona un cliente per il lavoro");return;}
 const input=document.createElement("input");input.type="file";input.accept="image/*";input.multiple=true;
 input.onchange=async()=>{try{const id=await galleryClientAlbum(a.client_id);await galleryUpload(input.files,id,appointmentId);}catch(e){toast(e.message);}};
 input.click();
}

/* Galleria fotografica: griglia e visualizzatore in stile iPhone */
(function galleryInstallStyle(){
 if(document.getElementById("igeaGalleryModernStyle"))return;
 const style=document.createElement("style");style.id="igeaGalleryModernStyle";
 style.textContent=`#galleryContent .gallery-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important;margin-top:16px}#galleryContent .gallery-tile{position:relative!important;min-width:0!important;aspect-ratio:1/1!important;overflow:hidden!important;border:0!important;border-radius:7px!important;background:#182233!important;padding:0!important;display:block!important}#galleryContent .gallery-tile>img{display:block;width:100%!important;height:100%!important;object-fit:cover!important;cursor:pointer;border:0!important;border-radius:0!important}#galleryContent .gallery-tile-delete{position:absolute!important;top:6px;right:6px;width:25px!important;height:25px!important;min-width:0!important;min-height:0!important;padding:0!important;border-radius:50%!important;background:rgba(12,18,29,.72)!important;color:white!important;border:1px solid rgba(255,255,255,.35)!important;backdrop-filter:blur(8px);font-size:15px!important;line-height:1!important;opacity:.85}#galleryContent .gallery-tile-delete:active{background:#a52a3d!important}#galleryViewer.gallery-viewer{position:fixed!important;inset:0!important;z-index:99999!important;background:rgba(5,9,17,.98)!important;align-items:center!important;justify-content:center!important;padding:0!important}#galleryViewer .gallery-viewer-stage{position:absolute!important;inset:75px 0 85px!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important}#galleryViewer .gallery-viewer-stage img{width:100%!important;height:100%!important;object-fit:contain!important;max-width:100%!important;max-height:100%!important}#galleryViewer .gallery-viewer-close,#galleryViewer .gallery-viewer-download{position:absolute!important;top:calc(16px + env(safe-area-inset-top));width:43px!important;height:43px!important;min-width:0!important;min-height:0!important;border-radius:50%!important;background:rgba(45,56,74,.78)!important;color:#fff!important;border:1px solid #ffffff2a!important;font-size:24px!important;display:grid!important;place-items:center!important;z-index:3!important;padding:0!important}#galleryViewer .gallery-viewer-close{left:17px!important}#galleryViewer .gallery-viewer-download{right:17px!important}#galleryViewer .gallery-viewer-count{position:absolute!important;top:calc(28px + env(safe-area-inset-top));left:75px!important;right:75px!important;text-align:center!important;color:#e8edf6!important;font-size:13px!important;letter-spacing:.8px!important;z-index:2!important}#galleryViewer .gallery-viewer-prev,#galleryViewer .gallery-viewer-next{position:absolute!important;top:50%!important;transform:translateY(-50%)!important;width:38px!important;height:48px!important;min-width:0!important;padding:0!important;border-radius:12px!important;background:#15203388!important;color:white!important;font-size:32px!important;z-index:3!important}#galleryViewer .gallery-viewer-prev{left:8px!important}#galleryViewer .gallery-viewer-next{right:8px!important}#galleryViewer .gallery-viewer-prev:disabled,#galleryViewer .gallery-viewer-next:disabled{opacity:.15!important}@media(max-width:650px){#galleryViewer .gallery-viewer-prev,#galleryViewer .gallery-viewer-next{display:none!important}#galleryContent .gallery-grid{gap:3px!important}#galleryContent .gallery-tile{border-radius:4px!important}}`;
 style.textContent += "\n/* IGEA PRO | Galleria fotografica premium */\n#galleryPanel{background:#080b11!important;border-color:#202b3a!important;color:#f8fafc!important}\n#galleryPanel h2{font-weight:750!important;letter-spacing:-.6px!important}\n#galleryContent .gallery-album-list{display:grid;gap:10px;margin-top:20px}\n#galleryContent .gallery-album{display:flex!important;align-items:center;gap:15px;text-align:left;background:linear-gradient(135deg,#151e2b,#0d121c)!important;border:1px solid #29374a!important;border-radius:19px!important;padding:18px!important;box-shadow:0 8px 24px #0003;color:#f8fafc!important}\n#galleryContent .gallery-album-symbol{display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:#123a64;color:#72bbff;font-size:29px}\n#galleryContent .gallery-album-name{flex:1;font-size:16px;font-weight:700;overflow:hidden;text-overflow:ellipsis}\n#galleryContent .gallery-album-arrow{font-size:28px;color:#8ca8c9}\n#galleryContent .gallery-grid{gap:2px!important;margin-top:18px!important}\n#galleryContent .gallery-tile{background:#090e17!important;border-radius:2px!important;content-visibility:auto;contain-intrinsic-size:110px}\n#galleryContent .gallery-tile-delete{opacity:0!important;transition:opacity .15s}\n#galleryContent .gallery-tile:hover .gallery-tile-delete,#galleryContent .gallery-tile:focus-within .gallery-tile-delete{opacity:1!important}\n#galleryViewer.gallery-viewer{background:#000!important}\n#galleryViewer .gallery-viewer-close,#galleryViewer .gallery-viewer-download{background:#1c1c1eaa!important;border:1px solid #ffffff20!important;backdrop-filter:blur(18px)}\n#galleryViewer .gallery-viewer-stage img{user-select:none;-webkit-user-select:none}\n@media(hover:none){#galleryContent .gallery-tile-delete{opacity:.8!important}}\n";
 document.head.append(style);
})();
