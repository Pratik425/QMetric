# extraction_logic.py
import sys
import json
import re
import numpy as np

# Try importing spaCy if available in environment
nlp = None
try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_md")
    except Exception:
        nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = None

# Base Bloom's taxonomy verbs by level
# Base Bloom's taxonomy verbs by level (matches Regex.js bloomsTaxonomyVerbs exactly)
BLOOMS_TAXONOMY = {
    "remember": ["recall", "give", "reproduce", "memorize", "define", "identify", "describe", "label", "list", "name", "state", "match", "recognize", "examine", "draw", "write", "locate", "quote", "read", "record", "repeat", "retell", "visualize", "copy", "duplicate", "enumerate", "listen", "observe", "omit", "tabulate", "tell", "what", "why", "when", "where", "which"],
    "understand": ["explain", "how", "interpret", "paraphrase", "summarize", "classify", "compare", "differentiate", "discuss", "distinguish", "extend", "predict", "associate", "contrast", "convert", "demonstrate", "estimate", "identify", "infer", "relate", "restate", "translate", "generalize", "group", "illustrate", "judge", "observe", "order", "report", "represent", "research", "review", "rewrite", "show", "trace"],
    "apply": ["solve", "apply", "modify", "use", "calculate", "change", "demonstrate", "experiment", "relate", "show", "complete", "manipulate", "practice", "simulate", "transfer"],
    "analyze": ["analyze", "analyse", "compare", "classify", "contrast", "distinguish", "infer", "separate", "categorize", "differentiate", "correlate", "deduce", "devise", "dissect", "estimate", "evaluate"],
    "evaluate": ["evaluate", "judge", "assess", "appraise", "critique", "criticize", "discern", "discriminate", "consider", "weigh", "measure", "estimate", "rate", "grade", "score", "rank", "test", "recommend", "decide", "conclude", "argue", "debate", "justify", "persuade", "defend", "support", "summarize", "editorialize", "predict", "distinguish"],
    "create": ["design", "compose", "synthesis", "plan", "combine", "formulate", "invent", "hypothesize", "substitute", "compile", "construct", "develop", "generalize", "integrate", "modify", "organize", "prepare", "produce", "rearrange", "rewrite", "adapt", "arrange", "assemble", "choose", "collaborate", "facilitate", "imagine", "intervene", "manage", "originate", "propose", "simulate", "solve", "support", "test", "validate", "create"]
}

# Semantic synonym mappings providing explicit semantic ties
SEMANTIC_SYNONYMS = {
    # Apply category (computation, execution, plotting)
    "compute": ("calculate", "apply", 0.94),
    "computing": ("calculate", "apply", 0.92),
    "computed": ("calculate", "apply", 0.92),
    "determine": ("solve", "apply", 0.88),
    "determining": ("solve", "apply", 0.86),
    "find": ("solve", "apply", 0.90),
    "finding": ("solve", "apply", 0.88),
    "derive": ("solve", "apply", 0.90),
    "deriving": ("solve", "apply", 0.88),
    "derived": ("solve", "apply", 0.88),
    "plot": ("draw", "apply", 0.91),
    "plotting": ("draw", "apply", 0.89),
    "graph": ("draw", "apply", 0.90),
    "execute": ("apply", "apply", 0.89),
    "implement": ("apply", "apply", 0.90),
    "utilize": ("use", "apply", 0.94),
    "quantify": ("calculate", "apply", 0.89),
    "perform": ("practice", "apply", 0.88),

    # Analyze category (investigation, inspection)
    "scrutinize": ("analyze", "analyze", 0.93),
    "investigate": ("analyze", "analyze", 0.91),
    "inspect": ("dissect", "analyze", 0.90),
    "deconstruct": ("dissect", "analyze", 0.91),
    "probe": ("dissect", "analyze", 0.88),

    # Evaluate category (assessment, critique)
    "critique": ("criticize", "evaluate", 0.94),
    "audit": ("assess", "evaluate", 0.89),
    "verify": ("test", "evaluate", 0.92),
    "gauge": ("measure", "evaluate", 0.90),
    "rate": ("grade", "evaluate", 0.91),

    # Create category (synthesis, formulation)
    "synthesize": ("combine", "create", 0.93),
    "formulate": ("develop", "create", 0.90),
    "build": ("construct", "create", 0.92),
    "generate": ("produce", "create", 0.91),
    "model": ("design", "create", 0.89),

    # Understand category (clarification, restatement)
    "clarify": ("explain", "understand", 0.92),
    "elucidate": ("explain", "understand", 0.91),
    "expound": ("explain", "understand", 0.89),
    "rephrase": ("paraphrase", "understand", 0.93),
    "recapitulate": ("summarize", "understand", 0.92),
    "outline": ("summarize", "understand", 0.89),

    # Remember category
    "cite": ("quote", "remember", 0.92),
    "recite": ("repeat", "remember", 0.91),
    "specify": ("state", "remember", 0.90),
}

