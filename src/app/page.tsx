"use client";

import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SportsEsportsRounded from "@mui/icons-material/SportsEsportsRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-api";

type TournamentStatus = "registration" | "live" | "upcoming";
type TournamentFilter = "all" | "registration" | "live";

type Tournament = {
  id: string;
  name: string;
  format: string;
  date: string;
  players: number;
  capacity: number;
  status: TournamentStatus;
  accent: string;
  initials: string;
};

const tournaments: Tournament[] = [
  {
    id: "rapid-open",
    name: "King's Rapid Open",
    format: "Rapid · 10 + 0",
    date: "Sat, Oct 18 · 10:00 AM",
    players: 18,
    capacity: 32,
    status: "registration",
    accent: "#d9efb2",
    initials: "KR",
  },
  {
    id: "club-championship",
    name: "Club Championship",
    format: "Classical · 30 + 0",
    date: "Sun, Oct 19 · 2:00 PM",
    players: 24,
    capacity: 40,
    status: "registration",
    accent: "#f6d9bd",
    initials: "CC",
  },
  {
    id: "sunday-blitz",
    name: "Sunday Blitz Arena",
    format: "Blitz · 3 + 2",
    date: "Round 4 of 7",
    players: 48,
    capacity: 64,
    status: "live",
    accent: "#cfe5e1",
    initials: "SB",
  },
  {
    id: "junior-classic",
    name: "Junior Chess Classic",
    format: "Rapid · 15 + 5",
    date: "Sat, Oct 25 · 11:00 AM",
    players: 12,
    capacity: 24,
    status: "upcoming",
    accent: "#e1d8f5",
    initials: "JC",
  },
];

const standings = [
  {
    rank: "01",
    name: "Maya Chen",
    handle: "@mayache",
    points: "8.5",
    initials: "MC",
    color: "#d9efb2",
  },
  {
    rank: "02",
    name: "Leo Fischer",
    handle: "@leof",
    points: "7.0",
    initials: "LF",
    color: "#f6d9bd",
  },
  {
    rank: "03",
    name: "Amara Okafor",
    handle: "@amara.o",
    points: "6.5",
    initials: "AO",
    color: "#cfe5e1",
  },
];

const filterLabels: { value: TournamentFilter; label: string }[] = [
  { value: "all", label: "All events" },
  { value: "registration", label: "Open" },
  { value: "live", label: "Live now" },
];

const boardPieces: Record<number, string> = {
  3: "♜",
  4: "♞",
  11: "♟",
  19: "♟",
  28: "♙",
  36: "♙",
  52: "♘",
  59: "♖",
};

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const isLive = tournament.status === "live";
  const spotsLeft = tournament.capacity - tournament.players;

  return (
    <Paper className="tournament-card" elevation={0}>
      <Box
        className="tournament-art"
        sx={{ backgroundColor: tournament.accent }}
      >
        <Box className="tournament-monogram">{tournament.initials}</Box>
        <Chip
          className={`status-chip ${isLive ? "status-chip-live" : ""}`}
          label={
            isLive
              ? "Live now"
              : tournament.status === "registration"
                ? "Registration open"
                : "Coming up"
          }
          size="small"
        />
      </Box>
      <Box className="tournament-copy">
        <Typography className="tournament-format">
          {tournament.format}
        </Typography>
        <Typography component="h3" className="tournament-name">
          {tournament.name}
        </Typography>
        <Typography className="tournament-date">{tournament.date}</Typography>
        <Box className="tournament-capacity">
          <Box className="capacity-label">
            <span>{tournament.players} players</span>
            <span>{spotsLeft} spots left</span>
          </Box>
          <LinearProgress
            aria-label={`${tournament.players} of ${tournament.capacity} players`}
            className="capacity-progress"
            value={(tournament.players / tournament.capacity) * 100}
            variant="determinate"
          />
        </Box>
      </Box>
    </Paper>
  );
}

