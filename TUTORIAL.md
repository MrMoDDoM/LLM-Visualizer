# 📚 Tutorial: Analyzing Reasoning Patterns in LLMs

This tutorial guides you through a comprehensive analysis of hidden state patterns during different types of reasoning.

## Objective

Understand how hidden states evolve during:
1. Mathematical reasoning
2. Creative generation
3. Factual knowledge retrieval

## Setup

```python
# Load the model in the web interface
# Use: meta-llama/Llama-3.2-1B-Instruct
```

## Experiment 1: Mathematical Reasoning

### Step 1: Generate without steering

**Prompt:**
```
Q: What is 127 + 384?
A: Let me solve this step by step.
```

**Parameters:**
- Max Tokens: 30
- Temperature: 0.7
- No steering

**What to observe:**
1. In early layers (0-5): lexical patterns of numbers
2. In middle layers (6-15): solution construction
3. In final layers (16+): final token selection

**Expected patterns:**
- Strong activations in dimensions associated with numbers
- Gradual transition toward more abstract representations
- Convergence toward answer in final layers

### Step 2: Compare key tokens

Navigate token by token and compare:
- Token "127": initial numerical representation
- Token "step": activation of reasoning mechanism
- Token with result: solution convergence

**Questions:**
- Which dimensions change the most between these tokens?
- At which layer does the "jump" toward the solution occur?

## Experiment 2: Creativity vs Facts

### Test A: Historical fact

**Prompt:**
```
The capital of France is
```

**What to expect:**
- Deterministic answer ("Paris")
- Very stable patterns across layers
- Minimal variance in activations

### Test B: Creative completion

**Prompt:**
```
Once upon a time, in a magical forest,
```

**What to expect:**
- Greater variance in activations
- Less deterministic patterns
- More "exploration" in hidden states space

**Comparison:**
Use "Fixed Range" normalization with same vmin/vmax to compare:
- Is variance greater in the creative case?
- Which layers show the biggest differences?

## Experiment 3: Steering for Control

### Step 1: Generate conciseness steering vector

```bash
cd backend
python generate_steering_vector.py \
    --model meta-llama/Llama-3.2-1B-Instruct \
    --behavior conciseness \
    --output concise_vector.pt
```

### Step 2: Test without steering

**Prompt:**
```
Explain photosynthesis.
```

**Parameters:**
- Max Tokens: 50
- Temperature: 1.0

**Expected result:** Verbose explanation

### Step 3: Test with steering

**Apply steering:**
- Vector: concise_vector
- Layer: 8 (middle layer)
- Coefficient: 2.5

**Expected result:** More concise explanation

### Step 4: Comparative analysis

**Create two visualizations:**
1. Complete timeline without steering
2. Complete timeline with steering

**Compare:**
- Which dimensions change the most?
- Is the change uniform across all layers or concentrated?
- How does the value distribution change?

## Experiment 4: Multi-Layer Steering

### Hypothesis

Applying steering to different layers produces different effects:
- Low layers: superficial change (style)
- Middle layers: semantic change (meaning)
- High layers: change in token selection

### Test

**Base setup:**
```
Write a poem about the ocean.
```

**Configurations to test:**

1. **Low layer steering (layer 4)**
   - Coefficient: 1.0
   - Expected effect: stylistic change

2. **Middle layer steering (layer 12)**
   - Coefficient: 1.0
   - Expected effect: thematic change

3. **High layer steering (layer 20)**
   - Coefficient: 1.0
   - Expected effect: change in word choice

4. **Simultaneous multi-layer (4, 12, 20)**
   - Coefficient: 0.7 for all
   - Expected effect: combined effect

### Analysis

For each configuration:
1. Save the timeline
2. Note differences in generated text
3. Identify which dimensions change the most
4. Compare effect on different layers

## Experiment 5: Behavior Debugging

### Case: Unexpected Output

**Scenario:** The model produces a strange response

**Problematic prompt:**
```
The moon is made of
```

**Unexpected response:** (for example, continues with incorrect information)

### Debugging process

1. **Identify the critical token**
   - Navigate token by token
   - Find where generation "deviates"

2. **Analyze hidden states**
   - Which layers show anomalous activations?
   - Are there unexpected patterns?

3. **Hypothesize the cause**
   - Comparison with similar correct prompts
   - Identification of problematic dimensions

4. **Attempt correction with steering**
   - Create or use a vector that "pushes" toward correct behavior
   - Apply to layer identified as problematic

## Common Patterns to Look For

### Pattern 1: "Information Retrieval"
**Characteristics:**
- Strong activations in low layers
- Rapid convergence in high layers
- Low variance between tokens

### Pattern 2: "Reasoning Chain"
**Characteristics:**
- Gradually evolving activations
- Visible transitions between reasoning "steps"
- Dimensions that "light up" in sequence

### Pattern 3: "Creative Exploration"
**Characteristics:**
- High variance in activations
- Less structured patterns
- Greater "diversity" between successive layers

### Pattern 4: "Token Selection"
**Characteristics:**
- Convergence in last 2-3 layers
- Very distinctive pattern for specific tokens
- Correlation with token probability

## Advanced Exercises

### Exercise 1: Create a Pattern Atlas

1. Generate 10 different types of prompts (math, history, creativity, etc.)
2. Save visualizations for each
3. Identify recurring patterns
4. Create a mental "map" of common patterns

### Exercise 2: Personal Steering Vector

1. Identify a behavior you want to control
2. Create 5-10 pairs of contrasting prompts
3. Generate your own steering vector
4. Test on new prompts
5. Iterate until achieving desired effect

### Exercise 3: Layer Importance Analysis

For a specific task:
1. Apply steering to each layer individually
2. Measure effect on generated text
3. Identify which layers are most influential
4. Create an "importance profile" for the task

## Additional Resources

- Original CAA paper: [Anthropic](https://www.anthropic.com/index/steering-gpt-2-xl-by-adding-an-activation-vector)
- Transformer Circuits: [Understanding transformers](https://transformer-circuits.pub/)
- Community examples: [GitHub discussions](#)

## Conclusions

Through these experiments you've learned to:
- ✅ Visualize and interpret hidden states
- ✅ Identify reasoning patterns
- ✅ Use steering vectors for control
- ✅ Debug model behaviors
- ✅ Analyze differences between layers

**Next steps:**
- Experiment with different models
- Create your own collection of steering vectors
- Share your findings with the community!

---

**Happy exploring! 🔬🧠**
