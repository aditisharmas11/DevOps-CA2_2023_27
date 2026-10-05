"""Feature definitions shared by the training script and the API.

These mirror the column groups used in `main copy.ipynb`, so the service
expects exactly the inputs the notebook model was built on.
"""

TARGET_COL = 'satisfaction'
ID_COLS = ['Unnamed: 0', 'id']
DROPPED_COLS = ['Arrival Delay in Minutes']   # ~0.97 correlated with departure delay

CATEGORICAL_COLS = ['Gender', 'Customer Type', 'Type of Travel', 'Class']
RATING_COLS = ['Inflight wifi service', 'Departure/Arrival time convenient', 'Ease of Online booking',
               'Gate location', 'Food and drink', 'Online boarding', 'Seat comfort',
               'Inflight entertainment', 'On-board service', 'Leg room service', 'Baggage handling',
               'Checkin service', 'Inflight service', 'Cleanliness']
LOG_COLS = ['Flight Distance', 'Departure Delay in Minutes']   # strongly right-skewed
PLAIN_COLS = ['Age']

FEATURE_COLS = CATEGORICAL_COLS + PLAIN_COLS + LOG_COLS + RATING_COLS

# Best XGBoost parameters found by RandomizedSearchCV in the notebook (CV ROC-AUC 0.9946)
XGB_BEST_PARAMS = {
    'n_estimators': 200,
    'max_depth': 10,
    'learning_rate': 0.1,
    'subsample': 0.85,
    'colsample_bytree': 1.0,
    'min_child_weight': 5,
    'gamma': 0.5,
}
