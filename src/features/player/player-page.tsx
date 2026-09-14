import { useParams } from "react-router-dom";
import PagePlaceholder from "@/components/app/page-placeholder";

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <PagePlaceholder
      title="Player"
      description="The video surface and control dock live here."
      detail={`Playing media id: ${id}`}
    />
  );
}
