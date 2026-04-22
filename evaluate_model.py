import pandas as pd
from sklearn import linear_model
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import numpy as np
import warnings

# Suppress sklearn warnings for clean output
warnings.filterwarnings('ignore')

def clean_runs(val):
    if isinstance(val, str):
        return int(val.replace('*', ''))
    return int(val)

def test_ml_layer():
    """
    Evaluates the accuracy of the Linear Regression models that power the
    PRCICM Player Weight allocations. This tests the actual ML output.
    """
    print("EVALUATING PLAYER SCORE PREDICTIONS (PER THE PAPER'S 24-RUN BOUNDARY CRITERIA)")
    
    data = pd.read_csv('csv/list.csv')
    
    # Clean the 'runs' column if it contains strings with '*'
    data['runs'] = data['runs'].apply(clean_runs)
    
    stdms = ['Wankhede Stadium','MA Chidambaram Stadium', 'Rajiv Gandhi International Stadium', 
             'Arun Jaitley Stadium', 'Eden Gardens', 'Maharashtra Cricket Association Stadium', 
             'Sawai Mansingh Stadium', 'M Chinnaswamy Stadium', 'Other', 
             'Punjab Cricket Association IS Bindra Stadium', 'Brabourne Stadium', 
             'Dr DY Patil Sports Academy', 'Narendra Modi Stadium', 'UAE']

    overall_mae = []
    overall_paper_accuracy = []
    overall_correct_per_match = []
    overall_accuracy_under_50 = []

    print(f"{'Stadium':<42} | {'Abs. Error':<15} | {'Acc (±24)':<15} | {'Correct/11':<15} | {'Acc (<50 Runs)':<15}")
    print("-" * 110)
    
    for stdm in stdms:
        data_stdm = data[data.venue == stdm].copy()
        testmerger = pd.DataFrame()
        trainmerger = pd.DataFrame()

        # Split data player-wise exactly like your training scheme
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

        # If we have enough test data
        if not trainmerger.empty and not testmerger.empty:
            
            # Train model
            reg = linear_model.LinearRegression()
            reg.fit(trainmerger[['pavg','lfm','savg']], trainmerger['runs'])
            
            # Predict
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
            # The paper specifically identifies 50+ runs as unpredictable outliers
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
            
            print(f"{stdm:<42} | {mae:<15.2f} | {paper_accuracy_pct:<15.2f} | {correct_per_match:<15.2f} | {accuracy_under_50_pct:<15.2f}")
        else:
            print(f"{stdm:<42} | {'Not Enough Data':<15} | {'Not Enough Data':<15} | {'Not Enough Data':<15} | {'Not Enough Data':<15}")

    print("-" * 110)
    print(f"{'OVERALL AVERAGE':<42} | {np.mean(overall_mae):<15.2f} | {np.mean(overall_paper_accuracy):<15.2f} | {np.mean(overall_correct_per_match):<15.2f} | {np.mean(overall_accuracy_under_50):<15.2f}")
    print("========================================\n")


if __name__ == "__main__":
    test_ml_layer()
