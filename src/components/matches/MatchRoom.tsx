"use client";

import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-api";
import { type LegalMove, matchApi } from "@/lib/match-api";
import { connectToMatchmaking } from "@/lib/matchmaking-socket";

const pieces: Record<string, string> = {
  K: "♔",
  Q: "♕",
  R: "♖",
  B: "♗",
  N: "♘",
  P: "♙",
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

function boardPieces(fen: string): Map<string, string> {
  const squares = new Map<string, string>();
  const [placement] = fen.split(" ");
  const rows = placement.split("/");
  rows.forEach((row, rowIndex) => {
    let file = 0;
    for (const item of row) {
      if (/\d/.test(item)) {
        file += Number(item);
      } else {
        squares.set(`${"abcdefgh"[file]}${8 - rowIndex}`, item);
        file += 1;
      }
    }
  });
  return squares;
}

function matchResultLabel(
  result: "white_win" | "black_win" | "draw" | null,
  playerColor: "w" | "b",
) {
  if (result === "draw") return "The game ended in a draw.";
  if (!result) return "The game has finished.";
  const playerWon =
    (result === "white_win" && playerColor === "w") ||
    (result === "black_win" && playerColor === "b");
  return playerWon ? "You won the game!" : "Your opponent won the game.";
}

export default function MatchRoom({ matchId }: { matchId: string }) {
  const { user, tokens } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [clockSnapshotLocalAt, setClockSnapshotLocalAt] = useState(Date.now());
  const queryKey = useMemo(() => ["match-game", matchId], [matchId]);

  const gameQuery = useQuery({
    queryKey,
    queryFn: () => matchApi.game(matchId),
    enabled: Boolean(user?.userId && user.role === "player"),
  });

  const refreshMatchData = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({
      queryKey: ["student-match-history", user?.userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["student-standing", user?.userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["student-leaderboard", user?.userId],
    });
  }, [queryClient, queryKey, user?.userId]);

  const moveMutation = useMutation({
    mutationFn: (move: LegalMove) =>
      matchApi.move(matchId, {
        from: move.from,
        to: move.to,
        ...(move.promotion ? { promotion: "q" } : {}),
      }),
    onSuccess: refreshMatchData,
    onError: (error) => {
      setMoveError(getAuthErrorMessage(error, "Unable to make that move."));
    },
  });
  const resignMutation = useMutation({
    mutationFn: () => matchApi.resign(matchId),
    onSuccess: () => {
      setConfirmResign(false);
      refreshMatchData();
    },
    onError: (error) => {
      setMoveError(getAuthErrorMessage(error, "Unable to resign."));
    },
  });
  const fen = gameQuery.data?.fen;
  const squares = useMemo(() => (fen ? boardPieces(fen) : new Map()), [fen]);
  const legalMoves = gameQuery.data?.legalMoves ?? [];
  const selectedMoves = legalMoves.filter(
    (move) => move.from === selectedSquare,
  );
  const destinations = new Set(selectedMoves.map((move) => move.to));
  const isMyTurn =
    gameQuery.data?.turn === gameQuery.data?.playerColor &&
    gameQuery.data?.match.status !== "completed";

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setClockSnapshotLocalAt(Date.now());
  }, [gameQuery.data?.clockSnapshotAt]);

  useEffect(() => {
    if (gameQuery.data?.match.status === "completed") {
      void queryClient.invalidateQueries({
        queryKey: ["student-match-history", user?.userId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["student-standing", user?.userId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["student-leaderboard", user?.userId],
      });
    }
  }, [gameQuery.data?.match.status, queryClient, user?.userId]);

  useEffect(() => {
    if (!tokens?.accessToken) return;

    const socket = connectToMatchmaking(tokens.accessToken);
    const onGameUpdated = (event: { matchId: string }) => {
      if (event.matchId === matchId) {
        refreshMatchData();
      }
    };
    const onConnect = () => refreshMatchData();
    socket.on("connect", onConnect);
    socket.on("game-updated", onGameUpdated);
    return () => {
      socket.off("connect", onConnect);
      socket.off("game-updated", onGameUpdated);
      socket.disconnect();
    };
  }, [matchId, refreshMatchData, tokens?.accessToken]);

  function clockTime(color: "w" | "b") {
    const game = gameQuery.data;
    if (!game) return 0;
    const timeMs = color === "w" ? game.whiteTimeMs : game.blackTimeMs;
    if (
      game.match.status !== "in_progress" ||
      !game.clockStartedAt ||
      game.turn !== color
    ) {
      return timeMs;
    }
    return Math.max(0, timeMs - (clockNow - clockSnapshotLocalAt));
  }

  useEffect(() => {
    const game = gameQuery.data;
    if (
      game &&
      !gameQuery.isFetching &&
      game.match.status === "in_progress" &&
      game.clockStartedAt &&
      clockTime(game.turn) <= 0
    ) {
      void gameQuery.refetch();
    }
  }, [
    clockNow,
    clockSnapshotLocalAt,
    gameQuery.data,
    gameQuery.isFetching,
    gameQuery.refetch,
  ]);

  function formattedTime(timeMs: number) {
    const totalSeconds = Math.ceil(timeMs / 1000);
    return `${Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0")}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
  }

  function playMove(move: LegalMove) {
    setMoveError(null);
    setSelectedSquare(null);
    moveMutation.mutate(move);
  }

  function handleSquareClick(square: string) {
    if (!isMyTurn || moveMutation.isPending) return;

    const move = selectedMoves.find((candidate) => candidate.to === square);
    if (move) {
      void playMove(move);
      return;
    }
    if (legalMoves.some((candidate) => candidate.from === square)) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  }

  if (!user) {
    return (
      <Box sx={{ mx: "auto", maxWidth: 620, p: 3 }}>
        <Alert severity="info">
          Sign in to open this game. <Link href="/auth/login">Sign in</Link>
        </Alert>
      </Box>
    );
  }

  if (user.role !== "player") {
    return (
      <Box sx={{ mx: "auto", maxWidth: 620, p: 3 }}>
        <Alert severity="info">
          This match room is available to its players.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "#f5f7f2", minHeight: "100vh", px: 2, py: 3 }}>
      <Box sx={{ maxWidth: 1020, mx: "auto" }}>
        <Button
          component={Link}
          href="/student"
          startIcon={<ArrowBackRounded />}
          sx={{ mb: 2 }}
        >
          Player dashboard
        </Button>
        {gameQuery.isLoading ? (
          <Box
            sx={{ display: "grid", minHeight: "60vh", placeItems: "center" }}
          >
            <CircularProgress aria-label="Loading game" />
          </Box>
        ) : gameQuery.isError || !gameQuery.data ? (
          <Alert severity="error">
            {getAuthErrorMessage(gameQuery.error, "Unable to load this game.")}
          </Alert>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 2.5,
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(0, 1.25fr) minmax(250px, .75fr)",
              },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                bgcolor: "#fff",
                border: "1px solid #e7ece5",
                borderRadius: 3,
                p: { xs: 1.5, sm: 3 },
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                sx={{
                  mb: 2,
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                    MATCH · {matchId.slice(0, 8)}
                  </Typography>
                  <Typography
                    component="h1"
                    sx={{ fontSize: 23, fontWeight: 800 }}
                  >
                    {gameQuery.data.match.status === "completed"
                      ? "Game complete"
                      : isMyTurn
                        ? "Your move"
                        : "Opponent’s turn"}
                  </Typography>
                </Box>
                <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                  You are{" "}
                  {gameQuery.data.playerColor === "w" ? "White" : "Black"}
                </Typography>
              </Stack>
              {moveError && (
                <Alert
                  onClose={() => setMoveError(null)}
                  severity="error"
                  sx={{ mb: 1.5 }}
                >
                  {moveError}
                </Alert>
              )}
              <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                {(["w", "b"] as const).map((color) => {
                  const active =
                    gameQuery.data.turn === color &&
                    gameQuery.data.match.status === "in_progress";
                  return (
                    <Paper
                      key={color}
                      elevation={0}
                      sx={{
                        bgcolor: active ? "#eaf3e8" : "#f5f7f2",
                        border: "1px solid #e7ece5",
                        borderRadius: 2,
                        flex: 1,
                        p: 1.25,
                        textAlign: "center",
                      }}
                    >
                      <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                        {color === "w" ? "White" : "Black"}
                      </Typography>
                      <Typography
                        aria-label={`${color === "w" ? "White" : "Black"} clock`}
                        component="time"
                        sx={{
                          fontSize: 24,
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 800,
                        }}
                      >
                        {formattedTime(clockTime(color))}
                      </Typography>
                    </Paper>
                  );
                })}
              </Stack>
              <Box
                aria-label="Chess board"
                role="grid"
                sx={{
                  aspectRatio: "1",
                  border: "5px solid #244b36",
                  borderRadius: 1,
                  display: "grid",
                  gridTemplateColumns: "repeat(8, 1fr)",
                  maxWidth: 620,
                  mx: "auto",
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                {Array.from({ length: 64 }, (_, index) => {
                  const whiteSide = gameQuery.data.playerColor === "w";
                  const row = Math.floor(index / 8);
                  const column = index % 8;
                  const rank = whiteSide ? 8 - row : row + 1;
                  const file = whiteSide
                    ? "abcdefgh"[column]
                    : "hgfedcba"[column];
                  const square = `${file}${rank}`;
                  const piece = squares.get(square);
                  const isLight = (row + column) % 2 === 0;
                  const isSelected = selectedSquare === square;
                  const isDestination = destinations.has(square);

                  return (
                    <Box
                      aria-label={`${square}${piece ? ` ${pieces[piece]}` : ""}`}
                      aria-selected={isSelected}
                      component="button"
                      key={square}
                      onClick={() => handleSquareClick(square)}
                      role="gridcell"
                      sx={{
                        alignItems: "center",
                        aspectRatio: "1",
                        bgcolor: isSelected
                          ? "#d4d86a"
                          : isLight
                            ? "#f0e8d6"
                            : "#76936c",
                        border: 0,
                        cursor: isMyTurn ? "pointer" : "default",
                        display: "flex",
                        justifyContent: "center",
                        p: 0,
                        position: "relative",
                        "&:focus-visible": {
                          outline: "3px solid #e1bb40",
                          zIndex: 1,
                        },
                      }}
                    >
                      {isDestination && !piece && (
                        <Box
                          sx={{
                            bgcolor: "rgba(30, 66, 41, .38)",
                            borderRadius: "50%",
                            height: "24%",
                            position: "absolute",
                            width: "24%",
                          }}
                        />
                      )}
                      {isDestination && piece && (
                        <Box
                          sx={{
                            border: "4px solid rgba(30, 66, 41, .4)",
                            borderRadius: "50%",
                            inset: 2,
                            position: "absolute",
                          }}
                        />
                      )}
                      {piece && (
                        <Typography
                          aria-hidden="true"
                          sx={{
                            color:
                              piece === piece.toUpperCase()
                                ? "#fff"
                                : "#202822",
                            filter:
                              piece === piece.toUpperCase()
                                ? "drop-shadow(0 1px 1px #304234)"
                                : "drop-shadow(0 1px 0 rgba(255,255,255,.45))",
                            fontFamily: "Arial, sans-serif",
                            fontSize: {
                              xs: "clamp(24px, 9vw, 44px)",
                              md: "clamp(32px, 5vw, 58px)",
                            },
                            lineHeight: 1,
                            position: "relative",
                            zIndex: 1,
                          }}
                        >
                          {pieces[piece]}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
              <Typography
                color="text.secondary"
                sx={{ mt: 1.5, fontSize: 12, textAlign: "center" }}
              >
                {gameQuery.data.match.status === "completed"
                  ? matchResultLabel(
                      gameQuery.data.match.result,
                      gameQuery.data.playerColor,
                    )
                  : isMyTurn
                    ? "Select one of your legal moves on the board."
                    : "Waiting for your opponent’s move. This board updates automatically."}
              </Typography>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                alignSelf: "start",
                border: "1px solid #e7ece5",
                borderRadius: 3,
                p: { xs: 2, sm: 2.5 },
              }}
            >
              <Typography component="h2" sx={{ fontSize: 18, fontWeight: 800 }}>
                Game details
              </Typography>
              <Stack spacing={1.25} sx={{ mt: 2 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography color="text.secondary">White</Typography>
                  <Typography sx={{ fontSize: 12 }}>
                    {gameQuery.data.match.whitePlayerId.slice(0, 8)}…
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Black</Typography>
                  <Typography sx={{ fontSize: 12 }}>
                    {gameQuery.data.match.blackPlayerId.slice(0, 8)}…
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                  <Typography color="text.secondary">Status</Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {gameQuery.data.match.status.replace("_", " ")}
                  </Typography>
                </Stack>
                {gameQuery.data.match.status === "completed" && (
                  <Stack spacing={1.5} sx={{ alignItems: "center", pt: 2 }}>
                    <EmojiEventsRounded color="warning" />
                    <Typography sx={{ fontWeight: 700, textAlign: "center" }}>
                      {matchResultLabel(
                        gameQuery.data.match.result,
                        gameQuery.data.playerColor,
                      )}
                    </Typography>
                    {gameQuery.data.match.endReason && (
                      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                        {gameQuery.data.match.endReason === "checkmate"
                          ? "Checkmate"
                          : gameQuery.data.match.endReason === "stalemate"
                            ? "Stalemate"
                            : gameQuery.data.match.endReason === "timeout"
                              ? "Time expired"
                              : gameQuery.data.match.endReason === "resignation"
                                ? "Resignation"
                                : "Draw"}
                      </Typography>
                    )}
                    <Button
                      component={Link}
                      href="/student"
                      variant="contained"
                    >
                      Find another opponent
                    </Button>
                  </Stack>
                )}
                {gameQuery.data.match.status !== "completed" && (
                  <Button
                    color="error"
                    disabled={resignMutation.isPending}
                    onClick={() => setConfirmResign(true)}
                    variant="outlined"
                  >
                    Resign
                  </Button>
                )}
                <Box>
                  <Typography component="h3" sx={{ fontWeight: 700, mt: 1 }}>
                    Moves
                  </Typography>
                  {gameQuery.data.moves.length ? (
                    <Stack
                      aria-label="Move list"
                      spacing={0.5}
                      sx={{ maxHeight: 180, mt: 0.75, overflowY: "auto" }}
                    >
                      {gameQuery.data.moves.map((move) => (
                        <Stack
                          direction="row"
                          key={move.number}
                          spacing={1}
                          sx={{ fontSize: 13 }}
                        >
                          <Typography color="text.secondary" sx={{ width: 24 }}>
                            {move.number}.
                          </Typography>
                          <Typography sx={{ flex: 1 }}>{move.white}</Typography>
                          <Typography sx={{ flex: 1 }}>
                            {move.black ?? ""}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  ) : (
                    <Typography
                      color="text.secondary"
                      sx={{ mt: 0.5, fontSize: 13 }}
                    >
                      No moves yet.
                    </Typography>
                  )}
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: 12, mt: 1.5 }}
                  >
                    PGN
                  </Typography>
                  <Box
                    component="pre"
                    sx={{
                      bgcolor: "#f5f7f2",
                      borderRadius: 1,
                      fontFamily: "monospace",
                      fontSize: 12,
                      maxHeight: 100,
                      overflow: "auto",
                      p: 1,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {gameQuery.data.pgn || "No moves recorded."}
                  </Box>
                </Box>
              </Stack>
            </Paper>
          </Box>
        )}
        <Dialog open={confirmResign} onClose={() => setConfirmResign(false)}>
          <DialogTitle>Resign this game?</DialogTitle>
          <DialogContent>
            <Typography>
              Resigning will end the game and record a loss.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmResign(false)}>Keep playing</Button>
            <Button
              color="error"
              disabled={resignMutation.isPending}
              onClick={() => resignMutation.mutate()}
              variant="contained"
            >
              Resign
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