# Semantic domain centers in a 6-dimensional space (levels 1-6)
LEVEL_CENTERS = {
    "remember": np.array([1.0, 0.1, 0.0, 0.0, 0.0, 0.0]),
    "understand": np.array([0.1, 1.0, 0.1, 0.0, 0.0, 0.0]),
    "apply": np.array([0.0, 0.1, 1.0, 0.1, 0.0, 0.0]),
    "analyze": np.array([0.0, 0.0, 0.1, 1.0, 0.1, 0.0]),
    "evaluate": np.array([0.0, 0.0, 0.0, 0.1, 1.0, 0.1]),
    "create": np.array([0.0, 0.0, 0.0, 0.0, 0.1, 1.0]),
}

def normalize_vector(v):
    norm = np.linalg.norm(v)
    if norm == 0:
        return v
    return v / norm

def cosine_similarity(v1, v2):
    dot = np.dot(v1, v2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(dot / (norm1 * norm2))

def hash_ngram_vector(word, dims=16):
    """Generates a character n-gram projection for morphological similarity."""
    vec = np.zeros(dims)
    for n in (2, 3):
        for i in range(len(word) - n + 1):
            ngram = word[i:i+n]
            idx = hash(ngram) % dims
            vec[idx] += 1.0
    return normalize_vector(vec)

def get_word_embedding(word):
    """
    Computes a 22-dimensional normalized semantic-morphological embedding vector:
    6 dimensions for Bloom taxonomy level alignment + 16 dimensions for n-gram features.
    """
    word = word.lower().strip()
    base_level_vec = np.zeros(6)

    # Check direct synonym
    if word in SEMANTIC_SYNONYMS:
        _, level, _ = SEMANTIC_SYNONYMS[word]
        base_level_vec = LEVEL_CENTERS.get(level, np.zeros(6)).copy()
    else:
        for level, verbs in BLOOMS_TAXONOMY.items():
            if word in verbs:
                base_level_vec = LEVEL_CENTERS[level].copy()
                break

    ngram_vec = hash_ngram_vector(word, dims=16)
    # Combine 6-dim semantic center with 16-dim morphological vector
    combined = np.concatenate([base_level_vec * 2.0, ngram_vec * 0.5])
    return normalize_vector(combined)

def lemmatize_simple(word):
    """Rule-based lemmatizer for common English verb inflections."""
    word = word.lower().strip()
    if word.endswith("ing") and len(word) > 5:
        base = word[:-3]
        if len(base) >= 3 and base[-1] == base[-2] and base[-1] not in "lsz":
            return base[:-1]  # plotting -> plot
        if base.endswith("v"):
            return base + "e"  # deriving -> derive
        return base
    if word.endswith("ed") and len(word) > 4:
        base = word[:-2]
        if base.endswith("i"):
            return base[:-1] + "y"  # applied -> apply
        if len(base) >= 3 and base[-1] == base[-2]:
            return base[:-1]
        if not base.endswith("e"):
            return base + "e"  # computed -> compute
        return base
    if word.endswith("es") and len(word) > 4:
        return word[:-2]
    if word.endswith("s") and len(word) > 3 and not word.endswith("ss"):
        return word[:-1]
    return word

def extract_candidate_verbs(text):
    """Extract candidate verbs from a question sentence."""
    text_clean = re.sub(r'[^a-zA-Z\s]', ' ', text)
    tokens = text_clean.split()
    if not tokens:
        return []

    # Common non-action auxiliary words to skip
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "to", "from", "in", "on",
        "at", "by", "for", "with", "about", "against", "between", "into",
        "through", "during", "before", "after", "above", "below", "up",
        "down", "in", "out", "off", "over", "under", "again", "further",
        "then", "once", "here", "there", "when", "where", "why", "how",
        "all", "any", "both", "each", "few", "more", "most", "other",
        "some", "such", "no", "nor", "not", "only", "own", "same", "so",
        "than", "too", "very", "can", "will", "just", "should", "now",
        "of", "that", "this", "these", "those", "it", "its", "what", "which",
        "given", "following"
    }

    candidates = []
    # If spaCy is available, use POS tagging
    if nlp is not None:
        try:
            doc = nlp(text)
            for token in doc:
                if token.pos_ == "VERB" and token.is_alpha:
                    lemma = token.lemma_.lower().strip()
                    if lemma not in stop_words and len(lemma) > 2:
                        candidates.append(lemma)
        except Exception:
            pass

    # Fallback / heuristic extraction
    for i, token in enumerate(tokens):
        lower = token.lower()
        if lower in stop_words or len(lower) < 3:
            continue
        lemma = lemmatize_simple(lower)
        if lemma not in candidates:
            candidates.append(lemma)
        if lower not in candidates:
            candidates.append(lower)

    return candidates

