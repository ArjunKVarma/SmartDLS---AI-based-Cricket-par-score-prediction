"""
FastAPI Backend for SmartDLS.
Provides endpoints for match metadata and par score calculations.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import prediction
import os
import traceback

app = FastAPI(title="SmartDLS API")

# Configure CORS for local development and production accessibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CalculateRequest(BaseModel):
    """Schema for match calculation requests."""
    venue: str
    batting_team: str
    score: int
    revised_limit: float
    stop_over: float
    out_list: List[str]
    playing_xi: List[str]

# Global data state
try:
    processed_df = pd.read_csv('csv/processed_team_players.csv')
    over_weights_df = pd.read_csv('csv/over_weights.csv')
except Exception:
    processed_df = None
    over_weights_df = None

@app.get("/api/meta")
def get_meta_data():
    """
    Retrieves match metadata including venues, seasons, and teams.
    """
    if processed_df is None:
        raise HTTPException(status_code=500, detail="Data source missing")
    
    venues = [
        'Wankhede Stadium', 'MA Chidambaram Stadium', 'Rajiv Gandhi International Stadium', 
        'Arun Jaitley Stadium', 'Eden Gardens', 'Maharashtra Cricket Association Stadium', 
        'Sawai Mansingh Stadium', 'M Chinnaswamy Stadium', 'Other', 
        'Punjab Cricket Association IS Bindra Stadium', 'Brabourne Stadium', 
        'Dr DY Patil Sports Academy', 'Narendra Modi Stadium', 'UAE'
    ]
              
    return {
        "venues": venues,
        "seasons": processed_df['season'].unique().tolist(),
        "teams": processed_df['team'].unique().tolist()
    }

@app.get("/api/squad/{season}/{team}")
def get_squad(season: str, team: str):
    """
    Retrieves the list of unique players for a specific team and season.
    """
    if processed_df is None:
        raise HTTPException(status_code=500, detail="Data source missing")
    
    # Handle URL-safe season formatting (2020-21 -> 2020/21)
    formatted_season = season.replace("-", "/")
    
    players = processed_df[
        (processed_df['team'] == team) & 
        (processed_df['season'] == formatted_season)
    ]['player'].unique().tolist()
    
    return {"players": sorted(players)}

@app.get("/api/over-weights/{team}")
def get_over_weights(team: str):
    """
    Retrieves the strategic resource weights for a specific team.
    """
    if over_weights_df is None:
        raise HTTPException(status_code=500, detail="Data source missing")
    
    weights = over_weights_df[over_weights_df["batting_team"] == team].to_dict('records')
    return {"over_weights": weights}

@app.post("/api/calculate")
def calculate(req: CalculateRequest):
    """
    Performs SmartDLS par score and target calculations.
    """
    if processed_df is None or over_weights_df is None:
        return {
            "success": False,
            "error": "Backend data sources (CSV files) are not loaded. Please ensure the CSV directory contains processed_team_players.csv and over_weights.csv."
        }

    try:
        # Execute PRCICM calculation engine
        res = prediction.calculate_target(
            req.venue, 
            req.batting_team, 
            req.score, 
            req.revised_limit, 
            req.stop_over, 
            req.out_list, 
            req.playing_xi
        )
        
        # Format response payload
        return {
            "live_par": res[0],
            "r2_total": res[1],
            "resource_deprived": res[2],
            "player_predictions": res[3],
            "g50": res[4],
            "target": res[5],
            "resource_consumed": res[6],
            "over_weights": over_weights_df[over_weights_df["batting_team"] == req.batting_team].to_dict('records')
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
