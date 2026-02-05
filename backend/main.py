"""
LLM Hidden States Visualizer - Backend Server
FastAPI server for LLM inference with hidden state extraction and steering vector manipulation
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
import traceback

app = FastAPI(title="LLM Hidden States Visualizer")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler to include stacktrace
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    tb = traceback.format_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "stacktrace": tb
        }
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
    do_sample: bool = True  # Set to False for deterministic greedy decoding
    seed: Optional[int] = None  # Random seed for reproducibility
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

class ContrastivePair(BaseModel):
    positive: str
    negative: str

class ContrastiveSearchRequest(BaseModel):
    vector_name: str
    pairs: List[ContrastivePair]
    target_layer: Optional[int] = None  # If None, will use middle layer

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
    status = {
        "model_loaded": model_state.model is not None,
        "model_name": model_state.model_name,
        "device": model_state.device,
        "cuda_available": torch.cuda.is_available(),
        "steering_vectors_count": len(model_state.steering_vectors)
    }
    
    # Add memory info if CUDA is available
    if torch.cuda.is_available():
        status["cuda_memory_allocated_mb"] = torch.cuda.memory_allocated() / 1024**2
        status["cuda_memory_reserved_mb"] = torch.cuda.memory_reserved() / 1024**2
        status["cuda_memory_cached_mb"] = torch.cuda.memory_cached() / 1024**2 if hasattr(torch.cuda, 'memory_cached') else 0
    
    return status

@app.post("/reset")
async def reset_all():
    """Reset everything: unload model, clear cache, clear steering vectors"""
    try:
        # Clear model from memory
        if model_state.model is not None:
            # Remove all forward hooks if any are still registered
            try:
                for module in model_state.model.modules():
                    module._forward_hooks.clear()
                    module._forward_pre_hooks.clear()
                    module._backward_hooks.clear()
            except Exception as e:
                print(f"Warning: Could not clear hooks: {e}")
            
            # Move model to CPU before deleting to ensure VRAM is freed
            try:
                model_state.model.to('cpu')
            except Exception as e:
                print(f"Warning: Could not move model to CPU: {e}")
            
            del model_state.model
            model_state.model = None
        
        if model_state.tokenizer is not None:
            del model_state.tokenizer
            model_state.tokenizer = None
        
        model_state.model_name = None
        
        # Clear steering vectors (which may hold tensors in GPU)
        for vector_data in model_state.steering_vectors.values():
            if "vector" in vector_data and torch.is_tensor(vector_data["vector"]):
                try:
                    vector_data["vector"] = vector_data["vector"].to('cpu')
                except:
                    pass
        model_state.steering_vectors.clear()
        
        # Clear generation cache
        model_state.hidden_states_cache.clear()
        model_state.tokens_cache.clear()
        model_state.embedding_cache.clear()
        
        # Aggressive GPU cache clearing
        if torch.cuda.is_available():
            import gc
            gc.collect()
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
            # Second pass for stubborn references
            gc.collect()
            torch.cuda.empty_cache()
        else:
            import gc
            gc.collect()
        
        print("✅ System reset: all models and cache cleared")
        print(f"   CUDA memory allocated: {torch.cuda.memory_allocated() / 1024**2:.2f} MB" if torch.cuda.is_available() else "   CPU mode")
        
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
        # Set random seed for reproducibility if provided
        if request.seed is not None:
            torch.manual_seed(request.seed)
            torch.cuda.manual_seed_all(request.seed)
            np.random.seed(request.seed)
            # Set deterministic behavior for PyTorch
            torch.backends.cudnn.deterministic = True
            torch.backends.cudnn.benchmark = False
        
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
                # Handle different output types
                if isinstance(output, tuple):
                    # output is a tuple, first element is the hidden states
                    hidden_states = output[0]
                    steering_vector = vector.to(hidden_states.device).to(hidden_states.dtype)
                    # Add steering vector to all positions
                    steered_hidden_states = hidden_states + coefficient * steering_vector.unsqueeze(0).unsqueeze(0)
                    return (steered_hidden_states,) + output[1:]
                else:
                    # output is just the hidden states tensor
                    hidden_states = output
                    steering_vector = vector.to(hidden_states.device).to(hidden_states.dtype)
                    # Add steering vector to all positions
                    steered_hidden_states = hidden_states + coefficient * steering_vector.unsqueeze(0).unsqueeze(0)
                    return steered_hidden_states
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
            
            # Deterministic decoding (greedy) if do_sample is False
            if not request.do_sample:
                next_token = torch.argmax(logits, dim=-1, keepdim=True)
            else:
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

@app.post("/generate_steering_vector")
async def generate_steering_vector(request: ContrastiveSearchRequest):
    """Generate a steering vector using Contrastive Activation technique"""
    if model_state.model is None:
        raise HTTPException(status_code=400, detail="No model loaded")
    
    try:
        # Determine target layer (default to middle layer)
        target_layer = request.target_layer
        if target_layer is None:
            num_layers = len(model_state.model.model.layers)
            target_layer = num_layers // 2
        
        print(f"Generating steering vector '{request.vector_name}' using {len(request.pairs)} pairs at layer {target_layer}")
        
        positive_activations = []
        negative_activations = []
        
        # Process each pair
        for i, pair in enumerate(request.pairs):
            print(f"Processing pair {i+1}/{len(request.pairs)}")
            
            # Tokenize positive example
            pos_inputs = model_state.tokenizer(pair.positive, return_tensors="pt").to(model_state.model.device)
            
            # Forward pass to get hidden states
            with torch.no_grad():
                pos_outputs = model_state.model(
                    **pos_inputs,
                    output_hidden_states=True,
                    return_dict=True
                )
            
            # Extract hidden state at target layer for the last token
            # hidden_states is a tuple of (num_layers+1) tensors, each of shape [batch, seq_len, hidden_size]
            pos_hidden = pos_outputs.hidden_states[target_layer + 1][:, -1, :].squeeze(0)  # +1 because includes embedding layer
            positive_activations.append(pos_hidden)
            
            # Tokenize negative example
            neg_inputs = model_state.tokenizer(pair.negative, return_tensors="pt").to(model_state.model.device)
            
            # Forward pass to get hidden states
            with torch.no_grad():
                neg_outputs = model_state.model(
                    **neg_inputs,
                    output_hidden_states=True,
                    return_dict=True
                )
            
            # Extract hidden state at target layer for the last token
            neg_hidden = neg_outputs.hidden_states[target_layer + 1][:, -1, :].squeeze(0)
            negative_activations.append(neg_hidden)
        
        # Stack all activations
        positive_stack = torch.stack(positive_activations)  # [num_pairs, hidden_size]
        negative_stack = torch.stack(negative_activations)  # [num_pairs, hidden_size]
        
        # Compute mean activations
        positive_mean = positive_stack.mean(dim=0)  # [hidden_size]
        negative_mean = negative_stack.mean(dim=0)  # [hidden_size]
        
        # Compute steering vector as the difference
        steering_vector = positive_mean - negative_mean  # [hidden_size]
        
        # Normalize the vector (optional but recommended)
        steering_vector = steering_vector / torch.norm(steering_vector)
        
        # Store the vector
        model_state.steering_vectors[request.vector_name] = {
            "vector": steering_vector.cpu(),
            "shape": list(steering_vector.shape),
            "norm": float(torch.norm(steering_vector).item()),
            "layer": target_layer,
            "num_pairs": len(request.pairs)
        }
        
        print(f"✓ Generated steering vector '{request.vector_name}': shape {steering_vector.shape}, norm {torch.norm(steering_vector).item():.4f}")
        
        return {
            "success": True,
            "name": request.vector_name,
            "shape": list(steering_vector.shape),
            "norm": float(torch.norm(steering_vector).item()),
            "layer": target_layer,
            "num_pairs": len(request.pairs)
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating steering vector: {str(e)}")

@app.get("/download_steering_vector/{name}")
async def download_steering_vector(name: str):
    """Download a steering vector as .pt file"""
    if name not in model_state.steering_vectors:
        raise HTTPException(status_code=404, detail=f"Vector '{name}' not found")
    
    try:
        from fastapi.responses import StreamingResponse
        
        vector_info = model_state.steering_vectors[name]
        vector = vector_info["vector"]
        layer = vector_info.get('layer', 'unknown')
        
        # Build filename: {name}_{base_model_name}_{layer}.pt
        base_model_name = model_state.model_name.split('/')[-1] if model_state.model_name else 'unknown'
        filename = f"{name}_{base_model_name}_{layer}.pt"
        
        # Save tensor to bytes
        buffer = BytesIO()
        torch.save({
            'vector': vector,
            'shape': vector_info['shape'],
            'norm': vector_info['norm'],
            'layer': vector_info.get('layer'),
            'num_pairs': vector_info.get('num_pairs')
        }, buffer)
        buffer.seek(0)
        
        # Return as downloadable file
        return StreamingResponse(
            buffer,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading vector: {str(e)}")

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

@app.get("/presets")
async def list_presets():
    """
    Scan the Preset/ directory and return available presets with their datasets
    Returns: {
        "presets": [
            {
                "name": "preset_name",
                "datasets": [
                    {"filename": "dataset1.json", "metadata": {...}},
                    ...
                ]
            }
        ]
    }
    """
    try:
        preset_dir = os.path.join(os.path.dirname(__file__), "Preset")
        
        if not os.path.exists(preset_dir):
            # Create empty Preset directory if it doesn't exist
            os.makedirs(preset_dir)
            return {"presets": []}
        
        presets = []
        
        # Iterate through preset directories
        for preset_name in os.listdir(preset_dir):
            preset_path = os.path.join(preset_dir, preset_name)
            
            # Skip if not a directory
            if not os.path.isdir(preset_path):
                continue
            
            datasets = []
            
            # Find all JSON files in this preset directory
            for filename in os.listdir(preset_path):
                if not filename.endswith('.json'):
                    continue
                
                file_path = os.path.join(preset_path, filename)
                
                # Try to read metadata from the dataset
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # Check if new format with metadata or old format
                    if isinstance(data, dict) and 'metadata' in data:
                        metadata = data['metadata']
                        pair_count = len(data.get('pairs', []))
                    else:
                        # Old format or no metadata
                        metadata = {"name": filename.replace('.json', '')}
                        pair_count = len(data) if isinstance(data, list) else 0
                    
                    datasets.append({
                        "filename": filename,
                        "metadata": metadata,
                        "pair_count": pair_count
                    })
                except Exception as e:
                    # If we can't read the file, skip it
                    print(f"Warning: Could not read {file_path}: {str(e)}")
                    continue
            
            if datasets:
                presets.append({
                    "name": preset_name,
                    "dataset_count": len(datasets),
                    "datasets": datasets
                })
        
        return {"presets": presets}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing presets: {str(e)}")

class ExecutePresetRequest(BaseModel):
    preset_name: str

@app.post("/execute_preset")
async def execute_preset(request: ExecutePresetRequest):
    """
    Execute contrastive search for all datasets in a preset
    Generates steering vectors and adds them to the available vectors
    """
    try:
        if model_state.model is None:
            raise HTTPException(status_code=400, detail="No model loaded")
        
        preset_dir = os.path.join(os.path.dirname(__file__), "Preset", request.preset_name)
        
        if not os.path.exists(preset_dir):
            raise HTTPException(status_code=404, detail=f"Preset '{request.preset_name}' not found")
        
        generated_vectors = []
        errors = []
        
        # Find all JSON files in the preset
        json_files = [f for f in os.listdir(preset_dir) if f.endswith('.json')]
        
        if not json_files:
            raise HTTPException(status_code=400, detail=f"No dataset files found in preset '{request.preset_name}'")
        
        # Process each dataset
        for idx, filename in enumerate(json_files):
            file_path = os.path.join(preset_dir, filename)
            
            try:
                # Load dataset
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Extract metadata and pairs
                if isinstance(data, dict) and 'metadata' in data:
                    metadata = data['metadata']
                    pairs = data['pairs']
                    vector_name = metadata.get('name', filename.replace('.json', ''))
                    target_layer = metadata.get('target_layer', None)
                else:
                    # Old format
                    pairs = data if isinstance(data, list) else []
                    vector_name = filename.replace('.json', '')
                    target_layer = None
                
                if not pairs:
                    errors.append(f"{filename}: No pairs found")
                    continue
                
                # Determine target layer
                if target_layer is None:
                    target_layer = model_state.model.config.num_hidden_layers // 2
                
                # Collect activations for all pairs
                positive_activations = []
                negative_activations = []
                
                for pair in pairs:
                    positive_text = pair.get('positive', '')
                    negative_text = pair.get('negative', '')
                    
                    if not positive_text or not negative_text:
                        continue
                    
                    # Tokenize and get hidden states for positive
                    pos_inputs = model_state.tokenizer(
                        positive_text,
                        return_tensors="pt",
                        padding=True,
                        truncation=True
                    ).to(model_state.device)
                    
                    with torch.no_grad():
                        pos_outputs = model_state.model(**pos_inputs, output_hidden_states=True)
                        pos_hidden = pos_outputs.hidden_states[target_layer]
                        pos_last_token = pos_hidden[:, -1, :]
                        positive_activations.append(pos_last_token)
                    
                    # Tokenize and get hidden states for negative
                    neg_inputs = model_state.tokenizer(
                        negative_text,
                        return_tensors="pt",
                        padding=True,
                        truncation=True
                    ).to(model_state.device)
                    
                    with torch.no_grad():
                        neg_outputs = model_state.model(**neg_inputs, output_hidden_states=True)
                        neg_hidden = neg_outputs.hidden_states[target_layer]
                        neg_last_token = neg_hidden[:, -1, :]
                        negative_activations.append(neg_last_token)
                
                if not positive_activations or not negative_activations:
                    errors.append(f"{filename}: No valid activations extracted")
                    continue
                
                # Compute mean difference
                pos_mean = torch.stack(positive_activations).mean(dim=0)
                neg_mean = torch.stack(negative_activations).mean(dim=0)
                steering_vector = (pos_mean - neg_mean).squeeze(0)
                
                # Store the steering vector
                model_state.steering_vectors[vector_name] = {
                    "vector": steering_vector,
                    "layer": target_layer
                }
                
                generated_vectors.append({
                    "name": vector_name,
                    "layer": target_layer,
                    "shape": list(steering_vector.shape),
                    "norm": float(torch.norm(steering_vector).item()),
                    "source_file": filename,
                    "pair_count": len(pairs)
                })
                
            except Exception as e:
                error_msg = f"{filename}: {str(e)}"
                errors.append(error_msg)
                print(f"Error processing {filename}: {str(e)}")
                continue
        
        return {
            "success": True,
            "preset_name": request.preset_name,
            "processed": len(generated_vectors),
            "failed": len(errors),
            "vectors": generated_vectors,
            "errors": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing preset: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
