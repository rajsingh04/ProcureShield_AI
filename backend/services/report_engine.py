"""
Report generation utilities.
This file will contain the logic for Excel export and matplotlib chart generation
if it is decoupled from the main pipeline.py file in the future.
"""
import os
import pandas as pd
import matplotlib.pyplot as plt

def generate_risk_chart(df_inv: pd.DataFrame, output_dir: str):
    plt.figure(figsize=(8, 4))
    plt.hist(df_inv['risk_score'], bins=25, color='#2c3e50', edgecolor='white', alpha=0.85)
    plt.axvline(40, color='orange', linestyle='--', linewidth=2)
    plt.axvline(70, color='red', linestyle='--', linewidth=2)
    plt.title('Risk Score Distribution', fontweight='bold')
    plt.tight_layout()
    chart_path = os.path.join(output_dir, 'risk_score_distribution.png')
    plt.savefig(chart_path, dpi=120, bbox_inches='tight')
    plt.close()
    return chart_path
