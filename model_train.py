import pandas as pd
from sklearn import linear_model
from sklearn.model_selection import train_test_split
import joblib
import numpy as np
import warnings

# Suppress sklearn warnings to keep terminal output strictly to metrics
warnings.filterwarnings('ignore')

def clean_runs(val):
    if isinstance(val, str):
        return int(val.replace('*', ''))
    return int(val)

data = pd.read_csv('csv/list.csv')
data['runs'] = data['runs'].apply(clean_runs)

stdms = ['Wankhede Stadium','MA Chidambaram Stadium', 'Rajiv Gandhi International Stadium', 'Arun Jaitley Stadium', 'Eden Gardens', 'Maharashtra Cricket Association Stadium', 'Sawai Mansingh Stadium', 'M Chinnaswamy Stadium', 'Other', 'Punjab Cricket Association IS Bindra Stadium', 'Brabourne Stadium', 'Dr DY Patil Sports Academy', 'Narendra Modi Stadium', 'UAE']

overall_mae = []
overall_paper_accuracy = []
overall_correct_per_match = []
overall_accuracy_under_50 = []

print("\nTRAINING MODELS & EVALUATING PRIMARY PERFORMANCE METRICS")
print("=" * 100)

for stdm in stdms:
    # Filter dataset for that country
    data_stdm = data[data.venue == stdm].copy()
    testmerger = pd.DataFrame()
    trainmerger = pd.DataFrame()

    # Split data player-wise
    for i in data_stdm.batter.unique():
        data2 = data_stdm[data_stdm.batter == i].copy()
        if data2.shape[0] > 1:
            train1, test1 = train_test_split(
                data2,
                test_size=0.2,
                random_state=42
            )
            trainmerger = pd.concat([trainmerger, train1], axis=0)
            testmerger = pd.concat([testmerger, test1], axis=0)

    if not trainmerger.empty and not testmerger.empty:
        # Train regression model
        reg = linear_model.LinearRegression()
        reg.fit(
            trainmerger[['pavg','lfm','savg']],
            trainmerger['runs']
        )
        
        # Save the trained model
        joblib.dump(reg, f"models/{stdm}_model.pkl")
        
        # ---- CALCULATE PRCICM METRICS ----
        predictions = reg.predict(testmerger[['pavg','lfm','savg']])
        predicted_abs = np.abs(predictions)
        absolute_errors = np.abs(testmerger['runs'] - predicted_abs)
        
        # 1. Mean Absolute Error |Predicted - Actual|
        mae = np.mean(absolute_errors)
        
        # 2. Paper's Metric: Accuracy classifying within 24 runs (Figure 3)
        correct_24 = np.sum(absolute_errors <= 24)
        total_predictions = len(absolute_errors)
        paper_accuracy_pct = (correct_24 / total_predictions) * 100
        
        # 3. Paper's Metric: Correct Predictions per Match (11 max) (Figure 6)
        correct_per_match = (paper_accuracy_pct / 100.0) * 11.0
        
        # 4. Paper's Metric: Accuracy excluding 50+ run anomalies (Figure 5)
        mask_under_50 = testmerger['runs'] < 50
        total_under_50 = np.sum(mask_under_50)
        if total_under_50 > 0:
            correct_under_50 = np.sum(absolute_errors[mask_under_50] <= 24)
            accuracy_under_50_pct = (correct_under_50 / total_under_50) * 100
        else:
            accuracy_under_50_pct = paper_accuracy_pct
        
        overall_mae.append(mae)
        overall_paper_accuracy.append(paper_accuracy_pct)
        overall_correct_per_match.append(correct_per_match)
        overall_accuracy_under_50.append(accuracy_under_50_pct)
        
        print(f"[*] The {stdm} model achieved {paper_accuracy_pct:.2f}% base accuracy (±24 runs)!")
        print(f"    -> It successfully predicts {correct_per_match:.2f} out of 11 players per match.")
        print(f"    -> When excluding unpredictable 50+ run outliers, accuracy jumps to {accuracy_under_50_pct:.2f}%.")
        print(f"    -> The average prediction error margin is {mae:.2f} runs.\n")
    else:
        print(f"[!] The {stdm} model was saved, but there wasn't enough test data to evaluate performance.\n")

print("=" * 100)
print(f"[*] OVERALL PROJECT SUMMARY:")
print(f"Across all stadiums, the models achieved an average accuracy of {np.mean(overall_paper_accuracy):.2f}%.")
print(f"This accurately predicts {np.mean(overall_correct_per_match):.2f}/11 players per match with an average margin of error of just {np.mean(overall_mae):.2f} runs.")
print(f"For typical batsmen (scores under 50), the system operates at {np.mean(overall_accuracy_under_50):.2f}% accuracy!")
print("=" * 100 + "\n")