export default function Home() {
  const [filter, setFilter] = useState<TournamentFilter>("all");
  const [search, setSearch] = useState("");
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const { user, isLoading, initializationError, logout } = useAuth();

  const visibleTournaments = useMemo(
    () =>
      tournaments.filter((tournament) => {
        const matchesFilter = filter === "all" || tournament.status === filter;
        const searchText =
          `${tournament.name} ${tournament.format} ${tournament.date}`.toLowerCase();
        return (
          matchesFilter && searchText.includes(search.trim().toLowerCase())
        );
      }),
    [filter, search],
  );

  async function handleLogout() {
    setAuthActionError(null);
    try {
      await logout();
    } catch (error) {
      setAuthActionError(getAuthErrorMessage(error, "Unable to sign out."));
    }
  }

  return (
    <Box className="app-shell" id="dashboard">
      <Box component="aside" className="sidebar">
        <a
          className="brand"
          href="#dashboard"
          aria-label="Kingdom of Chess home"
        >
          <Box className="brand-mark">
            <EmojiEventsRounded />
          </Box>
          <Box>
            <Typography className="brand-name">KINGDOM</Typography>
            <Typography className="brand-caption">OF CHESS</Typography>
          </Box>
        </a>

        <Typography className="nav-label">Workspace</Typography>
        <Box
          component="nav"
          className="primary-nav"
          aria-label="Main navigation"
        >
          <a className="nav-item nav-item-active" href="#dashboard">
            <DashboardRounded />
            <span>Dashboard</span>
          </a>
          <a className="nav-item" href="#tournaments">
            <EmojiEventsRounded />
            <span>Tournaments</span>
          </a>
          <a className="nav-item" href="#matches">
            <SportsEsportsRounded />
            <span>Recent matches</span>
          </a>
          <a className="nav-item" href="#leaderboard">
            <GroupsRounded />
            <span>Leaderboard</span>
          </a>
        </Box>

        <Paper className="sidebar-promo" elevation={0}>
          <Box className="promo-icon">
            <BoltRounded />
          </Box>
          <Typography className="promo-title">Play your next game</Typography>
          <Typography className="promo-copy">
            Find a tournament and make your move.
          </Typography>
          <Button
            className="promo-link"
            href="#tournaments"
            endIcon={<ArrowForwardRounded />}
          >
            Explore events
          </Button>
        </Paper>

        <Box className="sidebar-profile">
          <Avatar className="profile-avatar">
            {user?.email.slice(0, 2).toUpperCase() ?? "CM"}
          </Avatar>
          <Box className="profile-copy">
            <Typography className="profile-name">
              {user?.email ?? "Chess club member"}
            </Typography>
            <Typography className="profile-role">
              {user?.role ?? "Sample account"}
            </Typography>
          </Box>
          <span className="profile-menu" aria-hidden="true">
            ···
          </span>
        </Box>
      </Box>

      <Box component="main" className="main-content">
        <Box component="header" className="topbar">
          <Box className="breadcrumb">
            <Typography component="span">Workspace</Typography>
            <span className="breadcrumb-divider">/</span>
            <Typography component="span" className="breadcrumb-current">
              Dashboard
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <TextField
              className="search-field"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tournaments"
              size="small"
              value={search}
              slotProps={{
                htmlInput: { "aria-label": "Search tournaments" },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded />
                    </InputAdornment>
                  ),
                },
              }}
            />
            {!isLoading && user ? (
              <>
                <Avatar className="topbar-avatar">
                  {user.email.slice(0, 2).toUpperCase()}
                </Avatar>
                <Button onClick={() => void handleLogout()} size="small">
                  Sign out
                </Button>
              </>
            ) : (
              !isLoading && (
                <>
                  <Button href="/login" size="small">
                    Sign in
                  </Button>
                  <Button href="/register" size="small" variant="contained">
                    Join
                  </Button>
                </>
              )
            )}
          </Stack>
        </Box>

        {(initializationError || authActionError) && (
          <Alert
            onClose={
              authActionError ? () => setAuthActionError(null) : undefined
            }
            severity={authActionError ? "error" : "warning"}
            sx={{ mx: 4, mt: 2 }}
          >
            {authActionError ?? initializationError}
          </Alert>
        )}

        <Box className="page-content">
          <Box className="welcome-row">
            <Box>
              <Chip
                className="preview-chip"
                label="Sample workspace"
                size="small"
              />
              <Typography component="h1" className="page-title">
                Make your next move.
              </Typography>
              <Typography className="page-subtitle">
                Your home for tournaments, good games, and a little friendly
                competition.
              </Typography>
            </Box>
            <Button
              className="welcome-action"
              href="#tournaments"
              endIcon={<ArrowForwardRounded />}
            >
              Find a tournament
            </Button>
          </Box>

          <Paper className="hero-card" elevation={0}>
            <Box className="hero-copy">
              <Typography className="hero-eyebrow">
                THE BOARD IS YOURS
              </Typography>
              <Typography component="h2" className="hero-title">
                Think ahead.
                <br />
                Play together.
              </Typography>
              <Typography className="hero-description">
                Join your chess community, challenge new opponents, and climb
                the standings one move at a time.
              </Typography>
              <Button
                className="hero-button"
                href="#tournaments"
                endIcon={<ArrowForwardRounded />}
              >
                Explore tournaments
              </Button>
            </Box>
            <Box className="hero-board" aria-hidden="true">
              {Array.from({ length: 64 }, (_, index) => {
                const row = Math.floor(index / 8);
                const column = index % 8;
                const isDark = (row + column) % 2 === 1;
                return (
                  <Box
                    className={`board-square ${isDark ? "board-square-dark" : ""}`}
                    key={`${row}-${column}`}
                  >
                    {boardPieces[index] ?? ""}
                  </Box>
                );
              })}
            </Box>
          </Paper>

          <Box className="section-heading" id="tournaments">
            <Box>
              <Typography component="h2" className="section-title">
                Find your next tournament
              </Typography>
              <Typography className="section-subtitle">
                A few events to get your competitive side started.
              </Typography>
            </Box>
            <Button
              className="text-action"
              href="#tournaments"
              endIcon={<ArrowForwardRounded />}
            >
              Browse events
            </Button>
          </Box>

          <Paper className="tournament-panel" elevation={0}>
            <Box className="tournament-toolbar">
              <Tabs
                aria-label="Filter tournaments"
                className="tournament-tabs"
                onChange={(_, value: TournamentFilter) => setFilter(value)}
                value={filter}
              >
                {filterLabels.map((item) => (
                  <Tab key={item.value} label={item.label} value={item.value} />
                ))}
              </Tabs>
              <Typography className="sample-count">
                {visibleTournaments.length} sample events
              </Typography>
            </Box>
            {visibleTournaments.length > 0 ? (
              <Box className="tournament-grid">
                {visibleTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </Box>
            ) : (
              <Box className="empty-state">
                <SearchRounded />
                <Typography component="h3">No tournaments found</Typography>
                <Typography>
                  Try another search or switch to a different event filter.
                </Typography>
              </Box>
            )}
          </Paper>

          <Box className="lower-grid">
            <Paper
              className="content-panel standings-panel"
              elevation={0}
              id="leaderboard"
            >
              <Box className="panel-heading">
                <Box>
                  <Typography component="h2" className="section-title">
                    Club leaderboard
                  </Typography>
                  <Typography className="section-subtitle">
                    Kingdom Chess Club · October season
                  </Typography>
                </Box>
                <Button className="text-action" href="#leaderboard">
                  View all
                </Button>
              </Box>
              <Box className="standings-table">
                <Box className="standings-header">
                  <span>PLAYER</span>
                  <span>POINTS</span>
                </Box>
                {standings.map((player) => (
                  <Box className="standing-row" key={player.rank}>
                    <Box className="standing-player">
                      <Typography className="standing-rank">
                        {player.rank}
                      </Typography>
                      <Avatar
                        className="standing-avatar"
                        sx={{ backgroundColor: player.color }}
                      >
                        {player.initials}
                      </Avatar>
                      <Box>
                        <Typography className="standing-name">
                          {player.name}
                        </Typography>
                        <Typography className="standing-handle">
                          {player.handle}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography className="standing-points">
                      {player.points}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            <Paper
              className="content-panel matches-panel"
              elevation={0}
              id="matches"
            >
              <Box className="panel-heading">
                <Box>
                  <Typography component="h2" className="section-title">
                    Recent matches
                  </Typography>
                  <Typography className="section-subtitle">
                    A snapshot from the club
                  </Typography>
                </Box>
                <Button className="text-action" href="#matches">
                  View all
                </Button>
              </Box>
              <Box className="match-list">
                <Box className="match-row">
                  <Avatar
                    className="match-avatar"
                    sx={{ backgroundColor: "#d9efb2" }}
                  >
                    MC
                  </Avatar>
                  <Box className="match-copy">
                    <Typography className="match-players">
                      Maya Chen <span>vs</span> Leo Fischer
                    </Typography>
                    <Typography className="match-meta">
                      Rapid Open · 12 min ago
                    </Typography>
                  </Box>
                  <Chip
                    className="result-chip result-win"
                    label="1 — 0"
                    size="small"
                  />
                </Box>
                <Box className="match-row">
                  <Avatar
                    className="match-avatar"
                    sx={{ backgroundColor: "#f6d9bd" }}
                  >
                    AO
                  </Avatar>
                  <Box className="match-copy">
                    <Typography className="match-players">
                      Amara Okafor <span>vs</span> Sam Rivera
                    </Typography>
                    <Typography className="match-meta">
                      Club Arena · 38 min ago
                    </Typography>
                  </Box>
                  <Chip className="result-chip" label="½ — ½" size="small" />
                </Box>
                <Box className="match-row">
                  <Avatar
                    className="match-avatar"
                    sx={{ backgroundColor: "#cfe5e1" }}
                  >
                    LF
                  </Avatar>
                  <Box className="match-copy">
                    <Typography className="match-players">
                      Leo Fischer <span>vs</span> Maya Chen
                    </Typography>
                    <Typography className="match-meta">
                      Blitz Night · 1 hr ago
                    </Typography>
                  </Box>
                  <Chip
                    className="result-chip result-loss"
                    label="0 — 1"
                    size="small"
                  />
                </Box>
              </Box>
            </Paper>
          </Box>

          <Typography className="footer-note">
            Dashboard preview · Tournament, standings, and match data are sample
            content.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
