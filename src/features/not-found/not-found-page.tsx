import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex w-full flex-col items-start gap-4 p-6 md:p-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you are looking for does not exist.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">Back to library</Link>
      </Button>
    </div>
  );
}
