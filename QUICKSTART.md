# 🚀 Quick Start - LLM Hidden States Visualizer

Quick guide to get started in 5 minutes!

## Quick Setup

### 1. Backend (Terminal 1)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

✅ You'll see: `Uvicorn running on http://0.0.0.0:8000`

### 2. Frontend (Terminal 2)

```bash
cd frontend
npm install
npm start
```

✅ Will automatically open `http://localhost:3000`

## First Use

### Step 1: Load a Model

1. Choose "GPT-2 (Small)" from the list (fast for testing)
2. Click **Load Model**
3. Wait for download (~500MB)

### Step 2: Generate Text

1. Leave the default prompt: `"Tell me a short story about a robot."`
2. Set **Max Tokens = 15**
3. Click **🚀 Generate**

### Step 3: Explore Visualizations

- Use **◀ / ▶** to navigate between tokens
- **Zoom** with mouse wheel
- Click on **timeline** to jump to a specific token
- Download images with **💾 Download**

## Try Steering Vectors

### Generate a Test Vector

```bash
cd backend
python generate_steering_vector.py --model gpt2 --behavior formality --output formality_gpt2.pt
```

### Apply the Vector

1. In **Steering Vector Library** panel, click **📁 Upload Vector**
2. Select `formality_gpt2.pt`
3. In **Generation Settings** panel, click **+ Add Steering**
4. Adjust **Coefficient** to `2.0`
5. Generate again and compare!

## Quick Troubleshooting

**🔴 Backend won't start?**
```bash
pip install --upgrade fastapi uvicorn torch transformers
```

**🔴 Frontend won't connect?**
- Verify backend is on port 8000
- Check CORS in browser console

**🔴 Out of Memory?**
- Use GPT-2 instead of large models
- Reduce max_tokens
- Close other applications

**🔴 Model not found?**
- Verify name on https://huggingface.co/models
- For LLaMA: `huggingface-cli login`

## Quick Examples

### Interesting Prompts for Visualization

```
"Let's count from 1 to 5:"
"The capital of France is"
"Once upon a time there was a"
"Q: What is 2+2? A:"
```

### Experiments with Steering

1. **Formality**: Generate "Hey dude!" vs with formality steering
2. **Positivity**: Generate sad story vs with positivity steering
3. **Multi-Layer**: Apply same vector to layers 8 and 16 simultaneously

## Useful Resources

- 📖 [Complete README](README.md)
- 🎓 [Steering Vectors Tutorial](TUTORIAL.md)
- 📦 [Preset System Guide](backend/Preset/README.md)
- 💬 [Report Issues](https://github.com/...)

---

**Total setup time: ~5-10 minutes** ⏱️

Have fun! 🎉
