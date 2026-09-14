import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppShell from "@/components/app/app-shell";
import LibraryPage from "@/features/library/library-page";
import MediaPage from "@/features/media/media-page";
import NotFoundPage from "@/features/not-found/not-found-page";
import PlayerPage from "@/features/player/player-page";
import SettingsPage from "@/features/settings/settings-page";
import SetupPage from "@/features/setup/setup-page";

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
      { path: "media/:id", element: <MediaPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
