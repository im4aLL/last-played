import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppShell from "@/components/app/app-shell";
import LibraryPage from "@/features/library/library-page";
import AddMediaPage from "@/features/media/add-media-page";
import MediaPage from "@/features/media/media-page";
import NotFoundPage from "@/features/not-found/not-found-page";
import PlayerPage from "@/features/player/player-page";
import SettingsPage from "@/features/settings/settings-page";
import SetupPage from "@/features/setup/setup-page";
import { useAppConfig } from "@/lib/app-config";

const router = createBrowserRouter([
  {
    path: "/setup",
    element: <SetupPage />,
  },
  {
    path: "/player/:id",
    element: <PlayerPage />,
  },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <LibraryPage /> },
      { path: "add", element: <AddMediaPage /> },
      { path: "media/:id", element: <MediaPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

function AppLoading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="font-heading text-sm font-medium">Last Played</p>
    </div>
  );
}

export default function App() {
  const loaded = useAppConfig((state) => state.loaded);
  const load = useAppConfig((state) => state.load);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) {
    return <AppLoading />;
  }

  return <RouterProvider router={router} />;
}
