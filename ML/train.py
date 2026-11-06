"""
NexStep — Model Training & Evaluation Pipeline
Reproduces the NexStep model pipeline:
- TfidfVectorizer(max_features=200000)
- LogisticRegression(penalty='l2', solver='liblinear', class_weight='balanced', max_iter=1000)
- Target Classes: ['Good Fit', 'No Fit', 'Potential Fit']

Loads training dataset from ML/data/, performs stratified 80/20 split, trains,
evaluates, saves metrics/plots, and exports artifacts to Backend/.
"""

import os
import sys
import json
import glob
import argparse
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Optional plotting with matplotlib
try:
    import matplotlib
    matplotlib.use("Agg")  # Non-interactive headless backend
    import matplotlib.pyplot as plt
    from sklearn.metrics import ConfusionMatrixDisplay
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

# Base directories
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DEFAULT_DATA_DIR = os.path.join(SCRIPT_DIR, "data")
BACKEND_DIR = os.path.join(PROJECT_ROOT, "Backend")

# Canonical class names
TARGET_CLASSES = ["Good Fit", "No Fit", "Potential Fit"]


def find_dataset_csv(data_arg: str = None) -> str:
    """
    Locates the dataset CSV file from the argument or scans ML/data/.
    """
    if data_arg and os.path.isfile(data_arg):
        return os.path.abspath(data_arg)

    if not os.path.exists(DEFAULT_DATA_DIR):
        os.makedirs(DEFAULT_DATA_DIR, exist_ok=True)

    # Search for common filenames first
    for candidate in ["dataset.csv", "train.csv", "training_data.csv", "resumes.csv"]:
        path = os.path.join(DEFAULT_DATA_DIR, candidate)
        if os.path.isfile(path):
            return path

    # Scan for any CSV in ML/data/
    csv_files = glob.glob(os.path.join(DEFAULT_DATA_DIR, "*.csv"))
    if csv_files:
        return csv_files[0]

    raise FileNotFoundError(
        f"No training CSV found in '{DEFAULT_DATA_DIR}'.\n"
        f"Please place your dataset CSV (with columns: 'resume_text', 'job_description', 'label') "
        f"into '{DEFAULT_DATA_DIR}' (e.g. 'ML/data/dataset.csv') or specify with --data <path>."
    )


def load_and_validate_data(csv_path: str) -> pd.DataFrame:
    """
    Loads dataset and verifies presence of required columns and valid labels.
    """
    print(f"[1/6] Loading training dataset from: {csv_path}")
    df = pd.read_csv(csv_path)

    required_cols = {"resume_text", "job_description", "label"}
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        raise ValueError(
            f"Dataset is missing required columns: {missing_cols}.\n"
            f"Found columns: {list(df.columns)}. Expected: {list(required_cols)}"
        )

    initial_count = len(df)
    df = df.dropna(subset=["resume_text", "job_description", "label"])
    df["resume_text"] = df["resume_text"].astype(str).str.strip()
    df["job_description"] = df["job_description"].astype(str).str.strip()
    df["label"] = df["label"].astype(str).str.strip()

    # Drop empty strings
    df = df[(df["resume_text"] != "") & (df["job_description"] != "") & (df["label"] != "")]

    if len(df) == 0:
        raise ValueError(f"Dataset in '{csv_path}' contains 0 valid, non-empty records.")

    dropped = initial_count - len(df)
    if dropped > 0:
        print(f"      Dropped {dropped} invalid/empty rows. Remaining rows: {len(df)}")
    else:
        print(f"      Loaded {len(df)} valid records.")

    # Check class distributions
    class_counts = df["label"].value_counts().to_dict()
    print(f"      Class distribution: {class_counts}")

    unrecognized = set(df["label"].unique()) - set(TARGET_CLASSES)
    if unrecognized:
        print(f"      [Warning] Found unrecognized classes in dataset: {unrecognized}. Target classes are: {TARGET_CLASSES}")

    return df


def train_model(df: pd.DataFrame, random_state: int = 42):
    """
    Executes TF-IDF feature extraction, stratified split, and Logistic Regression training.
    """
    print("\n[2/6] Preparing text features and stratified 80/20 train/test split...")
    # Canonical input formatting matching Backend/app.py
    X = "RESUME: " + df["resume_text"] + " JOB DESCRIPTION: " + df["job_description"]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=random_state,
        stratify=y
    )
    print(f"      Training samples: {len(X_train)} (80%)")
    print(f"      Testing samples:  {len(X_test)} (20%)")

    print("\n[3/6] Fitting TfidfVectorizer (max_features=200,000)...")
    tfidf = TfidfVectorizer(max_features=200000)
    X_train_vec = tfidf.fit_transform(X_train)
    X_test_vec = tfidf.transform(X_test)
    print(f"      Vocabulary size:  {len(tfidf.vocabulary_)} features")

    print("\n[4/6] Training LogisticRegression (penalty='l2', solver='liblinear', class_weight='balanced', max_iter=1000)...")
    model = LogisticRegression(
        penalty="l2",
        solver="liblinear",
        class_weight="balanced",
        max_iter=1000,
        random_state=random_state
    )
    model.fit(X_train_vec, y_train)
    print(f"      Fitted model classes: {model.classes_}")

    return tfidf, model, X_test, X_test_vec, y_test


