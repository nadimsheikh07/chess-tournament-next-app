"use client";

import SearchRounded from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import {
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-api";
import { formatPlatformDateTime } from "@/lib/date-format";
import {
  type MatchResult,
  type MatchSortBy,
  type MatchStatus,
  matchApi,
} from "@/lib/match-api";

const statuses: MatchStatus[] = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
];

const sortableColumns: { id: MatchSortBy; label: string }[] = [
  { id: "whitePlayerId", label: "White" },
  { id: "blackPlayerId", label: "Black" },
  { id: "status", label: "Status" },
  { id: "result", label: "Result" },
  { id: "createdAt", label: "Created" },
];

function formatDate(value: string): string {
  return formatPlatformDateTime(value);
}

function formatResult(result: MatchResult | null): string {
  switch (result) {
    case "white_win":
      return "White wins";
    case "black_win":
      return "Black wins";
    case "draw":
      return "Draw";
    default:
      return "—";
  }
}

function statusColor(
  status: MatchStatus,
): "default" | "success" | "warning" | "info" | "error" {
  switch (status) {
    case "scheduled":
      return "warning";
    case "in_progress":
      return "info";
    case "completed":
      return "success";
    case "cancelled":
      return "error";
    default:
      return "default";
  }
}

function playerLabel(playerId: string): string {
  return playerId.length > 12 ? `${playerId.slice(0, 8)}…` : playerId;
}

export default function MatchesManagement() {
  const { user, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<MatchSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [status, setStatus] = useState<MatchStatus | "all">("all");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const matchesQuery = useQuery({
    queryKey: [
      "matches",
      page + 1,
      rowsPerPage,
      debouncedSearch,
      sortBy,
      sortOrder,
      status,
    ],
    queryFn: () =>
      matchApi.list({
        page: page + 1,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        sortBy,
        sortOrder,
        status: status === "all" ? undefined : status,
      }),
    enabled: !authLoading && Boolean(user),
    placeholderData: keepPreviousData,
  });

  function handleSort(column: MatchSortBy) {
    setPage(0);
    if (sortBy === column) {
      setSortOrder((current) => (current === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(column);
      setSortOrder("ASC");
    }
  }

  if (authLoading) {
    return (
      <Box className="management-loading">
        <CircularProgress aria-label="Loading your account" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box className="management-page">
        <Paper className="management-auth-prompt" elevation={0}>
          <Typography component="h1" variant="h5">
            Sign in to view matches
          </Typography>
          <Typography color="text.secondary">
            Match listings are available to authenticated members.
          </Typography>
          <Link className="matches-sign-in" href="/auth/login">
            Sign in
          </Link>
        </Paper>
      </Box>
    );
  }

  return (
    <Box className="management-page">
      <Box className="management-header">
        <Box>
          <Typography component="h1" className="management-title">
            Matches
          </Typography>
          <Typography className="management-description">
            Follow the latest games and results.
          </Typography>
        </Box>
      </Box>

      <Paper className="management-panel" elevation={0}>
        <Stack className="management-filters" direction="row" spacing={1.5}>
          <TextField
            fullWidth
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search matches"
            value={search}
            slotProps={{
              htmlInput: { "aria-label": "Search matches" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded />
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormControl className="management-status-filter">
            <InputLabel id="match-status-label">Status</InputLabel>
            <Select
              label="Status"
              labelId="match-status-label"
              onChange={(event) => {
                setStatus(event.target.value as MatchStatus | "all");
                setPage(0);
              }}
              value={status}
            >
              <MenuItem value="all">All statuses</MenuItem>
              {statuses.map((item) => (
                <MenuItem key={item} value={item}>
                  {item.replace("_", " ")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {matchesQuery.isError && (
          <Alert className="management-alert" severity="error">
            {getAuthErrorMessage(matchesQuery.error, "Unable to load matches.")}
          </Alert>
        )}

        <TableContainer>
          <Table aria-label="Matches" sx={{ minWidth: 850 }}>
            <TableHead>
              <TableRow>
                {sortableColumns.map((column) => (
                  <TableCell
                    key={column.id}
                    sortDirection={
                      sortBy === column.id
                        ? sortOrder === "ASC"
                          ? "asc"
                          : "desc"
                        : false
                    }
                  >
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={
                        sortBy === column.id
                          ? sortOrder === "ASC"
                            ? "asc"
                            : "desc"
                          : "asc"
                      }
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell>Tournament</TableCell>
                <TableCell>Game</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matchesQuery.isLoading ? (
                <TableRow>
                  <TableCell align="center" colSpan={7}>
                    <CircularProgress size={26} />
                  </TableCell>
                </TableRow>
              ) : matchesQuery.data?.data.length ? (
                matchesQuery.data.data.map((match) => (
                  <TableRow hover key={match.id}>
                    <TableCell>{playerLabel(match.whitePlayerId)}</TableCell>
                    <TableCell>{playerLabel(match.blackPlayerId)}</TableCell>
                    <TableCell>
                      <Chip
                        color={statusColor(match.status)}
                        label={match.status.replace("_", " ")}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatResult(match.result)}</TableCell>
                    <TableCell>{formatDate(match.createdAt)}</TableCell>
                    <TableCell>
                      {match.tournamentId
                        ? playerLabel(match.tournamentId)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {(user.role === "coach" ||
                        user.role === "admin" ||
                        match.whitePlayerId === user.userId ||
                        match.blackPlayerId === user.userId) && (
                        <Button
                          component={Link}
                          href={`/matches/${encodeURIComponent(match.id)}`}
                          size="small"
                        >
                          {user.role === "player" ? "Open" : "Watch"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell align="center" colSpan={7}>
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      {matchesQuery.isError
                        ? "Match data could not be loaded."
                        : "No matches match these filters."}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={matchesQuery.data?.meta.total ?? 0}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Paper>
    </Box>
  );
}
