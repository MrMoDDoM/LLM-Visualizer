"""
Example script for generating steering vectors using Contrastive Activation Addition (CAA)

This script demonstrates how to create steering vectors by computing the difference
between model activations on contrasting prompt pairs.

Usage:
    python generate_steering_vector.py --model meta-llama/Llama-3.1-8B-Instruct \
                                       --output formality_vector.pt \
                                       --layer 16

Requirements:
    - transformers
    - torch
    - A HuggingFace model
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import argparse
from typing import List, Tuple


def get_hidden_states(model, tokenizer, text: str, layer_idx: int) -> torch.Tensor:
    """
    Extract hidden states from a specific layer for given text.
    
    Args:
        model: HuggingFace model
        tokenizer: HuggingFace tokenizer
        text: Input text
        layer_idx: Layer index to extract from
        
    Returns:
        Hidden states tensor of shape [seq_len, hidden_size]
    """
    inputs = tokenizer(text, return_tensors="pt").to(model.device)
    
    with torch.no_grad():
        outputs = model(**inputs, output_hidden_states=True)
    
    # Get hidden states for the specified layer
    hidden_states = outputs.hidden_states[layer_idx + 1]  # +1 because first is embedding
    
    # Average over sequence length to get a single vector
    # You can also use the last token or other pooling strategies
    return hidden_states.mean(dim=1).squeeze(0)


def compute_steering_vector(
    model,
    tokenizer,
    positive_prompts: List[str],
    negative_prompts: List[str],
    layer_idx: int
) -> torch.Tensor:
    """
    Compute steering vector using Contrastive Activation Addition.
    
    Args:
        model: HuggingFace model
        tokenizer: HuggingFace tokenizer
        positive_prompts: List of prompts exhibiting desired behavior
        negative_prompts: List of prompts exhibiting undesired behavior
        layer_idx: Layer to extract activations from
        
    Returns:
        Steering vector tensor
    """
    print(f"Computing steering vector at layer {layer_idx}...")
    
    # Collect positive activations
    positive_activations = []
    for prompt in positive_prompts:
        hidden_state = get_hidden_states(model, tokenizer, prompt, layer_idx)
        positive_activations.append(hidden_state)
    
    # Collect negative activations
    negative_activations = []
    for prompt in negative_prompts:
        hidden_state = get_hidden_states(model, tokenizer, prompt, layer_idx)
        negative_activations.append(hidden_state)
    
    # Average positive and negative activations
    avg_positive = torch.stack(positive_activations).mean(dim=0)
    avg_negative = torch.stack(negative_activations).mean(dim=0)
    
    # Compute steering vector as the difference
    steering_vector = avg_positive - avg_negative
    
    # Normalize (optional but recommended)
    steering_vector = steering_vector / torch.norm(steering_vector)
    
    return steering_vector


# Example prompt pairs for different behaviors
FORMALITY_PROMPTS = {
    "positive": [
        "I would like to respectfully inquire about the status of my application.",
        "Could you please provide me with additional information regarding this matter?",
        "I am writing to formally request your assistance with the following issue.",
        "It would be greatly appreciated if you could address this concern at your earliest convenience.",
        "I wish to express my sincere gratitude for your prompt attention to this matter."
    ],
    "negative": [
        "Hey, what's up with my application?",
        "Can you give me more info about this?",
        "I need help with something.",
        "Please help me out ASAP!",
        "Thanks a lot for helping!"
    ]
}

POSITIVITY_PROMPTS = {
    "positive": [
        "This is absolutely wonderful and fills me with joy!",
        "I'm so excited and happy about this opportunity!",
        "What a fantastic day! Everything is going perfectly!",
        "I feel incredibly grateful and blessed!",
        "This brings such warmth and happiness to my heart!"
    ],
    "negative": [
        "This is terrible and makes me feel awful.",
        "I'm so disappointed and frustrated about this.",
        "What a horrible day. Nothing is going right.",
        "I feel miserable and hopeless.",
        "This is so depressing and disheartening."
    ]
}

CONCISENESS_PROMPTS = {
    "positive": [
        "Yes.",
        "No.",
        "Done.",
        "OK.",
        "Got it."
    ],
    "negative": [
        "Well, you see, the thing is that when you really think about it carefully and consider all the various factors and perspectives involved in this situation, one might come to the conclusion that...",
        "In order to fully understand this complex issue, it's important to first establish some background context and examine the historical precedents that have led us to this point...",
        "Let me explain in great detail exactly what I mean by that, because there are many nuanced aspects to consider and I want to make sure I'm being as clear and comprehensive as possible...",
        "To answer your question, I would need to provide a thorough explanation that covers all the relevant information and various considerations that factor into this matter...",
        "If I may elaborate on this point, there are several interconnected factors that contribute to this phenomenon, and I believe it would be helpful to explore each of them individually..."
    ]
}


def main():
    parser = argparse.ArgumentParser(description="Generate steering vectors using CAA")
    parser.add_argument("--model", type=str, default="meta-llama/Llama-3.1-8B-Instruct",
                       help="HuggingFace model name")
    parser.add_argument("--output", type=str, default="steering_vector.pt",
                       help="Output file path")
    parser.add_argument("--layer", type=int, default=None,
                       help="Layer index (default: middle layer)")
    parser.add_argument("--behavior", type=str, default="formality",
                       choices=["formality", "positivity", "conciseness"],
                       help="Behavior to create steering vector for")
    args = parser.parse_args()
    
    print(f"Loading model: {args.model}")
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        torch_dtype=torch.float16,
        device_map="auto"
    )
    
    # Determine layer
    num_layers = model.config.num_hidden_layers
    layer_idx = args.layer if args.layer is not None else num_layers // 2
    
    print(f"Model has {num_layers} layers")
    print(f"Using layer {layer_idx} for steering vector extraction")
    
    # Select prompts based on behavior
    if args.behavior == "formality":
        prompts = FORMALITY_PROMPTS
    elif args.behavior == "positivity":
        prompts = POSITIVITY_PROMPTS
    else:  # conciseness
        prompts = CONCISENESS_PROMPTS
    
    # Compute steering vector
    steering_vector = compute_steering_vector(
        model,
        tokenizer,
        prompts["positive"],
        prompts["negative"],
        layer_idx
    )
    
    # Save
    print(f"Saving steering vector to {args.output}")
    torch.save(steering_vector, args.output)
    
    # Print stats
    print(f"\nSteering Vector Stats:")
    print(f"  Shape: {steering_vector.shape}")
    print(f"  Norm: {torch.norm(steering_vector).item():.4f}")
    print(f"  Min: {steering_vector.min().item():.4f}")
    print(f"  Max: {steering_vector.max().item():.4f}")
    print(f"  Mean: {steering_vector.mean().item():.4f}")
    print(f"  Std: {steering_vector.std().item():.4f}")
    
    print(f"\n✅ Done! Upload {args.output} to the visualizer to use it.")


if __name__ == "__main__":
    main()