def evaluate_model(model, X_test_vec, y_test):
    """
    Evaluates trained model on the test split and computes metrics.
    """
    print("\n[5/6] Evaluating model performance on test split...")
    y_pred = model.predict(X_test_vec)
    classes = list(model.classes_)

    acc = accuracy_score(y_test, y_pred)
    report_dict = classification_report(y_test, y_pred, target_names=classes, output_dict=True)
    report_text = classification_report(y_test, y_pred, target_names=classes, digits=4)
    cm = confusion_matrix(y_test, y_pred, labels=classes)

    print("\n=======================================================")
    print(f" Overall Accuracy: {acc * 100:.2f}%")
    print("=======================================================")
    print("\nClassification Report:")
    print(report_text)
    print("Confusion Matrix:")
    print(f"Labels: {classes}")
    print(cm)
    print("=======================================================\n")

    return acc, report_dict, cm, classes


def save_artifacts(tfidf, model, classes, acc, report_dict, cm, total_samples, train_count, test_count):
    """
    Saves metrics JSON, confusion matrix PNG, and serialized model files to Backend/.
    """
    print("[6/6] Saving evaluation metrics and model artifacts...")

    # 1. Save ML/metrics.json
    metrics_path = os.path.join(SCRIPT_DIR, "metrics.json")
    metrics_data = {
        "accuracy": round(float(acc), 4),
        "total_samples": int(total_samples),
        "train_samples": int(train_count),
        "test_samples": int(test_count),
        "vocabulary_size": int(len(tfidf.vocabulary_)),
        "classes": list(classes),
        "confusion_matrix": cm.tolist(),
        "classification_report": report_dict
    }
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"      Saved metrics to: {metrics_path}")

    # 2. Save ML/confusion_matrix.png
    cm_path = os.path.join(SCRIPT_DIR, "confusion_matrix.png")
    if HAS_MATPLOTLIB:
        plt.figure(figsize=(7, 6))
        disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=classes)
        disp.plot(cmap="Blues", values_format="d", ax=plt.gca(), colorbar=False)
        plt.title("NexStep Match Model — Confusion Matrix", fontsize=12, fontweight="bold", pad=12)
        plt.tight_layout()
        plt.savefig(cm_path, dpi=300)
        plt.close()
        print(f"      Saved confusion matrix plot to: {cm_path}")
    else:
        print("      [Warning] matplotlib not installed; skipped confusion_matrix.png plot generation.")

    # 3. Save Backend/ model artifacts using current exact filenames
    os.makedirs(BACKEND_DIR, exist_ok=True)
    model_path = os.path.join(BACKEND_DIR, "nexstep_model.pkl")
    tfidf_path = os.path.join(BACKEND_DIR, "nexstep_tfidf.pkl")
    classes_path = os.path.join(BACKEND_DIR, "nexstep_classes.pkl")

    joblib.dump(model, model_path)
    joblib.dump(tfidf, tfidf_path)
    joblib.dump(classes, classes_path)

    print(f"      Saved model to:     {model_path}")
    print(f"      Saved vectorizer to: {tfidf_path}")
    print(f"      Saved classes to:    {classes_path}")
    print("\nTraining and artifact serialization complete successfully!")


def main():
    parser = argparse.ArgumentParser(description="Train and evaluate the NexStep resume matching model pipeline.")
    parser.add_argument("--data", type=str, default=None, help="Path to custom training dataset CSV file.")
    parser.add_argument("--random-state", type=int, default=42, help="Random state seed for reproducible split.")
    args = parser.parse_args()

    csv_path = find_dataset_csv(args.data)
    df = load_and_validate_data(csv_path)

    tfidf, model, X_test, X_test_vec, y_test = train_model(df, random_state=args.random_state)
    acc, report_dict, cm, classes = evaluate_model(model, X_test_vec, y_test)

    save_artifacts(
        tfidf=tfidf,
        model=model,
        classes=classes,
        acc=acc,
        report_dict=report_dict,
        cm=cm,
        total_samples=len(df),
        train_count=len(df) - len(y_test),
        test_count=len(y_test)
    )


if __name__ == "__main__":
    main()
