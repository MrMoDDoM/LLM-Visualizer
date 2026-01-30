# 📚 Tutorial: Analisi dei Pattern di Ragionamento in LLM

Questo tutorial ti guida attraverso un'analisi completa dei pattern di hidden states durante diverse tipologie di ragionamento.

## Obiettivo

Comprendere come gli hidden states evolvono durante:
1. Ragionamento matematico
2. Generazione creativa
3. Recupero di conoscenza fattuale

## Setup

```python
# Carica il modello nell'interfaccia web
# Usa: meta-llama/Llama-3.2-1B-Instruct
```

## Esperimento 1: Ragionamento Matematico

### Step 1: Genera senza steering

**Prompt:**
```
Q: What is 127 + 384?
A: Let me solve this step by step.
```

**Parametri:**
- Max Tokens: 30
- Temperature: 0.7
- No steering

**Cosa osservare:**
1. Nei primi layer (0-5): pattern lessicali dei numeri
2. Nei layer medi (6-15): costruzione della soluzione
3. Negli ultimi layer (16+): selezione del token finale

**Pattern attesi:**
- Attivazioni forti nelle dimensioni associate ai numeri
- Graduale transizione verso rappresentazioni più astratte
- Convergenza verso la risposta nei layer finali

### Step 2: Confronta token chiave

Naviga token per token e confronta:
- Token "127": rappresentazione numerica iniziale
- Token "step": attivazione del meccanismo di ragionamento
- Token con il risultato: convergenza della soluzione

**Domande:**
- Quali dimensioni cambiano di più tra questi token?
- A quale layer avviene il "salto" verso la soluzione?

## Esperimento 2: Creatività vs Fatti

### Test A: Fatto storico

**Prompt:**
```
The capital of France is
```

**Cosa aspettarsi:**
- Risposta deterministica ("Paris")
- Pattern molto stabili attraverso i layer
- Minima varianza nelle attivazioni

### Test B: Completamento creativo

**Prompt:**
```
Once upon a time, in a magical forest,
```

**Cosa aspettarsi:**
- Maggiore varianza nelle attivazioni
- Pattern meno deterministici
- Maggiore "esplorazione" nello spazio degli hidden states

**Confronto:**
Usa normalizzazione "Fixed Range" con gli stessi vmin/vmax per confrontare:
- La varianza è maggiore nel caso creativo?
- Quali layer mostrano le maggiori differenze?

## Esperimento 3: Steering per Controllo

### Step 1: Genera steering vector di conciseness

```bash
cd backend
python generate_steering_vector.py \
    --model meta-llama/Llama-3.2-1B-Instruct \
    --behavior conciseness \
    --output concise_vector.pt
```

### Step 2: Test senza steering

**Prompt:**
```
Explain photosynthesis.
```

**Parametri:**
- Max Tokens: 50
- Temperature: 1.0

**Risultato atteso:** Spiegazione verbosa

### Step 3: Test con steering

**Applica steering:**
- Vector: concise_vector
- Layer: 8 (layer medio)
- Coefficient: 2.5

**Risultato atteso:** Spiegazione più concisa

### Step 4: Analisi comparativa

**Crea due visualizzazioni:**
1. Timeline completa senza steering
2. Timeline completa con steering

**Confronta:**
- Quali dimensioni cambiano di più?
- Il cambiamento è uniforme su tutti i layer o concentrato?
- Come cambia la distribuzione dei valori?

## Esperimento 4: Multi-Layer Steering

### Ipotesi

Applicare steering a layer diversi produce effetti diversi:
- Layer bassi: cambio superficiale (stile)
- Layer medi: cambio semantico (significato)
- Layer alti: cambio nella selezione del token

### Test

**Setup base:**
```
Write a poem about the ocean.
```

**Configurazioni da testare:**

1. **Steering layer basso (layer 4)**
   - Coefficient: 1.0
   - Effetto atteso: cambio stilistico

