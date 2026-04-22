# app.py

import streamlit as st
import pandas as pd
from prediction import calculate_target

# Load the player data
@st.cache_data
def load_player_data():
    try:
        return pd.read_csv('csv/processed_team_players.csv')
    except FileNotFoundError:
        st.error("Please run your processing script to generate 'processed_team_players.csv'")
        return None

df_players = load_player_data()

st.title("SmartDLS")

# --- MATCH SETTINGS ---
venue = st.selectbox(
    "Select Match Venue",
    ['Wankhede Stadium', 'MA Chidambaram Stadium', 'Rajiv Gandhi International Stadium', 
     'Arun Jaitley Stadium', 'Eden Gardens', 'Maharashtra Cricket Association Stadium', 
     'Sawai Mansingh Stadium', 'M Chinnaswamy Stadium', 'Other', 
     'Punjab Cricket Association IS Bindra Stadium', 'Brabourne Stadium', 
     'Dr DY Patil Sports Academy', 'Narendra Modi Stadium', 'UAE']
)

if df_players is not None:
    # 1. Select Year and Team
    col_y, col_t = st.columns(2)
    with col_y:
        available_seasons = sorted(df_players['season'].unique(), reverse=True)
        selected_season = st.selectbox("Select Season", available_seasons)
    with col_t:
        teams_in_season = sorted(df_players[df_players['season'] == selected_season]['team'].unique())
        batting_team = st.selectbox("Select Batting Team", teams_in_season)

    # 2. Get Squad and Select Playing XI
    full_squad = sorted(df_players[(df_players['team'] == batting_team) & 
                                  (df_players['season'] == selected_season)]['player'].unique())

    playing_xi = st.multiselect(
        f"Select Playing XI (Must select exactly 11)",
        options=full_squad,
        help="Select the 11 players playing in this match."
    )

    # 3. Validation and "Players Out" Selection
    num_selected = len(playing_xi)
    
    if num_selected < 11:
        st.info(f"Please select {11 - num_selected} more player(s) to complete the XI.")
        outList = []
    elif num_selected > 11:
        st.warning(f"You have selected {num_selected} players. Please remove {num_selected - 11} to have exactly 11.")
        outList = []
    else:
        st.success("Playing XI Confirmed (11 players).")
        # Now show the "Who is out?" dropdown
        outList = st.multiselect(
            "Select Players Out (from the Playing XI)",
            options=playing_xi,
            help="Select players who have already been dismissed."
        )
else:
    st.stop()

# --- SCORE PARAMETERS ---
col1, col2 = st.columns(2)
with col1:
    S = st.number_input("Team 1 Score", value=191)
    revised_limit = st.number_input("Revised Overs", value=15)
with col2:
    
    stop_over = st.number_input("Rain Stopped At Over", value=10)

# --- CALCULATION ---
if st.button("Calculate Target"):
    if len(playing_xi) != 11:
        st.error("Error: You must select exactly 11 players for the Playing XI.")
    else:
        # Pass the batting team name and the list of players who are out
        live_par,r2,r2c,diction,G50,target = calculate_target(
            venue,
            batting_team,
            S,
            
            revised_limit,
            stop_over,
            outList,
            playing_xi
        )
        st.success(f"Target to Win: {target}")
        st.success(f"Live_par: {live_par}")
        st.subheader("Predicted Player Runs")

        for player, runs in diction.items():
            st.write(f"{player}: {runs:.2f}")

        st.write("---")
        st.write(f"Expected Team Total (G50): {G50:.2f}")
        st.write(f"Resources Deprived: {r2c:.2f} points")
        st.write(f"Team 2 Match Budget (R2): {r2:.2f} / 40.00")
       