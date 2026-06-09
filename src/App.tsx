import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  HelpCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  StepForward,
  Workflow,
} from 'lucide-react';

type ProcessState = 'ready' | 'running' | 'waiting' | 'done';
type Algorithm = 'round-robin' | 'fcfs' | 'priority';
type LessonFocus = 'overview' | 'queue' | 'cpu' | 'io' | 'memory' | 'table';

interface Process {
  id: string;
  name: string;
  role: string;
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
  { id: 'p1', name: 'Shell', role: '명령을 입력받는 작은 프로그램', color: COLORS[0], burst: 18, remaining: 18, priority: 2, memory: 3, ioEvery: 6, ioLeft: 0, state: 'ready', quantumUsed: 0, page: 0 },
  { id: 'p2', name: 'Compiler', role: '코드를 빌드하는 무거운 작업', color: COLORS[1], burst: 28, remaining: 28, priority: 1, memory: 5, ioEvery: 9, ioLeft: 0, state: 'ready', quantumUsed: 0, page: 0 },
  { id: 'p3', name: 'Browser', role: '웹 페이지를 보여주는 앱', color: COLORS[2], burst: 22, remaining: 22, priority: 3, memory: 4, ioEvery: 7, ioLeft: 0, state: 'ready', quantumUsed: 0, page: 0 },
  { id: 'p4', name: 'Backup', role: '파일을 저장 장치에 복사하는 작업', color: COLORS[3], burst: 16, remaining: 16, priority: 4, memory: 2, ioEvery: 5, ioLeft: 0, state: 'ready', quantumUsed: 0, page: 0 },
];

const createInitialMemory = (): MemoryFrame[] =>
  Array.from({ length: 12 }, (_, id) => ({ id, processId: null, page: null, age: 0 }));

