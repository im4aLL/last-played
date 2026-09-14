import {
  Clapperboard,
  Film,
  PlusCircle,
  Settings,
  type LucideIcon,
} from "lucide-react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useMatch,
} from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import SyncIndicator from "@/features/sync/sync-indicator";
import ThemeToggle from "@/components/app/theme-toggle";
import { useMedia } from "@/features/media/use-media";
import { useAppConfig } from "@/lib/app-config";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Library", icon: Film, end: true },
  { to: "/add", label: "Add media", icon: PlusCircle },
  { to: "/settings", label: "Settings", icon: Settings },
];

function sectionTitle(pathname: string, mediaTitle: string | null) {
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/add")) return "Add media";
  if (pathname.startsWith("/media")) return mediaTitle ?? "Media";
  if (pathname.startsWith("/player")) return "Player";
  return "Library";
}

function SidebarNavItem({ item }: { item: NavItem }) {
  const { pathname } = useLocation();
  const Icon = item.icon;
  const isActive = item.end
    ? pathname === item.to
    : pathname.startsWith(item.to);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <NavLink to={item.to} end={item.end}>
          <Icon />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function AppShell() {
  const { pathname } = useLocation();
  const dbMode = useAppConfig((state) => state.dbMode);
  const mediaId = useMatch("/media/:id")?.params.id ?? "";
  const { detail } = useMedia(mediaId);

  if (dbMode === null) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false} className="h-svh overflow-hidden">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link to="/">
                    <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Clapperboard className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-heading font-semibold">
                        Last Played
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        Local library
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Browse</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => (
                    <SidebarNavItem key={item.to} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarRail />
        </Sidebar>

        <SidebarInset className="overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
            />
            <h1 className="font-heading text-sm font-medium">
              {sectionTitle(pathname, detail?.title ?? null)}
            </h1>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <SyncIndicator />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
