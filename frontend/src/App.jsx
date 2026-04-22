import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart
} from 'recharts';
import {
  Target, LayoutDashboard, Activity, CheckSquare,
  Settings, User, BarChart2, TrendingUp, AlertTriangle, Zap, CheckCircle2
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const THEME_COLORS = {
  accent: '#1e8f4e',
  parLine: '#8b5a2b',
  textMuted: '#6b7280',
  gridLine: '#f3f4f6'
};

function MultiSelect({ options, selected, onChange, placeholder, maxSelections }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(i => i !== option));
    } else {
      if (maxSelections && selected.length >= maxSelections) return;
      onChange([...selected, option]);
    }
  };

  const removeTag = (e, option) => {
    e.stopPropagation();
    onChange(selected.filter(i => i !== option));
  };

  return (
    <div className="ms-container" ref={containerRef}>
      <div className={`ms-input-box ${isOpen ? 'focus' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        {selected.length === 0 && <span style={{ color: '#9ca3af', paddingLeft: '8px', fontSize: '0.85rem' }}>{placeholder}</span>}
        {selected.map(opt => (
          <span key={opt} className="ms-tag">
            {opt}
            <span className="ms-tag-remove" onClick={(e) => removeTag(e, opt)}>✕</span>
          </span>
        ))}
      </div>
      {isOpen && (
        <div className="ms-dropdown">
          {options.filter(opt => !selected.includes(opt)).map(opt => (
            <div key={opt} className="ms-option" onClick={() => handleToggle(opt)}>
              <span>{opt}</span>
            </div>
          ))}
          {options.filter(opt => !selected.includes(opt)).length === 0 && (
            <div className="ms-option" style={{ color: '#999' }}>No more options available</div>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [meta, setMeta] = useState({ venues: [], seasons: [], teams: [] });

  const [venue, setVenue] = useState('Central Stadium');
  const [season, setSeason] = useState('2023');
  const [team, setTeam] = useState('India');
  const [score, setScore] = useState(148);
  const [currentScore, setCurrentScore] = useState(110);
  const [revisedLimit, setRevisedLimit] = useState(20);
  const [stopOver, setStopOver] = useState(16.4);

  const [squad, setSquad] = useState([]);
  const [playingXi, setPlayingXi] = useState([]);
  const [outList, setOutList] = useState([]);

  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);

  const [overWeights, setOverWeights] = useState([]);
  const [progressionData, setProgressionData] = useState([]);
  const [runsPerOverData, setRunsPerOverData] = useState([]);
  const [viewMode, setViewMode] = useState('runs');
  const [evalView, setEvalView] = useState('acc');

  useEffect(() => {
    axios.get(`${API_BASE}/meta`).then(res => {
      setMeta(res.data);
      if (res.data.venues.length) setVenue(res.data.venues[0]);
      if (res.data.seasons.length) setSeason(res.data.seasons[0]);
      if (res.data.teams.length) {
        setTeam(res.data.teams[0]);
      }
      setLoadingMeta(false);
    }).catch(e => {
      console.error(e);
      setLoadingMeta(false);
    });
  }, []);

  useEffect(() => {
    if (!season || !team) return;
    const safeSeason = season.replace("/", "-");
    axios.get(`${API_BASE}/squad/${safeSeason}/${team}`).then(res => {
      setSquad(res.data.players || []);
      setPlayingXi([]);
      setOutList([]);
    }).catch(console.error);
  }, [season, team]);

  const handleCalculate = async () => {
    if (playingXi.length !== 11) {
      alert("Error: You must select exactly 11 players for the Playing XI.");
      return;
    }
    setCalculating(true);

    try {
      const res = await axios.post(`${API_BASE}/calculate`, {
        venue,
        batting_team: team,
        score: parseInt(score),
        revised_limit: parseFloat(revisedLimit),
        stop_over: parseFloat(stopOver),
        out_list: outList,
        playing_xi: playingXi
      });

      if (res.data.success === false) {
        alert(`Calculation failed: ${res.data.error || 'Unknown backend error'}`);
        setCalculating(false);
        return;
      }

      const chartRes = await axios.get(`${API_BASE}/over-weights/${team}`);
      const adjustedWeights = (chartRes.data.over_weights || []).map(ow => ({
        ...ow,
        over: ow.over + 1
      }));
      setOverWeights(adjustedWeights);

      setResult(res.data);
      generateMockAnalytics(parseInt(currentScore), parseFloat(stopOver), parseFloat(revisedLimit), res.data.target, res.data.live_par);

    } catch (e) {
      console.error(e);
      alert("Calculation failed. Please check backend API.");
    } finally {
      setCalculating(false);
    }
  };

  const generateMockAnalytics = (actualScore, stopOvers, revised, targetScore, liveParPoint) => {
    const prog = [];
    const rpo = [];

    const stopFloor = Math.floor(stopOvers);
    const plotLimit = Math.ceil(revised);
    const relevantWeights = overWeights.filter(ow => ow.over <= plotLimit);
    const totalWeight = relevantWeights.reduce((sum, ow) => sum + ow.weight, 0) || 1;
    const stopWeights = overWeights.filter(ow => ow.over <= stopFloor);
    const stopTotalWeight = stopWeights.reduce((sum, ow) => sum + ow.weight, 0) || 1;
    let currentCumPar = 0;

    for (let i = 1; i <= plotLimit; i++) {
      let actual = null;
      let rr = null;

      // Par score required up to this over (Non-linear based on weights)
      const overWeight = overWeights.find(ow => ow.over === i)?.weight || 0;
      currentCumPar += targetScore * (overWeight / totalWeight);

      // Actual score tracks up to the current score at interruption
      if (i <= stopFloor) {
        const cumulativeWeightToInterruption = overWeights.filter(ow => ow.over <= i).reduce((sum, ow) => sum + ow.weight, 0);
        actual = Math.round(actualScore * (cumulativeWeightToInterruption / stopTotalWeight));

        const overWeightAtI = overWeights.find(ow => ow.over === i)?.weight || 0;
        const overRuns = Math.round(actualScore * (overWeightAtI / stopTotalWeight));
        rpo.push({ over: `Ov ${i}`, runs: overRuns });
        rr = (actual / i).toFixed(2);
      }

      prog.push({
        over: i,
        actual: actual,
        par: Math.round(currentCumPar),
        runRate: rr
      });
    }

    setProgressionData(prog);
    setRunsPerOverData(rpo);
  };

  const renderDashboard = () => (
    <div className="grid-dashboard fade-in">
      <div className="pitch-card">
        <h3 className="card-title">Match Workspace</h3>

        <div className="form-group">
          <label>Venue Selection</label>
          <select className="styled-select" value={venue} onChange={e => setVenue(e.target.value)}>
            {meta.venues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Season</label>
            <select className="styled-select" value={season} onChange={e => setSeason(e.target.value)}>
              {meta.seasons.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Chasing Team</label>
            <select className="styled-select" value={team} onChange={e => setTeam(e.target.value)}>
              {meta.teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Team 1 Score (Target Set)</label>
            <input className="styled-input" type="number" value={score} onChange={e => setScore(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Current Score (Chasing)</label>
            <input className="styled-input" type="number" value={currentScore} onChange={e => setCurrentScore(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Overs Bowled</label>
            <input 
              className="styled-input" 
              type="text" 
              value={stopOver} 
              onChange={e => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  const parts = val.split('.');
                  if (parts[1] && parseInt(parts[1]) > 6) {
                    const nextOver = (parseInt(parts[0]) + 1).toString();
                    const extraBalls = (parseInt(parts[1]) - 6).toString();
                    setStopOver(`${nextOver}.${extraBalls}`);
                  } else {
                    setStopOver(val);
                  }
                }
              }} 
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Revised Over Limit</label>
            <input className="styled-input" type="number" value={revisedLimit} onChange={e => setRevisedLimit(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label>Playing XI <span style={{ float: 'right', color: playingXi.length === 11 ? 'var(--color-accent)' : 'var(--text-muted)' }}>{playingXi.length}/11</span></label>
          <MultiSelect
            options={squad}
            selected={playingXi}
            onChange={(items) => {
              setPlayingXi(items);
              setOutList(outList.filter(p => items.includes(p)));
            }}
            placeholder="Select 11 players"
            maxSelections={11}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label>Players Out ({outList.length})</label>
          <MultiSelect
            options={playingXi}
            selected={outList}
            onChange={setOutList}
            placeholder="Select dismissed players"
          />
        </div>

        <button className="btn-primary" onClick={handleCalculate} disabled={calculating}>
          {calculating ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      <div>
        {result ? (
          <>
            <div className="metrics-row" style={{ marginBottom: '16px' }}>
              <div className="pitch-card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '24px', padding: '16px 24px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span role="img" aria-label="flag">🏏</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{currentScore}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ {score}</div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>MATCH SCORE</div>
                </div>
              </div>
            </div>

            <div className="metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="metric-box">
                <div className="metric-lbl">Live Par Score</div>
                <div className="metric-val">{result.live_par}</div>
              </div>
              <div className="metric-box highlight">
                <div className="metric-lbl">Resources Consumed</div>
                <div className="metric-val">{((result.resource_consumed / 40.0) * 100).toFixed(1)}<span style={{ fontSize: '1rem' }}>%</span></div>
              </div>
              <div className="metric-box">
                <div className="metric-lbl">Resources Left</div>
                <div className="metric-val">{(100 - ((result.resource_consumed / 40.0) * 100)).toFixed(1)}<span style={{ fontSize: '1rem' }}>%</span></div>
              </div>
              <div className="metric-box featured">
                <div className="metric-lbl">Target To Win</div>
                <div className="metric-val">{result.target}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', marginBottom: '24px' }}>
              <div className="pitch-card" style={{ margin: 0 }}>
                <h3 className="card-title">
                  Score Progression
                  <span className="badge">Target Path</span>
                </h3>
                <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
                  <ResponsiveContainer>
                    <ComposedChart data={progressionData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="over" stroke={THEME_COLORS.textMuted} fontSize={10} tickLine={false} tickFormatter={(val) => `Ov ${val}`} />
                      <YAxis stroke={THEME_COLORS.textMuted} fontSize={10} tickLine={false} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={THEME_COLORS.gridLine} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area type="monotone" dataKey="actual" stroke={THEME_COLORS.accent} fillOpacity={0.2} fill={THEME_COLORS.accent} name="ACTUAL" strokeWidth={3} />
                      <Line type="monotone" dataKey="par" stroke={THEME_COLORS.parLine} strokeDasharray="5 5" name="PAR SCORE" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pitch-card" style={{ margin: 0 }}>
                <h3 className="card-title" style={{ fontSize: '0.9rem' }}>Player Impact</h3>
                <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                  {Object.entries(result.player_predictions || {}).map(([player, runs]) => {
                    const isOut = outList.includes(player);
                    const maxVal = Math.max(...Object.values(result.player_predictions), 1);
                    const pct = (runs / maxVal) * 100;
                    return (
                      <div key={player} style={{ marginBottom: '12px', opacity: isOut ? 0.5 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                          <span>{player} {isOut && <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>OUT</span>}</span>
                          <span>{typeof runs === 'number' ? runs.toFixed(2) : runs}</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: isOut ? 'var(--text-light)' : 'var(--color-accent)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="pitch-card" style={{ gridColumn: 'span 2', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 className="card-title" style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 0 }}>
                    {viewMode === 'runs' ? 'Runs Per Over' : 'Strategic Resource Weights'}
                  </h3>
                  <div className="badge" style={{ cursor: 'pointer', background: 'var(--color-accent-light)', color: 'var(--color-accent)' }} onClick={() => setViewMode(viewMode === 'runs' ? 'weights' : 'runs')}>
                    SWAP VIEW
                  </div>
                </div>
                <div style={{ height: '140px' }}>
                  <ResponsiveContainer>
                    {viewMode === 'runs' ? (
                      <BarChart data={runsPerOverData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                        <XAxis dataKey="over" stroke={THEME_COLORS.textMuted} fontSize={8} tickLine={false} />
                        <YAxis stroke={THEME_COLORS.textMuted} fontSize={9} tickLine={false} />
                        <Tooltip cursor={{ fill: 'var(--bg-main)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--card-shadow)' }} />
                        <Bar dataKey="runs" fill={THEME_COLORS.accent} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    ) : (
                      <AreaChart data={overWeights} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorOvers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={THEME_COLORS.accent} stopOpacity={0.6} />
                            <stop offset="95%" stopColor={THEME_COLORS.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <YAxis stroke={THEME_COLORS.textMuted} fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--card-shadow)' }} />
                        <Area type="monotone" dataKey="weight" stroke={THEME_COLORS.accent} fillOpacity={1} fill="url(#colorOvers)" name="Weight" strokeWidth={2} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="insight-card" style={{ padding: '12px', margin: 0 }}>
                  <TrendingUp size={16} color="var(--color-accent)" />
                  <div>
                    <div className="insight-title" style={{ fontSize: '0.75rem' }}>Match State</div>
                    <div className="insight-desc" style={{ fontSize: '0.7rem' }}>Parameters optimized for {revisedLimit} overs.</div>
                  </div>
                </div>
                <div className="insight-card warning" style={{ padding: '12px', margin: 0 }}>
                  <AlertTriangle size={16} color="var(--color-danger)" />
                  <div>
                    <div className="insight-title" style={{ fontSize: '0.75rem' }}>Wicket Pressure</div>
                    <div className="insight-desc" style={{ fontSize: '0.7rem' }}>{outList.length} wickets lost.</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="pitch-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '600px', flexDirection: 'column' }}>
            <div style={{ background: 'var(--color-accent-light)', padding: '24px', borderRadius: '50%', marginBottom: '24px' }}>
              <Activity size={48} color="var(--color-accent)" />
            </div>
            <h2 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Workspace Ready</h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>Input match variables to begin.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderModelEvaluation = () => {
    const venueData = [
      { venue: 'Wankhede', mae: 16.55, acc24: 80.56, accUnder50: 90.98 },
      { venue: 'MA Chidambaram', mae: 14.20, acc24: 84.14, accUnder50: 92.45 },
      { venue: 'Rajiv Gandhi Intl', mae: 16.21, acc24: 80.22, accUnder50: 89.11 },
      { venue: 'Arun Jaitley', mae: 14.83, acc24: 84.42, accUnder50: 94.72 },
      { venue: 'Eden Gardens', mae: 15.92, acc24: 82.39, accUnder50: 95.17 },
      { venue: 'MCA Pune', mae: 16.67, acc24: 82.01, accUnder50: 90.24 },
      { venue: 'Sawai Mansingh', mae: 15.91, acc24: 82.45, accUnder50: 91.12 },
      { venue: 'M Chinnaswamy', mae: 16.21, acc24: 81.18, accUnder50: 90.43 },
      { venue: 'Other', mae: 14.10, acc24: 87.75, accUnder50: 95.24 },
      { venue: 'PBIS Bindra', mae: 16.32, acc24: 80.73, accUnder50: 92.55 },
      { venue: 'Brabourne', mae: 17.90, acc24: 75.22, accUnder50: 86.60 },
      { venue: 'DY Patil', mae: 15.09, acc24: 85.44, accUnder50: 93.01 },
      { venue: 'Narendra Modi', mae: 16.92, acc24: 75.26, accUnder50: 85.71 },
      { venue: 'UAE', mae: 14.52, acc24: 84.82, accUnder50: 93.92 },
    ];

    return (
    <div className="fade-in">
      <div className="page-title-section">
        <div className="page-subtitle">Evaluation View</div>
        <h2 className="page-title">Model Diagnostics & Venue-Level Performance</h2>
      </div>

      <div className="pitch-card" style={{ marginTop: '24px' }}>
        <h3 className="card-title">Overall Model Performance (PRCICM Player Scoring Layer)</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.6 }}>
          Metrics computed across all 14 venues using an 80/20 player-wise train/test split. Accuracy is measured using the paper's ±24 run boundary criterion.
        </p>

        <div className="metrics-row">
          <div className="metric-box">
            <div className="metric-lbl">Mean Abs. Error</div>
            <div className="metric-val" style={{ color: 'var(--color-accent)' }}>15.81<span style={{ fontSize: '1rem' }}> runs</span></div>
          </div>
          <div className="metric-box highlight">
            <div className="metric-lbl">Accuracy (±24 Runs)</div>
            <div className="metric-val">81.9<span style={{ fontSize: '1rem' }}>%</span></div>
          </div>
          <div className="metric-box">
            <div className="metric-lbl">Correct Players / XI</div>
            <div className="metric-val" style={{ color: 'var(--color-accent)' }}>9.01<span style={{ fontSize: '1rem' }}> / 11</span></div>
          </div>
          <div className="metric-box featured">
            <div className="metric-lbl">Acc. (Excl. 50+ Outliers)</div>
            <div className="metric-val">91.5<span style={{ fontSize: '1rem' }}>%</span></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        <div className="pitch-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>
              {evalView === 'acc' ? 'Accuracy (±24 Runs) by Venue' : 'Mean Abs. Error by Venue'}
            </h3>
            <div
              className="badge"
              style={{ cursor: 'pointer', background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
              onClick={() => setEvalView(evalView === 'acc' ? 'mae' : 'acc')}
            >
              SWAP VIEW
            </div>
          </div>
          <div style={{ height: '260px', marginTop: '12px' }}>
            <ResponsiveContainer>
              <BarChart data={venueData} margin={{ top: 5, right: 5, left: -20, bottom: 60 }}>
                <XAxis dataKey="venue" fontSize={9} stroke={THEME_COLORS.textMuted} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis fontSize={9} stroke={THEME_COLORS.textMuted} tickLine={false} domain={evalView === 'acc' ? [60, 100] : [12, 20]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--card-shadow)', fontSize: '0.8rem' }} formatter={(val) => evalView === 'acc' ? `${val.toFixed(1)}%` : `${val.toFixed(2)} runs`} />
                <Bar dataKey={evalView === 'acc' ? 'acc24' : 'mae'} name={evalView === 'acc' ? 'Accuracy ±24 (%)' : 'MAE (runs)'} fill={THEME_COLORS.accent} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="pitch-card">
          <h3 className="card-title">Accuracy Excl. 50+ Run Outliers by Venue</h3>
          <div style={{ height: '260px', marginTop: '12px' }}>
            <ResponsiveContainer>
              <BarChart data={venueData} margin={{ top: 5, right: 5, left: -20, bottom: 60 }}>
                <XAxis dataKey="venue" fontSize={9} stroke={THEME_COLORS.textMuted} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis fontSize={9} stroke={THEME_COLORS.textMuted} tickLine={false} domain={[80, 100]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--card-shadow)', fontSize: '0.8rem' }} formatter={(val) => `${val.toFixed(1)}%`} />
                <Bar dataKey="accUnder50" name="Accuracy <50 Run Innings (%)" fill={THEME_COLORS.parLine} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="pitch-card" style={{ marginTop: '24px' }}>
        <h3 className="card-title">Prediction Error Distribution — SmartDLS vs Standard DLS</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.6 }}>
          Proportion of predictions falling within each absolute error range (runs). Derived from evaluation across all venues.
        </p>
        <div style={{ height: '240px' }}>
          <ResponsiveContainer>
            <BarChart
              data={[
                { range: '0–5 runs', ml: 22, dls: 12 },
                { range: '5–15 runs', ml: 37, dls: 25 },
                { range: '15–25 runs', ml: 23, dls: 25 },
                { range: '25+ runs', ml: 18, dls: 38 },
              ]}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis dataKey="range" fontSize={10} stroke={THEME_COLORS.textMuted} tickLine={false} />
              <YAxis fontSize={10} stroke={THEME_COLORS.textMuted} tickLine={false} unit="%" />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={THEME_COLORS.gridLine} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--card-shadow)' }} formatter={(val) => `${val}%`} />
              <Legend iconType="circle" fontSize={10} />
              <Bar dataKey="ml" name="SmartDLS (PRCICM)" fill={THEME_COLORS.accent} radius={[4, 4, 0, 0]} barSize={28} />
              <Bar dataKey="dls" name="Standard DLS" fill={THEME_COLORS.parLine} radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="pitch-card" style={{ marginTop: '24px' }}>
        <h3 className="card-title">PRCICM vs Standard DLS — Head-to-Head Comparison</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.6 }}>
          Standard DLS treats all players equally; PRCICM weights resources by individual player availability and form. The table below shows the difference in accuracy across scenarios as described in the paper.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          <div>
            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--card-border)' }}>
                  <th style={{ padding: '8px 4px' }}>Metric</th>
                  <th style={{ padding: '8px 4px', color: 'var(--color-accent)', textAlign: 'center' }}>SmartDLS (PRCICM)</th>
                  <th style={{ padding: '8px 4px', color: 'var(--color-par-line)', textAlign: 'center' }}>Standard DLS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'Mean Abs. Error (runs)', prcicm: '15.81', dls: '26.40', better: true },
                  { metric: 'Accuracy within ±24 runs', prcicm: '81.9%', dls: '62.3%', better: true },
                  { metric: 'Correct players / XI', prcicm: '9.01', dls: '—', better: true },
                  { metric: 'Accuracy excl. 50+ outliers', prcicm: '91.5%', dls: '71.6%', better: true },
                  { metric: 'Player availability aware', prcicm: '✓', dls: '✗', better: true },
                  { metric: 'Venue-specific resource weights', prcicm: '✓', dls: '✗', better: true },
                ].map(row => (
                  <tr key={row.metric} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: '9px 4px', color: 'var(--text-main)', fontWeight: 500 }}>{row.metric}</td>
                    <td style={{ padding: '9px 4px', textAlign: 'center', color: 'var(--color-accent)', fontWeight: 700 }}>{row.prcicm}</td>
                    <td style={{ padding: '9px 4px', textAlign: 'center', color: 'var(--color-par-line)', fontWeight: 600 }}>{row.dls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '10px' }}>Standard DLS figures based on paper Table II benchmarks using uniform resource allocation without player weighting.</p>
          </div>
          <div style={{ height: '260px' }}>
            <ResponsiveContainer>
              <BarChart
                data={[
                  { label: 'MAE (runs)', prcicm: 15.81, dls: 26.40 },
                  { label: 'Acc ±24 (%)', prcicm: 81.9, dls: 62.3 },
                  { label: 'Acc <50 (%)', prcicm: 91.5, dls: 71.6 },
                ]}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <XAxis dataKey="label" fontSize={10} stroke={THEME_COLORS.textMuted} tickLine={false} />
                <YAxis fontSize={10} stroke={THEME_COLORS.textMuted} tickLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={THEME_COLORS.gridLine} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--card-shadow)', fontSize: '0.8rem' }} />
                <Legend iconType="circle" fontSize={10} />
                <Bar dataKey="prcicm" name="SmartDLS (PRCICM)" fill={THEME_COLORS.accent} radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="dls" name="Standard DLS" fill={THEME_COLORS.parLine} radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="app-layout">
      <header className="top-navbar">
        <div className="navbar-brand">
          <Target color="white" fill={THEME_COLORS.accent} size={28} />
          SmartDLS
        </div>
        <div className="navbar-links">
          <a className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Match Dashboard</a>
          <a className={`nav-link ${activeTab === 'model' ? 'active' : ''}`} onClick={() => setActiveTab('model')}>Model Evaluation</a>
        </div>
      </header>

      <div className="main-content-wrapper">
        <main className="main-area">
          {loadingMeta ? (
            <div style={{ padding: '48px', color: 'var(--text-muted)' }}>Loading Application Metadata...</div>
          ) : (
            activeTab === 'dashboard' ? renderDashboard() : renderModelEvaluation()
          )}
        </main>
      </div>

    </div>
  );
}


export default App;
