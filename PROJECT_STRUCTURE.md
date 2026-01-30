# 📁 Struttura del Progetto

```
llm-hidden-states-visualizer/
│
├── backend/                          # Backend Python (FastAPI + PyTorch)
│   ├── main.py                       # Server FastAPI principale
│   ├── generate_steering_vector.py   # Script per generare steering vectors
│   ├── requirements.txt              # Dipendenze Python
│   ├── Dockerfile                    # Container Docker backend
│   └── venv/                         # Virtual environment (creato automaticamente)
│
├── frontend/                         # Frontend React
│   ├── src/
│   │   ├── App.js                    # Componente principale
│   │   ├── App.css                   # Stili globali
│   │   ├── index.js                  # Entry point React
│   │   ├── index.css                 # Stili di base
│   │   └── components/               # Componenti React
│   │       ├── ModelLoader.js        # Caricamento modelli
│   │       ├── ModelLoader.css
│   │       ├── GenerationPanel.js    # Pannello generazione testo
│   │       ├── GenerationPanel.css
│   │       ├── VisualizationPanel.js # Visualizzazioni e timeline
│   │       ├── VisualizationPanel.css
│   │       ├── SteeringVectorManager.js  # Gestione steering vectors
│   │       └── SteeringVectorManager.css
│   ├── public/
│   │   └── index.html                # HTML template
│   ├── package.json                  # Dipendenze Node.js
│   ├── Dockerfile                    # Container Docker frontend
│   └── node_modules/                 # Dipendenze installate
│
├── README.md                         # Documentazione completa
├── QUICKSTART.md                     # Guida rapida 5 minuti
├── TUTORIAL.md                       # Tutorial ed esempi
├── .gitignore                        # File da ignorare in Git
├── start.sh                          # Script di avvio rapido
└── docker-compose.yml                # Orchestrazione Docker

```

## 🎯 File Principali

### Backend

**`main.py`** (482 linee)
- Server FastAPI completo
- Endpoints per tutte le operazioni:
  - `/load_model` - Carica modelli HuggingFace
  - `/generate` - Genera testo con steering opzionale
  - `/visualize_token` - Crea heatmap per token specifico
  - `/visualize_timeline` - Crea timeline completa
  - `/upload_steering_vector` - Upload vettori di steering
  - `/visualize_steering_vector` - Visualizza steering vectors
- Gestione hidden states con hooks PyTorch
- Applicazione steering tramite forward hooks
- Creazione heatmap con matplotlib colormap

**`generate_steering_vector.py`** (189 linee)
- Script standalone per CAA (Contrastive Activation Addition)
- Prompt preconfigurati per: formality, positivity, conciseness
- Estrazione hidden states da layer specifici
- Averaging e normalizzazione
- Salvataggio in formato .pt

**`requirements.txt`**
- FastAPI + Uvicorn per API server
- PyTorch per inferenza
- Transformers (HuggingFace) per modelli
- Pillow per immagini
- Matplotlib per colormaps

### Frontend

**`App.js`** (75 linee)
- Componente root React
- Gestione stato globale (modello, generazione, steering vectors)
- Layout responsive a 2 colonne
- Comunicazione con API backend

**`ModelLoader.js`** (95 linee)
- Selezione modello da preset o custom
- UI per caricamento con feedback
- Gestione errori di caricamento

**`GenerationPanel.js`** (145 linee)
- Form per prompt e parametri di generazione
- Gestione steering configurations
- Sliders per temperature, top-k, top-p
- Controllo multi-layer steering

**`VisualizationPanel.js`** (235 linee)
- Visualizzazione principale hidden states
- Timeline con miniatura clickable
- Zoom/pan con mouse
- Navigazione token-by-token
- Download immagini
- Visualizzazione embedding

**`SteeringVectorManager.js`** (128 linee)
- Upload steering vectors (.pt files)
- Lista vettori caricati con stats
- Visualizzazione heatmap vettori
- Delete vettori

### Documentazione

