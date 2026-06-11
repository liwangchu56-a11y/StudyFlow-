import { useCallback } from "react";

export function useBrowserNotify() {
  const supported = typeof window !== "undefined" && "Notification" in window;

  const request = useCallback(async () => {
    if (!supported) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const r = await Notification.requestPermission();
    return r === "granted";
  }, [supported]);

  const notify = useCallback(
    async (title: string, body?: string) => {
      if (!supported) return;
      const ok = await request();
      if (!ok) return;
      try {
        new Notification(title, { body, silent: true });
      } catch {
        // 某些环境下 new Notification 不支持, 忽略
      }
    },
    [supported, request],
  );

  return { supported, request, notify };
}