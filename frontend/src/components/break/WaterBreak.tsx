import { useEffect, useState } from "react";
import { Guide } from "./MeditationGuide";

export function WaterBreak({ onDone }: { onDone: () => void }) {
  const [sec, setSec] = useState(5);
  useEffect(() => {
    if (sec <= 0) { onDone(); return; }
    const id = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [sec, onDone]);
  return (
    <Guide title="喝水休息" subtitle="起身倒杯水, 小口喝">
      <div className="text-7xl mb-4">💧</div>
      <div className="text-display text-5xl text-violet-600 tabular-nums">{sec}s</div>
    </Guide>
  );
}