**`README.md`** (450+ linee)
- Documentazione completa del progetto
- Guida installazione dettagliata
- Spiegazione architettura
- API reference
- Use cases ed esempi
- Troubleshooting
- Roadmap future features

**`QUICKSTART.md`** (80 linee)
- Setup in 5 minuti
- Primo utilizzo passo-passo
- Troubleshooting veloce
- Esempi rapidi

**`TUTORIAL.md`** (300+ linee)
- 5 esperimenti guidati
- Analisi pattern di ragionamento
- Steering per controllo
- Multi-layer steering
- Debugging comportamento
- Esercizi avanzati

## 🔧 Script di Utilità

**`start.sh`**
- Avvia backend e frontend automaticamente
- Crea virtual env se necessario
- Installa dipendenze se mancanti
- Gestione graceful shutdown
- Output colorato e informativo

## 🐳 Docker Support

**`docker-compose.yml`**
- Orchestrazione completa
- Support GPU per backend
- Networking automatico
- Volumes per cache modelli
- Hot reload per sviluppo

**`backend/Dockerfile`**
- Base Python 3.10
- Installazione dipendenze ottimizzata
- Port 8000 esposto

**`frontend/Dockerfile`**
- Base Node 18 Alpine
- Build ottimizzato
- Port 3000 esposto

## 📊 Dimensioni Stimate

- **Backend codebase**: ~700 linee Python
- **Frontend codebase**: ~1000 linee JavaScript/React
- **CSS**: ~800 linee
- **Documentazione**: ~1000 linee
- **Total LOC**: ~3500 linee

## 🎨 Tecnologie Utilizzate

### Backend
- **FastAPI**: Framework web moderno e veloce
- **PyTorch**: Deep learning framework
- **Transformers**: Libreria HuggingFace per LLM
- **Matplotlib**: Generazione colormaps
- **Pillow**: Manipolazione immagini
- **Uvicorn**: ASGI server

### Frontend
- **React 18**: UI framework
- **React Hooks**: State management moderno
- **Fetch API**: HTTP requests
- **CSS3**: Styling moderno con gradients
- **Canvas API**: Manipolazione immagini (timeline)

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Bash**: Scripts di automazione
- **Git**: Version control

## 🚀 Features Implementate

✅ **Visualizzazione**
- Heatmap hidden states per token
- Timeline completa generazione
- Embedding visualization
- Zoom/pan interattivo
- Download immagini

✅ **Generazione**
- Supporto multi-modello
- Parametri configurabili (temp, top-k, top-p)
- Real-time generation
- Token-by-token tracking

✅ **Steering**
- Upload custom vectors
- Multi-layer application
- Coefficient control
- Enable/disable on-the-fly
- Vector visualization

✅ **UI/UX**
- Interfaccia moderna e responsive
- Dark theme
- Feedback visivo
- Error handling
- Loading states

✅ **Documentazione**
- README completo
- Quick start guide
- Tutorial dettagliato
- API reference
- Esempi pratici

## 💡 Come Navigare il Codice

### Per aggiungere un nuovo endpoint backend:

1. Aggiungi la funzione in `backend/main.py`
2. Definisci i Pydantic models per request/response
3. Implementa la logica
4. Testa con curl o Postman
5. Integra nel frontend

### Per aggiungere un nuovo componente frontend:

1. Crea file in `frontend/src/components/`
2. Importa in `App.js`
3. Aggiungi CSS corrispondente
4. Gestisci stato con hooks
5. Connetti alle API

### Per debuggare:

**Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
# Check logs in terminal
```

**Frontend:**
```bash
cd frontend
npm start
# Check browser console (F12)
```

## 🎓 Prossimi Passi Suggeriti

1. **Inizia con QUICKSTART.md** per setup rapido
2. **Leggi README.md** per comprensione completa
3. **Segui TUTORIAL.md** per imparare le funzionalità
4. **Sperimenta** con modelli e steering vectors
5. **Contribuisci** con miglioramenti e nuove features

---

**Il progetto è pronto per l'uso! 🎉**

Esegui `./start.sh` per iniziare!
