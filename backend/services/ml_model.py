"""
ML Model wrapper.
This file will contain the Random Forest Classifier loading, training, 
and inference logic if it is decoupled from the main pipeline.py file in the future.
"""
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

class InvoiceAnomalyModel:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.is_trained = False

    def train(self, X: pd.DataFrame, y: pd.Series):
        self.model.fit(X, y)
        self.is_trained = True

    def predict(self, X: pd.DataFrame):
        if not self.is_trained:
            raise ValueError("Model is not trained yet.")
        return self.model.predict(X)
