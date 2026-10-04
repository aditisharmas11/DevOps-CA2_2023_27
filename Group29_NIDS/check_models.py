import joblib
m = joblib.load("ml/ids_xgboost_model.joblib")
s = joblib.load("ml/ids_scaler.joblib")
e = joblib.load("ml/ids_categorical_encoders.joblib")
t = joblib.load("ml/ids_target_encoder.joblib")
print("model:", type(m).__name__)
print("scaler features:", getattr(s, "n_features_in_", None))
print("encoders:", type(e).__name__, list(e.keys()) if isinstance(e, dict) else e)
print("target classes:", list(t.classes_))