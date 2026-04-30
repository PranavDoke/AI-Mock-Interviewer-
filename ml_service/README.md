# ML Score Prediction Service

This microservice provides a simple score prediction API for the evaluation pipeline. It uses a RandomForestRegressor trained on synthetic data as an initial model.

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
    "complexityScore": 30
  }
}
```

If no `model.joblib` exists, the service returns a deterministic fallback score.

Recommendation: For better, more consistent feedback and improved score prediction, train the model by running `python train_model.py` before running the service. When the model is present, the backend will combine deterministic scores with the ML prediction and include `mlUsed` and `mlPrediction` fields in evaluation results so you can see when the model influenced feedback.

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
