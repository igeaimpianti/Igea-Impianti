"use strict";
let galleryAlbum=null;
let galleryViewerItems=[];
let galleryViewerIndex=0;
const ge=(id)=>document.getElementById(id);
async function galleryOpen(){
 showPage("settings");
 ge("galleryPanel").classList.remove("hidden");
 galleryAlbum=null;
 await galleryRender();
 ge("galleryPanel").scrollIntoView({behavior:"smooth"});
}
async function galleryRender(){
 const root=ge("galleryContent");root.textContent="Caricamento...";
 const {data:albums,error}=await supabaseClient.from("photo_albums").select("*").order("created_at",{ascending:false});
 if(error){root.textContent="Errore: "+error.message;return;}
 if(!galleryAlbum){
 root.innerHTML=albums.length?albums.map(a=>'<button class="gallery-album" data-album="'+a.id+'">📁 '+escapeHTML(a.title)+'</button>').join(""):'<div class="empty">Nessun album. Crea il primo o carica foto in un lavoro.</div>';
 root.querySelectorAll("[data-album]").forEach(b=>b.onclick=()=>{galleryAlbum=b.dataset.album;galleryRender();});
 return;
 }
 const album=albums.find(a=>a.id===galleryAlbum);if(!album){galleryAlbum=null;return galleryRender();}
 const {data:photos,error:err}=await supabaseClient.from("gallery_photos").select("*").eq("album_id",galleryAlbum).order("created_at",{ascending:false});
 if(err){root.textContent=err.message;return;}
 root.innerHTML='<button id="galleryBack" class="secondary">← Album</button><h3>'+escapeHTML(album.title)+'</h3><input id="galleryFiles" type="file" accept="image/*" multiple><div id="galleryStatus" class="sub"></div><div class="gallery-grid" id="galleryGrid"></div>';
 ge("galleryBack").onclick=()=>{galleryAlbum=null;galleryRender();};
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
 for(const p of photos){
 const {data,error:e}=await supabaseClient.storage.from("job-documents").createSignedUrl(p.storage_path,3600);
 if(e)continue;
 const box=document.createElement("div");box.className="gallery-photo";
 const img=document.createElement("img");const raw=/\.(dng|raw|cr2|nef|arw)$/i.test(p.name||"");if(raw){img.alt="Originale RAW";img.style.display="none";const label=document.createElement("div");label.className="gallery-raw-label";label.textContent="📷 RAW · "+p.name;box.append(label);}else{img.src=data.signedUrl;img.alt=p.name;img.loading="lazy";}const photoIndex=viewable.push({url:data.signedUrl,name:p.name,raw})-1;
 img.onclick=()=>galleryShowViewer(viewable,photoIndex);if(raw)box.querySelector(".gallery-raw-label").onclick=()=>galleryShowViewer(viewable,photoIndex);
 const del=document.createElement("button");del.textContent="Elimina";del.className="secondary";del.onclick=async()=>{if(!confirm("Eliminare questa foto?"))return;const d=await supabaseClient.from("gallery_photos").delete().eq("id",p.id);if(d.error){toast(d.error.message);return;}await supabaseClient.storage.from("job-documents").remove([p.storage_path]);galleryRender();};
 const download=document.createElement("a");download.href=data.signedUrl;download.download=p.name;download.textContent="Scarica originale";download.className="secondary";box.append(img,download,del);grid.append(box);
 }
}
function galleryShowViewer(items,index){
 galleryViewerItems=items.slice();galleryViewerIndex=index;
 let viewer=ge("galleryViewer");
 if(!viewer){
  viewer=document.createElement("div");viewer.id="galleryViewer";viewer.className="gallery-viewer";
  viewer.innerHTML='<button type="button" class="gallery-viewer-close" aria-label="Chiudi">✕</button><div class="gallery-viewer-count"></div><div class="gallery-viewer-stage"><img alt="Foto ingrandita"></div><button type="button" class="gallery-viewer-prev" aria-label="Foto precedente">‹</button><button type="button" class="gallery-viewer-next" aria-label="Foto successiva">›</button>';
  document.body.appendChild(viewer);
  viewer.querySelector(".gallery-viewer-close").onclick=galleryCloseViewer;
  viewer.querySelector(".gallery-viewer-prev").onclick=()=>galleryMoveViewer(-1);
  viewer.querySelector(".gallery-viewer-next").onclick=()=>galleryMoveViewer(1);
  let touchX=null;
  viewer.addEventListener("touchstart",e=>{if(e.touches.length===1)touchX=e.touches[0].clientX;else touchX=null;},{passive:true});
  viewer.addEventListener("touchend",e=>{if(touchX===null||!e.changedTouches.length)return;const delta=e.changedTouches[0].clientX-touchX;touchX=null;if(Math.abs(delta)>55)galleryMoveViewer(delta<0?1:-1);},{passive:true});
 }
 viewer.style.display="flex";document.body.style.overflow="hidden";
 galleryUpdateViewer();
}
function galleryUpdateViewer(){
 const viewer=ge("galleryViewer");if(!viewer||!galleryViewerItems.length)return;
 const item=galleryViewerItems[galleryViewerIndex],img=viewer.querySelector("img");
 img.style.display=item.raw?"none":"block";if(!item.raw)img.src=item.url;img.alt=item.name||"Foto";let rawNote=viewer.querySelector(".gallery-raw-note");if(!rawNote){rawNote=document.createElement("div");rawNote.className="gallery-raw-note";viewer.querySelector(".gallery-viewer-stage").append(rawNote);}rawNote.style.display=item.raw?"block":"none";rawNote.textContent=item.raw?"Originale DNG conservato senza modifiche. Usa Scarica originale dalla galleria per aprirlo in un’app compatibile.":"";
 viewer.querySelector(".gallery-viewer-count").textContent=(galleryViewerIndex+1)+" di "+galleryViewerItems.length;
 viewer.querySelector(".gallery-viewer-prev").disabled=galleryViewerIndex===0;
 viewer.querySelector(".gallery-viewer-next").disabled=galleryViewerIndex===galleryViewerItems.length-1;
}
function galleryMoveViewer(delta){
 const next=galleryViewerIndex+delta;
 if(next<0||next>=galleryViewerItems.length)return;
 galleryViewerIndex=next;galleryUpdateViewer();
}
function galleryCloseViewer(){
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
 if(file.type==="image/png")return file;
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
 for(const file of allFiles){
  if(!file.type.startsWith("image/")&&!/\.(dng|raw|cr2|nef|arw)$/i.test(file.name)){errors.push(file.name+": formato non riconosciuto");processed++;onProgress?.(processed,allFiles.length,file.name);continue;}
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
 }
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