const LESSONS: Array<{ title: string; body: string; focus: LessonFocus; hint: string }> = [
  {
    title: '1. 프로세스는 실행 대기 중인 프로그램입니다',
    body: 'Shell, Browser 같은 이름은 실제 컴퓨터에서 켜져 있을 법한 프로그램 예시입니다. 지금은 이 프로그램들이 CPU 차례를 기다리고 있다고 보면 됩니다.',
    focus: 'overview',
    hint: '처음에는 자동 실행보다 Step 버튼으로 한 tick씩 넘겨보세요.',
  },
  {
    title: '2. Ready Queue는 줄 서는 곳입니다',
    body: 'CPU는 한 번에 하나만 실행할 수 있습니다. Ready Queue에 있는 프로세스들은 “내 차례가 오면 실행할게” 하고 기다리는 상태입니다.',
    focus: 'queue',
    hint: 'Step을 누르면 줄 맨 앞의 작업이 CPU로 이동합니다.',
  },
  {
    title: '3. CPU Core는 지금 실행 중인 작업입니다',
    body: 'CPU Core에 표시된 이름이 현재 실제로 계산되는 프로세스입니다. Round Robin 모드에서는 4 tick만 실행하고 다시 줄 뒤로 갑니다.',
    focus: 'cpu',
    hint: '아래 초록 막대 4칸이 한 번에 쓸 수 있는 CPU 시간입니다.',
  },
  {
    title: '4. I/O Wait는 잠깐 멈춘 상태입니다',
    body: '프로그램이 디스크나 입력 장치를 기다리면 CPU를 계속 잡고 있지 않습니다. 잠시 I/O Wait로 빠졌다가 준비되면 다시 줄로 돌아옵니다.',
    focus: 'io',
    hint: 'Backup처럼 파일을 다루는 작업은 I/O 대기가 자주 생깁니다.',
  },
  {
    title: '5. Memory Frames는 메모리 칸입니다',
    body: '프로그램이 실행되려면 필요한 페이지가 메모리에 올라와야 합니다. 칸에 프로세스 이름과 P0, P1 같은 페이지 번호가 표시됩니다.',
    focus: 'memory',
    hint: 'Kernel Events에서 page loaded 메시지가 나오면 이 영역이 바뀝니다.',
  },
  {
    title: '6. Process Table은 전체 상태 요약입니다',
    body: 'ready, running, waiting, done 상태를 한 번에 확인하는 표입니다. 처음에는 이 표보다 Ready Queue와 CPU Core를 먼저 보는 게 쉽습니다.',
    focus: 'table',
    hint: '상태 변화가 익숙해지면 스케줄링 모드를 바꿔 차이를 비교해보세요.',
  },
];

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
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(650);
  const [tick, setTick] = useState(0);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [logs, setLogs] = useState<EventLog[]>([
    { id: 1, tick: 0, message: '시스템이 준비되었습니다. Step을 눌러 한 칸씩 관찰하세요.', tone: 'cpu' },
  ]);
  const quantum = 4;
  const lesson = LESSONS[lessonIndex];

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
            nextLogs = addLog(nextLogs, nextTick, `${process.name}이 I/O 대기를 끝내고 줄로 돌아왔습니다`, 'io');
            return { ...process, ioLeft, state: 'ready' as const };
          }
          return { ...process, ioLeft };
        });

        let active = nextProcesses.find((process) => process.state === 'running') || null;
        if (!active) {
          const next = chooseNextProcess(nextProcesses, algorithm);
          if (next) {
            nextLogs = addLog(nextLogs, nextTick, `${next.name}이 CPU 차례를 받았습니다`, 'cpu');
            nextProcesses = nextProcesses.map((process) =>
              process.id === next.id ? { ...process, state: 'running', quantumUsed: 0 } : process,
            );
            active = nextProcesses.find((process) => process.id === next.id) || null;
          }
        }

        if (!active) {
          nextLogs = addLog(nextLogs, nextTick, 'CPU가 쉬는 중입니다. 기다리는 프로세스가 없습니다.', 'cpu');
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
            nextLogs = addLog(nextLogs, nextTick, `${process.name} 작업이 완료되었습니다`, 'done');
            return { ...process, remaining, page: nextPage, state: 'done', quantumUsed: 0 };
          }

          if (remaining % process.ioEvery === 0) {
            nextLogs = addLog(nextLogs, nextTick, `${process.name}이 I/O를 기다리러 잠시 빠졌습니다`, 'io');
            return { ...process, remaining, page: nextPage, state: 'waiting', ioLeft: 3, quantumUsed: 0 };
          }

          if (algorithm === 'round-robin' && quantumUsed >= quantum) {
            nextLogs = addLog(nextLogs, nextTick, `${process.name}의 CPU 사용 시간이 끝나 다시 줄로 갑니다`, 'cpu');
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
          addLog(currentLogs, nextTick, `${proc?.name || pageFault?.processId}의 page ${pageFault?.page}가 메모리에 올라왔습니다`, 'memory'),
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
    setRunning(false);
    setLessonIndex(0);
    setLogs([{ id: 1, tick: 0, message: '처음 상태로 돌아왔습니다. Step으로 천천히 시작하세요.', tone: 'cpu' }]);
  };

  const addProcess = () => {
    const index = processes.length + 1;
    const burst = 14 + ((index * 7) % 18);
    const process: Process = {
      id: `p${index}`,
      name: `Job ${index}`,
      role: '새로 들어온 임의 작업',
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
    setLogs((current) => addLog(current, tick, `${process.name}이 Ready Queue에 추가되었습니다`, 'cpu'));
  };

  return (
    <main className={`app-shell focus-${lesson.focus}`}>
      <section className="topbar">
        <div>
          <h1>OS Simulator</h1>
          <p>프로그램이 CPU를 기다리고, 실행되고, 잠시 멈추고, 끝나는 흐름을 천천히 관찰합니다.</p>
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

      <section className="guide-panel">
        <div className="guide-copy">
          <HelpCircle size={20} />
          <div>
            <span>Beginner walkthrough</span>
            <h2>{lesson.title}</h2>
            <p>{lesson.body}</p>
            <small>{lesson.hint}</small>
          </div>
        </div>
        <div className="guide-actions">
          <button
            className="icon-button"
            onClick={() => setLessonIndex((index) => Math.max(0, index - 1))}
            disabled={lessonIndex === 0}
          >
            Previous
          </button>
          <button className="icon-button primary" onClick={step} disabled={running}>
            <StepForward size={18} />
            Step
          </button>
          <button
            className="icon-button"
            onClick={() => setLessonIndex((index) => Math.min(LESSONS.length - 1, index + 1))}
            disabled={lessonIndex === LESSONS.length - 1}
          >
            Next
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
            <h2>CPU Core <small>지금 실행 중</small></h2>
            <span>{cpuLoad}%</span>
          </div>
          <div className={`cpu-chip ${runningProcess ? 'active' : ''}`}>
            <div className="chip-rings" />
            <div className="chip-label">{runningProcess?.name || 'Idle'}</div>
            <div className="chip-subtitle">
              {runningProcess ? `${runningProcess.remaining} ticks 남음` : '아직 실행 중인 작업 없음'}
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
            <h2>Ready Queue <small>CPU 대기 줄</small></h2>
            <span>{readyQueue.length}</span>
          </div>
          <div className="queue-lane">
            {readyQueue.map((process) => (
              <ProcessCard key={process.id} process={process} />
            ))}
            {readyQueue.length === 0 && <div className="empty-state">기다리는 프로세스 없음</div>}
          </div>
        </div>

        <div className="panel memory-panel">
          <div className="panel-header">
            <Database size={18} />
            <h2>Memory Frames <small>메모리 칸</small></h2>
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
                  <small>{owner?.name || '빈 칸'}</small>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel io-panel">
          <div className="panel-header">
            <HardDrive size={18} />
            <h2>I/O Wait <small>입출력 대기</small></h2>
            <span>{waitingQueue.length}</span>
          </div>
          <div className="io-stack">
            {waitingQueue.map((process) => (
              <div key={process.id} className="io-card" style={{ borderColor: process.color }}>
                <span>{process.name}</span>
                <div className="io-bar">
                  <i style={{ width: `${((3 - process.ioLeft) / 3) * 100}%`, backgroundColor: process.color }} />
                </div>
                <small>{process.ioLeft} tick 남음</small>
              </div>
            ))}
            {waitingQueue.length === 0 && <div className="empty-state">잠시 멈춘 프로세스 없음</div>}
          </div>
        </div>

        <div className="panel table-panel">
          <div className="panel-header">
            <Activity size={18} />
            <h2>Process Table <small>전체 상태</small></h2>
            <span>{completed}/{processes.length}</span>
          </div>
          <div className="process-table">
            {processes.map((process) => (
              <div key={process.id} className={`process-row ${process.state}`}>
                <span className="dot" style={{ backgroundColor: process.color }} />
                <strong>{process.name}</strong>
                <span>{formatState(process.state)}</span>
                <span>prio {process.priority}</span>
                <progress value={process.burst - process.remaining} max={process.burst} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel log-panel">
          <div className="panel-header">
            <Activity size={18} />
            <h2>Kernel Events <small>방금 일어난 일</small></h2>
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
      <p>{process.role}</p>
      <div className="process-card-meta">
        <span>{process.remaining}t</span>
        <span>prio {process.priority}</span>
        <span>{process.memory}p</span>
      </div>
    </div>
  );
}

function formatState(state: ProcessState) {
  if (state === 'ready') return '대기';
  if (state === 'running') return '실행';
  if (state === 'waiting') return 'I/O 대기';
  return '완료';
}

export default App;
