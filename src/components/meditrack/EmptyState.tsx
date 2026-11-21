import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-surface px-6 py-12 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-teal-soft text-teal">
        <Icon className="size-8" aria-hidden />
      </span>
      <h2 className="mt-5 text-2xl font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-lg text-muted-foreground">{description}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
