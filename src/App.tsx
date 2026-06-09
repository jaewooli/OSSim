import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  Pause,
  Play,
  Plus,
  RotateCcw,
  StepForward,
  Workflow,
} from 'lucide-react';

type ProcessState = 'ready' | 'running' | 'waiting' | 'done';
type Algorithm = 'round-robin' | 'fcfs' | 'priority';

interface Process {
  id: string;
  name: string;
  color: string;
  burst: number;
  remaining: number;
  priority: number;
  memory: number;
  ioEvery: number;
  ioLeft: number;
  state: ProcessState;
  quantumUsed: number;
  page: number;
}

interface MemoryFrame {
  id: number;
  processId: string | null;
  page: number | null;
  age: number;
}

interface EventLog {
  id: number;
  tick: number;
  message: string;
  tone: 'cpu' | 'memory' | 'io' | 'done';
}

const COLORS = ['#34a853', '#4285f4', '#fbbc04', '#ea4335', '#8b5cf6', '#06b6d4'];

const createInitialProcesses = (): Process[] => [
  { id: 'p1', name: 'Shell', color: COLORS[0], burst: 18, remaining: 18, priority: 2, memory: 3, ioEvery: 6, ioLeft: 0, state: 'ready', quantumUsed: 0, page: 0 },
  { id: 'p2', name: 'Compiler', color: COLORS[1], burst: 28, remaining: 28, priority: 1, memory: 5, ioEvery: 9, ioLeft: 0, state: 'ready', quantumUsed: 0, page: 0 },
  { id: 'p3', name: 'Browser', color: COLORS[2], burst: 22, remaining: 22, priority: 3, memory: 4, ioEvery: 7, ioLeft: 0, state: 'ready', quantumUsed: 0, page: 0 },
  { id: 'p4', name: 'Backup', color: COLORS[3], burst: 16, remaining: 16, priority: 4, memory: 2, ioEvery: 5, ioLeft: 0, state: 'ready', quantumUsed: 0, page: 0 },
];

const createInitialMemory = (): MemoryFrame[] =>
  Array.from({ length: 12 }, (_, id) => ({ id, processId: null, page: null, age: 0 }));

function chooseNextProcess(processes: Process[], algorithm: Algorithm) {
  const ready = processes.filter((p) => p.state === 'ready');
  if (ready.length === 0) return null;
  if (algorithm === 'priority') return [...ready].sort((a, b) => a.priority - b.priority)[0];
  return ready[0];
}

function addLog(logs: EventLog[], tick: number, message: string, tone: EventLog['tone']) {
  return [{ id: tick * 1000 + logs.length, tick, message, tone }, ...logs].slice(0, 8);
}

