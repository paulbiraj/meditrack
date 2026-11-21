import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function SafetyNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-teal/20 bg-teal-soft p-4 text-base text-accent-foreground",
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 size-6 shrink-0 text-teal" aria-hidden />
      <p>
        <strong className="font-semibold">Follow your prescription.</strong> Take each medicine exactly as
        your doctor or pharmacist instructed. If you miss a dose, don't take extra to make up for it —
        check your instructions or ask your pharmacist.
      </p>
    </div>
  );
}
