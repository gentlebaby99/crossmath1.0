import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Clock, Star, Play, RotateCcw, User, ChevronRight, Delete, Award, Home, GraduationCap, CheckCircle2 } from 'lucide-react';

// --- Configuration per Grade ---
const GRADE_CONFIGS = {
  'p12': {
    label: 'ป.1 - ป.2',
    maxNum: 10,
    ops: ['+'],
    description: 'บวกเลขง่ายๆ ไม่เกิน 10'
  },
  'p34': {
    label: 'ป.3 - ป.4',
    maxNum: 20,
    ops: ['+', '-'],
    description: 'บวกลบเลขไม่เกิน 20'
  },
  'p56': {
    label: 'ป.5 - ป.6',
    maxNum: 50,
    ops: ['+', '-', '*', '/'],
    description: 'บวกลบคูณหาร เลขไม่เกิน 50'
  }
};

const LEVELS = [
  { id: 1, size: 2, emptyCells: 1 }, 
  { id: 2, size: 2, emptyCells: 2 }, 
  { id: 3, size: 2, emptyCells: 3 }, 
  { id: 4, size: 3, emptyCells: 2 }, 
  { id: 5, size: 3, emptyCells: 3 },
  { id: 6, size: 3, emptyCells: 4 },
];

const TIME_OPTIONS = [
  { label: '1 นาที', value: 60 },
  { label: '3 นาที', value: 180 },
];

// Helper to calculate result sequentially without operator precedence (like a simple calculator)
const calculateSequential = (nums, ops) => {
  let res = nums[0];
  for (let i = 0; i < ops.length; i++) {
    const nextVal = nums[i + 1];
    if (ops[i] === '+') res += nextVal;
    else if (ops[i] === '-') res -= nextVal;
    else if (ops[i] === '*') res *= nextVal;
    else if (ops[i] === '/') res = nextVal !== 0 ? Math.floor(res / nextVal) : res;
  }
  return res;
};

