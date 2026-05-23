"""
AP ground truth + sentiment lexicon (server side).

This is the part that's genuinely YOURS — the entity alias map and the
Telugu/Tenglish/English weighted lexicon. Extend both freely; every entry
makes the radar sharper and more obviously AP-native.
"""

ENTITIES = [
    {"id": "naidu",  "label": "Chandrababu Naidu", "party": "TDP",
     "aliases": ["chandrababu", "naidu", "babu", "cbn"]},
    {"id": "lokesh", "label": "Nara Lokesh", "party": "TDP",
     "aliases": ["lokesh", "nara lokesh"]},
    {"id": "pawan",  "label": "Pawan Kalyan", "party": "JSP",
     "aliases": ["pawan", "pawan kalyan", "pk", "janasena chief", "deputy cm"]},
    {"id": "jagan",  "label": "Y.S. Jagan", "party": "YSRCP",
     "aliases": ["jagan", "ys jagan", "jagan mohan", "ysrcp chief"]},
    {"id": "tdp",    "label": "TDP", "party": "TDP",
     "aliases": ["tdp", "telugu desam"]},
    {"id": "jsp",    "label": "Jana Sena", "party": "JSP",
     "aliases": ["jana sena", "janasena", "jsp"]},
    {"id": "ysrcp",  "label": "YSRCP", "party": "YSRCP",
     "aliases": ["ysrcp", "ycp", "wycp"]},
]

ISSUES = [
    {"id": "amaravati", "label": "Amaravati / Capital",
     "cues": ["amaravati", "capital", "secretariat"]},
    {"id": "polavaram", "label": "Polavaram",
     "cues": ["polavaram", "diaphragm wall", "irrigation"]},
    {"id": "supersix", "label": "Super Six promises",
     "cues": ["super six", "promise", "talliki vandanam", "annadata"]},
    {"id": "jobs", "label": "Jobs / Employment",
     "cues": ["jobs", "employment", "unemployment", "recruitment", "mega dsc"]},
    {"id": "welfare", "label": "Welfare",
     "cues": ["welfare", "pension", "dbt", "subsidy", "ration"]},
    {"id": "law", "label": "Law & order",
     "cues": ["law and order", "attack", "violence", "police case"]},
    {"id": "graft", "label": "Corruption",
     "cues": ["corruption", "scam", "graft", "kickback", "liquor scam"]},
]

# Weighted sentiment lexicon: (term, weight). Telugu script, Tenglish, English.
LEXICON = [
    ("manchi", 0.8), ("bagundi", 0.7), ("super", 0.8), ("development", 0.7),
    ("develop", 0.6), ("nijam", 0.5), ("welcome", 0.5), ("praise", 0.7),
    ("boost", 0.6), ("win", 0.7), ("wins", 0.7), ("victory", 0.8),
    ("launches", 0.4), ("inaugurat", 0.5), ("growth", 0.6), ("progress", 0.6),
    ("relief", 0.5), ("approve", 0.5), ("hails", 0.7), ("historic", 0.6),
    ("మంచి", 0.8), ("అభివృద్ధి", 0.9), ("విజయం", 0.8),
    ("waste", -0.8), ("dobbindi", -0.9), ("abaddam", -0.8), ("cheyaledu", -0.7),
    ("fail", -0.8), ("failed", -0.8), ("corruption", -0.9), ("scam", -0.9),
    ("attack", -0.7), ("slams", -0.7), ("slam", -0.7), ("protest", -0.5),
    ("arrest", -0.6), ("crisis", -0.7), ("row", -0.5), ("controversy", -0.6),
    ("alleges", -0.5), ("lie", -0.7), ("loss", -0.6), ("delay", -0.5),
    ("criticis", -0.6), ("blames", -0.6), ("chaos", -0.7), ("unrest", -0.6),
    ("false", -0.6),
    ("దోచుకున్నారు", -0.9), ("అబద్ధం", -0.8), ("విఫలం", -0.8),
    ("దాడి", -0.7), ("నిరసన", -0.5),
]


def score_text(text: str):
    """Lexicon scoring with per-entity attribution. Returns None if no entity present."""
    lc = text.lower()
    present = [e for e in ENTITIES if any(a in lc for a in e["aliases"])]
    if not present:
        return None

    raw, hits = 0.0, 0
    for term, w in LEXICON:
        if term.lower() in lc:
            raw += w
            hits += 1

    if hits:
        s = max(-1.0, min(1.0, raw / max(2, hits)))
    else:
        s = 0.0
    s = round(s, 2)

    issue = next((i["label"] for i in ISSUES if any(c in lc for c in i["cues"])), "Other")
    return {
        "text": text,
        "entities": [{"id": e["id"], "label": e["label"], "party": e["party"], "sentiment": s} for e in present],
        "issue": issue,
        "method": "lexicon",
        "confident": hits > 0,
    }
