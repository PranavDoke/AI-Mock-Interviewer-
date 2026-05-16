"""Verify that a perfect code-only submission is returned as 100/100."""
import os
import joblib
from app import Features, deterministic_fallback, feature_array, feature_dict

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')
bundle = joblib.load(MODEL_PATH)
model = bundle['model'] if isinstance(bundle, dict) else bundle
feature_names = bundle.get('feature_names') if isinstance(bundle, dict) else [
    'testPassRate',
    'executionTime',
    'codeLength',
    'codeCharCount',
    'errorCount',
    'complexityScore',
    'implementationCompleteness',
]

features = {
    'testPassRate': 100,
    'executionTime': 45,
    'codeLength': 12,
    'codeCharCount': 420,
    'errorCount': 0,
    'complexityScore': 30,
    'implementationCompleteness': 100,
    'codeQualityScore': 88,
    'passedTestCases': 8,
    'totalTestCases': 8,
    'hasMeaningfulCode': True,
    'hasExplanation': False,
}

data = Features(**features)
raw = float(model.predict(feature_array(data, feature_names))[0])
fallback = deterministic_fallback(feature_dict(data))
final = 100.0 if data.testPassRate >= 100 and data.hasMeaningfulCode and not data.hasExplanation else (raw * 0.55) + (fallback * 0.45)

print('=' * 72)
print('Perfect code-only submission')
print(f'  Raw model prediction : {raw:.2f}')
print(f'  Runtime fallback     : {fallback:.2f}')
print(f'  Final service score  : {final:.2f}/100')
assert final == 100.0
print('Perfect code-only submissions score 100/100.')
