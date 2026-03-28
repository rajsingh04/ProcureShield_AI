"""
Report generation utilities.
This file will contain the logic for Excel export and matplotlib chart generation
if it is decoupled from the main pipeline.py file in the future.
"""
import io
import pandas as pd
import matplotlib.pyplot as plt

def generate_risk_chart(df_inv: pd.DataFrame) -> bytes:
    """Generates a PNG chart of risk_score distribution and returns raw bytes."""
    plt.figure(figsize=(8, 4))
    plt.hist(df_inv['risk_score'], bins=25, color='#2c3e50', edgecolor='white', alpha=0.85)
    plt.axvline(40, color='orange', linestyle='--', linewidth=2)
    plt.axvline(70, color='red', linestyle='--', linewidth=2)
    plt.title('Risk Score Distribution', fontweight='bold')
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=120, bbox_inches='tight')
    plt.close()
    buf.seek(0)
    data = buf.read()
    buf.close()
    return data
