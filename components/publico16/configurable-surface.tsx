"use client";

import { Children, type ReactNode, useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import {
  ResponsiveGridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type ResponsiveLayouts,
} from "react-grid-layout";

type Breakpoint = "lg" | "sm";

export type SurfaceItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

function mobile(layout: Layout): Layout {
  let y = 0;
  return layout.map((item) => {
    const next = { ...item, x: 0, y, w: 1, minW: 1 };
    y += next.h;
    return next;
  });
}

export function ConfigurableSurface({
  storageKey,
  editing,
  resetToken,
  defaults,
  labels,
  children,
  dark = false,
  className = "",
}: {
  storageKey: string;
  editing: boolean;
  resetToken: number;
  defaults: SurfaceItem[];
  labels: Record<string, string>;
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const makeDefault = () => ({ lg: defaults, sm: mobile(defaults) }) satisfies ResponsiveLayouts<Breakpoint>;
  const [layouts, setLayouts] = useState<ResponsiveLayouts<Breakpoint>>(makeDefault);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      setLayouts(saved ? (JSON.parse(saved) as ResponsiveLayouts<Breakpoint>) : makeDefault());
    } catch {
      window.localStorage.removeItem(storageKey);
      setLayouts(makeDefault());
    } finally {
      setHydrated(true);
    }
    // defaults are intentionally supplied as stable module constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, resetToken]);

  const items = useMemo(
    () =>
      Children.toArray(children).map((child) => {
        const raw = typeof child === "object" && child && "key" in child ? String(child.key) : "conteudo";
        const key = raw.replace(/^\.\$/, "");
        return (
          <div
            key={key}
            className={`surface-item ${editing ? "surface-item-editing" : ""} ${dark ? "surface-item-dark" : ""}`}
          >
            {editing && (
              <div className="surface-drag-handle nao-imprime" title={`Mover ${labels[key] ?? key}`}>
                <GripVertical size={14} aria-hidden />
                <span className="truncate">{labels[key] ?? key}</span>
                <span className="ml-auto hidden text-[9px] opacity-70 sm:inline">mover · redimensionar</span>
              </div>
            )}
            <div className="surface-item-content">{child}</div>
          </div>
        );
      }),
    [children, dark, editing, labels]
  );

  function onLayoutChange(_current: Layout, next: ResponsiveLayouts<Breakpoint>) {
    setLayouts(next);
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  return (
    <div ref={containerRef} className={className}>
      {mounted && (
        <ResponsiveGridLayout<Breakpoint>
          width={width}
          breakpoints={{ lg: 640, sm: 0 }}
          cols={{ lg: 12, sm: 1 }}
          layouts={layouts}
          rowHeight={32}
          margin={{ lg: [16, 16], sm: [10, 10] }}
          containerPadding={null}
          compactor={verticalCompactor}
          dragConfig={{ enabled: editing, handle: ".surface-drag-handle", bounded: true }}
          resizeConfig={{ enabled: editing, handles: ["se", "sw", "ne", "nw"] }}
          onLayoutChange={onLayoutChange}
          className="configurable-surface-grid"
        >
          {items}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
