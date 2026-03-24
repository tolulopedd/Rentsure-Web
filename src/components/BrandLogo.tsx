import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: {
    mark: "h-9 w-9 rounded-[0.9rem]",
    gap: "gap-3",
    wordmark: "text-[1.8rem]",
    tagline: "text-[0.65rem]"
  },
  md: {
    mark: "h-11 w-11 rounded-[1rem]",
    gap: "gap-3.5",
    wordmark: "text-[2.2rem]",
    tagline: "text-[0.72rem]"
  },
  lg: {
    mark: "h-14 w-14 rounded-[1.2rem]",
    gap: "gap-4",
    wordmark: "text-[3rem]",
    tagline: "text-[0.84rem]"
  }
} as const;

export function BrandLogo({ className, showTagline = false, size = "md" }: BrandLogoProps) {
  const config = sizes[size];

  return (
    <div className={cn("inline-flex items-center", config.gap, className)}>
      <div className={cn("grid grid-cols-2 grid-rows-2 gap-1.5", config.mark)}>
        <span className="row-span-2 rounded-[inherit] bg-[var(--rentsure-blue)] shadow-[0_10px_30px_-12px_rgba(18,0,255,0.7)]" />
        <span className="rounded-[inherit] bg-slate-950" />
        <span className="rounded-[inherit] bg-slate-300" />
      </div>

      <div className="leading-none">
        <div className={cn("font-black tracking-[-0.08em] text-slate-950", config.wordmark)}>
          <span className="text-[var(--rentsure-blue)]">Rent</span>
          <span>Sure</span>
        </div>
        {showTagline ? (
          <div className={cn("mt-1 font-light tracking-[-0.04em] text-slate-400", config.tagline)}>
            landlord and tenant relationship
          </div>
        ) : null}
      </div>
    </div>
  );
}
