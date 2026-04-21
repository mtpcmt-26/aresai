import { MessageSquare, Plus, Settings, Trash2, User } from "lucide-react";
import { Conversation } from "@/lib/conversations";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMode } from "@/lib/modes";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
}

export const AppSidebar = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onOpenSettings,
  onOpenAccount,
}: Props) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Button
          onClick={onNew}
          variant="outline"
          className="h-9 w-full justify-start gap-2 rounded-sm border-sidebar-border bg-transparent font-display text-xs font-bold uppercase tracking-[0.16em] hover:bg-sidebar-accent"
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span>New chat</span>}
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/60">
              Conversations
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {sorted.length === 0 && !collapsed && (
                <p className="px-2 py-2 text-xs text-sidebar-foreground/50">
                  No conversations yet.
                </p>
              )}
              {sorted.map((c) => {
                const meta = getMode(c.mode);
                const active = c.id === activeId;
                return (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn(
                        "group/conv h-auto items-start gap-2 rounded-sm py-2",
                        active && "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <button
                        onClick={() => onSelect(c.id)}
                        className="w-full text-left"
                      >
                        <MessageSquare
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: `hsl(var(${meta.accentVar}))` }}
                        />
                        {!collapsed && (
                          <div className="flex min-w-0 flex-1 items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium leading-tight">
                                {c.title}
                              </div>
                              <div className="mt-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/50">
                                {meta.label}
                              </div>
                            </div>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(c.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  onDelete(c.id);
                                }
                              }}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm opacity-0 transition hover:bg-sidebar-border group-hover/conv:opacity-100"
                              aria-label="Delete conversation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </span>
                          </div>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenAccount} className="rounded-sm">
              <User className="h-4 w-4" />
              {!collapsed && <span>Account</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenSettings} className="rounded-sm">
              <Settings className="h-4 w-4" />
              {!collapsed && <span>Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
