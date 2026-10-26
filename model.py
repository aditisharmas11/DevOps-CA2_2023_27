import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

# Dataset
data = {
    "mood":    [80,70,30,20,50,60,85,40,65,55,75,45,35,25,90,60,72,48,38,28],
    "anxiety": [20,30,70,80,50,40,15,60,35,45,25,55,65,75,10,48,30,58,68,78],
    "social":  [75,65,40,30,55,60,80,45,70,50,68,52,38,28,85,62,73,49,36,26],
    "label": [
        "Good","Good","High Risk","High Risk","Moderate",
        "Moderate","Good","Moderate","Good","Moderate",
        "Good","Moderate","High Risk","High Risk","Good",
        "Moderate","Good","Moderate","High Risk","High Risk"
    ]
}

df = pd.DataFrame(data)

X = df[["mood", "anxiety", "social"]]
y = df["label"]

# Encode labels
le = LabelEncoder()
y = le.fit_transform(y)

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.4, random_state=42
)

# ===== Train multiple models =====
models = {
    "Logistic Regression": LogisticRegression(),
    "Decision Tree": DecisionTreeClassifier(),
    "Random Forest": RandomForestClassifier(),
    "KNN": KNeighborsClassifier()
}

results = {}
trained_models = {}

for name, m in models.items():
    m.fit(X_train, y_train)
    preds = m.predict(X_test)
    acc = accuracy_score(y_test, preds)

    results[name] = acc
    trained_models[name] = m

    print(f"{name} Accuracy: {acc:.2f}")

# ===== Comparison graph =====
plt.figure()
plt.bar(results.keys(), results.values())
plt.title("Model Comparison")
plt.ylabel("Accuracy")
plt.xticks(rotation=20)
plt.show()

# ===== Pick best model =====
best_model_name = max(results, key=results.get)
best_model = trained_models[best_model_name]

print("\nBest Model:", best_model_name)

# ===== Evaluate best model =====
y_pred = best_model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)
print("Final Accuracy:", accuracy)

print("\nClassification Report:\n")
print(classification_report(y_test, y_pred, target_names=le.classes_))

# ===== Confusion Matrix =====
cm = confusion_matrix(y_test, y_pred)

labels = le.classes_

sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=labels,
            yticklabels=labels)

plt.title(f"Confusion Matrix ({best_model_name})")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.show()

# ===== Save best model =====
joblib.dump(best_model, "model.pkl")
joblib.dump(le, "label_encoder.pkl")

print("Model saved successfully!")