from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Tuple
import joblib
import os
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')

FEATURE_NAMES = [
    'testPassRate',
    'executionTime',
    'codeLength',
    'codeCharCount',
    'errorCount',
    'complexityScore',
    'implementationCompleteness',
    'codeQualityScore',
    'passedTestCases',
    'totalTestCases',
    'explanationClarity',
    'reasoningDepth',
    'structuredThinking',
    'approachRelevance',
    'explanationCompleteness',
    'explanationWordCount',
    'hasMeaningfulCode',
    'hasExplanation',
]
LEGACY_FEATURE_NAMES = [
    'testPassRate',
    'executionTime',
    'codeLength',
    'codeCharCount',
    'errorCount',
    'complexityScore',
    'implementationCompleteness',
]

app = FastAPI(title='ML Score Predictor')
_MODEL_CACHE: Optional[Tuple[object, List[str]]] = None


class Features(BaseModel):
    testPassRate: float = Field(..., ge=0, le=100)
    executionTime: Optional[float] = None
    codeLength: Optional[int] = 0
    codeCharCount: Optional[int] = 0
    errorCount: Optional[int] = 0
    complexityScore: Optional[float] = None
    implementationCompleteness: Optional[float] = 0
    codeQualityScore: Optional[float] = 0
    passedTestCases: Optional[int] = 0
    totalTestCases: Optional[int] = 0
    explanationClarity: Optional[float] = 0
    reasoningDepth: Optional[float] = 0
    structuredThinking: Optional[float] = 0
    approachRelevance: Optional[float] = 0
    explanationCompleteness: Optional[float] = 0
    explanationWordCount: Optional[int] = 0
    explanationScore: Optional[float] = 0
    hasMeaningfulCode: Optional[bool] = True
    hasExplanation: Optional[bool] = False


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return float(np.clip(value, low, high))


def feature_dict(data: Features) -> Dict:
    if hasattr(data, 'model_dump'):
        return data.model_dump()
    return data.dict()


def load_model():
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE

    if not os.path.exists(MODEL_PATH):
        return None, FEATURE_NAMES

    try:
        bundle = joblib.load(MODEL_PATH)
        if isinstance(bundle, dict) and 'model' in bundle:
            model = bundle['model']
            feature_names = bundle.get('feature_names') or FEATURE_NAMES
        else:
            model = bundle
            feature_names = LEGACY_FEATURE_NAMES
        _MODEL_CACHE = (model, feature_names)
        return _MODEL_CACHE
    except Exception:
        return None, FEATURE_NAMES


def efficiency_score(exec_time: Optional[float]) -> float:
    if exec_time is None or exec_time < 0:
        return 50.0

    min_t, max_t = 10.0, 2000.0
    norm = 1 - (min(max(exec_time, min_t), max_t) - min_t) / (max_t - min_t)
    return float(np.round(norm * 100, 2))


def derived_code_quality(features: Dict) -> float:
    supplied = float(features.get('codeQualityScore') or 0)
    if supplied > 0:
        return clamp(supplied)

    code_len = float(features.get('codeLength') or 0)
    code_chars = float(features.get('codeCharCount') or 0)
    complexity = float(features.get('complexityScore') or 50)
    completeness = float(features.get('implementationCompleteness') or 0)
    has_meaningful = bool(features.get('hasMeaningfulCode', True))

    if not has_meaningful or completeness <= 0:
        return 0.0

    length_basis = code_chars if code_chars > 0 else code_len * 20
    avg_line_length = length_basis / max(code_len, 1)
    length_score = 100.0 if length_basis <= 120 else max(20.0, 100 - ((length_basis - 120) / 14))
    readability_score = 100.0 if avg_line_length <= 80 else max(30.0, 100 - ((avg_line_length - 80) * 1.5))
    structure_score = (length_score * 0.35) + (readability_score * 0.25) + ((100 - complexity) * 0.40)
    best_practices = clamp(((100 - (float(features.get('errorCount') or 0) * 12)) * 0.6) + ((100 - complexity) * 0.4))
    return clamp(((structure_score * 0.55) + (best_practices * 0.45)) * (completeness / 100.0))


