# MatchLab AI — versione a costo zero (entro i limiti gratuiti)

Questa versione usa Cloudflare Workers per ospitare il sito e Google Gemini API per generare l'analisi. Cerca prima pagine web tramite DuckDuckGo e passa i risultati a Gemini. Non è una banca dati sportiva professionale: i risultati web possono essere incompleti e la ricerca HTML può cambiare.

## Cosa serve
- Account Cloudflare gratuito.
- Chiave Gemini API creata da Google AI Studio. Il livello gratuito ha limiti e condizioni che possono cambiare. Consulta https://ai.google.dev/gemini-api/docs/pricing?hl=it
- Per la distribuzione via terminale: Node.js 20+ e un computer. Da iPhone si può usare l'editor online di Cloudflare, ma caricare il progetto completo è più semplice da un computer.

## Distribuzione consigliata (computer)
1. Estrai lo ZIP.
2. Installa Node.js 20+ da https://nodejs.org/.
3. Apri un terminale nella cartella e lancia `npm install`.
4. Lancia `npx wrangler login` e autorizza Cloudflare.
5. Aggiungi la chiave come secret: `npx wrangler secret put GEMINI_API_KEY` e incolla la chiave quando richiesto.
6. Pubblica con `npm run deploy`.
7. Apri l'indirizzo `*.workers.dev` mostrato da Cloudflare.

Per cambiare modello, aggiungi un secret/variable `GEMINI_MODEL` con un nome di modello disponibile per il tuo account, ad esempio `gemini-2.5-flash`.

## Importante
- Non inserire mai la chiave API nei file `public/` e non pubblicarla su GitHub.
- Il piano hosting Cloudflare è gratuito entro i limiti previsti. Il livello gratuito Gemini può avere limiti di richieste, disponibilità dei modelli e condizioni d'uso. Non è possibile promettere uso illimitato a costo zero.
- La ricerca web qui è una prima versione: non garantisce di trovare tutte le statistiche, i roster, le quote o gli infortuni aggiornati. Per analisi precise su triple, rimbalzi e assist, verifica sempre le fonti collegate.
- Le analisi sportive non garantiscono vincite.
