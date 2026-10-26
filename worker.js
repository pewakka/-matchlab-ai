const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8"}});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, {headers:corsHeaders});
    if (url.pathname === "/api/status") return json({configured: Boolean(env.GEMINI_API_KEY), model: "Gemini Flash + ricerca web", webSearch: true});
    if (url.pathname === "/api/search" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({error:"Richiesta non valida."},400); }
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const sport = typeof body.sport === "string" ? body.sport : "all";
      if (!question) return json({error:"Scrivi una domanda prima di cercare."},400);
      if (question.length > 1800) return json({error:"La domanda è troppo lunga. Riducila."},400);
      if (!env.GEMINI_API_KEY) return json({error:"Manca GEMINI_API_KEY. Aggiungila nei Secrets del Worker."},503);
      try {
        const sportLabel = ({football:"calcio",nba:"NBA/basket",tennis:"tennis",all:"calcio, NBA o tennis"})[sport] || "sport";
        const queries = buildQueries(question, sportLabel);
        const results = [];
        for (const q of queries.slice(0,3)) {
          try { results.push(...await searchDuckDuckGo(q)); } catch (e) { console.log("Search source unavailable", e.message); }
        }
        const unique = [...new Map(results.filter(x=>x.url).map(x=>[x.url,x])).values()].slice(0,10);
        if (!unique.length) return json({error:"La ricerca web non ha restituito fonti accessibili. Riprova con una domanda più specifica."},502);
        const context = unique.map((s,i)=>`[${i+1}] ${s.title}\nURL: ${s.url}\nEstratto: ${s.snippet}`).join("\n\n");
        const prompt = `Sei MatchLab AI, assistente di ricerca sportiva in italiano. Ambito: ${sportLabel}.\n\nDomanda utente: ${question}\n\nRISULTATI WEB RECUPERATI (possono essere incompleti):\n${context}\n\nIstruzioni: rispondi in italiano. Basa le affermazioni sui risultati forniti; cita le fonti usando [1], [2] ecc. e inserisci link Markdown con URL esatti. Non inventare statistiche, quote, infortuni, partite o dati mancanti. Distingui dati verificati da inferenze. Per dati sportivi indica periodo e campione se disponibili. Se le fonti non contengono i dati richiesti, dichiaralo chiaramente e non simulare un confronto statistico. Per richieste relative a oggi/stanotte, considera la data attuale e segnala se i risultati non la confermano. Concludi con limiti dell'analisi. Nessuna garanzia di risultato o vincita.`;
        const model = env.GEMINI_MODEL || "gemini-2.5-flash";
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.25,maxOutputTokens:1800}})
        });
        const data = await response.json();
        if (!response.ok) {
          console.log("Gemini error", response.status, JSON.stringify(data).slice(0,400));
          if (response.status === 429) return json({error:"Hai raggiunto il limite temporaneo gratuito di Gemini. Riprova più tardi."},429);
          return json({error:"Il servizio AI non ha accettato la richiesta. Controlla la chiave Gemini e riprova."},502);
        }
        const answer = (data.candidates?.[0]?.content?.parts || []).map(p=>p.text||"").join("\n").trim();
        return json({answer:answer || "Nessuna risposta testuale ricevuta.", sources:unique.map(s=>({title:s.title,url:s.url})), model, generatedAt:new Date().toISOString()});
      } catch (e) {
        console.log("Request error",e.message);
        return json({error:"Ricerca non riuscita. Riprova tra poco."},502);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
function buildQueries(question, sport) {
  const base = question.replace(/[\r\n]+/g," ").slice(0,240);
  const q = [base];
  if (/nba|basket|triple|rimbalzi|assist/i.test(sport+" "+base)) q.push(base+" NBA stats last games official");
  else if (/tennis|atp|wta/i.test(sport+" "+base)) q.push(base+" ATP WTA official statistics");
  else q.push(base+" statistiche calcio fonti ufficiali");
  q.push(base+" statistics results today");
  return [...new Set(q)];
}
async function searchDuckDuckGo(query) {
  const url = "https://html.duckduckgo.com/html/?q="+encodeURIComponent(query);
  const r = await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 (compatible; MatchLabAI/1.0)"}});
  if (!r.ok) throw new Error("Search HTTP "+r.status);
  const html = await r.text();
  const out=[];
  const re=/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<td[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/td>)/gi;
  let m;
  while((m=re.exec(html))!==null && out.length<6){
    let href=decodeEntities(m[1]);
    try { const parsed=new URL(href,"https://duckduckgo.com"); const redirect=parsed.searchParams.get("uddg"); if(redirect) href=redirect; const valid=new URL(href); if(!["http:","https:"].includes(valid.protocol)) continue; }
    catch { continue; }
    const title=stripTags(decodeEntities(m[2]));
    const snippet=stripTags(decodeEntities(m[3]||m[4]||""));
    if(title && href) out.push({title,url:href,snippet});
  }
  return out;
}
function stripTags(s){return s.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();}
function decodeEntities(s){return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ");}
