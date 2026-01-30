"""
LLM Hidden States Visualizer - Backend Server
FastAPI server for LLM inference with hidden state extraction and steering vector manipulation
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import torch
import numpy as np
from transformers import AutoModelForCausalLM, AutoTokenizer
import base64
from io import BytesIO
from PIL import Image
import json
import os

app = FastAPI(title="LLM Hidden States Visualizer")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
class ModelState:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.model_name = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.steering_vectors = {}  # name -> {"vector": tensor, "layer": int}
        self.hidden_states_cache = []
        self.tokens_cache = []
        self.embedding_cache = []

model_state = ModelState()

# Pydantic models
class ModelLoadRequest(BaseModel):
    model_name: str

class GenerationRequest(BaseModel):
    prompt: str
    max_new_tokens: int = 20
    temperature: float = 1.0
    top_k: int = 50
    top_p: float = 0.9
    steering_configs: List[Dict[str, Any]] = []  # [{"vector_name": str, "layer": int, "coefficient": float, "enabled": bool}]

class NormalizationConfig(BaseModel):
    mode: str  # "auto" or "fixed"
    vmin: Optional[float] = None
    vmax: Optional[float] = None

class VisualizationRequest(BaseModel):
    token_index: int
    normalization: NormalizationConfig

class SteeringVectorInfo(BaseModel):
    name: str
    shape: List[int]
    norm: float

# Helper functions
def normalize_hidden_state(hidden_state: torch.Tensor, mode: str = "auto", vmin: float = None, vmax: float = None):
    """Normalize hidden states for visualization"""
    hs_np = hidden_state.detach().cpu().numpy()
    
    if mode == "auto":
        vmin = hs_np.min()
        vmax = hs_np.max()
    
    # Normalize to [0, 1]
    if vmax != vmin:
        normalized = (hs_np - vmin) / (vmax - vmin)
    else:
        normalized = np.zeros_like(hs_np)
    
    return normalized, vmin, vmax

def create_heatmap_image(data: np.ndarray, colormap: str = "coolwarm") -> str:
    """Convert normalized data to base64 encoded image using matplotlib colormap"""
    import matplotlib.pyplot as plt
    from matplotlib import cm
    
    # Get colormap
    cmap = cm.get_cmap(colormap)
    
    # Apply colormap (data should be in [0, 1])
    colored = cmap(data)
    
    # Convert to RGB (0-255)
    rgb_data = (colored[:, :, :3] * 255).astype(np.uint8)
    
    # Create PIL image
    img = Image.fromarray(rgb_data)
    
    # Convert to base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return img_str

# API Endpoints
@app.get("/")
async def root():
    return {"message": "LLM Hidden States Visualizer API", "status": "running"}

@app.get("/status")
async def get_status():
    return {
        "model_loaded": model_state.model is not None,
        "model_name": model_state.model_name,
        "device": model_state.device,
        "cuda_available": torch.cuda.is_available(),
        "steering_vectors_count": len(model_state.steering_vectors)
    }

@app.post("/reset")
async def reset_all():
    """Reset everything: unload model, clear cache, clear steering vectors"""
    try:
        # Clear model from memory
        if model_state.model is not None:
            del model_state.model
            model_state.model = None
        
        if model_state.tokenizer is not None:
            del model_state.tokenizer
            model_state.tokenizer = None
        
        model_state.model_name = None
        
        # Clear steering vectors
        model_state.steering_vectors.clear()
        
        # Clear generation cache
        model_state.hidden_states_cache.clear()
        model_state.tokens_cache.clear()
        model_state.embedding_cache.clear()
        
        # Clear GPU cache if available
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
        
        # Clear CPU cache
        import gc
        gc.collect()
        
        print("✅ System reset: all models and cache cleared")
        
        return {
            "success": True,
            "message": "System reset successfully. All models cleared from memory."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during reset: {str(e)}")

@app.post("/load_model")
async def load_model(request: ModelLoadRequest):
    """Load a HuggingFace model"""
    try:
        print(f"Loading model: {request.model_name}")
        
        # Clear previous model
        if model_state.model is not None:
            del model_state.model
            del model_state.tokenizer
            torch.cuda.empty_cache()
        
        # Load tokenizer
        model_state.tokenizer = AutoTokenizer.from_pretrained(request.model_name)
        
        # Load model with output_hidden_states support
        model_state.model = AutoModelForCausalLM.from_pretrained(
            request.model_name,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else None,
            low_cpu_mem_usage=True
        )
        
        model_state.model_name = request.model_name
        
        # Get model config info
        num_layers = model_state.model.config.num_hidden_layers
        hidden_size = model_state.model.config.hidden_size
        
        print(f"Model loaded successfully: {num_layers} layers, hidden size {hidden_size}")
        
        return {
            "success": True,
            "model_name": request.model_name,
            "num_layers": num_layers,
            "hidden_size": hidden_size,
            "device": str(model_state.device)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading model: {str(e)}")

@app.post("/generate")
async def generate_text(request: GenerationRequest):
    """Generate text with hidden state extraction and optional steering"""
    if model_state.model is None:
        raise HTTPException(status_code=400, detail="No model loaded")
    
    try:
        # Clear cache
        model_state.hidden_states_cache = []
        model_state.tokens_cache = []
        model_state.embedding_cache = []
        
        # Tokenize input
        inputs = model_state.tokenizer(request.prompt, return_tensors="pt").to(model_state.model.device)
        input_ids = inputs.input_ids
        
        # Prepare steering hooks if needed
        active_steering = [s for s in request.steering_configs if s.get("enabled", False)]
        hooks = []
        
        def create_steering_hook(vector: torch.Tensor, coefficient: float):
            def hook(module, input, output):
                # output is a tuple, first element is the hidden states
                hidden_states = output[0]
                steering_vector = vector.to(hidden_states.device).to(hidden_states.dtype)
                # Add steering vector to all positions
                hidden_states = hidden_states + coefficient * steering_vector.unsqueeze(0).unsqueeze(0)
                return (hidden_states,) + output[1:]
            return hook
        
        # Register hooks for steering
        if active_steering:
            for steering_config in active_steering:
                vector_name = steering_config["vector_name"]
                layer_idx = steering_config["layer"]
                coefficient = steering_config["coefficient"]
                
                if vector_name not in model_state.steering_vectors:
                    continue
                
                steering_vector = model_state.steering_vectors[vector_name]["vector"]
                
                # Get the layer module
                layer_module = model_state.model.model.layers[layer_idx]
                
                # Register hook
                hook_handle = layer_module.register_forward_hook(
                    create_steering_hook(steering_vector, coefficient)
                )
                hooks.append(hook_handle)
        
        # Generate tokens one by one
        generated_ids = input_ids.clone()
        
        for step in range(request.max_new_tokens):
            # Forward pass with output_hidden_states
            with torch.no_grad():
                outputs = model_state.model(
                    generated_ids,
                    output_hidden_states=True,
                    return_dict=True
                )
            
            # Extract hidden states (tuple of tensors, one per layer)
            hidden_states = outputs.hidden_states
            
            # Store hidden states for the last token position (the new token being generated)
            last_token_hidden_states = [hs[:, -1, :].squeeze(0) for hs in hidden_states]
            model_state.hidden_states_cache.append(last_token_hidden_states)
            
            # Store embedding (first layer hidden state)
            model_state.embedding_cache.append(hidden_states[0][:, -1, :].squeeze(0))
            
            # Get logits and sample next token
            logits = outputs.logits[:, -1, :]
            
            # Apply temperature
            if request.temperature != 1.0:
                logits = logits / request.temperature
            
            # Apply top-k filtering
            if request.top_k > 0:
                indices_to_remove = logits < torch.topk(logits, request.top_k)[0][..., -1, None]
                logits[indices_to_remove] = float('-inf')
            
            # Apply top-p (nucleus) filtering
            if request.top_p < 1.0:
                sorted_logits, sorted_indices = torch.sort(logits, descending=True)
                cumulative_probs = torch.cumsum(torch.softmax(sorted_logits, dim=-1), dim=-1)
                
                sorted_indices_to_remove = cumulative_probs > request.top_p
                sorted_indices_to_remove[..., 1:] = sorted_indices_to_remove[..., :-1].clone()
                sorted_indices_to_remove[..., 0] = 0
                
                indices_to_remove = sorted_indices_to_remove.scatter(1, sorted_indices, sorted_indices_to_remove)
                logits[indices_to_remove] = float('-inf')
            
            # Sample next token
            probs = torch.softmax(logits, dim=-1)
            next_token = torch.multinomial(probs, num_samples=1)
            
            # Store token
            model_state.tokens_cache.append(next_token.item())
            
            # Append to generated sequence
            generated_ids = torch.cat([generated_ids, next_token], dim=-1)
            
            # Check for EOS
            if next_token.item() == model_state.tokenizer.eos_token_id:
                break
        
        # Remove hooks
        for hook in hooks:
            hook.remove()
        
        # Decode generated text
        generated_text = model_state.tokenizer.decode(generated_ids[0], skip_special_tokens=True)
        
        # Decode individual tokens
        token_texts = [model_state.tokenizer.decode([tid]) for tid in model_state.tokens_cache]
        
        return {
            "success": True,
            "generated_text": generated_text,
            "prompt": request.prompt,
            "num_tokens_generated": len(model_state.tokens_cache),
            "tokens": token_texts,
            "num_layers": len(model_state.hidden_states_cache[0]) if model_state.hidden_states_cache else 0,
            "hidden_size": model_state.hidden_states_cache[0][0].shape[0] if model_state.hidden_states_cache else 0
        }
        
    except Exception as e:
        # Clean up hooks on error
        for hook in hooks:
            hook.remove()
        raise HTTPException(status_code=500, detail=f"Error during generation: {str(e)}")

@app.post("/visualize_token")
async def visualize_token(request: VisualizationRequest):
    """Generate visualization for a specific token"""
    if not model_state.hidden_states_cache:
        raise HTTPException(status_code=400, detail="No generation cache available")
    
    if request.token_index >= len(model_state.hidden_states_cache):
        raise HTTPException(status_code=400, detail="Token index out of range")
    
    try:
        # Get hidden states for this token (list of tensors, one per layer)
        hidden_states = model_state.hidden_states_cache[request.token_index]
        
        # Stack into single array: [num_layers, hidden_size]
        hidden_states_array = torch.stack(hidden_states).cpu().numpy()
        
        # Normalize
        normalized, vmin, vmax = normalize_hidden_state(
            torch.from_numpy(hidden_states_array),
            mode=request.normalization.mode,
            vmin=request.normalization.vmin,
            vmax=request.normalization.vmax
        )
        
        # Create heatmap image
        img_base64 = create_heatmap_image(normalized, colormap="RdBu_r")
        
        # Get embedding visualization
        embedding = model_state.embedding_cache[request.token_index]
        embedding_normalized, emb_vmin, emb_vmax = normalize_hidden_state(
            embedding.unsqueeze(0),
            mode=request.normalization.mode,
            vmin=request.normalization.vmin,
            vmax=request.normalization.vmax
        )
        embedding_img = create_heatmap_image(embedding_normalized, colormap="RdBu_r")
        
        return {
            "success": True,
            "image": img_base64,
            "embedding_image": embedding_img,
            "shape": list(hidden_states_array.shape),
            "vmin": float(vmin),
            "vmax": float(vmax),
            "token_text": model_state.tokenizer.decode([model_state.tokens_cache[request.token_index]])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating visualization: {str(e)}")

@app.post("/visualize_timeline")
async def visualize_timeline(normalization: NormalizationConfig):
    """Generate compact timeline visualization of all tokens"""
    if not model_state.hidden_states_cache:
        raise HTTPException(status_code=400, detail="No generation cache available")
    
    try:
        num_tokens = len(model_state.hidden_states_cache)
        num_layers = len(model_state.hidden_states_cache[0])
        
        # Create timeline: [num_tokens * num_layers, hidden_size]
        # Each block of num_layers rows represents one token
        timeline_data = []
        
        for token_idx in range(num_tokens):
            hidden_states = model_state.hidden_states_cache[token_idx]
            hidden_states_array = torch.stack(hidden_states).cpu().numpy()
            timeline_data.append(hidden_states_array)
        
        # Stack all tokens vertically
        full_timeline = np.vstack(timeline_data)
        
        # Normalize
        normalized, vmin, vmax = normalize_hidden_state(
            torch.from_numpy(full_timeline),
            mode=normalization.mode,
            vmin=normalization.vmin,
            vmax=normalization.vmax
        )
        
        # Create heatmap
        img_base64 = create_heatmap_image(normalized, colormap="RdBu_r")
        
        return {
            "success": True,
            "image": img_base64,
            "shape": list(full_timeline.shape),
            "num_tokens": num_tokens,
            "num_layers": num_layers,
            "token_texts": [model_state.tokenizer.decode([tid]) for tid in model_state.tokens_cache]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating timeline: {str(e)}")

@app.post("/upload_steering_vector")
async def upload_steering_vector(file: UploadFile = File(...), name: str = ""):
    """Upload a steering vector (.pt file)"""
    try:
        # Read file content
        content = await file.read()
        
        # Load tensor
        buffer = BytesIO(content)
        vector = torch.load(buffer, map_location='cpu')
        
        # Handle different tensor formats
        if isinstance(vector, dict):
            # Try to find the actual vector in dict
            if 'vector' in vector:
                vector = vector['vector']
            elif 'tensor' in vector:
                vector = vector['tensor']
            else:
                # Take first tensor value
                vector = next(iter(vector.values()))
        
        # Ensure it's 1D
        if vector.dim() > 1:
            vector = vector.squeeze()
        
        # Use provided name or filename
        vector_name = name if name else file.filename.replace('.pt', '')
        
        # Store vector
        model_state.steering_vectors[vector_name] = {
            "vector": vector,
            "shape": list(vector.shape),
            "norm": float(torch.norm(vector).item())
        }
        
        print(f"Loaded steering vector '{vector_name}': shape {vector.shape}, norm {torch.norm(vector).item():.4f}")
        
        return {
            "success": True,
            "name": vector_name,
            "shape": list(vector.shape),
            "norm": float(torch.norm(vector).item())
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading steering vector: {str(e)}")

@app.get("/steering_vectors")
async def list_steering_vectors():
    """List all loaded steering vectors"""
    vectors_info = []
    for name, info in model_state.steering_vectors.items():
        vectors_info.append({
            "name": name,
            "shape": info["shape"],
            "norm": info["norm"]
        })
    return {"vectors": vectors_info}

@app.delete("/steering_vectors/{name}")
async def delete_steering_vector(name: str):
    """Delete a steering vector"""
    if name in model_state.steering_vectors:
        del model_state.steering_vectors[name]
        return {"success": True, "message": f"Deleted vector '{name}'"}
    else:
        raise HTTPException(status_code=404, detail=f"Vector '{name}' not found")

@app.post("/visualize_steering_vector/{name}")
async def visualize_steering_vector(name: str, normalization: NormalizationConfig):
    """Visualize a steering vector as heatmap"""
    if name not in model_state.steering_vectors:
        raise HTTPException(status_code=404, detail=f"Vector '{name}' not found")
    
    try:
        vector = model_state.steering_vectors[name]["vector"]
        
        # Reshape to 2D for visualization
        vector_2d = vector.unsqueeze(0)
        
        # Normalize
        normalized, vmin, vmax = normalize_hidden_state(
            vector_2d,
            mode=normalization.mode,
            vmin=normalization.vmin,
            vmax=normalization.vmax
        )
        
        # Create heatmap
        img_base64 = create_heatmap_image(normalized, colormap="RdBu_r")
        
        return {
            "success": True,
            "image": img_base64,
            "shape": list(vector.shape),
            "norm": float(torch.norm(vector).item()),
            "vmin": float(vmin),
            "vmax": float(vmax)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error visualizing vector: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)