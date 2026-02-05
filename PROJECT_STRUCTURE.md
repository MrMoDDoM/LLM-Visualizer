# 📁 Project Structure

```
llm-hidden-states-visualizer/
│
├── backend/                          # Python Backend (FastAPI + PyTorch)
│   ├── main.py                       # Main FastAPI server
│   ├── generate_steering_vector.py   # Script to generate steering vectors
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Backend Docker container
│   ├── Preset/                       # Preset collections folder
│   │   ├── README.md                 # Preset system documentation
│   │   ├── EmotionalIntelligence/    # Example preset
│   │   └── CognitiveSkills/          # Example preset
│   └── venv/                         # Virtual environment (auto-created)
│
├── frontend/                         # React Frontend
│   ├── src/
│   │   ├── App.js                    # Main component
│   │   ├── App.css                   # Global styles
│   │   ├── index.js                  # React entry point
│   │   ├── index.css                 # Base styles
│   │   └── components/               # React components
│   │       ├── ModelLoader.js        # Model loading
│   │       ├── ModelLoader.css
│   │       ├── GenerationPanel.js    # Text generation panel
│   │       ├── GenerationPanel.css
│   │       ├── VisualizationPanel.js # Visualizations and timeline
│   │       ├── VisualizationPanel.css
│   │       ├── SteeringVectorManager.js  # Steering vector management
│   │       ├── SteeringVectorManager.css
│   │       ├── ContrastiveSearch.js  # Contrastive search interface
│   │       ├── ContrastiveSearch.css
│   │       ├── SteeringRadarChart.js # Radar chart for coefficients
│   │       └── NavigationControls.js # Navigation controls
│   ├── public/
│   │   └── index.html                # HTML template
│   ├── package.json                  # Node.js dependencies
│   ├── Dockerfile                    # Frontend Docker container
│   └── node_modules/                 # Installed dependencies
│
├── README.md                         # Complete documentation
├── PROJECT_STRUCTURE.md              # This file
├── TUTORIAL.md                       # Tutorial and examples
├── PRESET_SYSTEM.md                  # Preset system documentation
├── QUICKSTART.md                     # 5-minute quick guide
├── .gitignore                        # Files to ignore in Git
├── start.sh                          # Quick start script
└── docker-compose.yml                # Docker orchestration

```

## 🎯 Main Files

### Backend

**`main.py`** (900+ lines)
- Complete FastAPI server
- Endpoints for all operations:
  - `/load_model` - Load HuggingFace models
  - `/generate` - Generate text with optional steering
  - `/visualize_token` - Create heatmap for specific token
  - `/visualize_timeline` - Create complete timeline
  - `/upload_steering_vector` - Upload steering vectors
  - `/visualize_steering_vector` - Visualize steering vectors
  - `/contrastive_search` - Contrastive Activation Addition
  - `/presets` - List available presets
  - `/execute_preset` - Execute preset batch processing
- Hidden states management with PyTorch hooks
- Steering application via forward hooks
- Heatmap creation with matplotlib colormap

**`generate_steering_vector.py`** (189 lines)
- Standalone script for CAA (Contrastive Activation Addition)
- Preconfigured prompts for: formality, positivity, conciseness
- Hidden states extraction from specific layers
- Averaging and normalization
- Save in .pt format

**`requirements.txt`**
- FastAPI + Uvicorn for API server
- PyTorch for inference
- Transformers (HuggingFace) for models
- Pillow for images
- Matplotlib for colormaps

**`Preset/` folder**
- Preset collections for batch processing
- Each subfolder = one preset
- JSON dataset files with metadata
- Example presets: EmotionalIntelligence, CognitiveSkills

### Frontend

**`App.js`** (361 lines)
- Root React component
- Global state management (model, generation, steering vectors)
- Responsive 2-column layout
- Communication with backend API
- State lifting for steering configs

**`ModelLoader.js`** (95 lines)
- Model selection from presets or custom
- Loading UI with feedback
- Loading error handling

**`GenerationPanel.js`** (145 lines)
- Form for prompt and generation parameters
- Steering configurations management
- Sliders for temperature, top-k, top-p
- Multi-layer steering control

**`VisualizationPanel.js`** (235 lines)
- Main hidden states visualization
- Timeline with clickable miniature
- Zoom/pan with mouse
- Token-by-token navigation
- Image downloads
- Embedding visualization

**`SteeringVectorManager.js`** (405 lines)
- Upload steering vectors (.pt files)
- Multi-file upload support
- List loaded vectors with stats
- Vector heatmap visualization in modal
- Zoom/pan controls for vector visualization
- Delete vectors

