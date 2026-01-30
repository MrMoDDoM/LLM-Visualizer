# 🚀 Guida Rapida - LLM Hidden States Visualizer

Guida veloce per iniziare in 5 minuti!

## Setup Rapido

### 1. Backend (Terminale 1)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

✅ Vedrai: `Uvicorn running on http://0.0.0.0:8000`

### 2. Frontend (Terminale 2)

```bash
cd frontend
npm install
npm start
```

✅ Si aprirà automaticamente `http://localhost:3000`

## Primo Utilizzo

### Step 1: Carica un Modello

1. Scegli "GPT-2 (Small)" dalla lista (veloce per testare)
2. Clicca **Load Model**
3. Attendi il download (~500MB)

### Step 2: Genera Testo

1. Lascia il prompt di default: `"Tell me a short story about a robot."`
2. Imposta **Max Tokens = 15**
3. Clicca **🚀 Generate**

### Step 3: Esplora le Visualizzazioni

- Usa **◀ / ▶** per navigare tra i token
- Fai **zoom** con la rotella del mouse
- Clicca sulla **timeline** per saltare a un token specifico
- Scarica le immagini con **💾 Download**

## Prova Steering Vectors

### Genera un Vettore di Test

```bash
cd backend
python generate_steering_vector.py --model gpt2 --behavior formality --output formality_gpt2.pt
```

### Applica il Vettore

1. Nel pannello **Steering Vector Library**, clicca **📁 Upload Vector**
2. Seleziona `formality_gpt2.pt`
3. Nel pannello **Generation Settings**, clicca **+ Add Steering**
4. Regola **Coefficient** a `2.0`
5. Genera nuovamente e confronta!

## Troubleshooting Veloce

**🔴 Backend non si avvia?**
```bash
pip install --upgrade fastapi uvicorn torch transformers
```

**🔴 Frontend non si connette?**
- Verifica che backend sia su porta 8000
- Controlla CORS nel browser console

**🔴 Out of Memory?**
- Usa GPT-2 invece di modelli grandi
- Riduci max_tokens
- Chiudi altre applicazioni

**🔴 Modello non trovato?**
- Verifica nome su https://huggingface.co/models
- Per LLaMA: `huggingface-cli login`

## Esempi Rapidi

### Prompt Interessanti per Visualizzazione

```
"Let's count from 1 to 5:"
"The capital of France is"
"Once upon a time there was a"
"Q: What is 2+2? A:"
```

### Esperimenti con Steering

1. **Formality**: Genera "Hey dude!" vs con formality steering
2. **Positivity**: Genera story triste vs con positivity steering
3. **Multi-Layer**: Applica lo stesso vettore a layer 8 e 16 simultaneamente

## Risorse Utili

- 📖 [README Completo](README.md)
- 🎓 [Tutorial Steering Vectors](#)
- 💬 [Report Issues](https://github.com/...)

---

**Tempo totale setup: ~5-10 minuti** ⏱️

Buon divertimento! 🎉
