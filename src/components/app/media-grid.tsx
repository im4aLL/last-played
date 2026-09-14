import { Link } from "react-router-dom";
import PosterCard from "@/components/app/poster-card";
import { progressRatio, type MediaItem } from "@/lib/types";

export default function MediaGrid({ items }: { items: MediaItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
      {items.map((item) => (
        <Link key={item.id} to={`/media/${item.id}`} className="group">
          <PosterCard
            title={item.title}
            year={item.year}
            posterUrl={item.posterUrl}
            mediaType={item.type}
            progress={progressRatio(item.progress)}
            watched={item.progress?.watched ?? false}
            className="w-full sm:w-full"
          />
        </Link>
      ))}
    </div>
  );
}