2. **Steering layer medio (layer 12)**
   - Coefficient: 1.0
   - Effetto atteso: cambio tematico

3. **Steering layer alto (layer 20)**
   - Coefficient: 1.0
   - Effetto atteso: cambio nella scelta delle parole

4. **Multi-layer simultaneo (4, 12, 20)**
   - Coefficient: 0.7 per tutti
   - Effetto atteso: effetto combinato

### Analisi

Per ogni configurazione:
1. Salva la timeline
2. Nota le differenze nel testo generato
3. Identifica quali dimensioni cambiano di più
4. Confronta l'effetto sui diversi layer

## Esperimento 5: Debugging del Comportamento

### Caso: Output Inaspettato

**Scenario:** Il modello produce una risposta strana

**Prompt problematico:**
```
The moon is made of
```

**Risposta inaspettata:** (ad esempio, continua con informazioni errate)

### Processo di debugging

1. **Identifica il token critico**
   - Naviga token per token
   - Trova dove la generazione "devia"

2. **Analizza gli hidden states**
   - Quali layer mostrano attivazioni anomale?
   - Ci sono pattern inaspettati?

3. **Ipotizza la causa**
   - Confronto con prompt simili corretti
   - Identificazione delle dimensioni problematiche

4. **Tenta correzione con steering**
   - Crea o usa un vettore che "spinge" verso il comportamento corretto
   - Applica al layer identificato come problematico

## Patterns Comuni da Cercare

### Pattern 1: "Information Retrieval"
**Caratteristiche:**
- Attivazioni forti nei layer bassi
- Convergenza rapida nei layer alti
- Bassa varianza tra token

### Pattern 2: "Reasoning Chain"
**Caratteristiche:**
- Attivazioni che evolvono gradualmente
- Transizioni visibili tra "step" di ragionamento
- Dimensioni che si "accendono" in sequenza

### Pattern 3: "Creative Exploration"
**Caratteristiche:**
- Alta varianza nelle attivazioni
- Pattern meno strutturati
- Maggiore "diversità" tra layer successivi

### Pattern 4: "Token Selection"
**Caratteristiche:**
- Convergenza negli ultimi 2-3 layer
- Pattern molto distintivo per token specifici
- Correlazione con probabilità del token

## Esercizi Avanzati

### Esercizio 1: Crea un Atlas di Pattern

1. Genera 10 tipi diversi di prompt (matematica, storia, creatività, ecc.)
2. Salva le visualizzazioni per ciascuno
3. Identifica pattern ricorrenti
4. Crea una "mappa" mentale dei pattern comuni

### Esercizio 2: Steering Vector Personale

1. Identifica un comportamento che vuoi controllare
2. Crea 5-10 coppie di prompt contrastanti
3. Genera il tuo steering vector
4. Testa su nuovi prompt
5. Itera fino a ottenere l'effetto desiderato

### Esercizio 3: Layer Importance Analysis

Per un task specifico:
1. Applica steering a ciascun layer individualmente
2. Misura l'effetto sul testo generato
3. Identifica quali layer sono più influenti
4. Crea un "profilo di importanza" per il task

## Risorse Aggiuntive

- Paper originale su CAA: [Anthropic](https://www.anthropic.com/index/steering-gpt-2-xl-by-adding-an-activation-vector)
- Transformer Circuits: [Understanding transformers](https://transformer-circuits.pub/)
- Community examples: [GitHub discussions](#)

## Conclusioni

Attraverso questi esperimenti hai imparato a:
- ✅ Visualizzare e interpretare hidden states
- ✅ Identificare pattern di ragionamento
- ✅ Usare steering vectors per controllo
- ✅ Debuggare comportamenti del modello
- ✅ Analizzare differenze tra layer

**Prossimi passi:**
- Sperimenta con modelli diversi
- Crea la tua collezione di steering vectors
- Condividi i tuoi findings con la community!

---

**Buona esplorazione! 🔬🧠**