def derived_explanation_score(features: Dict) -> float:
    if not bool(features.get('hasExplanation', False)):
        return 0.0

    supplied = float(features.get('explanationScore') or 0)
    if supplied > 0:
        return clamp(supplied)

    return clamp(
        float(features.get('explanationClarity') or 0) * 0.25
        + float(features.get('reasoningDepth') or 0) * 0.25
        + float(features.get('structuredThinking') or 0) * 0.20
        + float(features.get('approachRelevance') or 0) * 0.20
        + float(features.get('explanationCompleteness') or 0) * 0.10
    )


def deterministic_fallback(features: Dict) -> float:
    test = clamp(float(features.get('testPassRate') or 0))
    efficiency = efficiency_score(features.get('executionTime'))
    code_quality = derived_code_quality(features)
    explanation = derived_explanation_score(features)
    has_meaningful = bool(features.get('hasMeaningfulCode', True))
    has_explanation = bool(features.get('hasExplanation', False))
    error_count = float(features.get('errorCount') or 0)

    if not has_meaningful:
        code_score = 0.0
    elif test >= 100:
        code_score = 100.0
    elif test >= 80:
        code_score = (test * 0.70) + (code_quality * 0.25) + (efficiency * 0.05)
    elif test >= 60:
        code_score = (test * 0.75) + (code_quality * 0.20) + (efficiency * 0.05)
    else:
        code_score = (test * 0.80) + (code_quality * 0.15) + (efficiency * 0.05)

    if has_meaningful and test < 100:
        code_score -= error_count * 2
        if test == 0:
            code_score = min(code_score - 10, 15)
        if test < 30:
            code_score = min(code_score, 25)

    code_score = clamp(code_score)

    if has_meaningful and has_explanation:
        final_score = (code_score * 0.85) + (explanation * 0.15)
    elif has_meaningful:
        final_score = code_score
    elif has_explanation:
        final_score = explanation
    else:
        final_score = 0.0

    return float(np.round(clamp(final_score), 2))


def feature_array(data: Features, feature_names: List[str]) -> np.ndarray:
    values = feature_dict(data)
    values['executionTime'] = data.executionTime if data.executionTime is not None else -1
    values['complexityScore'] = data.complexityScore if data.complexityScore is not None else 50
    values['hasMeaningfulCode'] = 1.0 if data.hasMeaningfulCode else 0.0
    values['hasExplanation'] = 1.0 if data.hasExplanation else 0.0

    return np.array([[float(values.get(name) or 0) for name in feature_names]], dtype=float)


@app.get('/health')
def health():
    model, feature_names = load_model()
    return {
        'status': 'ok',
        'modelLoaded': model is not None,
        'featureCount': len(feature_names),
    }


@app.post('/predict')
def predict(payload: Dict):
    # Accept either {'features': {...}} or raw features object
    if 'features' in payload and isinstance(payload['features'], dict):
        features = payload['features']
    else:
        features = payload

    try:
        data = Features(**features)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Invalid features payload: {e}')

    model, feature_names = load_model()
    fallback = deterministic_fallback(feature_dict(data))

    if model is None:
        return {'predictedScore': fallback, 'usedModel': False}

    try:
        pred_raw = model.predict(feature_array(data, feature_names))
        pred = float(np.round(pred_raw[0], 2))

        if not data.hasMeaningfulCode and not data.hasExplanation:
            pred = 0.0
        else:
            pred = float(np.round((pred * 0.55) + (fallback * 0.45), 2))

        if data.testPassRate >= 100 and data.hasMeaningfulCode and not data.hasExplanation:
            pred = 100.0

        pred = float(np.clip(pred, 0.0, 100.0))
        return {'predictedScore': pred, 'usedModel': True}
    except Exception as e:
        return {'predictedScore': fallback, 'usedModel': False, 'error': str(e)}
