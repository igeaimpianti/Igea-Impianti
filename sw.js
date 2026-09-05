const APP_URL = "./";

self.addEventListener("push",event=>{
    let data = {};

    try{
        data = event.data ? event.data.json() : {};
    }catch{
        data = {body:event.data?.text() || "Nuovo promemoria"};
    }

    event.waitUntil(
        self.registration.showNotification(
            data.title || "Igea Impianti",
            {
                body:data.body || "Promemoria appuntamento",
                icon:"./icon.png?v=13",
                badge:"./icon.png?v=13",
                tag:data.tag || "igea-appointment",
                renotify:true,
                data:{url:data.url || APP_URL}
            }
        )
    );
});

self.addEventListener("notificationclick",event=>{
    event.notification.close();

    event.waitUntil((async()=>{
        const target = new URL(event.notification.data?.url || APP_URL,self.location.origin).href;
        const windows = await clients.matchAll({type:"window",includeUncontrolled:true});

        for(const windowClient of windows){
            if("focus" in windowClient){
                await windowClient.focus();
                if("navigate" in windowClient) await windowClient.navigate(target);
                return;
            }
        }

        if(clients.openWindow) await clients.openWindow(target);
    })());
});
