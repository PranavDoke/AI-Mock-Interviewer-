from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict
import joblib
import os
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')

app = FastAPI(title='ML Score Predictor')


class Features(BaseModel):
    testPassRate: float = Field(..., ge=0, le=100)
    executionTime: Optional[float] = None
    codeLength: Optional[int] = 0
    errorCount: Optional[int] = 0
    complexityScore: Optional[float] = None


def load_model():
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            return model
        except Exception:
            return None
    return None


def deterministic_fallback(features: Dict) -> float:
    # Simple deterministic formula similar to backend scoring
    test = float(features.get('testPassRate', 0))
    exec_time = features.get('executionTime')
    if exec_time is None:
        efficiency = 50.0
    else:
        min_t, max_t = 10.0, 2000.0
        norm = 1 - (min(max(exec_time, min_t), max_t) - min_t) / (max_t - min_t)
        efficiency = float(np.round(norm * 100, 2))
    code_len = float(features.get('codeLength', 0))
    complexity = float(features.get('complexityScore') or 50)
    length_score = 100.0 if code_len <= 50 else max(20.0, float(np.round(100 - ((code_len - 50) / 5), 2)))
    code_quality = float(np.round((length_score * 0.6) + ((100 - complexity) * 0.4), 2))

    raw = (test * 0.7) + (efficiency * 0.2) + (code_quality * 0.1)
    penalized = raw - (features.get('errorCount', 0) * 2)
    return float(np.clip(np.round(penalized, 2), 0, 100))


@app.get('/health')
def health():
    model = load_model()
    return {'status': 'ok', 'modelLoaded': model is not None}


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

    model = load_model()
    features_arr = np.array([[data.testPassRate, data.executionTime if data.executionTime is not None else -1, data.codeLength, data.errorCount, data.complexityScore if data.complexityScore is not None else 50]])

    if model is None:
        # Return deterministic fallback if model missing
        pred = deterministic_fallback(features)
        return {'predictedScore': pred, 'usedModel': False}

    try:
        pred_raw = model.predict(features_arr)
        pred = float(np.round(pred_raw[0], 2))
        pred = float(np.clip(pred, 0.0, 100.0))
        return {'predictedScore': pred, 'usedModel': True}
    except Exception as e:
        # Fall back gracefully
        pred = deterministic_fallback(features)
        return {'predictedScore': pred, 'usedModel': False, 'error': str(e)}
