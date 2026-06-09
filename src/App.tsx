import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Cpu, HardDrive, MemoryStick, Play, RotateCcw, Users } from 'lucide-react';

type SceneId = 'process' | 'queue' | 'dispatch' | 'quantum' | 'io' | 'memory';

interface LessonScene {
  id: SceneId;
  eyebrow: string;
  title: string;
  plain: string;
  question: string;
  answer: string;
}

interface ProcessItem {
  id: string;
  name: string;
  label: string;
  color: string;
}

const PROCESSES: ProcessItem[] = [
  { id: 'shell', name: 'Shell', label: '사용자가 명령을 입력하는 프로그램', color: '#2f7d5a' },
  { id: 'browser', name: 'Browser', label: '웹 페이지를 보여주는 프로그램', color: '#3867a8' },
  { id: 'editor', name: 'Editor', label: '파일을 열고 수정하는 프로그램', color: '#b46b3c' },
];

const SCENES: LessonScene[] = [
  {
    id: 'process',
    eyebrow: 'Step 1',
    title: '프로세스는 실행 중이거나 실행을 기다리는 프로그램입니다',
    plain:
      '컴퓨터에서는 여러 프로그램이 동시에 켜져 있는 것처럼 보입니다. 하지만 CPU 하나는 같은 순간에 보통 한 가지 일만 처리합니다. 그래서 운영체제는 프로그램들을 프로세스라는 단위로 관리합니다.',
    question: 'Shell, Browser 같은 이름은 왜 나오나요?',
    answer: '실제 컴퓨터에서 켜져 있을 법한 프로그램 예시입니다. OS 수업에서는 이런 프로그램 하나하나를 프로세스라고 부릅니다.',
  },
  {
    id: 'queue',
    eyebrow: 'Step 2',
    title: 'Ready Queue는 CPU를 기다리는 줄입니다',
    plain:
      'CPU가 바쁘면 프로세스는 바로 실행되지 못합니다. 실행할 준비가 된 프로세스들은 Ready Queue라는 줄에 서고, 운영체제의 스케줄러가 다음 차례를 고릅니다.',
    question: '왜 줄을 세우나요?',
    answer: 'CPU를 공정하게 나누기 위해서입니다. 줄이 없으면 어떤 프로그램이 CPU를 계속 차지할 수 있습니다.',
  },
  {
    id: 'dispatch',
    eyebrow: 'Step 3',
    title: '스케줄러가 줄 맨 앞의 프로세스를 CPU로 보냅니다',
    plain:
      'Ready Queue에서 선택된 프로세스가 CPU로 이동하는 순간을 dispatch라고 합니다. 이때부터 그 프로세스는 running 상태가 됩니다.',
    question: '실행 중이라는 건 무슨 뜻인가요?',
    answer: '그 프로세스의 명령어가 CPU에서 실제로 처리되고 있다는 뜻입니다.',
  },
  {
    id: 'quantum',
    eyebrow: 'Step 4',
    title: 'Round Robin은 CPU 시간을 조금씩 나눠줍니다',
    plain:
      '한 프로세스가 CPU를 너무 오래 잡지 못하게, 운영체제는 작은 시간 조각을 줍니다. 이 시간 조각을 quantum이라고 부릅니다. 시간이 끝나면 다시 줄 뒤로 갑니다.',
    question: '왜 끝까지 실행하지 않고 다시 줄로 보내나요?',
    answer: '다른 프로그램도 멈춘 것처럼 보이지 않게 만들기 위해서입니다.',
  },
  {
    id: 'io',
    eyebrow: 'Step 5',
    title: '입출력을 기다릴 때는 CPU에서 내려옵니다',
    plain:
      '파일 읽기, 저장, 네트워크 응답처럼 기다리는 일이 생기면 CPU를 붙잡고 있을 필요가 없습니다. 그 프로세스는 I/O Wait로 빠지고, CPU는 다른 프로세스를 실행합니다.',
    question: '기다리는 동안 CPU는 쉬나요?',
    answer: '아닙니다. 운영체제는 그 사이 다른 준비된 프로세스를 CPU에 올립니다.',
  },
  {
    id: 'memory',
    eyebrow: 'Step 6',
    title: '실행에 필요한 조각은 메모리에 올라와야 합니다',
    plain:
      '프로세스 전체가 항상 메모리에 한 번에 올라오는 것은 아닙니다. 필요한 페이지가 메모리 프레임에 올라오고, 부족하면 오래된 페이지가 교체될 수 있습니다.',
    question: 'P0, P1 같은 표시는 뭔가요?',
    answer: '프로그램을 나눈 작은 조각인 page 번호입니다. 메모리 칸 하나에는 어떤 프로세스의 어떤 page가 들어있는지 표시됩니다.',
  },
];

