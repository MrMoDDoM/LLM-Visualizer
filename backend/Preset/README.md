# Preset System for LLM Visualizer

## Overview
This folder contains preset collections of contrastive datasets. Each preset is a folder containing multiple JSON dataset files that will be automatically loaded and processed together.

## Structure

```
Preset/
├── PresetName1/
│   ├── dataset1.json
│   ├── dataset2.json
│   └── dataset3.json
├── PresetName2/
│   ├── dataset1.json
│   └── dataset2.json
└── README.md (this file)
```

## How to Create a Preset

1. **Create a folder** with your preset name (e.g., "EmotionalIntelligence")
2. **Add JSON dataset files** following the format below
3. **Restart the backend** or click "Refresh" in the UI to reload presets

## Dataset JSON Format

Each dataset file should follow this structure:

```json
{
  "metadata": {
    "name": "positive_sentiment",
    "target_layer": 16,
    "description": "Enhances positive emotional responses",
    "created_at": "2026-02-05T10:00:00.000Z",
    "version": "1.0"
  },
  "pairs": [
    {
      "id": 1,
      "positive": "This is wonderful and I love it",
      "negative": "This is terrible and I hate it"
    },
    {
      "id": 2,
      "positive": "I feel happy and grateful",
      "negative": "I feel sad and resentful"
    }
  ]
}
```

### Metadata Fields
- **name** (required): Name of the steering vector to generate
- **target_layer** (optional): Layer to extract activations from (if null, uses middle layer)
- **description** (optional): Description of what this vector does
- **created_at** (optional): Timestamp
- **version** (optional): Format version

### Pairs Array
- **positive**: Text representing the desired behavior/concept
- **negative**: Text representing the opposite behavior/concept

## Example Presets

### EmotionalIntelligence
Contains datasets for:
- `positive_sentiment.json` - Enhances positive emotional responses
- `empathy.json` - Promotes empathetic responses
- `gratitude.json` - Encourages expressions of thankfulness

### CognitiveSkills
Contains datasets for:
- `creativity.json` - Enhances creative thinking
- `critical_thinking.json` - Promotes analytical reasoning

## Using Presets in the UI

1. Go to the **Contrastive Activation Search** tab
2. Find the **Preset Manager** section
3. Select a preset from the dropdown
4. View the datasets it contains
5. Click **Execute Preset** to generate all vectors at once
6. All generated vectors will be added to your steering vectors library

## Tips

- Group related vectors into themed presets
- Use consistent layer numbers within a preset for similar effects
- Start with 3-5 contrastive pairs per dataset
- Test individual datasets before adding to a preset
- Use descriptive names for both presets and datasets

## Backend API Endpoints

- `GET /presets` - List all available presets
- `POST /execute_preset` - Execute all datasets in a preset

## Notes

- The system automatically handles both old format (array only) and new format (with metadata)
- Empty or invalid JSON files are skipped with warnings in the backend logs
- Preset names come from folder names, dataset names come from file metadata or filenames
