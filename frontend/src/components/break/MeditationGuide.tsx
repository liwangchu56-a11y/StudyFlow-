import { useEffect, useState } from "react";

export function MeditationGuide({ onDone }: { onDone: () => void }) {
  const [sec, setSec] = useState(120);
  useEffect(() => {
    if (sec <= 0) { onDone(); return; }
    const id = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [sec, onDone]);
  return (
    <Guide title="冥想引导" subtitle="闭眼, 深呼吸, 专注于当下的感受">
      <div className="text-display text-7xl text-violet-600 tabular-nums">
        {Math.floor(sec / 60)}:{(sec % 60).toString().padStart(2, "0")}
      </div>
      <p className="text-sm text-slate-600 mt-4 max-w-xs">吸气 4 秒 → 屏息 4 秒 → 呼气 6 秒</p>
    </Guide>
  );
}

function Guide({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="card-elevated p-10 text-center">
      <div className="text-eyebrow mb-2">BREAK</div>
      <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-slate-500 mb-8">{subtitle}</p>
      <div className="flex flex-col items-center">{children}</div>
    </div>
  );
}

export { Guide };