# NexStep — Machine Learning Pipeline & Training Guide

This directory contains the training pipeline that reproduces the NexStep machine learning classification model.

---

## 1. Model Pipeline Architecture

The NexStep model pipeline evaluates candidate resume text against job descriptions:
- **Feature Extraction:** `TfidfVectorizer(max_features=200000)`
- **Classifier:** `LogisticRegression(penalty='l2', solver='liblinear', class_weight='balanced', max_iter=1000)`
- **Input Text Format:** `"RESUME: " + resume_text + " JOB DESCRIPTION: " + job_description`
- **Target Classes:** `['Good Fit', 'No Fit', 'Potential Fit']`

---

## 2. Dataset Requirements (`ML/data/`)

Place your training CSV file in `ML/data/` (e.g. `ML/data/dataset.csv` or `ML/data/train.csv`). The CSV must contain the following 3 columns:

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `resume_text` | String | Extracted plain text content of the candidate's resume. |
| `job_description` | String | Plain text description of the target job posting / role requirements. |
| `label` | String | Ground-truth fit classification. Must be one of: `Good Fit`, `Potential Fit`, or `No Fit`. |

---

## 3. How to Run Training

Run the training pipeline from the project root using the virtual environment:

```powershell
.\.venv\Scripts\python.exe ML/train.py
```

### Optional Arguments
You can specify a custom dataset location or a custom random state seed:
```powershell
# Custom dataset path
.\.venv\Scripts\python.exe ML/train.py --data path/to/my_dataset.csv

# Custom random state seed (default is 42)
.\.venv\Scripts\python.exe ML/train.py --random-state 123
```

---

## 4. Generated Artifacts & Output Files

When training completes, the script automatically generates the following files:

1. **`Backend/nexstep_model.pkl`**: Serialized `LogisticRegression` model loaded by `Backend/app.py`.
2. **`Backend/nexstep_tfidf.pkl`**: Serialized `TfidfVectorizer` (200,000 features) loaded by `Backend/app.py`.
3. **`Backend/nexstep_classes.pkl`**: Serialized target class labels (`['Good Fit', 'No Fit', 'Potential Fit']`).
4. **`ML/confusion_matrix.png`**: High-resolution (300 DPI) visualization of the test split confusion matrix.
5. **`ML/metrics.json`**: Machine-readable JSON record containing exact accuracy, per-class precision, recall, f1-score, sample counts, and confusion matrix values.

---

## 5. How to Read the Metrics

### Overall Accuracy
- **Accuracy:** The percentage of test pairs that were classified correctly out of all test samples (`test_size=0.20`).

### Classification Report Metrics
- **Precision:** Of all pairs that the model classified as a specific class (e.g. `Good Fit`), what fraction was actually that class? Higher precision reduces false positives.
- **Recall (Sensitivity):** Of all actual samples belonging to a class, what fraction did the model successfully identify? Higher recall reduces missed opportunities.
- **F1-Score:** The harmonic mean of Precision and Recall (`2 * (Precision * Recall) / (Precision + Recall)`). Provides a balanced measurement, particularly for imbalanced datasets.
- **Support:** The number of actual test instances for each class in the 20% test split.

### Confusion Matrix (`confusion_matrix.png`)
The confusion matrix is a grid where:
- **Rows (Y-axis):** Represent the **True / Ground Truth** labels.
- **Columns (X-axis):** Represent the **Predicted** labels.
- **Diagonal Elements (Top-Left to Bottom-Right):** Represent correct predictions.
- **Off-Diagonal Elements:** Represent misclassifications (e.g., actual `Potential Fit` predicted as `No Fit`).
