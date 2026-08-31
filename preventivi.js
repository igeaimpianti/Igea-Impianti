(function(){
"use strict";

let quotes = [];
let articles = [];
let quoteItems = [];
let quoteSaving = false;
let editingQuoteId = null;

const q = id => document.getElementById(id);
const round2 = value => Math.round((Number(value) || 0) * 100) / 100;

function installQuoteStyles(){
    const style = document.createElement("style");
    style.textContent = `
        .quote-row{background:#fafafa;border:1px solid #ddd;border-radius:15px;padding:12px;margin-bottom:10px}
        .quote-row-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px}
        .quote-row .grid-quote{display:grid;grid-template-columns:1fr 88px;gap:8px}
        .quote-total{font-size:26px;font-weight:900;text-align:right;color:#16834b}
        .quote-count{font-size:12px;color:#777;margin-bottom:10px}
        .quote-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
        .quote-tabs button{background:#eee;border:1px solid #ddd}
        .quote-tabs button.active{background:#111;color:#fff;border-color:#111}
        @media(max-width:410px){.nav button{font-size:9px}.nav span{font-size:19px}}
    `;
    document.head.appendChild(style);
}

function installQuotePage(){
    const main = document.querySelector("main");

    if(!main || q("quotes")) return;

    const section = document.createElement("section");

    section.id = "quotes";
    section.className = "hidden";

    section.innerHTML = `
        <div class="quote-tabs">
            <button
                id="quoteCreateTab"
                class="active"
                onclick="showQuoteArea('create')">
                🧾 Crea preventivo
            </button>

            <button
                id="quoteArticlesTab"
                onclick="showQuoteArea('articles')">
                📦 Articoli
            </button>
        </div>

        <div id="quoteCreateArea">

            <div class="card">

                <h2>🧾 Crea preventivo</h2>

                <label>Cliente</label>
                <select id="quoteClient"></select>

                <div class="grid2">

                    <div>
                        <label>Data</label>
                        <input id="quoteDate" type="date">
                    </div>

                    <div>
                        <label>Validità (giorni)</label>
                        <input
                            id="quoteValidity"
                            type="number"
                            min="1"
                            max="365"
                            value="30">
                    </div>

                </div>

                <label>Oggetto del preventivo</label>

                <input
                    id="quoteSubject"
                    placeholder="Es. Realizzazione impianto elettrico">

                <div class="divider"></div>

                <div class="between">

                    <h3>Articoli</h3>

                    <span
                        id="quoteItemCount"
                        class="badge blue">
                        0 / 30
                    </span>

                </div>

                <div id="quoteItems"></div>

                <button
                    id="addQuoteItemButton"
                    class="secondary"
                    style="width:100%"
                    onclick="addQuoteItem()">
                    ＋ Aggiungi articolo
                </button>

                <div class="divider"></div>

                <div class="between">

                    <b>Totale preventivo</b>

                    <div
                        id="quoteTotal"
                        class="quote-total">
                        €0,00
                    </div>

                </div>

                <label>Note e condizioni</label>

                <textarea
                    id="quoteNotes"
                    placeholder="Condizioni di pagamento, esclusioni, altre note..."></textarea>

                <button
                    id="emitQuoteButton"
                    class="primary"
                    onclick="emitQuote()">
                    Emetti e crea PDF
                </button>

                <button
                    id="cancelQuoteEditButton"
                    class="secondary hidden"
                    style="width:100%;margin-top:8px"
                    onclick="resetQuoteForm()">
                    Annulla modifica
                </button>

            </div>

            <div class="card">

                <h2>📚 Preventivi emessi</h2>

                <input
                    id="quoteSearch"
                    placeholder="🔎 Cerca cliente o numero..."
                    oninput="renderQuotes()">

                <div id="quotesList"></div>

            </div>

        </div>

        <div
            id="quoteArticlesArea"
            class="hidden">

            <div class="card">

                <h2>📦 Nuovo articolo</h2>

                <label>Articolo</label>

                <input
                    id="articleName"
                    placeholder="Es. Presa Schuko">

                <label>Descrizione</label>

                <textarea
                    id="articleDescription"
                    placeholder="Marca, modello, caratteristiche o lavorazione"></textarea>

                <label>Prezzo unitario</label>

                <input
                    id="articlePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00">

                <button
                    id="saveArticleButton"
                    class="primary"
                    onclick="saveArticle()">
                    Salva articolo
                </button>

            </div>

            <div class="card">

                <h2>📚 Articoli salvati</h2>

                <input
                    id="articleSearch"
                    placeholder="🔎 Cerca articolo..."
                    oninput="renderArticles()">

                <div id="articlesList"></div>

            </div>

        </div>
    `;

    main.insertBefore(
        section,
        q("settings")
    );

    const nav =
        document.querySelector(
            "nav.nav"
        );

    const button =
        document.createElement(
            "button"
        );

    button.id =
        "navQuotes";

    button.onclick =
        () => showPage("quotes");

    button.innerHTML =
        "<span>🧾</span>Preventivi";

    nav.insertBefore(
        button,
        q("navExpenses")
    );
}

const originalShowPage =
    window.showPage;

window.showPage = function(page){

    originalShowPage(
        page === "quotes"
        ?
        "dashboard"
        :
        page
    );

    if(page !== "quotes"){

        q("quotes")
        ?.classList
        .add("hidden");

        q("navQuotes")
        ?.classList
        .remove("active");

        return;
    }

    [
        "dashboard",
        "clients",
        "appointments",
        "payments",
        "expenses",
        "settings"
    ]
    .forEach(
        id =>
        q(id)
        ?.classList
        .add("hidden")
    );

    document
    .querySelectorAll(
        ".nav button"
    )
    .forEach(
        button =>
        button
        .classList
        .remove("active")
    );

    q("quotes")
    .classList
    .remove("hidden");

    q("navQuotes")
    .classList
    .add("active");

    q("pageTitle")
    .textContent =
        "Preventivi";

    refreshQuoteClients();
    renderQuotes();
    renderArticles();
};

window.showQuoteArea =
function(area){

    q("quoteCreateArea")
    .classList
    .toggle(
        "hidden",
        area !== "create"
    );

    q("quoteArticlesArea")
    .classList
    .toggle(
        "hidden",
        area !== "articles"
    );

    q("quoteCreateTab")
    .classList
    .toggle(
        "active",
        area === "create"
    );

    q("quoteArticlesTab")
    .classList
    .toggle(
        "active",
        area === "articles"
    );

    if(area === "articles"){

        renderArticles();

    }

};

function refreshQuoteClients(){

    const select =
        q("quoteClient");

    if(!select) return;

    const selected =
        select.value;

    select.innerHTML =
        '<option value="">Seleziona cliente</option>' +

        clients
        .map(
            client =>
            `<option value="${client.id}">
                ${escapeHTML(client.name)}
            </option>`
        )
        .join("");

    if(
        clients.some(
            client =>
            String(client.id) ===
            String(selected)
        )
    ){

        select.value =
            selected;

    }

}

window.addQuoteItem =
function(
    item = {
        article_id:"",
        article:"",
        description:"",
        price:"",
        quantity:1
    }
){

    if(
        quoteItems.length >= 30
    ){

        alert(
            "Puoi inserire al massimo 30 articoli."
        );

        return;

    }

    quoteItems.push({

        article_id:
            String(
                item.article_id || ""
            ),

        article:
            String(
                item.article || ""
            ),

        description:
            String(
                item.description || ""
            ),

        price:
            item.price ?? "",

        quantity:
            item.quantity ?? 1

    });

    renderQuoteItems();

};

window.removeQuoteItem =
function(index){

    quoteItems.splice(
        index,
        1
    );

    renderQuoteItems();

};

window.updateQuoteItem =
function(
    index,
    field,
    value
){

    if(
        !quoteItems[index]
    ) return;

    quoteItems[index][field] =
        value;

    updateQuoteTotals();

};

window.selectSavedArticle =
function(
    index,
    id
){

    if(
        !id ||
        !quoteItems[index]
    ) return;

    const article =
        articles.find(
            item =>
            String(item.id) ===
            String(id)
        );

    if(!article) return;

    quoteItems[index] = {

        ...quoteItems[index],

        article_id:
            article.id,

        article:
            article.name,

        description:
            article.description || "",

        price:
            round2(
                article.unit_price
            )

    };

    renderQuoteItems();

};

function renderQuoteItems(){

    const box =
        q("quoteItems");

    if(!box) return;

    box.innerHTML =
        quoteItems
        .map(
            (
                item,
                index
            ) => `

            <div class="quote-row">

                <div class="quote-row-head">

                    <b>
                        Articolo ${index + 1}
                    </b>

                    <button
                        class="danger"
                        onclick="removeQuoteItem(${index})">
                        Rimuovi
                    </button>

                </div>

                <label>
                    Seleziona articolo salvato
                </label>

                <select
                    onchange="selectSavedArticle(${index},this.value)">

                    <option value="">
                        Scegli dalla lista oppure compila manualmente
                    </option>

                    ${
                        articles
                        .map(
                            saved => `

                            <option
                                value="${saved.id}"
                                ${
                                    String(saved.id) ===
                                    String(item.article_id)
                                    ?
                                    "selected"
                                    :
                                    ""
                                }>

                                ${escapeHTML(saved.name)}
                                ·
                                ${money(saved.unit_price)}

                            </option>

                            `
                        )
                        .join("")
                    }

                </select>

                <label>Articolo</label>

                <input
                    value="${escapeHTML(item.article)}"
                    placeholder="Es. Presa Schuko, quadro elettrico..."
                    oninput="updateQuoteItem(${index},'article',this.value)">

                <label>Descrizione</label>

                <textarea
                    placeholder="Descrizione articolo o lavorazione"
                    oninput="updateQuoteItem(${index},'description',this.value)">${escapeHTML(item.description)}</textarea>

                <div class="grid-quote">

                    <div>

                        <label>
                            Prezzo unitario
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value="${escapeHTML(item.price)}"
                            placeholder="0,00"
                            oninput="updateQuoteItem(${index},'price',this.value)">

                    </div>

                    <div>

                        <label>
                            Quantità
                        </label>

                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value="${escapeHTML(item.quantity)}"
                            oninput="updateQuoteItem(${index},'quantity',this.value)">

                    </div>

                </div>

                <div class="between">

                    <span class="sub">
                        Prezzo finale
                    </span>

                    <b id="quoteLineTotal${index}">
                        ${
                            money(
                                round2(
                                    item.price *
                                    item.quantity
                                )
                            )
                        }
                    </b>

                </div>

            </div>

            `
        )
        .join("");

    q("quoteItemCount")
    .textContent =
        `${quoteItems.length} / 30`;

    q("addQuoteItemButton")
    .disabled =
        quoteItems.length >= 30;

    updateQuoteTotals();

}

function updateQuoteTotals(){

    let total = 0;

    quoteItems
    .forEach(
        (
            item,
            index
        ) => {

            const line =
                round2(

                    Math.max(
                        0,
                        Number(item.price) || 0
                    )

                    *

                    Math.max(
                        0,
                        Number(item.quantity) || 0
                    )

                );

            total =
                round2(
                    total + line
                );

            if(
                q(
                    `quoteLineTotal${index}`
                )
            ){

                q(
                    `quoteLineTotal${index}`
                )
                .textContent =
                    money(line);

            }

        }
    );

    if(
        q("quoteTotal")
    ){

        q("quoteTotal")
        .textContent =
            money(total);

    }

    return total;

}

function nextQuoteNumber(){

    const year =
        new Date()
        .getFullYear();

    const prefix =
        `PREV-${year}-`;

    const max =
        quotes
        .filter(
            item =>
            String(
                item.quote_number || ""
            )
            .startsWith(prefix)
        )
        .reduce(
            (
                value,
                item
            ) =>
            Math.max(

                value,

                Number(
                    String(
                        item.quote_number
                    )
                    .slice(
                        prefix.length
                    )
                ) || 0

            ),
            0
        );

    return (
        prefix +
        String(max + 1)
        .padStart(
            3,
            "0"
        )
    );

}

async function loadQuotes(){

    const {
        data,
        error
    } =
    await supabaseClient
        .from("quotes")
        .select("*")
        .order(
            "quote_date",
            {
                ascending:false
            }
        );

    if(error){

        console.error(error);

        toast(
            "Prima esegui il comando SQL dei preventivi"
        );

        return;

    }

    quotes =
        data || [];

    renderQuotes();

}

async function loadArticles(){

    const {
        data,
        error
    } =
    await supabaseClient
        .from("articles")
        .select("*")
        .order(
            "name",
            {
                ascending:true
            }
        );

    if(error){

        console.error(error);

        toast(
            "Esegui l'aggiornamento SQL degli articoli"
        );

        return;

    }

    articles =
        data || [];

    renderArticles();
    renderQuoteItems();

}

window.saveArticle =
async function(){

    const name =
        q("articleName")
        .value
        .trim();

    const description =
        q("articleDescription")
        .value
        .trim();

    const unit_price =
        round2(
            q("articlePrice")
            .value
        );

    if(!name){

        alert(
            "Inserisci il nome dell'articolo."
        );

        return;

    }

    if(unit_price < 0){

        alert(
            "Inserisci un prezzo valido."
        );

        return;

    }

    const duplicate =
        articles.some(
            item =>
            item.name
            .trim()
            .toLowerCase() ===
            name.toLowerCase()
        );

    if(duplicate){

        alert(
            "Questo articolo è già stato salvato."
        );

        return;

    }

    const button =
        q("saveArticleButton");

    button.disabled =
        true;

    button.textContent =
        "Salvataggio...";

    try{

        const {
            data,
            error
        } =
        await supabaseClient
            .from("articles")
            .insert({

                name,
                description,
                unit_price

            })
            .select()
            .single();

        if(error){

            alert(
                "Errore salvataggio articolo:\n" +
                error.message
            );

            return;

        }

        articles.push(data);

        articles.sort(
            (
                a,
                b
            ) =>
            a.name.localeCompare(
                b.name,
                "it"
            )
        );

        q("articleName").value =
            "";

        q("articleDescription").value =
            "";

        q("articlePrice").value =
            "";

        renderArticles();
        renderQuoteItems();

        toast(
            "Articolo salvato"
        );

    }
    finally{

        button.disabled =
            false;

        button.textContent =
            "Salva articolo";

    }

};

window.editArticle =
function(id){

    const article =
        articles.find(
            item =>
            String(item.id) ===
            String(id)
        );

    if(!article) return;

    q("modalContent")
    .innerHTML = `

        <h2>
            ✏️ Modifica articolo
        </h2>

        <label>Articolo</label>

        <input
            id="editArticleName"
            value="${escapeHTML(article.name)}">

        <label>Descrizione</label>

        <textarea id="editArticleDescription">${escapeHTML(article.description || "")}</textarea>

        <label>
            Prezzo unitario
        </label>

        <input
            id="editArticlePrice"
            type="number"
            min="0"
            step="0.01"
            value="${escapeHTML(article.unit_price)}">

        <div class="actions">

            <button
                class="secondary"
                onclick="closeModal()">
                Annulla
            </button>

            <button
                id="updateArticleButton"
                class="primary"
                onclick="updateArticle('${article.id}')">
                Salva modifiche
            </button>

        </div>

    `;

    q("modal")
    .classList
    .add("modal-center");

    q("modal")
    .classList
    .remove("hidden");

};

window.updateArticle =
async function(id){

    const name =
        q("editArticleName")
        .value
        .trim();

    const description =
        q("editArticleDescription")
        .value
        .trim();

    const unit_price =
        round2(
            q("editArticlePrice")
            .value
        );

    if(!name){

        alert(
            "Inserisci il nome dell'articolo."
        );

        return;

    }

    if(unit_price < 0){

        alert(
            "Inserisci un prezzo valido."
        );

        return;

    }

    const duplicate =
        articles.some(
            item =>
            String(item.id) !==
            String(id)

            &&

            item.name
            .trim()
            .toLowerCase() ===
            name.toLowerCase()
        );

    if(duplicate){

        alert(
            "Esiste già un articolo con questo nome."
        );

        return;

    }

    const button =
        q("updateArticleButton");

    button.disabled =
        true;

    button.textContent =
        "Salvataggio...";

    const {
        data,
        error
    } =
    await supabaseClient
        .from("articles")
        .update({

            name,
            description,
            unit_price,

            updated_at:
                new Date()
                .toISOString()

        })
        .eq(
            "id",
            id
        )
        .select()
        .single();

    if(error){

        button.disabled =
            false;

        button.textContent =
            "Salva modifiche";

        alert(
            error.message
        );

        return;

    }

    articles =
        articles
        .map(
            item =>
            String(item.id) ===
            String(id)
            ?
            data
            :
            item
        )
        .sort(
            (
                a,
                b
            ) =>
            a.name.localeCompare(
                b.name,
                "it"
            )
        );

    closeModal();
    renderArticles();
    renderQuoteItems();

    toast(
        "Articolo aggiornato"
    );

};

window.deleteArticle =
async function(id){

    if(
        !confirm(
            "Eliminare questo articolo dall'archivio?"
        )
    ) return;

    const {
        error
    } =
    await supabaseClient
        .from("articles")
        .delete()
        .eq(
            "id",
            id
        );

    if(error){

        alert(
            error.message
        );

        return;

    }

    articles =
        articles.filter(
            item =>
            String(item.id) !==
            String(id)
        );

    renderArticles();
    renderQuoteItems();

    toast(
        "Articolo eliminato"
    );

};

function renderArticles(){

    const box =
        q("articlesList");

    if(!box) return;

    const query =
        (
            q("articleSearch")
            ?.value || ""
        )
        .toLowerCase();

    const list =
        articles.filter(
            item =>
            (
                item.name +
                " " +
                (
                    item.description ||
                    ""
                )
            )
            .toLowerCase()
            .includes(query)
        );

    box.innerHTML =
        list.length
        ?
        list
        .map(
            item => `

            <div class="item">

                <div class="between">

                    <div>

                        <div class="item-title">
                            ${escapeHTML(item.name)}
                        </div>

                        <div class="sub">
                            ${
                                escapeHTML(
                                    item.description ||
                                    ""
                                )
                            }
                        </div>

                    </div>

                    <b>
                        ${money(item.unit_price)}
                    </b>

                </div>

                <div class="actions">

                    <button
                        class="secondary"
                        onclick="editArticle('${item.id}')">
                        Modifica
                    </button>

                    <button
                        class="danger"
                        onclick="deleteArticle('${item.id}')">
                        Elimina
                    </button>

                </div>

            </div>

            `
        )
        .join("")
        :
        '<div class="empty">Nessun articolo salvato.</div>';

}

window.emitQuote =
async function(){

    if(quoteSaving) return;

    const client =
        findClient(
            q("quoteClient")
            .value
        );

    if(!client){

        alert(
            "Seleziona il cliente."
        );

        return;

    }

    const cleanItems =
        quoteItems.map(
            item => ({

                article_id:
                    item.article_id ||
                    null,

                article:
                    String(
                        item.article ||
                        ""
                    )
                    .trim(),

                description:
                    String(
                        item.description ||
                        ""
                    )
                    .trim(),

                price:
                    round2(
                        item.price
                    ),

                quantity:
                    round2(
                        item.quantity
                    ),

                total:
                    round2(
                        item.price *
                        item.quantity
                    )

            })
        );

    if(
        !cleanItems.length
    ){

        alert(
            "Inserisci almeno un articolo."
        );

        return;

    }

    if(
        cleanItems.some(
            item =>
            !item.article ||
            item.price < 0 ||
            item.quantity <= 0
        )
    ){

        alert(
            "Controlla articolo, prezzo e quantità di tutte le righe."
        );

        return;

    }

    quoteSaving =
        true;

    const button =
        q("emitQuoteButton");

    button.disabled =
        true;

    button.textContent =
        "Emissione in corso...";

    try{

        const currentQuote =
            editingQuoteId
            ?
            quotes.find(
                item =>
                String(item.id) ===
                String(editingQuoteId)
            )
            :
            null;

        const payload = {

            quote_number:
                currentQuote
                ?.quote_number ||
                nextQuoteNumber(),

            client_id:
                client.id,

            quote_date:
                q("quoteDate")
                .value ||
                today(),

            subject:
                q("quoteSubject")
                .value
                .trim(),

            notes:
                q("quoteNotes")
                .value
                .trim(),

            validity_days:
                Number(
                    q("quoteValidity")
                    .value
                ) || 30,

            items:
                cleanItems,

            total:
                updateQuoteTotals(),

            status:
                "emesso",

            updated_at:
                new Date()
                .toISOString()

        };

        const request =
            editingQuoteId
            ?
            supabaseClient
            .from("quotes")
            .update(payload)
            .eq(
                "id",
                editingQuoteId
            )
            :
            supabaseClient
            .from("quotes")
            .insert(payload);

        const {
            data,
            error
        } =
        await request
            .select()
            .single();

        if(error){

            alert(
                "Errore salvataggio preventivo:\n" +
                error.message
            );

            return;

        }

        if(editingQuoteId){

            quotes =
                quotes.map(
                    item =>
                    String(item.id) ===
                    String(editingQuoteId)
                    ?
                    data
                    :
                    item
                );

        }
        else{

            quotes.unshift(
                data
            );

        }

        await createQuotePDF(
            data,
            client
        );

        const wasEditing =
            Boolean(
                editingQuoteId
            );

        resetQuoteForm();
        renderQuotes();

        toast(
            wasEditing
            ?
            "Preventivo aggiornato e PDF creato"
            :
            "Preventivo emesso e PDF creato"
        );

    }
    finally{

        quoteSaving =
            false;

        button.disabled =
            false;

        button.textContent =
            "Emetti e crea PDF";

    }

};

window.editQuote =
function(id){

    const quote =
        quotes.find(
            item =>
            String(item.id) ===
            String(id)
        );

    if(!quote) return;

    editingQuoteId =
        quote.id;

    showQuoteArea(
        "create"
    );

    refreshQuoteClients();

    q("quoteClient").value =
        quote.client_id;

    q("quoteDate").value =
        quote.quote_date ||
        today();

    q("quoteValidity").value =
        quote.validity_days ||
        30;

    q("quoteSubject").value =
        quote.subject ||
        "";

    q("quoteNotes").value =
        quote.notes ||
        "";

    quoteItems =
        (
            quote.items ||
            []
        )
        .map(
            item => ({

                ...item,

                article_id:
                    item.article_id ||
                    ""

            })
        );

    if(
        !quoteItems.length
    ){

        addQuoteItem();

    }
    else{

        renderQuoteItems();

    }

    q("emitQuoteButton")
    .textContent =
        "Salva modifiche e crea PDF";

    q("cancelQuoteEditButton")
    .classList
    .remove("hidden");

    window.scrollTo({

        top:0,
        behavior:"smooth"

    });

};

window.downloadQuotePDF =
async function(id){

    const quote =
        quotes.find(
            item =>
            String(item.id) ===
            String(id)
        );

    if(!quote) return;

    await createQuotePDF(

        quote,

        findClient(
            quote.client_id
        )

    );

};

window.deleteQuote =
async function(id){

    if(
        !confirm(
            "Eliminare definitivamente questo preventivo?"
        )
    ) return;

    const {
        error
    } =
    await supabaseClient
        .from("quotes")
        .delete()
        .eq(
            "id",
            id
        );

    if(error){

        alert(
            error.message
        );

        return;

    }

    quotes =
        quotes.filter(
            item =>
            String(item.id) !==
            String(id)
        );

    renderQuotes();

    toast(
        "Preventivo eliminato"
    );

};

function renderQuotes(){

    const box =
        q("quotesList");

    if(!box) return;

    const query =
        (
            q("quoteSearch")
            ?.value || ""
        )
        .toLowerCase();

    const list =
        quotes.filter(
            item =>
            (
                `${item.quote_number} ` +
                `${clientName(item.client_id)} ` +
                `${item.subject || ""}`
            )
            .toLowerCase()
            .includes(query)
        );

    box.innerHTML =
        list.length
        ?
        list
        .map(
            item => `

            <div class="item">

                <div class="between">

                    <div>

                        <div class="item-title">
                            ${escapeHTML(item.quote_number)}
                        </div>

                        <div class="sub">

                            ${escapeHTML(clientName(item.client_id))}
                            ·
                            ${formatDate(item.quote_date)}

                        </div>

                        ${
                            item.subject
                            ?
                            `<div class="sub">${escapeHTML(item.subject)}</div>`
                            :
                            ""
                        }

                    </div>

                    <b class="green">
                        ${money(item.total)}
                    </b>

                </div>

                <div class="actions">

                    <button
                        class="secondary"
                        onclick="editQuote('${item.id}')">
                        Modifica
                    </button>

                    <button
                        class="blue"
                        onclick="downloadQuotePDF('${item.id}')">
                        PDF
                    </button>

                    <button
                        class="danger"
                        onclick="deleteQuote('${item.id}')">
                        Elimina
                    </button>

                </div>

            </div>

            `
        )
        .join("")
        :
        '<div class="empty">Nessun preventivo emesso.</div>';

}

function loadQuoteLogo(){

    return new Promise(
        resolve => {

            const image =
                new Image();

            image.onload =
                () => resolve(image);

            image.onerror =
                () => resolve(null);

            image.src =
                `logo-preventivo.png?v=${Date.now()}`;

        }
    );

}

async function createQuotePDF(
    quote,
    client
){

    if(!window.jspdf){

        alert(
            "Libreria PDF non caricata. Controlla la connessione e riprova."
        );

        return;

    }

    const {
        jsPDF
    } =
    window.jspdf;

    const doc =
        new jsPDF({

            unit:"mm",
            format:"a4",
            orientation:"portrait"

        });

    const logo =
        await loadQuoteLogo();

    const navy =
        [17,31,48];

    const gold =
        [202,157,71];

    const pale =
        [245,247,249];

    const ink =
        [30,38,47];

    const pageWidth =
        doc.internal
        .pageSize
        .getWidth();

    const left =
        15;

    const right =
        pageWidth - 15;


 // Intestazione aziendale
doc.setFillColor(255,255,255);
doc.rect(0,0,pageWidth,39,"F");

doc.setFillColor(...gold);
doc.rect(0,39,pageWidth,1.7,"F");

if(logo){

    try{

        doc.addImage(
            logo,
            "PNG",
            15,
            5,
            180,
            30,
            undefined,
            "FAST"
        );

    }catch(error){

        console.warn(
            "Logo non inserito nel PDF",
            error
        );

    }

}else{

    doc.setTextColor(...navy);
    doc.setFont("helvetica","bold");
    doc.setFontSize(19);

    doc.text(
        "IGEA IMPIANTI",
        pageWidth / 2,
        18,
        {align:"center"}
    );

    doc.setFont("helvetica","normal");
    doc.setFontSize(9);

    doc.text(
        "IMPIANTI ELETTRICI · ALLARME · VIDEOSORVEGLIANZA · AUTOMAZIONE",
        pageWidth / 2,
        25,
        {align:"center"}
    );

}

    /* =========================================
       NUMERO E DATA PREVENTIVO
    ========================================= */

    doc.setTextColor(
        ...ink
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(
        21
    );

    doc.text(
        "PREVENTIVO",
        left,
        55
    );

    doc.setFillColor(
        ...navy
    );

    doc.roundedRect(

        139,
        46,

        56,
        24,

        2.5,
        2.5,

        "F"

    );

    doc.setTextColor(
        255,
        255,
        255
    );

    doc.setFontSize(
        8
    );

    doc.text(
        "NUMERO",
        144,
        52
    );

    doc.text(
        "DATA",
        144,
        63
    );

    doc.setFontSize(
        10.5
    );

    doc.text(

        String(
            quote.quote_number ||
            "-"
        ),

        190,
        52,

        {
            align:"right"
        }

    );

    doc.text(

        formatDate(
            quote.quote_date
        ),

        190,
        63,

        {
            align:"right"
        }

    );


    /* =========================================
       DATI AZIENDA E CLIENTE
    ========================================= */

    const companyLines = [

        "Titolare: Ciro Igea",

        "Via Maria Maligran 15 - 80147 Napoli (NA)",

        "Codice fiscale: GIECRI93S14F839O"

    ];

    const clientLines = [

        client?.name ||
        "Cliente non indicato",

        client?.address ||
        "",

        client?.city ||
        "",

        client?.phone
        ?
        `Tel. ${client.phone}`
        :
        "",

        client?.email ||
        ""

    ]
    .filter(Boolean);

    const cardY =
        77;

    const cardH =
        Math.max(

            35,

            14 +

            Math.max(
                companyLines.length,
                clientLines.length
            )

            * 4.6

        );

    doc.setFillColor(
        ...pale
    );

    doc.roundedRect(

        left,
        cardY,

        86,
        cardH,

        2.5,
        2.5,

        "F"

    );

    doc.roundedRect(

        109,
        cardY,

        86,
        cardH,

        2.5,
        2.5,

        "F"

    );

    doc.setTextColor(
        ...gold
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(
        8
    );

    doc.text(
        "FORNITORE",
        20,
        84
    );

    doc.text(
        "DESTINATARIO",
        114,
        84
    );

    doc.setTextColor(
        ...ink
    );

    doc.setFontSize(
        9.2
    );

    doc.text(
        "IGEA IMPIANTI",
        20,
        91
    );

    doc.text(
        clientLines[0],
        114,
        91
    );

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(
        7.8
    );

    doc.text(

        companyLines,

        20,
        96,

        {
            lineHeightFactor:1.35
        }

    );

    if(
        clientLines.length > 1
    ){

        doc.text(

            clientLines.slice(1),

            114,
            96,

            {
                lineHeightFactor:1.35
            }

        );

    }


    /* =========================================
       OGGETTO DEL PREVENTIVO
    ========================================= */

    let y =
        cardY +
        cardH +
        9;

    if(quote.subject){

        const subjectLines =
            doc.splitTextToSize(
                quote.subject,
                151
            );

        const subjectH =
            Math.max(

                14,

                8 +
                subjectLines.length *
                4.5

            );

        doc.setDrawColor(
            220,
            224,
            228
        );

        doc.setFillColor(
            255,
            255,
            255
        );

        doc.roundedRect(

            left,
            y,

            180,
            subjectH,

            2,
            2,

            "FD"

        );

        doc.setTextColor(
            ...gold
        );

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            8
        );

        doc.text(
            "OGGETTO",
            20,
            y + 6
        );

        doc.setTextColor(
            ...ink
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(
            9
        );

        doc.text(

            subjectLines,

            39,
            y + 6

        );

        y +=
            subjectH +
            7;

    }


    /* =========================================
       ARTICOLI
    ========================================= */

    const rows =
        (
            quote.items ||
            []
        )
        .map(
            (
                item,
                index
            ) => [

                String(
                    index + 1
                ),

                item.article ||
                "",

                item.description ||
                "",

                String(
                    item.quantity
                )
                .replace(
                    ".",
                    ","
                ),

                money(
                    item.price
                ),

                money(
                    item.total
                )

            ]
        );

    doc.autoTable({

        startY:
            y,

        margin:{

            left,
            right:15,
            bottom:29

        },

        head:[[

            "#",
            "ARTICOLO",
            "DESCRIZIONE",
            "Q.TÀ",
            "PREZZO UNIT.",
            "TOTALE"

        ]],

        body:
            rows,

        theme:
            "plain",

        styles:{

            font:
                "helvetica",

            fontSize:
                8,

            cellPadding:{

                top:3,
                bottom:3,
                left:2,
                right:2

            },

            textColor:
                ink,

            valign:
                "middle",

            lineColor:[
                225,
                228,
                232
            ],

            lineWidth:{

                bottom:
                    0.25

            }

        },

        headStyles:{

            fillColor:
                navy,

            textColor:[
                255,
                255,
                255
            ],

            fontStyle:
                "bold",

            fontSize:
                7.5,

            halign:
                "left",

            lineWidth:
                0

        },

        alternateRowStyles:{

            fillColor:[
                248,
                249,
                250
            ]

        },

        columnStyles:{

            0:{

                cellWidth:8,
                halign:"center"

            },

            1:{

                cellWidth:39,
                fontStyle:"bold"

            },

            2:{

                cellWidth:58

            },

            3:{

                cellWidth:15,
                halign:"right"

            },

            4:{

                cellWidth:28,
                halign:"right"

            },

            5:{

                cellWidth:32,
                halign:"right",
                fontStyle:"bold"

            }

        }

    });

    y =
        doc.lastAutoTable
        .finalY +
        8;

    if(y > 236){

        doc.addPage();

        y =
            20;

    }


    /* =========================================
       TOTALE E VALIDITÀ
    ========================================= */

    doc.setFillColor(
        ...pale
    );

    doc.roundedRect(

        109,
        y,

        86,
        23,

        2.5,
        2.5,

        "F"

    );

    doc.setTextColor(
        ...ink
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(
        8.5
    );

    doc.text(

        "TOTALE PREVENTIVO",

        114,
        y + 8

    );

    doc.setTextColor(
        ...navy
    );

    doc.setFontSize(
        16
    );

    doc.text(

        money(
            quote.total
        ),

        190,
        y + 16,

        {
            align:"right"
        }

    );

    doc.setTextColor(
        ...ink
    );

    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(
        8.5
    );

    doc.text(

        `Validità: ${quote.validity_days || 30} giorni dalla data di emissione`,

        left,
        y + 8

    );

    y +=
        31;


    /* =========================================
       NOTE E CONDIZIONI
    ========================================= */

    if(quote.notes){

        const noteLines =
            doc.splitTextToSize(
                quote.notes,
                180
            );

        const noteH =
            12 +
            noteLines.length *
            4;

        if(
            y + noteH >
            263
        ){

            doc.addPage();

            y =
                20;

        }

        doc.setTextColor(
            ...gold
        );

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(
            8
        );

        doc.text(

            "NOTE E CONDIZIONI",

            left,
            y

        );

        doc.setTextColor(
            ...ink
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(
            8.5
        );

        doc.text(

            noteLines,

            left,
            y + 6,

            {
                lineHeightFactor:1.35
            }

        );

        y +=
            noteH;

    }


    /* =========================================
       FIRMA CLIENTE
    ========================================= */

    if(y > 249){

        doc.addPage();

        y =
            25;

    }

    doc.setDrawColor(
        170,
        176,
        182
    );

    doc.line(

        125,
        y + 13,

        195,
        y + 13

    );

    doc.setTextColor(
        90,
        97,
        105
    );

    doc.setFontSize(
        7.5
    );

    doc.text(

        "Firma del cliente per accettazione",

        160,
        y + 18,

        {
            align:"center"
        }

    );


    /* =========================================
       PIÈ DI PAGINA
    ========================================= */

    const totalPages =
        doc.getNumberOfPages();

    for(
        let page = 1;
        page <= totalPages;
        page++
    ){

        doc.setPage(
            page
        );

        doc.setDrawColor(
            ...gold
        );

        doc.setLineWidth(
            0.5
        );

        doc.line(

            left,
            278,

            right,
            278

        );

        doc.setTextColor(
            100,
            107,
            114
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(
            7
        );

        doc.text(

            "IGEA IMPIANTI - Via Maria Maligran 15, 80147 Napoli (NA) - C.F. GIECRI93S14F839O",

            left,
            284

        );

        doc.text(

            `Pagina ${page} di ${totalPages}`,

            right,
            284,

            {
                align:"right"
            }

        );

    }


    /* =========================================
       DOWNLOAD PDF
    ========================================= */

    doc.save(

        `${quote.quote_number}-${
            (
                client?.name ||
                "cliente"
            )
            .replace(
                /[^a-z0-9]+/gi,
                "-"
            )
        }.pdf`

    );

}

function resetQuoteForm(){

    editingQuoteId =
        null;

    q("quoteClient").value =
        "";

    q("quoteDate").value =
        today();

    q("quoteValidity").value =
        "30";

    q("quoteSubject").value =
        "";

    q("quoteNotes").value =
        "";

    q("emitQuoteButton")
    .textContent =
        "Emetti e crea PDF";

    q("cancelQuoteEditButton")
    .classList
    .add("hidden");

    quoteItems =
        [];

    addQuoteItem();

}

installQuoteStyles();
installQuotePage();
refreshQuoteClients();

q("quoteDate").value =
    today();

addQuoteItem();

supabaseClient
.auth
.getSession()
.then(
    ({
        data
    }) => {

        if(
            data?.session
        ){

            loadQuotes();
            loadArticles();

        }

    }
);

supabaseClient
.auth
.onAuthStateChange(
    (
        event,
        session
    ) => {

        if(
            event === "SIGNED_IN" &&
            session
        ){

            loadQuotes();
            loadArticles();

        }

    }
);

})();
