import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative">
      {/* 多层径向渐变背景, 比单一线性更有深度 */}
      <div
        className="fixed inset-0 -z-10 bg-gradient-page"
        aria-hidden
      />
      {/* 装饰性大色块, 极淡 */}
      <div
        className="fixed top-0 left-1/4 w-[600px] h-[600px] -z-10 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(196,181,253,0.4) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="fixed bottom-0 right-1/4 w-[500px] h-[500px] -z-10 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(165,180,252,0.4) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <main className="mx-auto max-w-5xl px-5 pt-6 pb-4 sm:pt-8 sm:pb-6 animate-fade-in-up">
        {children}
      </main>
    </div>
  );
}