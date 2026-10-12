"use client";

import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import SportsEsportsRounded from "@mui/icons-material/SportsEsportsRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-api";
import { leaderboardApi } from "@/lib/leaderboard-api";
import { formatPlatformDateTime } from "@/lib/date-format";
import { type Match, matchApi } from "@/lib/match-api";
import {
  connectToMatchmaking,
  type MatchFoundEvent,
} from "@/lib/matchmaking-socket";
import {
  type Tournament,
  type TournamentStatus,
  tournamentApi,
} from "@/lib/tournament-api";

const panelSx = {
  border: "1px solid #e7ece5",
  borderRadius: 3,
  boxShadow: "0 10px 34px rgba(31, 54, 39, 0.045)",
  p: { xs: 2, sm: 2.5 },
};

function formatDate(value: string | null) {
  if (!value) return "Date to be announced";
  const formatted = formatPlatformDateTime(value);
  return formatted === "—" ? "Date to be announced" : formatted;
}

function shortId(id: string) {
  return `${id.slice(0, 8)}…`;
}

function opponentId(match: Match, userId: string) {
  return match.whitePlayerId === userId
    ? match.blackPlayerId
    : match.whitePlayerId;
}

function resultLabel(match: Match, userId: string) {
  if (match.status !== "completed" || !match.result) return match.status;
  if (match.result === "draw") return "Draw";
  const userWon =
    (match.result === "white_win" && match.whitePlayerId === userId) ||
    (match.result === "black_win" && match.blackPlayerId === userId);
  return userWon ? "Won" : "Lost";
}

function statusColor(status: TournamentStatus) {
  return status === "ongoing" ? "info" : "success";
}

