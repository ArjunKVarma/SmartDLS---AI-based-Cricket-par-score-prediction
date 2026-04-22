import prediction
import math

# Updated Scenarios based on User Input (Strict PRCICM Verification)
scenarios = [
    {
        "id": 1,
        "match": "MI vs RCB 2017",
        "venue": "Wankhede Stadium",
        "team": "Mumbai Indians",
        "target": 163,
        "score": 95,
        "wickets": 2,
        "overs": 12.0,
        "out": ["Parthiv Patel", "Rohit Sharma"],
        "players": ["Parthiv Patel", "Rohit Sharma", "Nitish Rana", "Kieron Pollard", "Hardik Pandya", "Krunal Pandya", "Harbhajan Singh", "Mitchell McClenaghan", "Jasprit Bumrah", "Lasith Malinga", "KH Pandya"],
        "winner": "Chasing Team"
    },
    {
        "id": 2,
        "match": "RCB vs KKR 2018",
        "venue": "M Chinnaswamy Stadium",
        "team": "Royal Challengers Bangalore",
        "target": 177,
        "score": 82,
        "wickets": 3,
        "overs": 10.0,
        "out": ["Brendon McCullum", "Quinton de Kock", "Virat Kohli"],
        "players": ["Brendon McCullum", "Quinton de Kock", "Virat Kohli", "AB de Villiers", "Mandeep Singh", "Colin de Grandhomme", "Washington Sundar", "Umesh Yadav", "Yuzvendra Chahal", "Mohammed Siraj", "TG Southee"],
        "winner": "Defending Team"
    },
    {
        "id": 3,
        "match": "CSK vs DC 2019",
        "venue": "MA Chidambaram Stadium",
        "team": "Chennai Super Kings",
        "target": 148,
        "score": 70,
        "wickets": 2,
        "overs": 9.0,
        "out": ["Shane Watson", "Faf du Plessis"],
        "players": ["Shane Watson", "Faf du Plessis", "Suresh Raina", "Ambati Rayudu", "MS Dhoni", "Ravindra Jadeja", "Dwayne Bravo", "Deepak Chahar", "Harbhajan Singh", "Imran Tahir", "SN Thakur"],
        "winner": "Chasing Team"
    },
    {
        "id": 4,
        "match": "KKR vs SRH 2017",
        "venue": "Eden Gardens",
        "team": "Kolkata Knight Riders",
        "target": 183,
        "score": 105,
        "wickets": 4,
        "overs": 13.0,
        "out": ["Gautam Gambhir", "Chris Lynn", "Robin Uthappa", "Manish Pandey"],
        "players": ["Gautam Gambhir", "Chris Lynn", "Robin Uthappa", "Manish Pandey", "Yusuf Pathan", "Andre Russell", "Sunil Narine", "Piyush Chawla", "Trent Boult", "Kuldeep Yadav", "UT Yadav"],
        "winner": "Defending Team"
    },
    {
        "id": 5,
        "match": "DC vs PBKS 2018",
        "venue": "Arun Jaitley Stadium",
        "team": "Delhi Capitals",
        "target": 172,
        "score": 90,
        "wickets": 3,
        "overs": 11.0,
        "out": ["Prithvi Shaw", "Shikhar Dhawan", "Shreyas Iyer"],
        "players": ["Prithvi Shaw", "Shikhar Dhawan", "Shreyas Iyer", "Rishabh Pant", "Glenn Maxwell", "Chris Morris", "Axar Patel", "Kagiso Rabada", "Amit Mishra", "TA Boult", "Sandeep Lamichhane"],
        "winner": "Defending Team"
    },
    {
        "id": 6,
        "match": "SRH vs RR 2019",
        "venue": "Rajiv Gandhi International Stadium",
        "team": "Sunrisers Hyderabad",
        "target": 159,
        "score": 78,
        "wickets": 2,
        "overs": 10.0,
        "out": ["David Warner", "Jonny Bairstow"],
        "players": ["David Warner", "Jonny Bairstow", "Kane Williamson", "Vijay Shankar", "Yusuf Pathan", "Rashid Khan", "Bhuvneshwar Kumar", "Sandeep Sharma", "S Kaul", "Shabaz Nadeem", "Deepak Hooda"],
        "winner": "Chasing Team"
    },
    {
        "id": 7,
        "match": "PBKS vs MI 2018",
        "venue": "Punjab Cricket Association IS Bindra Stadium",
        "team": "Kings XI Punjab",
        "target": 187,
        "score": 120,
        "wickets": 2,
        "overs": 14.0,
        "out": ["KL Rahul", "Chris Gayle"],
        "players": ["KL Rahul", "Chris Gayle", "Mayank Agarwal", "Yuvraj Singh", "Karun Nair", "Ravichandran Ashwin", "Axar Patel", "AJ Tye", "MM Sharma", "AS Rajpoot", "Mujeeb Ur Rahman"],
        "winner": "Chasing Team"
    },
    {
        "id": 8,
        "match": "RR vs CSK 2019",
        "venue": "Sawai Mansingh Stadium",
        "team": "Rajasthan Royals",
        "target": 176,
        "score": 85,
        "wickets": 3,
        "overs": 10.0,
        "out": ["Ajinkya Rahane", "Jos Buttler", "Sanju Samson"],
        "players": ["Ajinkya Rahane", "Jos Buttler", "Sanju Samson", "Steve Smith", "Ben Stokes", "Rahul Tripathi", "Jofra Archer", "Shreyas Gopal", "K Gowtham", "JD Unadkat", "DS Kulkarni"],
        "winner": "Defending Team"
    },
    {
        "id": 9,
        "match": "RCB vs MI 2020",
        "venue": "Dubai International Cricket Stadium",
        "team": "Royal Challengers Bangalore",
        "target": 202,
        "score": 110,
        "wickets": 1,
        "overs": 10.0,
        "out": ["Devdutt Padikkal"],
        "players": ["Devdutt Padikkal", "Virat Kohli", "AB de Villiers", "Shivam Dube", "Washington Sundar", "Gurkeerat Singh Mann", "Isuru Udana", "Navdeep Saini", "Yuzvendra Chahal", "Adam Zampa", "Mohammed Siraj"],
        "winner": "Tied/Defending"
    },
    {
        "id": 10,
        "match": "CSK vs KKR 2021",
        "venue": "Wankhede Stadium",
        "team": "Chennai Super Kings",
        "target": 172,
        "score": 92,
        "wickets": 2,
        "overs": 11.0,
        "out": ["Ruturaj Gaikwad", "Faf du Plessis"],
        "players": ["Ruturaj Gaikwad", "Faf du Plessis", "Suresh Raina", "MS Dhoni", "Ravindra Jadeja", "Sam Curran", "Ambati Rayudu", "Moeen Ali", "Dwayne Bravo", "Deepak Chahar", "Shardul Thakur"],
        "winner": "Chasing Team"
    }
]

print(f"{'ID':<4} | {'Match':<20} | {'Score':<5} | {'Par':<5} | {'Status':<12} | {'Real Result':<15} | {'Correct?'}")
print("-" * 100)

for s in scenarios:
    S1 = s["target"] - 1
    try:
        live_par, r_rev, r_diff, diction, G50, target, r_cons = prediction.calculate_target(
            s["venue"], 
            s["team"], 
            S1, 
            20.0, 
            s["overs"], 
            s["out"], 
            s["players"]
        )
        
        status = "Ahead" if s["score"] > live_par else "Behind"
        real_win = s["winner"]
        
        # Check if status reflects reality
        # If real result is "Chasing Team", correct is "Ahead"
        # If real result is "Defending Team", correct is "Behind"
        is_correct = False
        if real_win == "Chasing Team" and status == "Ahead":
            is_correct = True
        elif "Defending" in real_win and status == "Behind":
            is_correct = True
            
        print(f"{s['id']:<4} | {s['match']:<20} | {s['score']:<5} | {live_par:<5} | {status:<12} | {real_win:<15} | {is_correct}")
    except Exception as e:
        print(f"{s['id']:<4} | {s['match']:<20} | Error: {e}")