function App() {
  const [processes, setProcesses] = useState(createInitialProcesses);
  const [memory, setMemory] = useState(createInitialMemory);
  const [algorithm, setAlgorithm] = useState<Algorithm>('round-robin');
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(650);
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState<EventLog[]>([
    { id: 1, tick: 0, message: 'System booted. Scheduler is ready.', tone: 'cpu' },
  ]);
  const quantum = 4;

  const runningProcess = processes.find((p) => p.state === 'running') || null;
  const readyQueue = processes.filter((p) => p.state === 'ready');
  const waitingQueue = processes.filter((p) => p.state === 'waiting');
  const completed = processes.filter((p) => p.state === 'done').length;

  const cpuLoad = useMemo(() => {
    const active = processes.filter((p) => p.state !== 'done').length;
    return Math.min(100, Math.round((active / Math.max(1, processes.length)) * 82 + (runningProcess ? 18 : 0)));
  }, [processes, runningProcess]);

  const memoryLoad = useMemo(() => {
    const used = memory.filter((frame) => frame.processId).length;
    return Math.round((used / memory.length) * 100);
  }, [memory]);

  const step = () => {
    setTick((currentTick) => {
      const nextTick = currentTick + 1;
      let nextLogs = logs;
      let pageFault: { processId: string; page: number } | null = null;

      setProcesses((currentProcesses) => {
        let nextProcesses = currentProcesses.map((process) => {
          if (process.state !== 'waiting') return process;
          const ioLeft = Math.max(0, process.ioLeft - 1);
          if (ioLeft === 0) {
            nextLogs = addLog(nextLogs, nextTick, `${process.name} returned from I/O`, 'io');
            return { ...process, ioLeft, state: 'ready' as const };
          }
          return { ...process, ioLeft };
        });

        let active = nextProcesses.find((process) => process.state === 'running') || null;
        if (!active) {
          const next = chooseNextProcess(nextProcesses, algorithm);
          if (next) {
            nextLogs = addLog(nextLogs, nextTick, `${next.name} dispatched to CPU`, 'cpu');
            nextProcesses = nextProcesses.map((process) =>
              process.id === next.id ? { ...process, state: 'running', quantumUsed: 0 } : process,
            );
            active = nextProcesses.find((process) => process.id === next.id) || null;
          }
        }

        if (!active) {
          nextLogs = addLog(nextLogs, nextTick, 'CPU idle. No ready process.', 'cpu');
          setLogs(nextLogs);
          return nextProcesses;
        }

        nextProcesses = nextProcesses.map((process) => {
          if (process.id !== active.id) return process;

          const remaining = Math.max(0, process.remaining - 1);
          const quantumUsed = process.quantumUsed + 1;
          const nextPage = (process.page + 1) % Math.max(1, process.memory);
          pageFault = { processId: process.id, page: nextPage };

          if (remaining === 0) {
            nextLogs = addLog(nextLogs, nextTick, `${process.name} completed`, 'done');
            return { ...process, remaining, page: nextPage, state: 'done', quantumUsed: 0 };
          }

          if (remaining % process.ioEvery === 0) {
            nextLogs = addLog(nextLogs, nextTick, `${process.name} blocked for I/O`, 'io');
            return { ...process, remaining, page: nextPage, state: 'waiting', ioLeft: 3, quantumUsed: 0 };
          }

          if (algorithm === 'round-robin' && quantumUsed >= quantum) {
            nextLogs = addLog(nextLogs, nextTick, `${process.name} quantum expired`, 'cpu');
            return { ...process, remaining, page: nextPage, state: 'ready', quantumUsed: 0 };
          }

          return { ...process, remaining, page: nextPage, quantumUsed };
        });

        setLogs(nextLogs);
        return nextProcesses;
      });

      setMemory((currentMemory) => {
        if (!pageFault) return currentMemory.map((frame) => ({ ...frame, age: frame.age + 1 }));

        const existing = currentMemory.find(
          (frame) => frame.processId === pageFault?.processId && frame.page === pageFault.page,
        );
        if (existing) {
          return currentMemory.map((frame) =>
            frame.id === existing.id ? { ...frame, age: 0 } : { ...frame, age: frame.age + 1 },
          );
        }

        const target =
          currentMemory.find((frame) => frame.processId === null) ||
          [...currentMemory].sort((a, b) => b.age - a.age)[0];
        const proc = processes.find((process) => process.id === pageFault?.processId);
        setLogs((currentLogs) =>
          addLog(currentLogs, nextTick, `${proc?.name || pageFault?.processId} page ${pageFault?.page} loaded`, 'memory'),
        );
        return currentMemory.map((frame) =>
          frame.id === target.id
            ? { ...frame, processId: pageFault?.processId || null, page: pageFault?.page ?? null, age: 0 }
            : { ...frame, age: frame.age + 1 },
        );
      });

      return nextTick;
    });
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(step, speed);
    return () => window.clearInterval(timer);
  });

  const reset = () => {
    setProcesses(createInitialProcesses());
    setMemory(createInitialMemory());
    setTick(0);
    setLogs([{ id: 1, tick: 0, message: 'System reset. Workload restored.', tone: 'cpu' }]);
  };

  const addProcess = () => {
    const index = processes.length + 1;
    const burst = 14 + ((index * 7) % 18);
    const process: Process = {
      id: `p${index}`,
      name: `Job ${index}`,
      color: COLORS[index % COLORS.length],
      burst,
      remaining: burst,
      priority: 1 + (index % 5),
      memory: 2 + (index % 5),
      ioEvery: 5 + (index % 5),
      ioLeft: 0,
      state: 'ready',
      quantumUsed: 0,
      page: 0,
    };
    setProcesses((current) => [...current, process]);
    setLogs((current) => addLog(current, tick, `${process.name} admitted to ready queue`, 'cpu'));
  };

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>OS Simulator</h1>
          <p>Scheduler, memory paging, I/O blocking, and resource pressure in motion.</p>
        </div>
        <div className="controls">
          <button className="icon-button primary" onClick={() => setRunning((value) => !value)} title={running ? 'Pause' : 'Run'}>
            {running ? <Pause size={18} /> : <Play size={18} />}
            {running ? 'Pause' : 'Run'}
          </button>
          <button className="icon-button" onClick={step} disabled={running} title="Step one tick">
            <StepForward size={18} />
            Step
          </button>
          <button className="icon-button" onClick={reset} title="Reset workload">
            <RotateCcw size={18} />
            Reset
          </button>
          <button className="icon-button" onClick={addProcess} title="Admit process">
            <Plus size={18} />
            Process
          </button>
        </div>
      </section>

      <section className="control-strip">
        <div className="segmented">
          {(['round-robin', 'fcfs', 'priority'] as Algorithm[]).map((item) => (
            <button key={item} className={algorithm === item ? 'active' : ''} onClick={() => setAlgorithm(item)}>
              {item === 'round-robin' ? 'Round Robin' : item === 'fcfs' ? 'FCFS' : 'Priority'}
            </button>
          ))}
        </div>
        <label className="slider-control">
          <Gauge size={16} />
          <span>{Math.round(1000 / speed)} t/s</span>
          <input
            type="range"
            min="220"
            max="1200"
            step="20"
            value={1420 - speed}
            onChange={(event) => setSpeed(1420 - Number(event.target.value))}
          />
        </label>
        <div className="tick-counter">tick {tick}</div>
      </section>

      <section className="dashboard-grid">
        <div className="panel cpu-panel">
          <div className="panel-header">
            <Cpu size={18} />
            <h2>CPU Core</h2>
            <span>{cpuLoad}%</span>
          </div>
          <div className={`cpu-chip ${runningProcess ? 'active' : ''}`}>
            <div className="chip-rings" />
            <div className="chip-label">{runningProcess?.name || 'Idle'}</div>
            <div className="chip-subtitle">
              {runningProcess ? `${runningProcess.remaining} ticks remaining` : 'waiting for dispatch'}
            </div>
          </div>
          <div className="quantum-track">
            {Array.from({ length: quantum }, (_, index) => (
              <span key={index} className={runningProcess && index < runningProcess.quantumUsed ? 'used' : ''} />
            ))}
          </div>
        </div>

        <div className="panel queue-panel">
          <div className="panel-header">
            <Workflow size={18} />
            <h2>Ready Queue</h2>
            <span>{readyQueue.length}</span>
          </div>
          <div className="queue-lane">
            {readyQueue.map((process) => (
              <ProcessCard key={process.id} process={process} />
            ))}
            {readyQueue.length === 0 && <div className="empty-state">No ready process</div>}
          </div>
        </div>

        <div className="panel memory-panel">
          <div className="panel-header">
            <Database size={18} />
            <h2>Memory Frames</h2>
            <span>{memoryLoad}%</span>
          </div>
          <div className="memory-grid">
            {memory.map((frame) => {
              const owner = processes.find((process) => process.id === frame.processId);
              return (
                <div
                  key={frame.id}
                  className={`memory-frame ${owner ? 'used' : ''}`}
                  style={{ borderColor: owner?.color, backgroundColor: owner ? `${owner.color}22` : undefined }}
                >
                  <span>F{frame.id}</span>
                  <strong>{owner ? `P${frame.page}` : '-'}</strong>
                  <small>{owner?.name || 'free'}</small>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel io-panel">
          <div className="panel-header">
            <HardDrive size={18} />
            <h2>I/O Wait</h2>
            <span>{waitingQueue.length}</span>
          </div>
          <div className="io-stack">
            {waitingQueue.map((process) => (
              <div key={process.id} className="io-card" style={{ borderColor: process.color }}>
                <span>{process.name}</span>
                <div className="io-bar">
                  <i style={{ width: `${((3 - process.ioLeft) / 3) * 100}%`, backgroundColor: process.color }} />
                </div>
                <small>{process.ioLeft} ticks</small>
              </div>
            ))}
            {waitingQueue.length === 0 && <div className="empty-state">No blocked process</div>}
          </div>
        </div>

        <div className="panel table-panel">
          <div className="panel-header">
            <Activity size={18} />
            <h2>Process Table</h2>
            <span>{completed}/{processes.length}</span>
          </div>
          <div className="process-table">
            {processes.map((process) => (
              <div key={process.id} className={`process-row ${process.state}`}>
                <span className="dot" style={{ backgroundColor: process.color }} />
                <strong>{process.name}</strong>
                <span>{process.state}</span>
                <span>prio {process.priority}</span>
                <progress value={process.burst - process.remaining} max={process.burst} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel log-panel">
          <div className="panel-header">
            <Activity size={18} />
            <h2>Kernel Events</h2>
            <span>live</span>
          </div>
          <div className="log-list">
            {logs.map((log) => (
              <div key={log.id} className={`log-item ${log.tone}`}>
                <span>t{log.tick}</span>
                <p>{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function ProcessCard({ process }: { process: Process }) {
  return (
    <div className="process-card" style={{ borderColor: process.color }}>
      <div className="process-card-top">
        <span className="dot" style={{ backgroundColor: process.color }} />
        <strong>{process.name}</strong>
      </div>
      <div className="process-card-meta">
        <span>{process.remaining}t</span>
        <span>prio {process.priority}</span>
        <span>{process.memory}p</span>
      </div>
    </div>
  );
}

export default App;