export default function StudentDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [socketError, setSocketError] = useState<string | null>(null);

  const tournamentsQuery = useQuery({
    queryKey: ["student-tournaments"],
    queryFn: async () => {
      const [open, ongoing] = await Promise.all([
        tournamentApi.list({
          page: 1,
          limit: 100,
          sortBy: "startDate",
          sortOrder: "ASC",
          status: "open",
        }),
        tournamentApi.list({
          page: 1,
          limit: 100,
          sortBy: "startDate",
          sortOrder: "ASC",
          status: "ongoing",
        }),
      ]);
      return [...open.data, ...ongoing.data];
    },
    enabled: Boolean(user?.userId && user.role === "player"),
  });

  const scheduleQuery = useQuery({
    queryKey: ["student-tournament-schedule", user?.userId],
    queryFn: () => tournamentApi.mySchedule(),
    enabled: Boolean(user?.userId && user.role === "player"),
  });

  const matchesQuery = useQuery({
    queryKey: ["student-match-history", user?.userId],
    queryFn: () =>
      matchApi.mine({
        page: 1,
        limit: 8,
        sortBy: "createdAt",
        sortOrder: "DESC",
      }),
    enabled: Boolean(user?.userId && user.role === "player"),
  });

  const leaderboardQuery = useQuery({
    queryKey: ["student-leaderboard", user?.userId],
    queryFn: () => leaderboardApi.top(8),
    enabled: Boolean(user?.userId && user.role === "player"),
  });

  const standingQuery = useQuery({
    queryKey: ["student-standing", user?.userId],
    queryFn: () => {
      if (!user?.userId) {
        throw new Error("Sign in to view your leaderboard standing.");
      }
      return leaderboardApi.standing(user.userId);
    },
    enabled: Boolean(user?.userId && user.role === "player"),
  });

  const queueQuery = useQuery({
    queryKey: ["student-matchmaking", user?.userId],
    queryFn: () => matchApi.matchmakingStatus(),
    enabled: Boolean(user?.userId && user.role === "player"),
    refetchInterval: (query) =>
      query.state.data?.status === "waiting" ? 2500 : false,
  });

  const joinMutation = useMutation({
    mutationFn: (tournamentId: string) => tournamentApi.join(tournamentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["student-tournament-schedule", user?.userId],
      });
    },
  });

  const findOpponentMutation = useMutation({
    mutationFn: () => matchApi.findOpponent(),
    onSuccess: async (result) => {
      queryClient.setQueryData(
        ["student-matchmaking", user?.userId],
        result.queueEntry,
      );
      await queryClient.invalidateQueries({
        queryKey: ["student-match-history", user?.userId],
      });
      if (result.match) {
        router.push(`/matches/${encodeURIComponent(result.match.id)}`);
      }
    },
  });

  const tournaments = useMemo(
    () =>
      [...(tournamentsQuery.data ?? [])].sort((a, b) =>
        a.startDate.localeCompare(b.startDate),
      ),
    [tournamentsQuery.data],
  );

  const joinedTournamentIds = useMemo(
    () =>
      new Set((scheduleQuery.data ?? []).map((entry) => entry.tournamentId)),
    [scheduleQuery.data],
  );

  const activeMatch = useMemo(
    () =>
      matchesQuery.data?.data.find((match) => match.status === "in_progress"),
    [matchesQuery.data],
  );

  useEffect(() => {
    if (!user || user.role !== "player") return;

    const socket = connectToMatchmaking();
    const onMatchFound = (event: MatchFoundEvent) => {
      setSocketError(null);
      void queryClient.invalidateQueries({
        queryKey: ["student-match-history", user?.userId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["student-matchmaking", user?.userId],
      });
      router.push(`/matches/${encodeURIComponent(event.matchId)}`);
    };
    const onConnectError = () => {
      setSocketError(
        "Live match alerts are reconnecting. We’ll keep checking your queue.",
      );
    };

    socket.on("match-found", onMatchFound);
    socket.on("connect_error", onConnectError);
    return () => {
      socket.off("match-found", onMatchFound);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, [queryClient, router, user?.role, user?.userId]);

  useEffect(() => {
    if (!authLoading && user && user.role !== "player") {
      router.replace("/admin/tournaments");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (activeMatch) {
      router.replace(`/matches/${encodeURIComponent(activeMatch.id)}`);
    }
  }, [activeMatch, router]);

  if (authLoading) {
    return (
      <Box sx={{ display: "grid", minHeight: "70vh", placeItems: "center" }}>
        <CircularProgress aria-label="Loading your account" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ mx: "auto", maxWidth: 560, p: 3 }}>
        <Paper sx={panelSx}>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 750 }}>
            Sign in to your player dashboard
          </Typography>
          <Typography color="text.secondary" sx={{ my: 1.5 }}>
            Browse tournaments, find your next opponent, and follow your
            ranking.
          </Typography>
          <Button component={Link} href="/auth/login" variant="contained">
            Sign in
          </Button>
        </Paper>
      </Box>
    );
  }

  if (user.role !== "player") {
    return (
      <Box sx={{ mx: "auto", maxWidth: 680, p: 3 }}>
        <Alert severity="info">
          The student dashboard is available to player accounts.{" "}
          <MuiLink component={Link} href="/matches">
            Go to the chess workspace
          </MuiLink>
          .
        </Alert>
      </Box>
    );
  }

  const isWaiting = queueQuery.data?.status === "waiting";

  return (
    <Box
      component="main"
      sx={{
        bgcolor: "#f5f7f2",
        minHeight: "100vh",
        px: { xs: 2, sm: 3, lg: 5 },
        py: { xs: 2.5, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1320, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            mb: 3,
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              sx={{
                color: "#244b36",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.4,
              }}
            >
              KINGDOM OF CHESS · PLAYER
            </Typography>
            <Typography
              component="h1"
              sx={{
                color: "#20392a",
                fontSize: { xs: 28, md: 34 },
                fontWeight: 800,
                mt: 0.75,
              }}
            >
              Good to see you
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {user.email} · Your next game is one click away.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button component={Link} href="/matches" variant="outlined">
              Match directory
            </Button>
            <Button component={Link} href="/admin/tournaments" variant="text">
              Tournament results
            </Button>
          </Stack>
        </Stack>

        {socketError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {socketError}
          </Alert>
        )}
        {findOpponentMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {getAuthErrorMessage(
              findOpponentMutation.error,
              "Unable to join the matchmaking queue.",
            )}
          </Alert>
        )}
        {tournamentsQuery.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {getAuthErrorMessage(
              tournamentsQuery.error,
              "Unable to load tournaments.",
            )}
          </Alert>
        )}
        {scheduleQuery.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {getAuthErrorMessage(
              scheduleQuery.error,
              "Unable to load your tournament registrations.",
            )}
          </Alert>
        )}
        {matchesQuery.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {getAuthErrorMessage(
              matchesQuery.error,
              "Unable to load match history.",
            )}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(0, 1.65fr) minmax(300px, 0.85fr)",
            },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              ...panelSx,
              background:
                "linear-gradient(125deg, #214a35 0%, #2f6246 68%, #47784f 100%)",
              color: "white",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 3,
              justifyContent: "space-between",
              minHeight: 194,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Box sx={{ maxWidth: 500, position: "relative", zIndex: 1 }}>
              <Chip
                icon={<GroupsRounded />}
                label={
                  isWaiting
                    ? "Searching for an opponent"
                    : "Rated club matchmaking"
                }
                sx={{
                  bgcolor: "rgba(255,255,255,.13)",
                  color: "white",
                  mb: 1.5,
                }}
              />
              <Typography component="h2" sx={{ fontSize: 26, fontWeight: 800 }}>
                {isWaiting ? "You’re in the queue" : "Find your next opponent"}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,.78)", mt: 0.75 }}>
                {isWaiting
                  ? "We’ll open your game automatically as soon as a player is matched."
                  : "Players are paired by rating. Your game opens automatically when a match is found."}
              </Typography>
              <Typography
                sx={{ color: "rgba(255,255,255,.68)", fontSize: 12, mt: 1.5 }}
              >
                Round-robin tournament pairings are generated automatically.
              </Typography>
            </Box>
            <Box
              sx={{
                alignSelf: { sm: "center" },
                minWidth: { sm: 190 },
                position: "relative",
                zIndex: 1,
              }}
            >
              <Button
                disabled={
                  isWaiting ||
                  findOpponentMutation.isPending ||
                  Boolean(activeMatch)
                }
                onClick={() => findOpponentMutation.mutate()}
                size="large"
                startIcon={
                  findOpponentMutation.isPending || isWaiting ? (
                    <CircularProgress color="inherit" size={18} />
                  ) : (
                    <SportsEsportsRounded />
                  )
                }
                sx={{
                  bgcolor: "#d7efa8",
                  color: "#203c2a",
                  fontWeight: 800,
                  minHeight: 48,
                  px: 2.25,
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: "#c8e891" },
                  "&.Mui-disabled": {
                    bgcolor: "rgba(255,255,255,.24)",
                    color: "white",
                  },
                }}
                variant="contained"
              >
                {isWaiting ? "Searching…" : "Find opponent"}
              </Button>
              {activeMatch && (
                <Button
                  component={Link}
                  href={`/matches/${encodeURIComponent(activeMatch.id)}`}
                  sx={{ color: "white", mt: 1 }}
                >
                  Resume active match
                </Button>
              )}
            </Box>
            {queueQuery.isError && (
              <Typography role="alert" sx={{ color: "#ffe6dc", fontSize: 12 }}>
                {getAuthErrorMessage(
                  queueQuery.error,
                  "Unable to check queue status.",
                )}
              </Typography>
            )}
          </Paper>

          <Paper elevation={0} sx={panelSx}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Avatar sx={{ bgcolor: "#edf4e6", color: "#315a3d" }}>
                <EmojiEventsRounded />
              </Avatar>
              <Box>
                <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                  Your current ranking
                </Typography>
                {standingQuery.isLoading ? (
                  <CircularProgress size={18} sx={{ mt: 0.5 }} />
                ) : standingQuery.isError ? (
                  <Typography color="error" sx={{ fontSize: 13 }}>
                    Ranking unavailable
                  </Typography>
                ) : (
                  <Typography
                    sx={{ color: "#20392a", fontSize: 25, fontWeight: 800 }}
                  >
                    #{standingQuery.data?.rank ?? "—"}
                    <Typography
                      component="span"
                      color="text.secondary"
                      sx={{ fontSize: 14, fontWeight: 500 }}
                    >
                      {" "}
                      · {standingQuery.data?.rating ?? "—"} rating
                    </Typography>
                  </Typography>
                )}
              </Box>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Games played
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {standingQuery.data?.gamesPlayed ?? 0}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              sx={{ mt: 0.8, justifyContent: "space-between" }}
            >
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Points
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {standingQuery.data?.points ?? 0}
              </Typography>
            </Stack>
          </Paper>

          <Paper elevation={0} sx={panelSx}>
            <Stack
              direction="row"
              sx={{
                mb: 1.5,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  component="h2"
                  sx={{ fontSize: 18, fontWeight: 800 }}
                >
                  Tournaments
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                  Open for registration and currently ongoing
                </Typography>
              </Box>
              <Button
                component={Link}
                href="/admin/tournaments"
                endIcon={<ArrowForwardRounded />}
                size="small"
              >
                All
              </Button>
            </Stack>
            {tournamentsQuery.isLoading ? (
              <CircularProgress size={24} />
            ) : tournaments.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                There are no open or ongoing tournaments right now.
              </Typography>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={0}>
                {tournaments.map((tournament: Tournament) => {
                  const registered = joinedTournamentIds.has(tournament.id);
                  return (
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      key={tournament.id}
                      spacing={1.5}
                      sx={{
                        py: 1.75,
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: "center" }}
                        >
                          <Typography sx={{ fontWeight: 750 }}>
                            {tournament.name}
                          </Typography>
                          <Chip
                            color={statusColor(tournament.status)}
                            label={tournament.status}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                        <Typography
                          color="text.secondary"
                          sx={{ mt: 0.5, fontSize: 12 }}
                        >
                          {tournament.timeControl ?? "5+0"} ·{" "}
                          {tournament.maxParticipants} seats ·{" "}
                          {formatDate(tournament.startDate)}
                        </Typography>
                      </Box>
                      {tournament.status === "open" ? (
                        <Button
                          disabled={registered || joinMutation.isPending}
                          onClick={() => joinMutation.mutate(tournament.id)}
                          size="small"
                          variant={registered ? "text" : "outlined"}
                        >
                          {registered ? "Registered" : "Join tournament"}
                        </Button>
                      ) : (
                        <Button
                          component={Link}
                          href="/admin/tournaments"
                          size="small"
                          variant="outlined"
                        >
                          View standings
                        </Button>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            )}
            {joinMutation.isError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {getAuthErrorMessage(
                  joinMutation.error,
                  "Unable to join this tournament.",
                )}
              </Alert>
            )}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              ...panelSx,
              gridColumn: { lg: "2" },
              gridRow: { lg: "2 / span 2" },
            }}
          >
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 800 }}>
              Club leaderboard
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1.5, fontSize: 13 }}>
              Top players by rating and match performance
            </Typography>
            {leaderboardQuery.isLoading ? (
              <CircularProgress size={24} />
            ) : leaderboardQuery.isError ? (
              <Alert severity="error">
                {getAuthErrorMessage(
                  leaderboardQuery.error,
                  "Unable to load the leaderboard.",
                )}
              </Alert>
            ) : (
              <Table size="small" aria-label="Club leaderboard">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ px: 0 }}>Rank</TableCell>
                    <TableCell>Player</TableCell>
                    <TableCell align="right" sx={{ px: 0 }}>
                      Rating
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(leaderboardQuery.data ?? []).map((entry) => (
                    <TableRow
                      key={entry.userId}
                      selected={entry.userId === user.userId}
                    >
                      <TableCell sx={{ px: 0, fontWeight: 700 }}>
                        #{entry.rank}
                      </TableCell>
                      <TableCell>
                        {entry.name}
                        {entry.userId === user.userId && (
                          <Typography
                            color="text.secondary"
                            component="span"
                            sx={{ fontSize: 11 }}
                          >
                            {" "}
                            · You
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ px: 0 }}>
                        {entry.rating}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>

          <Paper elevation={0} sx={panelSx}>
            <Stack
              direction="row"
              sx={{
                mb: 1.25,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  component="h2"
                  sx={{ fontSize: 18, fontWeight: 800 }}
                >
                  Recent matches
                </Typography>
                <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                  Your game history
                </Typography>
              </Box>
              <Button
                component={Link}
                href="/matches"
                endIcon={<ArrowForwardRounded />}
                size="small"
              >
                History
              </Button>
            </Stack>
            {matchesQuery.isLoading ? (
              <CircularProgress size={24} />
            ) : (matchesQuery.data?.data.length ?? 0) === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                Your completed games will appear here.
              </Typography>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={0}>
                {matchesQuery.data?.data.slice(0, 5).map((match) => (
                  <Stack
                    direction="row"
                    key={match.id}
                    spacing={1}
                    sx={{
                      py: 1.25,
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                        vs {shortId(opponentId(match, user.userId))}
                      </Typography>
                      <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                        {formatDate(match.completedAt ?? match.createdAt)}
                      </Typography>
                    </Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <Chip
                        color={
                          match.status === "completed"
                            ? "success"
                            : match.status === "in_progress"
                              ? "info"
                              : "default"
                        }
                        label={resultLabel(match, user.userId)}
                        size="small"
                        variant="outlined"
                      />
                      <Button
                        component={Link}
                        href={`/matches/${encodeURIComponent(match.id)}`}
                        size="small"
                        aria-label={`View match against ${shortId(opponentId(match, user.userId))}`}
                      >
                        View
                      </Button>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
