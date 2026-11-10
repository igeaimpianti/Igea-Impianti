# IGEA IMPIANTI — sito Luxury Technology

## Stato
Bozza isolata in `website-luxury/index.html` su ramo `site-luxury-20261110`. Il dominio pubblico NON è stato cambiato. Il gestionale sul ramo main resta intatto.

## Architettura
- Sito pubblico: repository GitHub Pages dedicato, dominio `igeaimpianti.com` solo dopo verifica DNS.
- PWA privata: `app.igeaimpianti.com`, repository `igeaimpianti/Igea-Impianti`.
- Catalogo: Supabase con tabelle dedicate, lettura anonima SOLO dei prodotti pubblicati e dei campi pubblici tramite RLS.
- Scritture: soltanto utenti autorizzati della PWA, verificati lato database. Non utilizzare user_metadata per autorizzazione.
- Immagini: bucket dedicato al catalogo pubblico, separato dai documenti e dalle foto dei clienti.
- Le righe di preventivo e gli articoli interni non devono essere esposti automaticamente.

## Verifiche necessarie
1. Individuare progetto Supabase IGEA e controllare tabelle e policy prima di creare migrazioni.
2. Individuare DNS attuale e repository del sito pubblico prima di cambiarli.
3. Recuperare logo originale autorizzato e immagini dei lavori.
4. Collegare categorie, sottocategorie, prodotti, immagini, pubblicazione e richieste di preventivo.
5. Test responsive, accessibilità, sicurezza RLS e SEO.
6. Pubblicare solo dopo test di regressione e backup.

La bozza non presenta prodotti fittizi come disponibili e non usa chiavi Supabase o dati privati.
