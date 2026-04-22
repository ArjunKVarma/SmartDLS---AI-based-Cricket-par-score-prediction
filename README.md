# 🏏 SmartDLS – AI-based Revised Target Score Prediction

## 📌 Overview

SmartDLS is an AI-driven system designed to predict **revised target scores in cricket matches**, improving upon the traditional Duckworth-Lewis-Stern (DLS) method by incorporating contextual and player-specific factors.

---

## 📸 Demo

### 🔹 Dashboard & Prediction System

<p align="center">
  <img src="images/f1.png" width="800"/>
</p>

### 🔹 Model Performance Metrics

<p align="center">
  <img src="images/f2.png" width="700"/>
</p>

---

## 🎯 Objective

* Predict realistic target scores during interrupted matches
* Reduce biases present in traditional DLS calculations
* Provide data-driven and adaptive score predictions

---

## 🧠 Methodology

### 🔹 Traditional DLS Factors

The standard DLS method considers:

* Overs remaining
* Wickets lost

---

### 🔹 SmartDLS Enhancements

In addition to standard DLS parameters, SmartDLS introduces:

* **Player-specific wicket weightage**, based on:

  * Player form
  * Player average

* **Team-specific over weightage**, accounting for team dynamics and playing style

* **Stadium-specific player performance**, incorporating venue-based variations

---

## ⚖️ Key Advantage

These enhancements enable a more **context-aware and fair calculation**, reducing the likelihood of any team gaining an unfair advantage due to match interruptions and reduced overs.

---

## ⚙️ Tech Stack

* Python
* Scikit-learn (Multiple Linear Regression)
* Pandas, NumPy
* FastAPI
* React

---

## 📊 Features

* AI-based target score prediction
* Context-aware match analysis
* Improved fairness compared to traditional DLS
* Scalable for real-time applications

---

## 🚀 Installation

```bash
git clone https://github.com/ArjunKVarma/SmartDLS---AI-based-Cricket-par-score-prediction.git
cd SmartDLS---AI-based-Cricket-par-score-prediction
pip install -r requirements.txt
```

---

## ▶️ Usage

```bash
python api.py
npm run dev
```

---

## 📸 Architecture

### 🔹 Implimentation Architecture

<p align="center">
  <img src="images/d1.png" width="800"/>
</p>

### 🔹 Class Diagram

<p align="center">
  <img src="images/d3.png" width="700"/>
</p>

---
## 📌 Future Improvements

* Real-time match integration
* Deployment-ready API
* Advanced deep learning models
* Web and mobile interfaces

---

## 📄 Research Basis

This project is based on the research paper:
**"Player-aware resource compensation in interrupted cricket matches"** by Zia et al., adapted and simplified for the T20 format.

---
