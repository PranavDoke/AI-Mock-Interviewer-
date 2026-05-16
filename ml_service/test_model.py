"""Smoke-test the trained ML scoring model."""
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


def predict_case(name, features):
    data = Features(**features)
    raw = float(model.predict(feature_array(data, feature_names))[0])
    fallback = deterministic_fallback(feature_dict(data))
    final = (raw * 0.55) + (fallback * 0.45)
    if data.testPassRate >= 100 and data.hasMeaningfulCode and not data.hasExplanation:
        final = 100.0

    print('\n' + '=' * 72)
    print(name)
    print(f'  Raw model prediction : {raw:.2f}')
    print(f'  Runtime fallback     : {fallback:.2f}')
    print(f'  Final service score  : {final:.2f}/100')


predict_case('Perfect code-only solution', {
    'testPassRate': 100,
    'executionTime': 45,
    'codeLength': 12,
    'codeCharCount': 420,
    'errorCount': 0,
    'complexityScore': 32,
    'implementationCompleteness': 100,
    'codeQualityScore': 86,
    'passedTestCases': 8,
    'totalTestCases': 8,
    'hasMeaningfulCode': True,
    'hasExplanation': False,
})

predict_case('Good code with clear explanation', {
    'testPassRate': 88,
    'executionTime': 120,
    'codeLength': 16,
    'codeCharCount': 520,
    'errorCount': 1,
    'complexityScore': 45,
    'implementationCompleteness': 88,
    'codeQualityScore': 78,
    'passedTestCases': 7,
    'totalTestCases': 8,
    'explanationClarity': 82,
    'reasoningDepth': 76,
    'structuredThinking': 80,
    'approachRelevance': 84,
    'explanationCompleteness': 81,
    'explanationWordCount': 95,
    'hasMeaningfulCode': True,
    'hasExplanation': True,
})

predict_case('Starter template with weak explanation', {
    'testPassRate': 0,
    'executionTime': 20,
    'codeLength': 1,
    'codeCharCount': 24,
    'errorCount': 1,
    'complexityScore': 8,
    'implementationCompleteness': 2,
    'codeQualityScore': 0,
    'passedTestCases': 0,
    'totalTestCases': 6,
    'explanationClarity': 25,
    'reasoningDepth': 10,
    'structuredThinking': 20,
    'approachRelevance': 8,
    'explanationCompleteness': 15,
    'explanationWordCount': 18,
    'hasMeaningfulCode': False,
    'hasExplanation': True,
})

print('\n' + '=' * 72)
print('Model smoke test completed.')