export default function App() {
  const [gameState, setGameState] = useState('login');
  const [playerName, setPlayerName] = useState('');
  const [grade, setGrade] = useState('p12');
  const [baseTime, setBaseTime] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [board, setBoard] = useState(null); 
  const [inputs, setInputs] = useState({}); 
  const [hints, setHints] = useState({}); 
  const [activeIndex, setActiveIndex] = useState({ r: 0, c: 0 });
  const [owlMessage, setOwlMessage] = useState("สวัสดีจ้า! พร้อมลุยหรือยัง?");
  const [isWrongShake, setIsWrongShake] = useState(false);

  // Core improvement: Logic to ensure whole numbers and no negative results
  const generateLevel = useCallback((levelIdx, selectedGrade) => {
    const config = LEVELS[levelIdx];
    const gradeCfg = GRADE_CONFIGS[selectedGrade];
    const size = config.size;
    const opsList = gradeCfg.ops;
    
    let grid = Array(size).fill(0).map(() => Array(size).fill(0));
    let rowOps = Array(size).fill(0).map(() => Array(size - 1).fill('+'));
    let colOps = Array(size).fill(0).map(() => Array(size - 1).fill('+'));

    // Step 1: Assign operations first
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - 1; j++) {
        rowOps[i][j] = opsList[Math.floor(Math.random() * opsList.length)];
        colOps[i][j] = opsList[Math.floor(Math.random() * opsList.length)];
      }
    }

    // Step 2: Fill numbers strategically to avoid fractions and negatives
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Simple random base
        let val = Math.floor(Math.random() * (gradeCfg.maxNum / 2)) + 1;
        
        // Adjust based on Row Operator (if previous exists)
        if (c > 0) {
          const op = rowOps[r][c-1];
          if (op === '/') {
            // Ensure multiplication result doesn't exceed maxNum too much
            grid[r][c-1] = grid[r][c-1] || (Math.floor(Math.random() * 5) + 1);
            grid[r][c] = Math.floor(Math.random() * 5) + 1;
            grid[r][c-1] = grid[r][c] * (Math.floor(Math.random() * 5) + 1); // Reverse multiply
          } else if (op === '-') {
            // Ensure result is not negative
            if (grid[r][c-1] < val) {
              const temp = grid[r][c-1];
              grid[r][c-1] = val;
              val = temp;
            }
          }
        }
        grid[r][c] = grid[r][c] || val;
      }
    }

    // Final calculations for labels
    const rowResults = grid.map((row, i) => calculateSequential(row, rowOps[i]));
    const colResults = Array(size).fill(0).map((_, c) => {
      const colNums = grid.map(row => row[c]);
      return calculateSequential(colNums, colOps[c]);
    });

    // Step 3: Setup game UI state
    const allCells = [];
    for(let r=0; r<size; r++) for(let c=0; c<size; c++) allCells.push({r,c});
    const shuffled = [...allCells].sort(() => Math.random() - 0.5);
    const numToEmpty = Math.min(config.emptyCells, allCells.length);
    const emptyCells = shuffled.slice(0, numToEmpty);
    
    const newHints = {};
    const initialInputs = {};
    allCells.forEach(cell => {
      const isEmpty = emptyCells.some(e => e.r === cell.r && e.c === cell.c);
      if (!isEmpty) {
        newHints[`${cell.r}-${cell.c}`] = grid[cell.r][cell.c];
        initialInputs[`${cell.r}-${cell.c}`] = grid[cell.r][cell.c].toString();
      }
    });

    setBoard({ grid, rowOps, colOps, rowResults, colResults, size });
    setHints(newHints);
    setInputs(initialInputs);
    setActiveIndex(emptyCells[0] || { r: 0, c: 0 });
    setTimeLeft(baseTime);
    setOwlMessage(levelIdx === 0 ? "ลองเติมเลขที่หายไปดูนะจ๊ะ" : `ด่านที่ ${levelIdx + 1} ลุยกันเลย!`);
  }, [baseTime]);

  const startGame = () => {
    if (!playerName.trim()) return;
    setScore(0);
    setCurrentLevelIdx(0);
    generateLevel(0, grade);
    setGameState('playing');
  };

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('game-over');
    }
    return () => clearInterval(timer);
  }, [timeLeft, gameState]);

  const handleNumpad = (val) => {
    if (gameState !== 'playing') return;
    const { r, c } = activeIndex;
    if (hints[`${r}-${c}`]) return;

    setInputs(prev => {
      const currentVal = prev[`${r}-${c}`] || "";
      if (currentVal.length >= 2) return prev;
      return { ...prev, [`${r}-${c}`]: currentVal + val.toString() };
    });
  };

  const clearCell = () => {
    const { r, c } = activeIndex;
    if (hints[`${r}-${c}`]) return;
    setInputs(prev => {
      const next = { ...prev };
      delete next[`${r}-${c}`];
      return next;
    });
  };

  const confirmCell = () => {
    const size = board.size;
    let foundNext = false;
    for (let i = 0; i < size * size; i++) {
      const nextR = Math.floor(i / size);
      const nextC = i % size;
      const key = `${nextR}-${nextC}`;
      if (!inputs[key] && !hints[key]) {
        setActiveIndex({ r: nextR, c: nextC });
        foundNext = true;
        break;
      }
    }
    checkStatus(inputs);
  };

  const checkStatus = (currentInputs) => {
    const size = board.size;
    let allFilled = true;
    let allCorrect = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = currentInputs[`${r}-${c}`];
        if (!val) allFilled = false;
        else if (parseInt(val) !== board.grid[r][c]) allCorrect = false;
      }
    }

    if (allFilled && allCorrect) {
      setOwlMessage("ว้าว! ถูกเผงเลย 🦉💎");
      const bonus = timeLeft * 10;
      setScore(prev => prev + 100 + bonus);
      setTimeout(() => {
        if (currentLevelIdx === LEVELS.length - 1) setGameState('game-win');
        else setGameState('level-summary');
      }, 800);
    } else if (allFilled && !allCorrect) {
      setOwlMessage("อ๊ะ! ยังมีบางช่องไม่ถูกต้องนะ ลองคิดดูใหม่จ๊ะ");
      setIsWrongShake(true);
      setTimeout(() => setIsWrongShake(false), 500);
    }
  };

  const isRowCorrect = (r) => {
    const size = board.size;
    const rowInputs = [];
    for (let c = 0; c < size; c++) {
      const val = inputs[`${r}-${c}`];
      if (!val) return null;
      rowInputs.push(parseInt(val));
    }
    return calculateSequential(rowInputs, board.rowOps[r]) === board.rowResults[r];
  };

  const isColCorrect = (c) => {
    const size = board.size;
    const colInputs = [];
    for (let r = 0; r < size; r++) {
      const val = inputs[`${r}-${c}`];
      if (!val) return null;
      colInputs.push(parseInt(val));
    }
    return calculateSequential(colInputs, board.colOps[c]) === board.colResults[c];
  };

  // Condition to check if name is entered
  const isNameEmpty = playerName.trim().length === 0;

  return (
    <div className="fixed inset-0 bg-[#0f172a] font-sans text-slate-800 overflow-hidden select-none flex flex-col items-center p-4">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 text-4xl">➕</div>
        <div className="absolute top-40 right-10 text-4xl">➖</div>
        <div className="absolute bottom-20 left-20 text-4xl">✖️</div>
      </div>

      {gameState === 'login' && (
        <div className="z-10 bg-white p-6 rounded-[32px] shadow-2xl w-full max-w-sm my-auto animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg rotate-3">
              <Star className="text-white w-8 h-8 fill-current" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 leading-tight">MATH<br/><span className="text-orange-500 uppercase text-xl">Junior Quest</span></h1>
            
            <div className="w-full space-y-3 mt-2">
              <input 
                type="text" placeholder="พิมพ์ชื่อเล่นตรงนี้..." value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 border-2 border-slate-200 focus:border-orange-400 focus:outline-none font-bold text-center"
              />
              
              <div className="text-left">
                <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase">เลือกชั้นเรียน</label>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {Object.entries(GRADE_CONFIGS).map(([key, cfg]) => (
                    <button key={key} onClick={() => setGrade(key)}
                      className={`p-3 rounded-xl flex items-center gap-3 border-2 transition-all ${grade === key ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-200' : 'bg-white border-slate-100'}`}>
                      <div className={`p-2 rounded-lg ${grade === key ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <GraduationCap size={18} />
                      </div>
                      <div className="text-left">
                        <p className={`font-black text-sm leading-none ${grade === key ? 'text-orange-600' : 'text-slate-600'}`}>{cfg.label}</p>
                        <p className="text-[9px] text-slate-400 mt-1">{cfg.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                {TIME_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setBaseTime(opt.value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${baseTime === opt.value ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-100 text-slate-400'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={startGame} 
              disabled={isNameEmpty}
              className={`w-full py-4 rounded-2xl font-black text-xl shadow-lg transition-all mt-4 active:translate-y-1 active:shadow-none
                ${isNameEmpty 
                  ? 'bg-slate-300 text-slate-500 border-b-4 border-slate-400 cursor-not-allowed opacity-80' 
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_6px_0_#059669] border-b-0'
                }`}
            >
              {isNameEmpty ? 'กรุณาใส่ชื่อ' : 'เริ่มเล่นเลย!'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && board && (
        <div className={`z-10 flex flex-col items-center w-full max-w-md h-full justify-between pb-4 ${isWrongShake ? 'animate-shake' : ''}`}>
          {/* Top Bar */}
          <div className="w-full flex items-center bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 text-white">
            <div className="flex items-center gap-2 flex-1">
              <div className="bg-orange-400 p-1 rounded-lg"><Trophy size={14} /></div>
              <span className="text-xs font-black">ด่าน {currentLevelIdx + 1} • {score}</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <span className={`text-xs font-black ${timeLeft < 10 ? 'text-red-400 animate-pulse' : ''}`}>{timeLeft}s</span>
              <Clock size={14} />
            </div>
          </div>

          {/* Game Board */}
          <div className="bg-amber-900/40 p-3 rounded-[32px] border-4 border-amber-800 shadow-2xl scale-[0.95]">
            <div className="bg-[#1b4332] p-4 rounded-[24px] shadow-inner grid gap-2" style={{ gridTemplateColumns: `repeat(${board.size * 2}, minmax(0, 1fr))` }}>
              {Array(board.size * 2 - 1).fill(0).map((_, rIdx) => {
                const isNumRow = rIdx % 2 === 0;
                const rowIdx = Math.floor(rIdx / 2);
                return Array(board.size * 2).fill(0).map((_, cIdx) => {
                  const isNumCol = cIdx % 2 === 0;
                  const colIdx = Math.floor(cIdx / 2);
                  const isLastCol = cIdx === board.size * 2 - 1;
                  
                  if (isNumRow && isNumCol && !isLastCol) {
                    const isActive = activeIndex.r === rowIdx && activeIndex.c === colIdx;
                    const isHint = hints[`${rowIdx}-${colIdx}`] !== undefined;
                    return (
                      <div key={`c-${rIdx}-${cIdx}`} onClick={() => !isHint && setActiveIndex({ r: rowIdx, c: colIdx })}
                        className={`w-14 h-12 flex items-center justify-center rounded-xl text-xl font-black border-b-4 transition-all ${
                          isHint ? 'bg-slate-400/20 text-white/30 border-transparent' :
                          isActive ? 'bg-yellow-300 text-slate-800 border-yellow-500 scale-110 shadow-lg' :
                          'bg-white/10 text-white/90 border-transparent hover:bg-white/20'
                        }`}>
                        {inputs[`${rowIdx}-${colIdx}`] || ""}
                      </div>
                    );
                  }
                  if (isNumRow && !isNumCol && !isLastCol) return <div key={`oh-${rIdx}`} className="text-yellow-400/50 font-bold text-center">{board.rowOps[rowIdx][colIdx]}</div>;
                  if (isNumRow && isLastCol) {
                    const correct = isRowCorrect(rowIdx);
                    return <div key={`rh-${rIdx}`} className={`ml-1 w-10 h-10 flex items-center justify-center rounded-lg font-bold border text-sm ${correct === true ? 'bg-emerald-500/40 border-emerald-400 text-emerald-200' : correct === false ? 'bg-red-500/40 border-red-400 text-red-200' : 'bg-black/20 text-white/30'}`}>{board.rowResults[rowIdx]}</div>;
                  }
                  if (!isNumRow && isNumCol && !isLastCol) return <div key={`ov-${cIdx}`} className="text-yellow-400/50 font-bold text-center">{board.colOps[colIdx][rowIdx]}</div>;
                  return <div key={`e-${rIdx}-${cIdx}`} />;
                });
              })}
              {/* Bottom Results Row */}
              {Array(board.size * 2).fill(0).map((_, cIdx) => {
                const isNumCol = cIdx % 2 === 0;
                if (isNumCol && cIdx < board.size * 2 - 1) {
                  const colIdx = Math.floor(cIdx / 2);
                  const correct = isColCorrect(colIdx);
                  return <div key={`rv-${cIdx}`} className={`mt-1 w-14 h-10 flex items-center justify-center rounded-lg font-bold border text-sm ${correct === true ? 'bg-emerald-500/40 border-emerald-400 text-emerald-200' : correct === false ? 'bg-red-500/40 border-red-400 text-red-200' : 'bg-black/20 text-white/30'}`}>{board.colResults[colIdx]}</div>;
                }
                return <div key={`eb-${cIdx}`} />;
              })}
            </div>
          </div>

          {/* Owl + Numpad */}
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
              <div className="text-3xl animate-float">🦉</div>
              <div className="flex-1 bg-white p-2 rounded-xl rounded-tl-none relative shadow-xl">
                <p className="text-[9px] font-bold text-orange-500 uppercase">ครูนกฮูก:</p>
                <p className="text-[11px] font-bold text-slate-700 leading-tight">{owlMessage}</p>
                <div className="absolute -left-2 top-0 border-8 border-transparent border-t-white"></div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 p-3 bg-slate-800/80 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                <button key={num} onClick={() => handleNumpad(num)} className="h-14 bg-slate-100 text-slate-800 text-xl font-black rounded-xl shadow-[0_4px_0_#94a3b8] active:translate-y-1 active:shadow-none transition-all">
                  {num}
                </button>
              ))}
              <button onClick={clearCell} className="h-14 bg-red-400 text-white flex items-center justify-center rounded-xl shadow-[0_4px_0_#b91c1c] active:translate-y-1 active:shadow-none">
                <Delete size={20} />
              </button>
              <button onClick={confirmCell} className="h-14 bg-emerald-500 text-white flex items-center justify-center rounded-xl shadow-[0_4px_0_#065f46] active:translate-y-1 active:shadow-none">
                <CheckCircle2 size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {(gameState === 'level-summary' || gameState === 'game-over' || gameState === 'game-win') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/95 backdrop-blur-xl p-4">
          <div className="bg-white rounded-[40px] p-8 w-full max-sm:p-6 max-w-sm flex flex-col items-center gap-6 shadow-2xl border-b-[12px] border-slate-200 animate-in zoom-in duration-300">
            {gameState === 'level-summary' && (
              <>
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce"><Award className="text-emerald-500 w-10 h-10" /></div>
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-800">เก่งมาก!</h2>
                  <p className="text-slate-500 font-medium text-sm">ผ่านด่าน {currentLevelIdx + 1} แล้ว</p>
                </div>
                <div className="w-full bg-slate-50 p-4 rounded-2xl flex justify-between items-center border-2 border-slate-100">
                  <span className="font-bold text-slate-400">คะแนน</span>
                  <span className="text-3xl font-black text-emerald-500">{score.toLocaleString()}</span>
                </div>
                <button onClick={() => {
                  const nextIdx = currentLevelIdx + 1;
                  setCurrentLevelIdx(nextIdx);
                  generateLevel(nextIdx, grade);
                  setGameState('playing');
                }} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-xl shadow-[0_6px_0_#c2410c] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2">
                  ด่านต่อไป <ChevronRight />
                </button>
              </>
            )}

            {gameState === 'game-over' && (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center"><Clock className="text-red-500 w-10 h-10 animate-pulse" /></div>
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-800">เวลาหมดแล้ว!</h2>
                  <p className="text-slate-500 font-medium px-4 mt-1 italic text-sm">"ยังไม่ถึงด่านสุดท้ายเลย ลองใหม่อีกครั้งเพื่อพิสูจน์ตัวเองนะ!"</p>
                </div>
                <button onClick={startGame} className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-xl shadow-[0_6px_0_#1e293b] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2">
                  <RotateCcw size={20} /> ลองใหม่
                </button>
                <button onClick={() => setGameState('login')} className="text-slate-400 font-bold text-sm">กลับหน้าหลัก</button>
              </>
            )}

            {gameState === 'game-win' && (
              <>
                <div className="w-24 h-24 bg-yellow-400 rounded-[32px] flex items-center justify-center relative shadow-xl rotate-6 animate-bounce">
                   <Trophy className="text-white w-12 h-12" />
                   <div className="absolute -top-4 -right-4 text-4xl">👑</div>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-800">อัจฉริยะตัวจริง!</h2>
                  <p className="text-slate-500 font-bold text-sm px-4 mt-2">"{playerName} คุณจบด่านสุดท้ายได้สำเร็จ เก่งที่สุดในโลกเลย! 💖"</p>
                </div>
                <div className="w-full bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-3xl border-4 border-yellow-200 text-center">
                  <p className="text-[10px] font-black text-orange-500 uppercase mb-1">คะแนนรวมทั้งหมด</p>
                  <p className="text-5xl font-black text-slate-800">{score.toLocaleString()}</p>
                </div>
                <button onClick={() => setGameState('login')} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xl shadow-[0_6px_0_#047857] active:translate-y-1 active:shadow-none flex items-center justify-center gap-2">
                  <Home size={20} /> เล่นอีกครั้ง
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.1s ease-in-out infinite; animation-iteration-count: 3; }
      `}} />
    </div>
  );
}
