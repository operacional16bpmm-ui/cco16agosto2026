"use client";

import { Children, createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { GripVertical, LayoutDashboard, Lock, RotateCcw, Unlock } from "lucide-react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type ResponsiveLayouts,
} from "react-grid-layout";
import { toast } from "sonner";

type Breakpoint = "lg" | "md" | "sm" | "xs";

const STORAGE_KEY = "cop2026-dashboard-layout-v2";
const KPI_STORAGE_KEY = "cop2026-dashboard-kpi-layout-v1";
const DashboardEditingContext = createContext(false);

const DEFAULT_LAYOUT: ResponsiveLayouts<Breakpoint> = {
  lg: [
    { i: "situacao", x: 0, y: 0, w: 12, h: 24, minW: 5, minH: 13 },
    { i: "semanal", x: 0, y: 24, w: 12, h: 14, minW: 5, minH: 8 },
    { i: "onde-agir", x: 0, y: 38, w: 12, h: 17, minW: 5, minH: 9 },
    { i: "atencao", x: 0, y: 55, w: 12, h: 13, minW: 5, minH: 8 },
    { i: "analise", x: 0, y: 68, w: 12, h: 20, minW: 6, minH: 10 },
    { i: "tabela", x: 0, y: 88, w: 12, h: 18, minW: 6, minH: 10 },
    { i: "lancamentos", x: 0, y: 106, w: 12, h: 18, minW: 6, minH: 10 },
    { i: "galeria", x: 0, y: 124, w: 12, h: 12, minW: 4, minH: 7 },
  ],
  md: [],
  sm: [],
  xs: [],
};

const LABELS: Record<string, string> = {
  situacao: "Situação e indicadores",
  semanal: "Metas semanais",
  "onde-agir": "Onde agir e exceções",
  atencao: "Pontos de atenção",
  analise: "Análise técnica",
  tabela: "Tabela analítica",
  lancamentos: "Lançamentos",
  galeria: "Registro operacional",
};

function singleColumn(layout: Layout): Layout {
  let y = 0;
  return layout.map((item) => {
    const next = { ...item, x: 0, y, w: 1, minW: 1, h: Math.max(item.minH ?? 6, item.h) };
    y += next.h;
    return next;
  });
}

function makeResponsive(layout: ResponsiveLayouts<Breakpoint>) {
  const desktop: Layout = layout.lg?.length ? layout.lg : (DEFAULT_LAYOUT.lg ?? []);
  return {
    lg: desktop,
    md: layout.md?.length ? layout.md : desktop.map((item) => ({ ...item, w: Math.min(8, item.w), x: 0, minW: Math.min(4, item.minW ?? 1) })),
    sm: layout.sm?.length ? layout.sm : singleColumn(desktop),
    xs: layout.xs?.length ? layout.xs : singleColumn(desktop),
  } satisfies ResponsiveLayouts<Breakpoint>;
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const [editing, setEditing] = useState(false);
  const [layouts, setLayouts] = useState<ResponsiveLayouts<Breakpoint>>(() => makeResponsive(DEFAULT_LAYOUT));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setLayouts(makeResponsive(JSON.parse(saved) as ResponsiveLayouts<Breakpoint>));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  const items = useMemo(
    () =>
      Children.toArray(children).map((child) => {
        const rawKey = typeof child === "object" && child && "key" in child ? String(child.key) : "painel";
        const key = rawKey.replace(/^\.\$/, "");
        return (
          <div key={key} className={editing ? "dashboard-widget dashboard-widget-editing" : "dashboard-widget"}>
            {editing && (
              <div className="dashboard-widget-handle nao-imprime" title="Arraste para mover este quadro">
                <GripVertical size={17} aria-hidden />
                <span>{LABELS[key] ?? "Quadro do dashboard"}</span>
                <span className="ml-auto text-[10px] font-semibold opacity-70">arraste aqui · redimensione pelos cantos</span>
              </div>
            )}
            <div className="dashboard-widget-content">{child}</div>
          </div>
        );
      }),
    [children, editing]
  );

  function resetLayout() {
    const fresh = makeResponsive(DEFAULT_LAYOUT);
    setLayouts(fresh);
    window.localStorage.removeItem(STORAGE_KEY);
    toast.success("Disposição padrão restaurada.");
  }

  function onLayoutChange(_current: Layout, next: ResponsiveLayouts<Breakpoint>) {
    setLayouts(next);
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <DashboardEditingContext.Provider value={editing}>
    <div ref={containerRef}>
      <div className="nao-imprime sticky top-2 z-40 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white/95 p-2.5 shadow-lg backdrop-blur">
        <span className="mr-auto inline-flex items-center gap-2 px-2 text-xs font-black uppercase tracking-wider text-slate-800">
          <LayoutDashboard size={17} className="text-vermelho" aria-hidden />
          Painel configurável
        </span>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          aria-pressed={editing}
          className="inline-flex items-center gap-2 rounded-xl bg-vermelho px-3.5 py-2 text-xs font-black text-white shadow-sm hover:bg-vermelho-escuro"
        >
          {editing ? <Lock size={15} aria-hidden /> : <Unlock size={15} aria-hidden />}
          {editing ? "Concluir organização" : "Organizar quadros"}
        </button>
        <button
          type="button"
          onClick={resetLayout}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2 text-xs font-black text-slate-700 hover:border-vermelho hover:text-vermelho"
        >
          <RotateCcw size={15} aria-hidden /> Restaurar padrão
        </button>
        <p className="w-full px-2 text-[11px] font-semibold text-slate-600">
          {editing
            ? "Arraste pela faixa vermelha e aumente ou diminua pelos cantos. A disposição é salva automaticamente neste navegador."
            : "Sua disposição fica salva automaticamente. Clique em Organizar quadros para mover ou redimensionar."}
        </p>
      </div>

      {mounted && (
        <ResponsiveGridLayout<Breakpoint>
          width={width}
          breakpoints={{ lg: 1200, md: 768, sm: 480, xs: 0 }}
          cols={{ lg: 12, md: 8, sm: 1, xs: 1 }}
          layouts={layouts}
          rowHeight={32}
          margin={{ lg: [20, 20], md: [16, 16], sm: [12, 12], xs: [10, 10] }}
          containerPadding={null}
          compactor={verticalCompactor}
          dragConfig={{ enabled: editing, handle: ".dashboard-widget-handle", bounded: true }}
          resizeConfig={{ enabled: editing, handles: ["se", "sw", "ne", "nw"] }}
          onLayoutChange={onLayoutChange}
          className="dashboard-configurable-grid"
        >
          {items}
        </ResponsiveGridLayout>
      )}
    </div>
    </DashboardEditingContext.Provider>
  );
}

