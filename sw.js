/* Cache application files only. Supabase records, credentials and documents are never cached. */
const SHELL_CACHE = "igea-pro-shell-20261109-12";
const SHELL_FILES = ["./", "./index.html", "./app.js?v=20261109-8", "./preventivi.js?v=pro-1", "./igea-pro-ui.js?v=20261109-8", "./igea-pro.css?v=pro-1", "./assets/components.css?v=pro-1", "./assets/igea-mark.svg", "./manifest.json?v=pro-1", "./icon.png", "./igea-gallery.js?v=20261109-12", "./igea-jobs.js?v=20261109-2"];
self.addEventListener("install", event => {
    event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_FILES)));
    self.skipWaiting();
});
self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith("igea-pro-shell-") && name !== SHELL_CACHE).map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});
self.addEventListener("fetch", event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== self.location.origin) return;
    // Serve network-first shell assets; no generic API or document interception.
    const shellURLs = SHELL_FILES.map(path => new URL(path, self.registration.scope).href);
    if (request.mode !== "navigate" && !shellURLs.includes(url.href)) return;
    event.respondWith((async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
            const response = await fetch(request, {cache:"no-store"});
            if (response.ok && shellURLs.includes(url.href)) await cache.put(request, response.clone());
            return response;
        } catch (error) {
            const cached = await cache.match(request);
            if (cached) return cached;
            if (request.mode === "navigate") return (await cache.match(new URL("./index.html", self.registration.scope).href)) || Response.error();
            return Response.error();
        }
    })());
});

const APP_SCOPE = self.registration.scope;

self.addEventListener("push", event => {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = {
            body: event.data?.text() || "Nuovo promemoria"
        };
    }

    const appointmentId =
        data.appointmentId ||
        data.appointment_id ||
        data.id ||
        null;

    event.waitUntil(
        self.registration.showNotification(
            data.title || "Igea Impianti",
            {
                body:
                    data.body ||
                    "Promemoria appuntamento",

                icon:
                    "./icon.png?v=15",

                badge:
                    "./icon.png?v=15",

                tag:
                    data.tag ||
                    (
                        appointmentId
                        ? `igea-appointment-${appointmentId}`
                        : "igea-appointment"
                    ),

                renotify: true,

                data: {
                    appointmentId
                }
            }
        )
    );
});


self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();

        event.waitUntil(
            (async () => {

                const appointmentId =
                    event.notification
                    .data
                    ?.appointmentId ||
                    null;

                /*
                 * IMPORTANTE:
                 * usiamo lo scope reale della PWA.
                 * In questo modo funziona anche
                 * dentro una cartella GitHub Pages.
                 */
                const target =
                    new URL(
                        "./",
                        APP_SCOPE
                    );

                if(appointmentId){

                    target.searchParams.set(
                        "appointment",
                        appointmentId
                    );

                }


                const windows =
                    await clients.matchAll({
                        type:"window",
                        includeUncontrolled:true
                    });


                for(
                    const windowClient
                    of windows
                ){

                    if(
                        windowClient.url.startsWith(APP_SCOPE) &&
                        "focus" in windowClient
                    ){

                        await windowClient
                            .focus();


                        if(
                            appointmentId &&
                            "postMessage"
                            in windowClient
                        ){

                            windowClient
                                .postMessage({
                                    type:
                                        "OPEN_APPOINTMENT",

                                    appointmentId
                                });

                        }else if(
                            "navigate"
                            in windowClient
                        ){

                            await windowClient
                                .navigate(
                                    target.href
                                );

                        }

                        return;

                    }

                }


                if(
                    clients.openWindow
                ){

                    await clients
                        .openWindow(
                            target.href
                        );

                }

            })()
        );

    }
);
