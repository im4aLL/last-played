import { useParams } from "react-router-dom";
import PagePlaceholder from "@/components/app/page-placeholder";

export default function MediaPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <PagePlaceholder
      title="Media detail"
      description="Overview, seasons, and episodes for a movie or show."
      detail={`Media id: ${id}`}
    />
  );
}