const DEFAULT_KPI_LAYOUT: ResponsiveLayouts<Breakpoint> = {
  lg: [
    { i: "Cumprimento da meta", x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 4 },
    { i: "Ritmo necessário", x: 6, y: 0, w: 6, h: 6, minW: 3, minH: 4 },
    { i: "Evidências auditadas", x: 0, y: 6, w: 4, h: 4, minW: 2, minH: 3 },
    { i: "Auditores ativos", x: 4, y: 6, w: 4, h: 4, minW: 2, minH: 3 },
    { i: "Conformidade (≥3)", x: 8, y: 6, w: 4, h: 4, minW: 2, minH: 3 },
    { i: "resumo-indicadores", x: 0, y: 10, w: 12, h: 2, minW: 4, minH: 2 },
  ],
  md: [],
  sm: [],
  xs: [],
};

export function DashboardKpiLayout({ children }: { children: ReactNode }) {
  const editing = useContext(DashboardEditingContext);
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const [layouts, setLayouts] = useState<ResponsiveLayouts<Breakpoint>>(() => makeResponsive(DEFAULT_KPI_LAYOUT));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KPI_STORAGE_KEY);
      if (saved) setLayouts(makeResponsive(JSON.parse(saved) as ResponsiveLayouts<Breakpoint>));
    } catch {
      window.localStorage.removeItem(KPI_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  const items = useMemo(
    () =>
      Children.toArray(children).map((child) => {
        const rawKey = typeof child === "object" && child && "key" in child ? String(child.key) : "indicador";
        const key = rawKey.replace(/^\.\$/, "");
        return (
          <div key={key} className={editing ? "dashboard-kpi dashboard-kpi-editing" : "dashboard-kpi"}>
            {editing && (
              <div className="dashboard-kpi-handle nao-imprime" title={`Mover ${key}`}>
                <GripVertical size={14} aria-hidden />
                <span className="truncate">{key === "resumo-indicadores" ? "Resumo operacional" : key}</span>
              </div>
            )}
            <div className="dashboard-kpi-content">{child}</div>
          </div>
        );
      }),
    [children, editing]
  );

  function onLayoutChange(_current: Layout, next: ResponsiveLayouts<Breakpoint>) {
    setLayouts(next);
    if (hydrated) window.localStorage.setItem(KPI_STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <div ref={containerRef} className="min-w-0">
      {mounted && (
        <ResponsiveGridLayout<Breakpoint>
          width={width}
          breakpoints={{ lg: 700, md: 520, sm: 360, xs: 0 }}
          cols={{ lg: 12, md: 8, sm: 1, xs: 1 }}
          layouts={layouts}
          rowHeight={34}
          margin={{ lg: [14, 14], md: [12, 12], sm: [10, 10], xs: [8, 8] }}
          containerPadding={null}
          compactor={verticalCompactor}
          dragConfig={{ enabled: editing, handle: ".dashboard-kpi-handle", bounded: true }}
          resizeConfig={{ enabled: editing, handles: ["se", "sw", "ne", "nw"] }}
          onLayoutChange={onLayoutChange}
          className="dashboard-kpi-grid"
        >
          {items}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