function App() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const scene = SCENES[sceneIndex];

  const activeProcess = useMemo(() => PROCESSES[playCount % PROCESSES.length], [playCount]);
  const queuedProcesses = useMemo(
    () => PROCESSES.filter((process) => process.id !== activeProcess.id),
    [activeProcess.id],
  );

  const goToScene = (nextIndex: number) => {
    setSceneIndex(Math.min(SCENES.length - 1, Math.max(0, nextIndex)));
    setPlayCount(0);
  };

  return (
    <main className="lesson-shell">
      <header className="lesson-header">
        <div>
          <span>Operating Systems 101</span>
          <h1>처음 배우는 CPU 스케줄링</h1>
        </div>
        <div className="progress-label">
          {sceneIndex + 1} / {SCENES.length}
        </div>
      </header>

      <nav className="lesson-map" aria-label="Lesson steps">
        {SCENES.map((item, index) => (
          <button
            key={item.id}
            className={index === sceneIndex ? 'active' : ''}
            onClick={() => goToScene(index)}
            type="button"
          >
            <span>{index + 1}</span>
            {item.id === 'process' && '프로세스'}
            {item.id === 'queue' && '대기 줄'}
            {item.id === 'dispatch' && 'CPU 배정'}
            {item.id === 'quantum' && '시간 분배'}
            {item.id === 'io' && 'I/O 대기'}
            {item.id === 'memory' && '메모리'}
          </button>
        ))}
      </nav>

      <section className={`lesson-stage scene-${scene.id}`}>
        <article className="lesson-copy">
          <span>{scene.eyebrow}</span>
          <h2>{scene.title}</h2>
          <p>{scene.plain}</p>

          <div className="question-box">
            <strong>{scene.question}</strong>
            <p>{scene.answer}</p>
          </div>
        </article>

        <div className="animation-board">
          <SceneAnimation scene={scene.id} activeProcess={activeProcess} queuedProcesses={queuedProcesses} playCount={playCount} />
        </div>
      </section>

      <footer className="lesson-controls">
        <button className="control-button" onClick={() => goToScene(sceneIndex - 1)} disabled={sceneIndex === 0} type="button">
          <ArrowLeft size={18} />
          이전
        </button>
        <button className="control-button primary" onClick={() => setPlayCount((count) => count + 1)} type="button">
          <Play size={18} />
          애니메이션 한 번 보기
        </button>
        <button className="control-button" onClick={() => setPlayCount(0)} type="button">
          <RotateCcw size={18} />
          다시 보기
        </button>
        <button
          className="control-button"
          onClick={() => goToScene(sceneIndex + 1)}
          disabled={sceneIndex === SCENES.length - 1}
          type="button"
        >
          다음
          <ArrowRight size={18} />
        </button>
      </footer>
    </main>
  );
}

function SceneAnimation({
  scene,
  activeProcess,
  queuedProcesses,
  playCount,
}: {
  scene: SceneId;
  activeProcess: ProcessItem;
  queuedProcesses: ProcessItem[];
  playCount: number;
}) {
  if (scene === 'process') {
    return (
      <div className="process-intro">
        {PROCESSES.map((process, index) => (
          <div className="program-card" key={`${process.id}-${playCount}`} style={{ '--accent': process.color, '--delay': `${index * 120}ms` } as React.CSSProperties}>
            <Users size={22} />
            <strong>{process.name}</strong>
            <p>{process.label}</p>
            <small>상태: ready</small>
          </div>
        ))}
      </div>
    );
  }

  if (scene === 'queue') {
    return (
      <div className="queue-scene" key={playCount}>
        <div className="queue-title">Ready Queue</div>
        <div className="queue-track">
          {PROCESSES.map((process, index) => (
            <ProcessToken key={process.id} process={process} index={index} />
          ))}
        </div>
        <div className="queue-note">왼쪽부터 CPU 차례를 기다립니다</div>
      </div>
    );
  }

  if (scene === 'dispatch') {
    return (
      <div className="dispatch-scene" key={playCount}>
        <div className="mini-queue">
          {queuedProcesses.map((process, index) => (
            <ProcessToken key={process.id} process={process} index={index} />
          ))}
        </div>
        <div className="dispatch-path">
          <ProcessToken process={activeProcess} index={0} moving />
        </div>
        <div className="cpu-socket">
          <Cpu size={34} />
          <strong>CPU</strong>
          <span>{activeProcess.name} 실행 중</span>
        </div>
      </div>
    );
  }

  if (scene === 'quantum') {
    return (
      <div className="quantum-scene" key={playCount}>
        <div className="cpu-socket large">
          <Cpu size={36} />
          <strong>{activeProcess.name}</strong>
          <span>CPU 사용 중</span>
        </div>
        <div className="time-slices">
          {[1, 2, 3, 4].map((slice) => (
            <span key={slice}>tick {slice}</span>
          ))}
        </div>
        <div className="return-line">quantum 종료 후 Ready Queue 뒤로 이동</div>
      </div>
    );
  }

  if (scene === 'io') {
    return (
      <div className="io-scene" key={playCount}>
        <div className="cpu-socket">
          <Cpu size={32} />
          <strong>CPU</strong>
        </div>
        <ProcessToken process={activeProcess} index={0} moving />
        <div className="io-device">
          <HardDrive size={34} />
          <strong>I/O Wait</strong>
          <span>디스크 응답 대기</span>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-scene" key={playCount}>
      <div className="memory-sidebar">
        <MemoryStick size={30} />
        <strong>{activeProcess.name}</strong>
        <span>필요한 페이지: P0, P1, P2</span>
      </div>
      <div className="frame-grid">
        {Array.from({ length: 8 }, (_, index) => (
          <div className={index < 3 ? 'frame filled' : 'frame'} key={index}>
            <small>Frame {index}</small>
            <strong>{index < 3 ? `P${index}` : '-'}</strong>
            <span>{index < 3 ? activeProcess.name : 'empty'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcessToken({
  process,
  index,
  moving = false,
}: {
  process: ProcessItem;
  index: number;
  moving?: boolean;
}) {
  return (
    <div
      className={`process-token ${moving ? 'moving' : ''}`}
      style={{ '--accent': process.color, '--delay': `${index * 120}ms` } as React.CSSProperties}
    >
      <strong>{process.name}</strong>
      <span>{process.label}</span>
    </div>
  );
}

export default App;
