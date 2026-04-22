"""
Core prediction engine for SmartDLS. 
Implements the PRCICM (Player-Aware Resource Compensation) methodology.
"""
import pandas as pd
import joblib
import math


def calculate_target(
    current_match_venue,
    batting_team,
    S,
    revised_limit,
    stop_over,
    outList,
    players
):
    """
    Calculates live par scores and revised targets for rain-interrupted matches.
    
    Args:
        current_match_venue (str): Venue name matching pre-trained model filenames.
        batting_team (str): Name of the team currently batting.
        S (int): Original target or first innings total.
        revised_limit (float): New innings limit (overs).
        stop_over (float): Point of interruption (cricket notation).
        outList (list): List of dismissed players.
        players (list): Full list of the starting 11 players.
        
    Returns:
        tuple: (live_par, R2_total, R_deprived, predictions, G50, target_to_win, R_consumed)
    """
    original_limit = 20
    data = pd.read_csv("csv/list.csv")
    diction = {}
    player_features = {}
    
    # 1. Player Feature Extraction (Career, Form, Venue)
    team_pavg, team_lfm, team_savg = [], [], []
    stdms = [current_match_venue]

    for p in players:
        player_data = data[data["batter"] == p]
        if player_data.empty:
            player_features[p] = None
            continue

        runs = player_data["runs"].apply(lambda x: int(str(x).replace("*", "")))
        outs = player_data["out"].sum()
        pavg = runs.sum() / outs if outs != 0 else runs.sum()

        last5 = player_data.tail(5)
        runs_5 = last5["runs"].apply(lambda x: int(str(x).replace("*", "")))
        outs_5 = last5["out"].sum()
        lfm = runs_5.sum() / outs_5 if outs_5 != 0 else runs_5.sum()

        stadium_data = player_data[player_data["venue"].isin(stdms)]
        runs_c = stadium_data["runs"].apply(lambda x: int(str(x).replace("*", "")))
        outs_c = stadium_data["out"].sum()
        savg = runs_c.sum() / outs_c if outs_c != 0 else runs_c.sum()

        player_features[p] = (pavg, lfm, savg)
        team_pavg.append(pavg)
        team_lfm.append(lfm)
        team_savg.append(savg)

    # Handle missing features using team averages or global defaults
    if team_pavg:
        mean_pavg = sum(team_pavg) / len(team_pavg)
        mean_lfm = sum(team_lfm) / len(team_lfm)
        mean_savg = sum(team_savg) / len(team_savg)
    else:
        # Fallback if NO players in the XI have historical data
        mean_pavg, mean_lfm, mean_savg = 20.0, 20.0, 20.0

    # 2. Predictive Scoring using Venue-Specific ML Models
    reg = joblib.load(f"models/{current_match_venue}_model.pkl")
    for p in players:
        f = player_features[p] or (mean_pavg, mean_lfm, mean_savg)
        X_new = pd.DataFrame([f], columns=["pavg", "lfm", "savg"])
        diction[p] = abs(float(reg.predict(X_new)[0]))

    # 3. Dynamic Resource Allocation (Team Potential)
    G50 = sum(diction.values())
    player_weights = {p: (score * 20.0 / G50) for p, score in diction.items()}

    # Calculate remaining player resource (PRES)
    PRES = 20.0
    for p in outList:
        PRES -= player_weights.get(p, 0)

    # 4. Over Weights Mapping
    ow_df = pd.read_csv("csv/over_weights.csv")
    ow_df["over"] = ow_df["over"] + 1

    # Scale over weights to 20-point budget (Eq 1)
    team_ow = ow_df[ow_df["batting_team"] == batting_team]["weight"].sum()
    if team_ow > 0:
        ow_df.loc[ow_df["batting_team"] == batting_team, "weight"] *= (20.0 / team_ow)

    # 5. Over Notation Conversion (e.g., 16.4 -> 16.66)
    stop_over_decimal = int(stop_over) + (stop_over - int(stop_over)) * 10 / 6
    current_over = int(stop_over) + 1
    balls_bowled = int(round((stop_over - int(stop_over)) * 10))
    balls_left = max(0, 6 - balls_bowled)
    
    cur_ov_res = ow_df[(ow_df["batting_team"] == batting_team) & (ow_df["over"] == current_over)]["weight"].sum()
    partial_res = cur_ov_res * (balls_left / 6.0)

    # Over Resources (ORES) for original and revised limits
    ORES_orig = ow_df[(ow_df["batting_team"] == batting_team) & (ow_df["over"] > current_over) & (ow_df["over"] <= 20)]["weight"].sum() + partial_res
    ORES_rev = ow_df[(ow_df["batting_team"] == batting_team) & (ow_df["over"] > current_over) & (ow_df["over"] <= revised_limit)]["weight"].sum() + partial_res

    # 6. Resource Consumption and Loss Calculation (Eq 4, 5)
    PLOSS_orig = PRES * (stop_over_decimal / 20.0)
    
    # Guard against revised_limit being zero to avoid division by zero
    revised_limit_safe = max(revised_limit, 0.1)
    PLOSS_rev = PRES * (stop_over_decimal / revised_limit_safe)

    R1_future = ORES_orig + (PRES - PLOSS_orig)
    R2_future = ORES_rev + (PRES - PLOSS_rev)
    
    R_deprived = R1_future - R2_future
    R2_total = 40.0 - R_deprived

    # 7. Final Target Calculation (Eq 6 & 7)
    if R2_total <= 40.0:
        final_target = S * (R2_total / 40.0)
    else:
        final_target = S + G50 * (R2_total - 40.0) / 40.0

    target_to_win = math.floor(final_target) + 1

    # 8. Real-Time Resource Analytics
    time_used = ow_df[(ow_df["batting_team"] == batting_team) & (ow_df["over"] < current_over)]["weight"].sum()
    time_used += cur_ov_res * (balls_bowled / 6.0)
    player_used = (20.0 - PRES) + PLOSS_orig
    
    R_consumed = time_used + player_used
    live_par = math.floor(S * (R_consumed / 40.0)) + 1

    # Cast all potentially numpy values to native Python types for JSON compatibility
    return (
        int(live_par), 
        float(R2_total), 
        float(R_deprived), 
        {k: float(v) for k, v in diction.items()}, 
        float(G50), 
        int(target_to_win), 
        float(R_consumed)
    )
