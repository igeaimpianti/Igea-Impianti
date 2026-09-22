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
                        "focus"
                        in windowClient
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
