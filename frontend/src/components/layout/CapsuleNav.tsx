import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "开始学习", icon: "study" },
  { to: "/cards", label: "知识卡", icon: "cards" },
  { to: "/todos", label: "待办", icon: "todos" },
  { to: "/stats", label: "统计", icon: "stats" },
];

function Icon({ name }: { name: string }) {
  // 极简线性图标, 18px stroke
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "study":
      return (
        <svg {...props}>
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5v-18Z" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        </svg>
      );
    case "cards":
      return (
        <svg {...props}>
          <rect x="3" y="6" width="14" height="14" rx="2.5" />
          <path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3H19.5A1.5 1.5 0 0 1 21 4.5v12" />
        </svg>
      );
    case "todos":
      return (
        <svg {...props}>
          <rect x="4" y="3" width="16" height="18" rx="2.5" />
          <path d="M8 9l2.5 2.5L15 7" />
          <path d="M8 16h8" />
        </svg>
      );
    case "stats":
      return (
        <svg {...props}>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20H2" />
        </svg>
      );
    default:
      return null;
  }
}

export function CapsuleNav() {
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="glass rounded-full p-1.5 flex gap-1 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.18),0_0_0_1px_rgba(255,255,255,0.4)_inset]">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === "/"}
            className={({ isActive }) =>
              `group relative flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute inset-0 rounded-full bg-gradient-violet shadow-glow-violet"
                    aria-hidden
                    style={{
                      background:
                        "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                    }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon name={it.icon} />
                  <span className="hidden sm:inline tracking-tight">
                    {it.label}
                  </span>
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}