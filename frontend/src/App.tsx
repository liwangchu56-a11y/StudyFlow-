import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, BrowserRouter, Routes } from "react-router-dom";
import { PageShell } from "./components/layout/PageShell";
import { SecondaryMenu } from "./components/layout/SecondaryMenu";
import { ChatPage } from "./pages/ChatPage";
import { HomePage } from "./pages/HomePage";
import { useUiStore } from "./store/uiStore";

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  const toast = useUiStore((s) => s.toast);
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* ChatPage 自己管 100vh 全宽布局, 不走 PageShell */}
          <Route path="/" element={<ChatPage />} />
          {/* 其他页面走 PageShell 居中布局 */}
          <Route path="/timer" element={<PageShell><HomePage /></PageShell>} />
          <Route path="*" element={<ChatPage />} />
        </Routes>
        <SecondaryMenu />
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full glass shadow-card-hover text-sm text-slate-900 animate-slide-up-spring">
            {toast}
          </div>
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
}