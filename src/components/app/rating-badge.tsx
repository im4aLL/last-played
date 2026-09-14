import { Star } from "lucide-react";
import { cn } from "cn";

type RatingBadgeProps = {
  value: number | null | undefined;
  className?: string;
};

function formatRating(value: number | null | undefined): string | null {
  if (value == null || value <= 0) return null;
  return value.toFixed(1);
}

export default function RatingBadge({ value, className }: RatingBadgeProps) {
  const label = formatRating(value);
  if (label == null) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-1 font-medium", className)}
      title={`Rated ${label} out of 10 on TMDB`}
    >
      <Star className="size-3.5 fill-amber-400 text-amber-400" />
      <span className="tabular-nums">{label}</span>
    </span>
  );
}
