"""
Train a simple RandomForestRegressor on synthetic data and save the model.
Run: python train_model.py
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
import joblib
import os

OUT = os.path.join(os.path.dirname(__file__), 'model.joblib')


def generate_synthetic(n=2000, random_state=42):
    rng = np.random.RandomState(random_state)
    testPassRate = rng.uniform(0, 100, size=n)
    executionTime = rng.exponential(scale=300, size=n)  # skewed
    codeLength = rng.poisson(lam=80, size=n)
    errorCount = rng.binomial(3, 0.1, size=n)
    complexityScore = rng.uniform(10, 90, size=n)

    # Construct a target roughly following deterministic formula + noise
    lengthScore = np.where(codeLength <= 50, 100, np.maximum(20, 100 - ((codeLength - 50) / 5)))
    codeQuality = (lengthScore * 0.6) + ((100 - complexityScore) * 0.4)

    efficiency = 1 - (np.minimum(np.maximum(executionTime, 10), 2000) - 10) / (2000 - 10)
    efficiency = np.clip(efficiency * 100, 0, 100)

    raw = (testPassRate * 0.7) + (efficiency * 0.2) + (codeQuality * 0.1) - (errorCount * 2)
    noise = rng.normal(0, 5, size=n)
    target = np.clip(raw + noise, 0, 100)

    df = pd.DataFrame({
        'testPassRate': testPassRate,
        'executionTime': executionTime,
        'codeLength': codeLength,
        'errorCount': errorCount,
        'complexityScore': complexityScore,
        'score': target,
    })
    return df


def train_and_save(out_path=OUT):
    print('Generating synthetic data...')
    df = generate_synthetic()
    X = df[['testPassRate', 'executionTime', 'codeLength', 'errorCount', 'complexityScore']].values
    y = df['score'].values

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

    print('Training RandomForestRegressor...')
    model = RandomForestRegressor(n_estimators=150, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_val)
    mse = mean_squared_error(y_val, preds)
    print(f'Validation MSE: {mse:.3f}')

    joblib.dump(model, out_path)
    print(f'Model saved to {out_path}')


if __name__ == '__main__':
    train_and_save()