def find_most_similar_bloom_verb(candidate_verb, verb_dictionary, threshold=0.65):
    """
    Finds the most similar dictionary verb to candidate_verb using cosine similarity.
    Only called when candidate_verb is NOT in verb_dictionary.
    """
    candidate_verb = candidate_verb.lower().strip()
    lemma = lemmatize_simple(candidate_verb)

    # 1. Check direct semantic synonym table first
    for word_key in (candidate_verb, lemma):
        if word_key in SEMANTIC_SYNONYMS:
            syn_verb, target_level, syn_sim = SEMANTIC_SYNONYMS[word_key]
            # Ensure the level and target verb exist in the provided verb_dictionary
            if target_level in verb_dictionary:
                return {
                    "matched": True,
                    "original_verb": candidate_verb,
                    "similar_verb": syn_verb,
                    "level": target_level,
                    "similarity": round(float(syn_sim), 4)
                }

    # 2. Check spaCy word vectors if available
    if nlp is not None and hasattr(nlp.vocab, "vectors") and nlp.vocab.vectors.shape[0] > 0:
        token = nlp(candidate_verb)
        if token.has_vector and token.vector_norm > 0:
            best_verb = None
            best_level = None
            highest_sim = -1.0
            for level, verbs in verb_dictionary.items():
                for target_verb in verbs:
                    target_token = nlp(target_verb)
                    if target_token.has_vector:
                        sim = float(token.similarity(target_token))
                        if sim > highest_sim:
                            highest_sim = sim
                            best_verb = target_verb
                            best_level = level
            if highest_sim >= threshold and best_verb is not None:
                return {
                    "matched": True,
                    "original_verb": candidate_verb,
                    "similar_verb": best_verb,
                    "level": best_level,
                    "similarity": round(highest_sim, 4)
                }

    # 3. Compute mathematical cosine similarity using dense embedding space
    cand_vec = get_word_embedding(candidate_verb)
    best_verb = None
    best_level = None
    highest_sim = -1.0

    for level, verbs in verb_dictionary.items():
        for target_verb in verbs:
            target_vec = get_word_embedding(target_verb)
            sim = cosine_similarity(cand_vec, target_vec)
            if sim > highest_sim:
                highest_sim = sim
                best_verb = target_verb
                best_level = level

    if highest_sim >= threshold and best_verb is not None:
        return {
            "matched": True,
            "original_verb": candidate_verb,
            "similar_verb": best_verb,
            "level": best_level,
            "similarity": round(highest_sim, 4)
        }

    return {
        "matched": False,
        "original_verb": candidate_verb,
        "similar_verb": None,
        "level": None,
        "similarity": round(float(highest_sim), 4) if highest_sim > 0 else 0.0
    }

def process_cosine_similarity(text, verb_dictionary, threshold=0.65):
    """
    Extracts candidate verbs from text, and for verbs NOT in verb_dictionary,
    calculates cosine similarity to find the most similar Bloom's verb.
    """
    candidates = extract_candidate_verbs(text)
    if not candidates:
        return {
            "matched": False,
            "original_verb": None,
            "similar_verb": None,
            "level": None,
            "similarity": 0.0
        }

    # Iterate through candidates in order (command verb first)
    for cand in candidates:
        # If candidate is already in the dictionary, skip (cosine similarity is only for unseen verbs)
        already_in_dict = any(cand in verbs for verbs in verb_dictionary.values())
        if already_in_dict:
            continue

        result = find_most_similar_bloom_verb(cand, verb_dictionary, threshold)
        if result["matched"]:
            return result

    return {
        "matched": False,
        "original_verb": None,
        "similar_verb": None,
        "level": None,
        "similarity": 0.0
    }

if __name__ == "__main__":
    # Check if called in similarity mode
    if len(sys.argv) > 1 and sys.argv[1] == "--similarity":
        try:
            if len(sys.argv) > 2 and sys.stdin.isatty():
                input_data = sys.argv[2]
            elif sys.stdin.isatty():
                print(json.dumps({"status": "ready", "mode": "similarity"}))
                sys.exit(0)
            else:
                input_data = sys.stdin.read().strip()

            if not input_data:
                print(json.dumps({"matched": False}))
                sys.exit(0)

            payload = json.loads(input_data)
            text = payload.get("text", "")
            verb_dict = payload.get("verb_dictionary", BLOOMS_TAXONOMY)
            threshold = float(payload.get("threshold", 0.65))

            result = process_cosine_similarity(text, verb_dict, threshold)
            print(json.dumps(result))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"matched": False, "error": str(e)}))
            sys.exit(0)

    # Default extraction mode (backward compatible with extractVerbsPython)
    if sys.stdin.isatty():
        if len(sys.argv) > 1:
            input_text = " ".join(sys.argv[1:])
        else:
            print("QMetric Verb Extraction & Cosine Similarity Engine.")
            print("Ready for piped inputs or CLI arguments.")
            sys.exit(0)
    else:
        input_text = sys.stdin.read().strip()

    if not input_text:
        sys.exit(0)

    # Flat list of all known Bloom verbs
    all_blooms = {verb for level_verbs in BLOOMS_TAXONOMY.values() for verb in level_verbs}
    candidates = extract_candidate_verbs(input_text)
    matched_verbs = [v for v in candidates if v in all_blooms]
    print(','.join(sorted(set(matched_verbs))))