**`ContrastiveSearch.js`** (508 lines)
- Contrastive Activation Addition interface
- Dataset management (pairs of positive/negative texts)
- Export/import datasets with metadata
- Preset manager for batch processing
- Progress indicator for multiple generations
- Vector generation from contrastive pairs

**`SteeringRadarChart.js`** (264 lines)
- Interactive radar chart for coefficients
- Drag-and-drop point manipulation
- Visual representation of steering intensity
- Double-click to reset coefficient to 0
- Scale from -10 to +10

**`NavigationControls.js`** (80 lines)
- Token navigation controls
- Previous/next buttons
- Direct token selection

### Documentation

**`README.md`** (450+ lines)
- Complete project documentation
- Detailed installation guide
- Architecture explanation
- API reference
- Use cases and examples
- Troubleshooting
- Future features roadmap

**`PROJECT_STRUCTURE.md`** (This file)
- Detailed file structure
- Component descriptions
- Technology stack
- Code navigation guide

**`TUTORIAL.md`** (300+ lines)
- 5 guided experiments
- Reasoning pattern analysis
- Steering for control
- Multi-layer steering
- Behavior debugging
- Advanced exercises

**`PRESET_SYSTEM.md`** (150+ lines)
- Preset system overview
- Backend API documentation
- Frontend UI guide
- Example presets
- Usage instructions

**`QUICKSTART.md`** (80 lines)
- 5-minute setup
- First use step-by-step
- Quick troubleshooting
- Quick examples

## 🔧 Utility Scripts

**`start.sh`**
- Automatically starts backend and frontend
- Creates virtual env if needed
- Installs missing dependencies
- Graceful shutdown handling
- Colorful and informative output

## 🐳 Docker Support

**`docker-compose.yml`**
- Complete orchestration
- GPU support for backend
- Automatic networking
- Volumes for model cache
- Hot reload for development

**`backend/Dockerfile`**
- Python 3.10 base
- Optimized dependency installation
- Port 8000 exposed

**`frontend/Dockerfile`**
- Node 18 Alpine base
- Optimized build
- Port 3000 exposed

## 📊 Estimated Sizes

- **Backend codebase**: ~1200 lines Python
- **Frontend codebase**: ~2000 lines JavaScript/React
- **CSS**: ~1500 lines
- **Documentation**: ~1500 lines
- **Total LOC**: ~6200 lines

## 🎨 Technologies Used

### Backend
- **FastAPI**: Modern and fast web framework
- **PyTorch**: Deep learning framework
- **Transformers**: HuggingFace library for LLMs
- **Matplotlib**: Colormap generation
- **Pillow**: Image manipulation
- **Uvicorn**: ASGI server

### Frontend
- **React 18**: UI framework
- **React Hooks**: Modern state management
- **Fetch API**: HTTP requests
- **CSS3**: Modern styling with gradients
- **Canvas API**: Image manipulation (timeline)

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Bash**: Automation scripts
- **Git**: Version control

## 🚀 Implemented Features

✅ **Visualization**
- Hidden states heatmaps per token
- Complete generation timeline
- Embedding visualization
- Interactive zoom/pan
- Image downloads

✅ **Generation**
- Multi-model support
- Configurable parameters (temp, top-k, top-p)
- Real-time generation
- Token-by-token tracking

✅ **Steering**
- Upload custom vectors
- Multi-layer application
- Coefficient control with radar chart
- Enable/disable on-the-fly
- Vector visualization in modal
- Multi-file upload

✅ **Contrastive Search**
- Dataset creation and management
- Export/import with metadata
- Automatic vector generation
- Preset system for batch processing
- Progress tracking

✅ **UI/UX**
- Modern and responsive interface
- Dark theme
- Visual feedback
- Error handling
- Loading states
- Modal popups

✅ **Documentation**
- Complete README
- Quick start guide
- Detailed tutorial
- API reference
- Practical examples
- Preset system guide

## 💡 How to Navigate the Code

### To add a new backend endpoint:

1. Add function in `backend/main.py`
2. Define Pydantic models for request/response
3. Implement logic
4. Test with curl or Postman
5. Integrate in frontend

### To add a new frontend component:

1. Create file in `frontend/src/components/`
2. Import in `App.js`
3. Add corresponding CSS
4. Manage state with hooks
5. Connect to APIs

### For debugging:

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

## 🎓 Suggested Next Steps

1. **Start with QUICKSTART.md** for quick setup
2. **Read README.md** for complete understanding
3. **Follow TUTORIAL.md** to learn features
4. **Experiment** with models and steering vectors
5. **Explore PRESET_SYSTEM.md** for batch processing
6. **Contribute** with improvements and new features

---

**The project is ready to use! 🎉**

Run `./start.sh` to begin!
