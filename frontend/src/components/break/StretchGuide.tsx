import { useEffect, useState } from "react";
import { Guide } from "./MeditationGuide";

const moves = [
  { name: "颈部环绕", desc: "头部缓慢顺时针 4 圈, 逆时针 4 圈" },
  { name: "肩部旋转", desc: "双肩向前 4 圈, 向后 4 圈" },
  { name: "腰部扭转", desc: "双脚分开, 身体左右扭转各 8 次" },
  { name: "腿部拉伸", desc: "扶墙, 前后腿弓步拉伸, 每侧 15 秒" },
];

export function StretchGuide({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [sec, setSec] = useState(30);
  useEffect(() => {
    if (sec <= 0) {
      if (i + 1 >= moves.length) { onDone(); return; }
      setI(i + 1);
      setSec(30);
      return;
    }
    const id = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [sec, i, onDone]);
  const m = moves[i];
  return (
    <Guide title="拉伸运动" subtitle={`动作 ${i + 1} / ${moves.length}: ${m.name}`}>
      <div className="text-display text-7xl text-violet-600 tabular-nums mb-4">{sec}s</div>
      <p className="text-sm text-slate-600 max-w-xs">{m.desc}</p>
    </Guide>
  );
}