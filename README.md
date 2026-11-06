# IGEA IMPIANTI PRO

PWA personale per clienti, agenda, lavori, pagamenti, movimenti, preventivi e documenti. Interfaccia grafite e blu elettrico, con navigazione mobile e laterale per computer.

## File

- `index.html`: struttura delle schermate e accesso.
- `app.js`: autenticazione Supabase e operazioni esistenti su clienti, appuntamenti, pagamenti, spese, lavori, documenti, assistente e notifiche.
- `preventivi.js`: articoli, preventivi e PDF.
- `igea-pro-ui.js`: navigazione, accessibilità, grafico e riepiloghi letti dai dati caricati.
- `igea-pro.css`: nuovo design responsive.
- `assets/components.css`: stili di base dei componenti operativi esistenti.
- `sw.js`: notifiche e cache dei soli file applicativi dello stesso dominio.

GitHub Pages pubblica la cartella principale del branch `main`. Non servono compilazione o migrazioni SQL. Configurazione Supabase, tabelle e chiavi pubblicabili restano quelle del gestionale precedente. Il browser continua a usare la sessione Supabase già presente sul medesimo dominio.

Il grafico confronta entrate registrate e rate pagate con le uscite degli ultimi sei mesi. Usa le stesse regole di contabilizzazione del riepilogo esistente. Il saldo di cassa non rappresenta l'utile fiscale. La cache non memorizza risposte Supabase, credenziali o documenti; l'accesso e i dati richiedono una connessione.

## Verifiche dell'aggiornamento

- Controllo sintattico di tutti i JavaScript.
- Conservazione dei 67 identificatori HTML originali e controllo duplicati.
- Prova browser con dati locali isolati e scritture disabilitate: navigazione desktop/mobile, apertura moduli, finestre appuntamenti, filtri e totale preventivo (35 × 4 = 140).
- Nessuna modifica ai dati reali durante le verifiche. Accesso reale, salvataggi Supabase, invio push e fotocamera richiedono una verifica dall'account e dal dispositivo del titolare.

La versione precedente è conservata nel ramo GitHub `backup/prima-igea-pro-20261106` e nella cronologia Git originale.
