"use strict";
let galleryAlbum=null;
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
 ge("galleryFiles").onchange=async(e)=>{await galleryUpload(e.target.files,galleryAlbum,null);await galleryRender();};
 const grid=ge("galleryGrid");
 if(!photos.length)grid.textContent="Nessuna foto";
 for(const p of photos){
 const {data,error:e}=await supabaseClient.storage.from("job-documents").createSignedUrl(p.storage_path,3600);
 if(e)continue;
 const box=document.createElement("div");box.className="gallery-photo";
 const img=document.createElement("img");img.src=data.signedUrl;img.alt=p.name;img.loading="lazy";img.onclick=()=>window.open(data.signedUrl,"_blank","noopener");
 const del=document.createElement("button");del.textContent="Elimina";del.className="secondary";del.onclick=async()=>{if(!confirm("Eliminare questa foto?"))return;const d=await supabaseClient.from("gallery_photos").delete().eq("id",p.id);if(d.error){toast(d.error.message);return;}await supabaseClient.storage.from("job-documents").remove([p.storage_path]);galleryRender();};
 box.append(img,del);grid.append(box);
 }
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
async function galleryUpload(files,albumId,appointmentId){
 if(!currentUser)throw Error("Accesso richiesto");
 let done=0;
 for(const file of Array.from(files||[])){
 if(!file.type.startsWith("image/"))continue;
 if(file.size>15*1024*1024){toast("Foto oltre 15 MB: "+file.name);continue;}
 const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
 const path=currentUser.id+"/gallery/"+albumId+"/"+crypto.randomUUID()+"."+ext;
 const up=await supabaseClient.storage.from("job-documents").upload(path,file,{contentType:file.type,upsert:false});
 if(up.error){toast(up.error.message);continue;}
 const ins=await supabaseClient.from("gallery_photos").insert({user_id:currentUser.id,album_id:albumId,appointment_id:appointmentId,name:file.name,storage_path:path});
 if(ins.error){await supabaseClient.storage.from("job-documents").remove([path]);toast(ins.error.message);continue;}
 done++;
 }
 toast(done+" foto caricate");
}
function galleryForJob(appointmentId){
 const a=appointments.find(x=>String(x.id)===String(appointmentId));
 if(!a?.client_id){toast("Seleziona un cliente per il lavoro");return;}
 const input=document.createElement("input");input.type="file";input.accept="image/*";input.multiple=true;
 input.onchange=async()=>{try{const id=await galleryClientAlbum(a.client_id);await galleryUpload(input.files,id,appointmentId);}catch(e){toast(e.message);}};
 input.click();
}
