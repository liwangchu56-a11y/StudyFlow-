import { useUiStore } from "../../store/uiStore";
import { MeditationGuide } from "./MeditationGuide";
import { StretchGuide } from "./StretchGuide";
import { EyeExerciseGuide } from "./EyeExerciseGuide";
import { WaterBreak } from "./WaterBreak";

export function BreakGuideOverlay() {
  const data = useUiStore((s) => s.modalData) as { guide?: string } | null;
  const closeModal = useUiStore((s) => s.closeModal);
  if (!data?.guide) return null;
  const onDone = closeModal;
  return (
    <div className="fixed inset-0 z-50 bg-gradient-page flex items-center justify-center p-4 animate-fade-in-up">
      <div className="w-full max-w-md">
        {data.guide === "meditation" && <MeditationGuide onDone={onDone} />}
        {data.guide === "stretch" && <StretchGuide onDone={onDone} />}
        {data.guide === "eye" && <EyeExerciseGuide onDone={onDone} />}
        {data.guide === "water" && <WaterBreak onDone={onDone} />}
      </div>
    </div>
  );
}