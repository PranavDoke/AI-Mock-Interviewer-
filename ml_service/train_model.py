"""
Train the scoring model used by ml_service/app.py.

The project does not include a labeled real-submission dataset, so this script
creates a broad synthetic training set from the same rubric used at runtime:
test correctness dominates, code quality calibrates mostly-correct answers, and
explanation/approach quality contributes when an explanation is submitted.
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split, cross_val_score

OUT = os.path.join(os.path.dirname(__file__), 'model.joblib')
DEFAULT_QUESTION_BANKS = [
    os.path.abspath(os.path.join(
        os.path.dirname(__file__),
        '..',
        'server',
        'src',
        'data',
        'ai-mock-interviewer-all-unique-questions.json',
    )),
]

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


def load_question_profiles():
    raw_paths = os.environ.get('QUESTION_BANK_PATH')
    if raw_paths:
        paths = [p for chunk in raw_paths.split(os.pathsep) for p in chunk.split(';') if p.strip()]
    else:
        paths = DEFAULT_QUESTION_BANKS

    profiles = []
    seen_titles = set()
    for path in paths:
        path = path.strip()
        if not path or not os.path.exists(path):
            continue

        try:
            with open(path, 'r', encoding='utf-8') as fh:
                payload = json.load(fh)
        except Exception:
            continue

        if not isinstance(payload, list):
            continue

        for item in payload:
            if not isinstance(item, dict):
                continue
            title = str(item.get('title') or '').strip()
            if not title or title in seen_titles:
                continue
            seen_titles.add(title)
            tests = item.get('testCases') if isinstance(item.get('testCases'), list) else []
            profiles.append({
                'title': title,
                'difficulty': int(item.get('difficulty') or 3),
                'test_count': max(1, len(tests)),
                'topic': str(item.get('topic') or '').strip(),
            })
    return profiles


def clamp(values, low=0, high=100):
    return np.clip(values, low, high)


def efficiency_score(execution_time):
    min_t, max_t = 10.0, 2000.0
    normalized = 1 - (np.minimum(np.maximum(execution_time, min_t), max_t) - min_t) / (max_t - min_t)
    return clamp(normalized * 100)


def code_quality_score(code_length, code_chars, complexity, completeness, error_count, has_meaningful):
    length_basis = np.where(code_chars > 0, code_chars, code_length * 20)
    avg_line_length = length_basis / np.maximum(code_length, 1)
    length_score = np.where(length_basis <= 120, 100, np.maximum(20, 100 - ((length_basis - 120) / 14)))
    readability_score = np.where(avg_line_length <= 80, 100, np.maximum(30, 100 - ((avg_line_length - 80) * 1.5)))
    structure_score = (length_score * 0.35) + (readability_score * 0.25) + ((100 - complexity) * 0.40)
    best_practices = clamp(((100 - (error_count * 12)) * 0.6) + ((100 - complexity) * 0.4))
    quality = ((structure_score * 0.55) + (best_practices * 0.45)) * (completeness / 100.0)
    return np.where(has_meaningful, clamp(quality), 0)


def explanation_score(clarity, reasoning, structured, relevance, completeness, has_explanation):
    score = (
        clarity * 0.25
        + reasoning * 0.25
        + structured * 0.20
        + relevance * 0.20
        + completeness * 0.10
    )
    return np.where(has_explanation, clamp(score), 0)


def target_score(df):
    test = df['testPassRate'].to_numpy()
    efficiency = efficiency_score(df['executionTime'].to_numpy())
    quality = df['codeQualityScore'].to_numpy()
    explanation = explanation_score(
        df['explanationClarity'].to_numpy(),
        df['reasoningDepth'].to_numpy(),
        df['structuredThinking'].to_numpy(),
        df['approachRelevance'].to_numpy(),
        df['explanationCompleteness'].to_numpy(),
        df['hasExplanation'].to_numpy().astype(bool),
    )
    errors = df['errorCount'].to_numpy()
    has_code = df['hasMeaningfulCode'].to_numpy().astype(bool)
    has_explanation = df['hasExplanation'].to_numpy().astype(bool)

    code_score = np.zeros(len(df))
    perfect = (test >= 100) & has_code
    high = (test >= 80) & (test < 100) & has_code
    medium = (test >= 60) & (test < 80) & has_code
    low = (test < 60) & has_code

    code_score[perfect] = 100
    code_score[high] = (test[high] * 0.70) + (quality[high] * 0.25) + (efficiency[high] * 0.05)
    code_score[medium] = (test[medium] * 0.75) + (quality[medium] * 0.20) + (efficiency[medium] * 0.05)
    code_score[low] = (test[low] * 0.80) + (quality[low] * 0.15) + (efficiency[low] * 0.05)

    non_perfect_code = has_code & (test < 100)
    code_score[non_perfect_code] -= errors[non_perfect_code] * 2
    zero_pass = has_code & (test == 0)
    code_score[zero_pass] = np.minimum(code_score[zero_pass] - 10, 15)
    weak_correctness = has_code & (test < 30)
    code_score[weak_correctness] = np.minimum(code_score[weak_correctness], 25)
    code_score = clamp(code_score)

    final = np.zeros(len(df))
    both = has_code & has_explanation
    code_only = has_code & ~has_explanation
    explanation_only = ~has_code & has_explanation
    final[both] = (code_score[both] * 0.85) + (explanation[both] * 0.15)
    final[code_only] = code_score[code_only]
    final[explanation_only] = explanation[explanation_only]
    return clamp(final)


def generate_synthetic(n=12000, random_state=42, question_profiles=None):
    rng = np.random.RandomState(random_state)

    has_meaningful_code = rng.uniform(0, 1, size=n) > 0.10
    has_explanation = rng.uniform(0, 1, size=n) < 0.62

    question_profiles = question_profiles or []
    if question_profiles:
        profile_idx = rng.randint(0, len(question_profiles), size=n)
        profile_test_counts = np.array([max(3, int(p.get('test_count') or 1) + 2) for p in question_profiles])
        profile_difficulties = np.array([int(p.get('difficulty') or 3) for p in question_profiles])
        total_test_cases = profile_test_counts[profile_idx]
        difficulty_adjustment = (profile_difficulties[profile_idx] - 3) * 0.04
    else:
        total_test_cases = rng.randint(3, 13, size=n)
        difficulty_adjustment = 0

    correctness_profile = rng.beta(2.2, 1.9, size=n)
    correctness_profile = clamp(correctness_profile - difficulty_adjustment, 0, 1)
    exact_perfect = rng.uniform(0, 1, size=n) < 0.16
    exact_zero = rng.uniform(0, 1, size=n) < 0.10
    correctness_profile = np.where(exact_perfect, 1.0, correctness_profile)
    correctness_profile = np.where(exact_zero, 0.0, correctness_profile)
    correctness_profile = np.where(has_meaningful_code, correctness_profile, 0.0)
    passed_test_cases = np.rint(correctness_profile * total_test_cases).astype(int)
    test_pass_rate = np.round((passed_test_cases / total_test_cases) * 100, 2)

    execution_time = clamp(rng.lognormal(mean=5.35, sigma=0.85, size=n), 5, 2500)
    code_length = np.maximum(0, rng.poisson(lam=14 + correctness_profile * 8, size=n))
    code_char_count = np.maximum(0, rng.normal(loc=code_length * 34, scale=70, size=n)).astype(int)
    complexity_score = clamp(rng.normal(loc=42 + (code_length * 0.9), scale=18, size=n), 5, 100)
    error_count = rng.binomial(4, np.clip(0.35 - (correctness_profile * 0.28), 0.03, 0.35), size=n)

    completeness_noise = rng.normal(0, 12, size=n)
    implementation_completeness = clamp((correctness_profile * 72) + 22 + completeness_noise)
    starter_mask = ~has_meaningful_code
    implementation_completeness[starter_mask] = rng.uniform(0, 5, size=starter_mask.sum())
    code_length[starter_mask] = rng.randint(0, 2, size=starter_mask.sum())
    code_char_count[starter_mask] = rng.randint(0, 45, size=starter_mask.sum())
    complexity_score[starter_mask] = rng.uniform(5, 20, size=starter_mask.sum())
    error_count[starter_mask] = rng.binomial(2, 0.35, size=starter_mask.sum())

    approach_latent = clamp((correctness_profile * 65) + rng.normal(20, 18, size=n))
    explanation_word_count = np.where(
        has_explanation,
        np.maximum(5, rng.normal(loc=45 + approach_latent * 0.8, scale=30, size=n)).astype(int),
        0,
    )
    explanation_clarity = np.where(has_explanation, clamp(approach_latent + rng.normal(5, 15, size=n)), 0)
    reasoning_depth = np.where(has_explanation, clamp(approach_latent + rng.normal(0, 18, size=n)), 0)
    structured_thinking = np.where(has_explanation, clamp(approach_latent + rng.normal(4, 17, size=n)), 0)
    approach_relevance = np.where(has_explanation, clamp(approach_latent + rng.normal(8, 16, size=n)), 0)
    explanation_completeness = np.where(
        has_explanation,
        clamp(
            explanation_clarity * 0.25
            + reasoning_depth * 0.25
            + structured_thinking * 0.20
            + approach_relevance * 0.30
            + rng.normal(0, 5, size=n)
        ),
        0,
    )

    code_quality = code_quality_score(
        code_length,
        code_char_count,
        complexity_score,
        implementation_completeness,
        error_count,
        has_meaningful_code,
    )

    df = pd.DataFrame({
        'testPassRate': test_pass_rate,
        'executionTime': execution_time,
        'codeLength': code_length,
        'codeCharCount': code_char_count,
        'errorCount': error_count,
        'complexityScore': complexity_score,
        'implementationCompleteness': implementation_completeness,
        'codeQualityScore': code_quality,
        'passedTestCases': passed_test_cases,
        'totalTestCases': total_test_cases,
        'explanationClarity': explanation_clarity,
        'reasoningDepth': reasoning_depth,
        'structuredThinking': structured_thinking,
        'approachRelevance': approach_relevance,
        'explanationCompleteness': explanation_completeness,
        'explanationWordCount': explanation_word_count,
        'hasMeaningfulCode': has_meaningful_code.astype(int),
        'hasExplanation': has_explanation.astype(int),
    })
    df['score'] = target_score(df)
    return df


def train_and_save(out_path=OUT):
    print('=' * 72)
    print('Generating synthetic training data aligned with runtime scoring...')
    print('=' * 72)
    question_profiles = load_question_profiles()
    if question_profiles:
      print(f'Loaded {len(question_profiles)} question profiles for training calibration.')
    else:
      print('No question-bank profile file found; using general rubric-only calibration.')
    df = generate_synthetic(question_profiles=question_profiles)

    X = df[FEATURE_NAMES].to_numpy(dtype=float)
    y = df['score'].to_numpy(dtype=float)
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(
        n_estimators=260,
        max_depth=18,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_val)
    metrics = {
        'mse': float(mean_squared_error(y_val, y_pred)),
        'mae': float(mean_absolute_error(y_val, y_pred)),
        'r2': float(r2_score(y_val, y_pred)),
    }

    print('\nValidation Metrics')
    print(f"  MSE: {metrics['mse']:.3f}")
    print(f"  MAE: {metrics['mae']:.3f}")
    print(f"  R2 : {metrics['r2']:.4f}")

    print('\nPer-Range MAE')
    for low, high in [(0, 25), (25, 50), (50, 75), (75, 100.1)]:
        mask = (y_val >= low) & (y_val < high)
        if mask.any():
            print(f'  {low:>5.1f}-{high:>5.1f}: {mean_absolute_error(y_val[mask], y_pred[mask]):.2f} (n={mask.sum()})')

    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='neg_mean_absolute_error')
    print('\n5-Fold Cross-Validation')
    print(f'  Mean MAE: {-cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})')

    print('\nFeature Importance')
    for name, importance in sorted(zip(FEATURE_NAMES, model.feature_importances_), key=lambda item: item[1], reverse=True):
        print(f'  {name:28s}: {importance:.4f}')

    bundle = {
        'model': model,
        'feature_names': FEATURE_NAMES,
        'metrics': metrics,
        'target': 'submission_score_0_100',
        'version': 2,
        'question_profile_count': len(question_profiles),
        'question_titles': [p['title'] for p in question_profiles if p.get('title')],
    }
    joblib.dump(bundle, out_path)
    print(f'\nModel saved to {out_path}')
    print('=' * 72)


if __name__ == '__main__':
    train_and_save()
