import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import type { SurfaceLevel } from "./types";
import styles from "./glass-panel.module.css";

type GlassPanelProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  level?: SurfaceLevel;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function GlassPanel<T extends ElementType = "div">({
  as,
  children,
  level = "base",
  className,
  ...props
}: GlassPanelProps<T>) {
  const Component = as ?? "div";
  return (
    <Component
      className={[styles.panel, styles[level], className].filter(Boolean).join(" ")}
      data-surface-level={level}
      {...props}
    >
      {children}
    </Component>
  );
}
