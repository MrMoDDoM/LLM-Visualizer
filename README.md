# ⚖️ LLM Alignment Tool

An interactive web tool to visualize and manipulate hidden states of Decoder-based LLM models during inference, with support for Steering Vectors.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8%2B-blue.svg)
![React](https://img.shields.io/badge/react-18.2-blue.svg)

## 🎯 Features

- **Hidden States Visualization**: Detailed heatmaps of hidden states for every layer and token
- **Steering Vectors**: Manipulate model behavior during inference
- **Interactive Interface**: Token-by-token navigation with complete timeline
- **Zoom & Pan**: Explore visualizations in detail
- **Multi-Layer Steering**: Apply steering vectors to different layers simultaneously
- **Multi-Model Support**: Compatible with LLaMA, Mistral, GPT-2 and other HuggingFace models
- **Real-time Controls**: Modify temperature, top-k, top-p and steering coefficients on the fly

## 🏗️ Architecture

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

## 📋 Prerequisites

### Backend
- Python 3.8+
- CUDA-compatible GPU (recommended, but works on CPU too)
- 16GB+ RAM (32GB+ for large models)

### Frontend
- Node.js 14+
- npm or yarn

## 🚀 Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd llm-hidden-states-visualizer
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Important Notes:**
- For LLaMA models, configure HuggingFace authentication:
  ```bash
  huggingface-cli login
  ```
- For GPU: make sure you have CUDA and PyTorch with CUDA support installed
- For large models: consider using `bitsandbytes` for quantization

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

## 🎮 Usage

### Starting Backend

```bash
cd backend
source venv/bin/activate
python main.py
```

Server will be available at `http://localhost:8000`

### Starting Frontend

```bash
cd frontend
npm start
```

Web interface will be available at `http://localhost:3000`

## 📖 User Guide

### 1. Loading a Model

1. At startup, select a model from the preset list or enter a custom model
2. Click "Load Model" and wait for download and initialization
3. The model is loaded into memory with hidden states support

**Suggested Models:**
- `meta-llama/Llama-3.2-1B-Instruct` - Fast, good for testing
- `meta-llama/Llama-3.1-8B-Instruct` - Balanced
- `gpt2` - Lightweight, ideal for CPU

### 2. Text Generation

1. Enter a prompt in the text field
2. Adjust generation parameters:
   - **Max Tokens**: Maximum number of tokens to generate
   - **Temperature**: Controls randomness (0.1 = deterministic, 2.0 = very random)
   - **Top-K**: Limits sampling to K most probable tokens
   - **Top-P**: Nucleus sampling (0.9 recommended)
3. (Optional) Configure steering vectors
4. Click "Generate"

### 3. Hidden States Visualization

After generation:

**Main View (Current Token):**
- Shows all layers for the selected token
- Each row = one layer
- Each column = one hidden state dimension
- Colors: Blue (negative values) → White (zero) → Red (positive values)

**Controls:**
- ◀/▶ to navigate between tokens
- Zoom with +/- or mouse scroll
- Pan by dragging the image
- Download current image

**Complete Timeline:**
- Miniaturized view of entire sequence
- Click to jump to specific token
- Visual separators between tokens

**Input Embedding:**
- Displays embedding vector of current token
- Useful to understand initial representation

### 4. Steering Vectors

**Loading:**
1. Click "Upload Vector (.pt)" in Steering Vector Library section
2. Select a `.pt` file containing a torch tensor
3. Vector appears in list with shape and norm

**Visualization:**
- Click 👁️ icon to see vector heatmap
- Use auto or fixed range normalization

**Application during Generation:**
1. In Generation Settings section, click "+ Add Steering"
2. Select the vector to use
3. Choose target layer (default: middle layer)
4. Adjust multiplicative coefficient (-5 to +5)
5. Enable/disable with checkbox
6. You can add multiple configurations for different layers

**Formula:** `hidden_state = hidden_state + coefficient × steering_vector`

### 5. Normalization

**Auto Normalize:**
- Uses min/max of current values
- Best for seeing patterns in a single token

**Fixed Range:**
- Manually specify vmin/vmax
- Useful for comparing different tokens with same scale

## 🔬 Use Cases

### 1. Reasoning Analysis

Observe how hidden states evolve during a chain of reasoning generation:

```python
prompt = "Let's solve this step by step: What is 15 × 24?"
```

You'll notice interesting patterns:
- Lower layers: lexical representations
- Middle layers: solution construction
- Upper layers: final token selection

### 2. Steering for Style Control

Apply a "formality vector" to make the model more formal:

```python
# Generate a steering vector (simplified example)
import torch

# This is an example - in practice you would use CAA (Contrastive Activation Addition)
formality_vector = torch.randn(4096)  # Model's hidden dimension
torch.save(formality_vector, 'formality_vector.pt')
```

### 3. Studying Attention Patterns

Compare hidden states with and without steering to understand the effect:
- Generate with steering disabled
- Save visualizations
- Generate with steering enabled
- Compare differences

### 4. Debugging Behavior

If a model produces unexpected outputs:
1. Visualize hidden states token-by-token
2. Identify when/where behavior diverges
3. Use steering to correct at runtime

## 📊 Steering Vector Format

`.pt` files must contain torch tensors with:

```python
import torch

# Correct format
steering_vector = torch.randn(hidden_size)  # 1D tensor
torch.save(steering_vector, 'my_vector.pt')

# Or a dictionary
torch.save({'vector': steering_vector}, 'my_vector.pt')
```

**Dimensions:**
- LLaMA 3.1 8B: 4096
- LLaMA 2 7B: 4096
- GPT-2: 768
- GPT-2 Medium: 1024

## 🛠️ API Reference

### Backend Endpoints

**GET `/status`**
- Check server and loaded model status

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
- Multipart form data with `.pt` file

**GET `/steering_vectors`**
- List of all loaded vectors

**DELETE `/steering_vectors/{name}`**
- Delete a vector

## 🧪 Testing

### Basic Tests

```bash
# Backend
cd backend
pytest tests/

# Frontend
cd frontend
npm test
```

### Manual Testing

1. Load GPT-2 (small and fast)
2. Use prompt: "Hello, my name is"
3. Generate 10 tokens
4. Verify all visualizations load
5. Try zoom/pan
6. Load a test vector
7. Apply steering and compare results

## 🐛 Troubleshooting

### Model Won't Load

- **Out of Memory**: Reduce model size or use CPU
- **Authentication Error (LLaMA)**: Run `huggingface-cli login`
- **Model not found**: Verify name on HuggingFace Hub

### Slow Visualizations

- Reduce number of generated tokens
- Use GPU instead of CPU
- Close other applications

### Steering Not Working

- Verify vector dimension matches hidden size
- Check selected layer is valid (0 to num_layers-1)
- Make sure checkbox is enabled

### CORS Errors

- Ensure backend is on port 8000
- Verify frontend is on port 3000
- Check backend logs

## 🔮 Future Features

- [ ] Support for Encoder-Decoder models
- [ ] Export/import of complete sessions
- [ ] Side-by-side comparison of generations
- [ ] Automatic pattern analysis
- [ ] Automatic steering vector generation via CAA
- [ ] Support for quantized models (4-bit, 8-bit)
- [ ] API for batch processing
- [ ] Integration with Weights & Biases for logging

## 📚 Resources

- [Anthropic CAA Paper](https://www.anthropic.com/index/steering-gpt-2-xl-by-adding-an-activation-vector)
- [Transformer Interpretability](https://transformer-circuits.pub/)
- [HuggingFace Transformers Docs](https://huggingface.co/docs/transformers)

## 🤝 Contributing

Pull requests are welcome! For major changes:

1. Open an issue to discuss the changes
2. Fork the repository
3. Create a feature branch
4. Commit changes with descriptive messages
5. Push to the branch
6. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

Created to explore and manipulate the internal mechanisms of Large Language Models.

## 🙏 Acknowledgments

- Anthropic for research on steering vectors and interpretability
- HuggingFace for the Transformers library
- LLM interpretability research community

---

**Happy Steering! 🚀🧠**
