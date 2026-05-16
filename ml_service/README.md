# ML Score Prediction Service

This microservice provides a score prediction API for the evaluation pipeline. It uses a RandomForestRegressor trained on rubric-aligned synthetic submission data because the project does not include a labeled real-submission dataset.

Quick start (local):

1. Create a Python env and install dependencies

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

2. Train model

```bash
python train_model.py
```

This creates `model.joblib` in the `ml_service` folder.

3. Run the service

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

4. Predict

POST to `http://localhost:8000/predict` with JSON body `{ "features": { ... } }`.

Example payload:

```json
{
  "features": {
    "testPassRate": 80,
    "executionTime": 150,
    "codeLength": 80,
    "errorCount": 0,
    "complexityScore": 30,
    "implementationCompleteness": 90,
    "codeQualityScore": 82,
    "passedTestCases": 4,
    "totalTestCases": 5,
    "explanationClarity": 75,
    "reasoningDepth": 70,
    "structuredThinking": 72,
    "approachRelevance": 78,
    "explanationCompleteness": 74,
    "hasMeaningfulCode": true,
    "hasExplanation": true
  }
}
```

If no `model.joblib` exists, the service returns a deterministic fallback score.

Recommendation: train the model by running `python train_model.py` before running the service. When the model is present, the backend combines deterministic execution/static-analysis scores with the ML prediction and includes `mlUsed` and `mlPrediction` in evaluation results so you can see when the model influenced feedback.

## CI-Based Model Strategy (Recommended)

Do not commit `model.joblib` to git. Use CI to train and publish it as an artifact.

1. Trigger GitHub Action: `ML Model Train`
2. Download artifact: `ml-model-joblib`
3. Place `model.joblib` in `ml_service/` at deploy/runtime

The workflow file is located at `.github/workflows/ml-model-train.yml`.

For API validation, run the smoke workflow `.github/workflows/ml-model-smoke.yml`, which starts FastAPI in CI and validates `POST /predict` end-to-end.

For backend integration, set:

```bash
ML_SERVICE_URL=http://localhost:8000/predict
```
