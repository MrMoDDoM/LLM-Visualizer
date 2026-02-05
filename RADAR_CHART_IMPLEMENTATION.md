# Radar Chart Interactive Implementation

## Panoramica
Implementato un radar chart interattivo per controllare i coefficienti dei vettori di steering. Il radar chart sostituisce gli slider individuali, fornendo un'interfaccia visuale più intuitiva per gestire più vettori contemporaneamente.

## Caratteristiche Principali

### 1. Visualizzazione Radar
- **Scala**: Da -10 (centro) a +10 (bordo esterno)
- **Linea dello Zero**: Evidenziata in blu (#667eea, 2px)
- **Cerchi Concentrici**: Ogni 2 unità per una facile lettura
- **Assi Dinamici**: Un asse per ogni vettore di steering caricato
- **Posizionamento**: Gli assi sono disposti in senso orario partendo dall'alto

### 2. Interattività
- **Drag & Drop**: Trascina i punti per modificare i coefficienti
- **Hover Effect**: I punti si ingrandiscono al passaggio del mouse
- **Aggiornamento in Tempo Reale**: Le modifiche si propagano immediatamente
- **Poligono Visivo**: Collega tutti i punti per mostrare la configurazione globale

### 3. Architettura del Codice

#### Componenti Modificati

**App.js**
```javascript
// Nuovo stato per gestire le configurazioni dei vettori
const [steeringConfigs, setSteeringConfigs] = useState([]);

// Handler per le modifiche dal radar chart
const handleCoefficientChange = (id, newCoefficient) => {
  setSteeringConfigs(configs => 
    configs.map(config => 
      config.id === id ? { ...config, coefficient: newCoefficient } : config
    )
  );
};

// Props passate ai componenti figli
<GenerationPanel 
  steeringConfigs={steeringConfigs}
  onSteeringConfigsChange={setSteeringConfigs}
  ...
/>

<VisualizationPanel
  steeringConfigs={steeringConfigs}
  onCoefficientChange={handleCoefficientChange}
  ...
/>
```

**GenerationPanel.js**
- Convertito a componente controllato (riceve steeringConfigs come prop)
- Rimosso lo slider del coefficiente
- Mantiene solo i controlli per: abilita/disabilita, selezione vettore, layer

**VisualizationPanel.js**
- Aggiunta tab "Analysis" con il radar chart
- Riceve steeringConfigs e onCoefficientChange come props
- Passa le props al SteeringRadarChart

**SteeringRadarChart.js** (Nuovo componente)
- Implementazione completa con Canvas API
- Gestione eventi mouse per drag & drop
- Calcolo matematico per conversione coordinate cartesiane/polari

### 4. Formato Dati

Ogni configurazione di steering ha la seguente struttura:
```javascript
{
  id: 1234567890,           // timestamp univoco
  vector_name: "vector1",   // nome del vettore
  layer: 16,                // layer di applicazione
  coefficient: 2.5,         // coefficiente (-10 a +10)
  enabled: true             // stato di abilitazione
}
```

### 5. Flusso di Dati

1. **Caricamento**: L'utente carica vettori di steering tramite SteeringVectorManager
2. **Configurazione**: Aggiunge configurazioni in GenerationPanel (vettore + layer)
3. **Visualizzazione**: Il radar chart mostra tutti i vettori configurati nella tab Analysis
4. **Modifica**: L'utente trascina i punti sul radar chart
5. **Propagazione**: 
   - SteeringRadarChart → onCoefficientChange → App.js
   - App.js aggiorna steeringConfigs
   - GenerationPanel riceve i nuovi valori
6. **Generazione**: I coefficienti aggiornati vengono inviati al backend

### 6. File Creati/Modificati

**Nuovi File**:
- `frontend/src/components/SteeringRadarChart.js` (250 righe)
- `frontend/src/components/SteeringRadarChart.css` (70 righe)
- `RADAR_CHART_IMPLEMENTATION.md` (questo file)

**File Modificati**:
- `frontend/src/App.js`: Aggiunto stato steeringConfigs e handler
- `frontend/src/components/GenerationPanel.js`: Rimosso slider, convertito a componente controllato
- `frontend/src/components/VisualizationPanel.js`: Integrato radar chart nella tab Analysis

**Dipendenze**:
- Installato `recharts` (anche se non utilizzato nella versione finale)

### 7. Note Tecniche

#### Conversione Coordinate
```javascript
// Da valore logico a raggio in pixel
const valueToRadius = (value) => {
  const range = 20; // da -10 a +10
  const normalized = (value + 10) / range; // 0 a 1
  return normalized * maxRadius;
};

// Da raggio in pixel a valore logico
const radiusToValue = (radius) => {
  const normalized = radius / maxRadius; // 0 a 1
  return normalized * 20 - 10; // -10 a +10
};
```

#### Posizionamento Assi (senso orario)
```javascript
const angleStep = (2 * Math.PI) / steeringConfigs.length;
const angle = (i * angleStep) - (Math.PI / 2); // inizio dall'alto
```

### 8. Testing

Per testare la funzionalità:

1. Avvia backend e frontend
2. Carica un modello
3. Carica almeno 2 vettori di steering
4. Aggiungi configurazioni in GenerationPanel
5. Passa alla tab "Analysis" in VisualizationPanel
6. Trascina i punti sul radar chart
7. Torna alla tab "Generation" e verifica che i valori siano sincronizzati
8. Genera testo per verificare che i coefficienti vengano applicati correttamente

### 9. Limitazioni Attuali

- Il radar chart non mostra etichette direttamente sui punti (solo legend)
- Scala fissa -10/+10 (non configurabile)
- Non c'è conferma visuale dell'aggiornamento oltre al movimento del punto

### 10. Possibili Miglioramenti Futuri

- Tooltip al passaggio del mouse che mostra il valore esatto
- Animazioni smooth durante il drag
- Undo/Redo per le modifiche
- Preset di configurazioni salvabili
- Export/Import delle configurazioni del radar
- Scala configurabile dall'utente
- Snap a valori interi o multipli di 0.5
