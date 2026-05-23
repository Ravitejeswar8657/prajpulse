"""
Optional 'deep' scoring via the Google Gemini API, server-side.

The lexicon handles the bulk for free. This adds nuanced, sarcasm-aware,
multi-entity scoring for the hard cases — and crucially the API key lives
on the SERVER (env var), never in the browser. The frontend's "deep" button
calls /api/deep, which calls this. If GEMINI_API_KEY is unset, the
endpoint cleanly reports unavailable and the app keeps working on lexicon.
"""

import os
import json
import google.generativeai as genai

SYSTEM = """You are a sentiment analyst for Andhra Pradesh politics, fluent in English, Telugu (script), and Romanized Telugu (Tenglish).

Context: TDP-JanaSena-BJP (NDA) governs AP after a 2024 landslide. Chandrababu Naidu (TDP) is CM, Pawan Kalyan (JSP) Deputy CM, Nara Lokesh a key minister. YSRCP (Jagan) is opposition.

Aliases: Babu/CBN -> naidu; Lokesh -> lokesh; Pawan/PK -> pawan; Jagan/YS -> jagan; party mentions -> tdp/jsp/ysrcp.

Rules:
- One line can mention multiple entities with DIFFERENT sentiment. Score each separately.
- sentiment in [-1.0, 1.0]; 0 = neutral/factual.
- Detect dominant issue: Amaravati / Capital, Polavaram, Super Six promises, Jobs / Employment, Welfare, Law & order, Corruption, Other.
- Respond ONLY with JSON, no markdown:
{"results":[{"text":"...","entities":[{"id":"...","sentiment":0.0}],"issue":"..."}]}"""


def deep_available() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY"))


def deep_score(texts):
    """Score a batch of headline strings with Gemini. Returns list of result dicts."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=SYSTEM
    )

    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
    prompt = f"Analyze each line, sentiment per entity:\n\n{numbered}"
    
    response = model.generate_content(prompt)
    
    text = response.text
    clean = text.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(clean)
        results = data.get("results", [])
        for r in results:
            r["method"] = "deep"
        return results
    except json.JSONDecodeError:
        # Fallback if Gemini adds conversational filler
        return []
