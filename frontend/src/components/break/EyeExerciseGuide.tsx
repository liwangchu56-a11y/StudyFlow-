import { useEffect, useState } from "react";
import { Guide } from "./MeditationGuide";

const steps = [
  "远眺 6 米外的物体 10 秒",
  "看近处指尖 5 秒",
  "上下左右转动眼球各 4 次",
  "闭眼, 双手搓热敷眼 10 秒",
];

export function EyeExerciseGuide({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [sec, setSec] = useState(15);
  useEffect(() => {
    if (sec <= 0) {
      if (i + 1 >= steps.length) { onDone(); return; }
      setI(i + 1);
      setSec(15);
      return;
    }
    const id = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [sec, i, onDone]);
  return (
    <Guide title="眼保健操" subtitle={`步骤 ${i + 1} / ${steps.length}`}>
      <div className="text-display text-7xl text-violet-600 tabular-nums mb-4">{sec}s</div>
      <p className="text-sm text-slate-600 max-w-xs">{steps[i]}</p>
    </Guide>
  );
}