import { cn } from "@/lib/utils";

export function BrandMark({ stacked = false }: { stacked?: boolean }) {
  return (
    <div className={cn("min-w-0", stacked && "space-y-1")}>
      <div className="font-display text-[1.35rem] leading-none tracking-tight text-foreground">
        Amplify
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">ContractOS</div>
    </div>
  );
}
