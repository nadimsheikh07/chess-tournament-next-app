"use client";

import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import SportsEsportsRounded from "@mui/icons-material/SportsEsportsRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-api";

const navigationItems = [
  {
    label: "Matches",
    href: "/matches",
    icon: <SportsEsportsRounded />,
  },
  {
    label: "Tournaments",
    href: "/admin/tournaments",
    icon: <EmojiEventsRounded />,
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function handleLogout() {
    setLogoutError(null);
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error, "Unable to sign out."));
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <Box className="admin-shell">
      <Box
        component="aside"
        className={`admin-sidebar${isSidebarOpen ? " admin-sidebar-open" : ""}`}
        aria-label="Workspace navigation"
      >
        <Link className="admin-brand" href="/matches">
          <Box className="admin-brand-mark">
            <EmojiEventsRounded />
          </Box>
          <Box>
            <Typography className="admin-brand-name">KINGDOM</Typography>
            <Typography className="admin-brand-caption">CHESS CLUB</Typography>
          </Box>
        </Link>

        <Typography className="admin-nav-label">Workspace</Typography>
        <Box component="nav" className="admin-nav">
          {navigationItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`admin-nav-item${isActive ? " admin-nav-item-active" : ""}`}
                href={item.href}
                key={item.href}
                onClick={() => setIsSidebarOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </Box>

        <Paper className="admin-sidebar-note" elevation={0}>
          <Typography className="admin-sidebar-note-title">
            Manage your events
          </Typography>
          <Typography className="admin-sidebar-note-copy">
            Create and update tournaments for your chess community.
          </Typography>
        </Paper>
      </Box>

      {isSidebarOpen && (
        <button
          aria-label="Close navigation"
          className="admin-sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      )}

      <Box className="admin-workspace">
        <Box component="header" className="admin-header">
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <IconButton
              aria-label={
                isSidebarOpen ? "Close navigation" : "Open navigation"
              }
              className="admin-menu-button"
              onClick={() => setIsSidebarOpen((open) => !open)}
            >
              <MenuRounded />
            </IconButton>
            <Box>
              <Typography className="admin-header-title">
                Chess workspace
              </Typography>
              <Typography className="admin-header-subtitle">
                Kingdom of Chess
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            {isLoading ? (
              <CircularProgress aria-label="Loading account" size={20} />
            ) : user ? (
              <>
                <Avatar className="admin-user-avatar">
                  {user.email.slice(0, 2).toUpperCase()}
                </Avatar>
                <Box className="admin-user-details">
                  <Typography className="admin-user-email">
                    {user.email}
                  </Typography>
                  <Typography className="admin-user-role">
                    {user.role}
                  </Typography>
                </Box>
                <Button
                  disabled={isLoggingOut}
                  onClick={() => void handleLogout()}
                  startIcon={<LogoutRounded />}
                  size="small"
                >
                  {isLoggingOut ? "Signing out…" : "Sign out"}
                </Button>
              </>
            ) : (
              <Button component={Link} href="/auth/login" size="small">
                Sign in
              </Button>
            )}
          </Stack>
        </Box>

        {logoutError && (
          <Alert
            className="admin-logout-error"
            onClose={() => setLogoutError(null)}
            severity="error"
          >
            {logoutError}
          </Alert>
        )}

        <Box component="main" className="admin-main">
          {children}
        </Box>

        <Box component="footer" className="admin-footer">
          <Typography>Kingdom of Chess</Typography>
          <Typography>Chess workspace</Typography>
        </Box>
      </Box>
    </Box>
  );
}
