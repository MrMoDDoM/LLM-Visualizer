# 🧠 LLM Hidden States Visualizer

Un tool web interattivo per visualizzare e manipolare gli hidden states di modelli LLM Decoder-based durante l'inferenza, con supporto per Steering Vectors.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8%2B-blue.svg)
![React](https://img.shields.io/badge/react-18.2-blue.svg)

## 🎯 Caratteristiche

- **Visualizzazione Hidden States**: Heatmap dettagliate degli stati nascosti per ogni layer e token
- **Steering Vectors**: Manipola il comportamento del modello durante l'inferenza
- **Interfaccia Interattiva**: Navigazione token-by-token con timeline completa
- **Zoom & Pan**: Esplora le visualizzazioni in dettaglio
- **Multi-Layer Steering**: Applica steering vectors a layer diversi simultaneamente
- **Supporto Multi-Modello**: Compatibile con LLaMA, Mistral, GPT-2 e altri modelli HuggingFace
- **Controlli Real-time**: Modifica temperature, top-k, top-p e coefficienti di steering al volo

## 🏗️ Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Model Loader   │  │ Generation   │  │ Visualization   │ │
│  │                │  │ Panel        │  │ Panel           │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Steering Vector Manager                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (FastAPI + PyTorch)                 │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Model Loading  │  │ Token        │  │ Hidden States   │ │
│  │ & Management   │  │ Generation   │  │ Extraction      │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Steering Vector Application via Hooks          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisiti

### Backend
- Python 3.8+
- CUDA-compatible GPU (raccomandato, ma funziona anche su CPU)
- 16GB+ RAM (32GB+ per modelli grandi)

### Frontend
- Node.js 14+
- npm o yarn

## 🚀 Installazione

### 1. Clone del Repository

```bash
git clone <repository-url>
cd llm-hidden-states-visualizer
```

### 2. Setup Backend

```bash
cd backend

# Crea ambiente virtuale
python -m venv venv
source venv/bin/activate  # Su Windows: venv\Scripts\activate

# Installa dipendenze
pip install -r requirements.txt
```

**Note Importanti:**
- Per modelli LLaMA, configura HuggingFace authentication:
  ```bash
  huggingface-cli login
  ```
- Per GPU: assicurati di avere CUDA e PyTorch con supporto CUDA installati
- Per modelli grandi: considera l'uso di `bitsandbytes` per quantizzazione

### 3. Setup Frontend

```bash
cd ../frontend

# Installa dipendenze
npm install
```

## 🎮 Utilizzo

### Avvio Backend

```bash
cd backend
source venv/bin/activate
python main.py
```

Il server sarà disponibile su `http://localhost:8000`

### Avvio Frontend

```bash
cd frontend
npm start
```

L'interfaccia web sarà disponibile su `http://localhost:3000`

## 📖 Guida Utente

### 1. Caricamento del Modello

1. All'avvio, seleziona un modello dalla lista preimpostata o inserisci un modello custom
2. Clicca "Load Model" e attendi il download e l'inizializzazione
3. Il modello viene caricato in memoria con supporto per hidden states

**Modelli Suggeriti:**
- `meta-llama/Llama-3.2-1B-Instruct` - Veloce, buono per testing
- `meta-llama/Llama-3.1-8B-Instruct` - Bilanciato
- `gpt2` - Leggero, ideale per CPU

### 2. Generazione di Testo

1. Inserisci un prompt nel campo di testo
2. Regola i parametri di generazione:
   - **Max Tokens**: Numero massimo di token da generare
   - **Temperature**: Controlla la randomness (0.1 = deterministico, 2.0 = molto casuale)
   - **Top-K**: Limita il campionamento ai K token più probabili
   - **Top-P**: Nucleus sampling (0.9 raccomandato)
3. (Opzionale) Configura steering vectors
4. Clicca "Generate"

### 3. Visualizzazione degli Hidden States

Dopo la generazione:

**Vista Principale (Token Corrente):**
- Mostra tutti i layer per il token selezionato
- Ogni riga = un layer
- Ogni colonna = una dimensione del hidden state
- Colori: Blu (valori negativi) → Bianco (zero) → Rosso (valori positivi)

**Controlli:**
- ◀/▶ per navigare tra i token
- Zoom con +/- o scroll del mouse
- Pan trascinando l'immagine
- Download dell'immagine corrente

**Timeline Completa:**
- Vista miniaturizzata di tutta la sequenza
- Clicca per saltare a un token specifico
- Separatori visivi tra i token

**Input Embedding:**
- Visualizza il vettore di embedding del token corrente
- Utile per capire la rappresentazione iniziale

### 4. Steering Vectors

**Caricamento:**
1. Clicca "Upload Vector (.pt)" nella sezione Steering Vector Library
2. Seleziona un file `.pt` contenente un torch tensor
3. Il vettore appare nella lista con shape e norma

**Visualizzazione:**
- Clicca l'icona 👁️ per vedere l'heatmap del vettore
- Usa normalizzazione auto o fixed range

**Applicazione durante Generazione:**
1. Nella sezione Generation Settings, clicca "+ Add Steering"
2. Seleziona il vettore da usare
3. Scegli il layer target (default: layer centrale)
4. Regola il coefficiente moltiplicativo (-5 a +5)
5. Abilita/disabilita con la checkbox
6. Puoi aggiungere multiple configurazioni per layer diversi

**Formula:** `hidden_state = hidden_state + coefficient × steering_vector`

### 5. Normalizzazione

**Auto Normalize:**
- Usa min/max dei valori correnti
- Migliore per vedere pattern in un singolo token

**Fixed Range:**
- Specifica vmin/vmax manualmente
- Utile per confrontare token diversi con la stessa scala

## 🔬 Use Cases

### 1. Analisi del Ragionamento

Osserva come gli hidden states evolvono durante la generazione di una catena di ragionamento:

```python
prompt = "Let's solve this step by step: What is 15 × 24?"
```

Noterai pattern interessanti:
- Layer inferiori: rappresentazioni lessicali
- Layer medi: costruzione della soluzione
- Layer superiori: selezione del token finale

### 2. Steering per Controllo dello Stile

Applica un "formality vector" per rendere il modello più formale:

```python
# Genera un vettore di steering (esempio semplificato)
import torch

# Questo è un esempio - in pratica useresti CAA (Contrastive Activation Addition)
formality_vector = torch.randn(4096)  # Dimensione hidden del modello
torch.save(formality_vector, 'formality_vector.pt')
```

### 3. Studio degli Attention Patterns

Confronta gli hidden states con e senza steering per capire l'effetto:
- Genera con steering disabilitato
- Salva le visualizzazioni
- Genera con steering abilitato
- Confronta le differenze

### 4. Debugging del Comportamento

Se un modello produce output inaspettati:
1. Visualizza gli hidden states token-by-token
2. Identifica quando/dove il comportamento diverge
3. Usa steering per correggere a runtime

## 📊 Formato Steering Vectors

I file `.pt` devono contenere torch tensors con:

```python
import torch

# Formato corretto
steering_vector = torch.randn(hidden_size)  # 1D tensor
torch.save(steering_vector, 'my_vector.pt')

# Oppure un dizionario
torch.save({'vector': steering_vector}, 'my_vector.pt')
```

**Dimensioni:**
- LLaMA 3.1 8B: 4096
- LLaMA 2 7B: 4096
- GPT-2: 768
- GPT-2 Medium: 1024

## 🛠️ API Reference

### Backend Endpoints

**GET `/status`**
- Controlla lo stato del server e del modello caricato

**POST `/load_model`**
```json
{
  "model_name": "meta-llama/Llama-3.1-8B-Instruct"
}
```

**POST `/generate`**
```json
{
  "prompt": "Your prompt here",
  "max_new_tokens": 20,
  "temperature": 1.0,
  "top_k": 50,
  "top_p": 0.9,
  "steering_configs": [
    {
      "vector_name": "formality",
      "layer": 16,
      "coefficient": 1.5,
      "enabled": true
    }
  ]
}
```

**POST `/visualize_token`**
```json
{
  "token_index": 0,
  "normalization": {
    "mode": "auto",
    "vmin": null,
    "vmax": null
  }
}
```

**POST `/upload_steering_vector`**
- Multipart form data con file `.pt`

**GET `/steering_vectors`**
- Lista di tutti i vettori caricati

**DELETE `/steering_vectors/{name}`**
- Elimina un vettore

## 🧪 Testing

### Test di Base

```bash
# Backend
cd backend
pytest tests/

# Frontend
cd frontend
npm test
```

### Test Manuale

1. Carica GPT-2 (piccolo e veloce)
2. Usa prompt: "Hello, my name is"
3. Genera 10 token
4. Verifica che tutte le visualizzazioni si carichino
5. Prova zoom/pan
6. Carica un vettore di test
7. Applica steering e confronta risultati

## 🐛 Troubleshooting

### Il modello non si carica

- **Out of Memory**: Riduci dimensione modello o usa CPU
- **Authentication Error (LLaMA)**: Esegui `huggingface-cli login`
- **Model not found**: Verifica il nome su HuggingFace Hub

### Visualizzazioni lente

- Riduci numero di token generati
- Usa GPU invece di CPU
- Chiudi altre applicazioni

### Steering non funziona

- Verifica che la dimensione del vettore corrisponda all'hidden size
- Controlla che il layer selezionato sia valido (0 to num_layers-1)
- Assicurati che la checkbox sia abilitata

### CORS Errors

- Assicurati che backend sia su porta 8000
- Verifica che frontend sia su porta 3000
- Controlla i log del backend

## 🔮 Funzionalità Future

- [ ] Supporto per Encoder-Decoder models
- [ ] Export/import di sessioni complete
- [ ] Confronto side-by-side di generazioni
- [ ] Analisi automatica di pattern
- [ ] Generazione automatica di steering vectors via CAA
- [ ] Supporto per modelli quantizzati (4-bit, 8-bit)
- [ ] API per batch processing
- [ ] Integrazione con Weights & Biases per logging

## 📚 Risorse

- [Anthropic CAA Paper](https://www.anthropic.com/index/steering-gpt-2-xl-by-adding-an-activation-vector)
- [Transformer Interpretability](https://transformer-circuits.pub/)
- [HuggingFace Transformers Docs](https://huggingface.co/docs/transformers)

## 🤝 Contribuire

Pull requests sono benvenute! Per modifiche importanti:

1. Apri un issue per discutere le modifiche
2. Fork del repository
3. Crea un feature branch
4. Commit delle modifiche con messaggi descrittivi
5. Push al branch
6. Apri una Pull Request

## 📝 License

MIT License - vedi LICENSE file per dettagli

## 👨‍💻 Autore

Creato per esplorare e manipolare i meccanismi interni dei Large Language Models.

## 🙏 Ringraziamenti

- Anthropic per la ricerca su steering vectors e interpretability
- HuggingFace per la libreria Transformers
- Community di ricerca su LLM interpretability

---

**Happy Steering! 🚀🧠**
