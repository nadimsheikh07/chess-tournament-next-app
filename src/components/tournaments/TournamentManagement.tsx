"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import EmojiEventsRounded from "@mui/icons-material/EmojiEventsRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
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
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthErrorMessage } from "@/lib/auth-api";
import { matchApi } from "@/lib/match-api";
import {
  type Tournament,
  type TournamentCreateInput,
  type TournamentSortBy,
  type TournamentStatus,
  type TournamentUpdateInput,
  tournamentApi,
} from "@/lib/tournament-api";

type TournamentFormValues = {
  name: string;
  description: string;
  timeControl: string;
  maxParticipants: number;
  startDate: string;
  endDate: string;
  status: "draft" | "open";
};

const statuses: TournamentStatus[] = ["draft", "open", "ongoing", "completed"];

const editableStatuses: TournamentFormValues["status"][] = ["draft", "open"];

const sortableColumns: { id: TournamentSortBy; label: string }[] = [
  { id: "name", label: "Tournament" },
  { id: "startDate", label: "Starts" },
  { id: "maxParticipants", label: "Capacity" },
  { id: "createdAt", label: "Created" },
];

function toDateTimeLocal(value?: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function statusColor(
  status: TournamentStatus,
): "default" | "success" | "warning" | "info" | "error" {
  switch (status) {
    case "open":
    case "completed":
      return "success";
    case "ongoing":
      return "info";
    case "draft":
      return "warning";
    default:
      return "default";
  }
}

function statusLabel(status: TournamentStatus): string {
  return status;
}

function canEditTournament(
  status: TournamentStatus,
): status is TournamentFormValues["status"] {
  return status === "draft" || status === "open";
}

function playerLabel(playerId: string): string {
  return playerId.length > 12 ? `${playerId.slice(0, 8)}…` : playerId;
}

export default function TournamentManagement() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [matchPage, setMatchPage] = useState(0);
  const [matchRowsPerPage, setMatchRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<TournamentSortBy>("startDate");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [status, setStatus] = useState<TournamentStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [deleting, setDeleting] = useState<Tournament | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const canManage = user?.role === "coach" || user?.role === "admin";
  const queryKey = useMemo(
    () => [
      "tournaments",
      page + 1,
      rowsPerPage,
      debouncedSearch,
      sortBy,
      sortOrder,
      status,
    ],
    [page, rowsPerPage, debouncedSearch, sortBy, sortOrder, status],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const tournamentsQuery = useQuery({
    queryKey,
    queryFn: () =>
      tournamentApi.list({
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

  const form = useForm<TournamentFormValues>({
    defaultValues: {
      name: "",
      description: "",
      timeControl: "5+0",
      maxParticipants: 16,
      startDate: "",
      endDate: "",
      status: "open",
    },
  });

  const participantsQuery = useQuery({
    queryKey: ["tournament-participants", selectedTournament?.id],
    queryFn: () => tournamentApi.participants(selectedTournament!.id),
    enabled: Boolean(selectedTournament),
  });

  const leaderboardQuery = useQuery({
    queryKey: ["tournament-leaderboard", selectedTournament?.id],
    queryFn: () => tournamentApi.leaderboard(selectedTournament!.id),
    enabled: Boolean(selectedTournament),
  });

  const matchesQuery = useQuery({
    queryKey: [
      "tournament-matches",
      selectedTournament?.id,
      matchPage + 1,
      matchRowsPerPage,
    ],
    queryFn: () =>
      matchApi.list({
        page: matchPage + 1,
        limit: matchRowsPerPage,
        tournamentId: selectedTournament!.id,
        sortBy: "createdAt",
        sortOrder: "DESC",
      }),
    enabled: Boolean(selectedTournament),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: TournamentFormValues) => {
      const fields: TournamentCreateInput = {
        name: values.name.trim(),
        description: values.description.trim(),
        timeControl: values.timeControl.trim(),
        maxParticipants: Number(values.maxParticipants),
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
      };
      if (editing) {
        const input: TournamentUpdateInput = {
          ...fields,
          status: values.status,
        };
        return tournamentApi.update(editing.id, input);
      }
      return tournamentApi.create(fields);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      setDialogOpen(false);
      setSuccessMessage(
        editing ? "Tournament updated." : "Tournament created.",
      );
    },
    onError: (error) => {
      setSaveError(
        getAuthErrorMessage(error, "Unable to save the tournament."),
      );
    },
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => tournamentApi.join(id),
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({
        queryKey: ["tournament-participants", id],
      });
      setSuccessMessage(
        "Registration submitted. Opponents are assigned automatically.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (tournament: Tournament) => tournamentApi.remove(tournament.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      setPage(0);
      setDeleting(null);
      setSuccessMessage("Tournament deleted.");
    },
  });

  function openCreateDialog() {
    setEditing(null);
    setSaveError(null);
    form.reset({
      name: "",
      description: "",
      timeControl: "5+0",
      maxParticipants: 16,
      startDate: "",
      endDate: "",
      status: "open",
    });
    setDialogOpen(true);
  }

  function openEditDialog(tournament: Tournament) {
    if (!canEditTournament(tournament.status)) {
      return;
    }

    setEditing(tournament);
    setSaveError(null);
    form.reset({
      name: tournament.name,
      description: tournament.description ?? "",
      timeControl: tournament.timeControl ?? "5+0",
      maxParticipants: tournament.maxParticipants,
      startDate: toDateTimeLocal(tournament.startDate),
      endDate: toDateTimeLocal(tournament.endDate),
      status: tournament.status,
    });
    setDialogOpen(true);
  }

  function handleSort(column: TournamentSortBy) {
    setPage(0);
    if (sortBy === column) {
      setSortOrder((current) => (current === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(column);
      setSortOrder("ASC");
    }
  }

  function participantName(userId: string): string {
    return (
      participantsQuery.data?.find(
        (participant) => participant.userId === userId,
      )?.name || playerLabel(userId)
    );
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
            Sign in to view tournaments
          </Typography>
          <Typography color="text.secondary">
            Tournament listings are available to authenticated members.
          </Typography>
          <Button component={Link} href="/auth/login" variant="contained">
            Sign in
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box className="management-page">
      <Box className="management-header">
        <Box>
          <Button
            className="management-back"
            component={Link}
            href="/admin"
            startIcon={<ArrowBackRounded />}
          >
            Dashboard
          </Button>
          <Typography component="h1" className="management-title">
            Tournaments
          </Typography>
          <Typography className="management-description">
            Create events, register students, and follow automatic pairings and
            results.
          </Typography>
        </Box>
        {canManage && (
          <Button
            onClick={openCreateDialog}
            startIcon={<AddRounded />}
            variant="contained"
          >
            Create tournament
          </Button>
        )}
      </Box>

      <Paper className="management-panel" elevation={0}>
        <Stack className="management-filters" direction="row" spacing={1.5}>
          <TextField
            fullWidth
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or description"
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
          <FormControl className="management-status-filter">
            <InputLabel id="tournament-status-label">Status</InputLabel>
            <Select
              label="Status"
              labelId="tournament-status-label"
              onChange={(event) => {
                setStatus(event.target.value as TournamentStatus | "all");
                setPage(0);
              }}
              value={status}
            >
              <MenuItem value="all">All statuses</MenuItem>
              {statuses.map((item) => (
                <MenuItem key={item} value={item}>
                  {statusLabel(item)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {tournamentsQuery.isError && (
          <Alert className="management-alert" severity="error">
            {getAuthErrorMessage(
              tournamentsQuery.error,
              "Unable to load tournaments.",
            )}
          </Alert>
        )}
        {joinMutation.isError && (
          <Alert className="management-alert" severity="error">
            {getAuthErrorMessage(
              joinMutation.error,
              "Unable to join this tournament.",
            )}
          </Alert>
        )}
        {deleteMutation.isError && (
          <Alert className="management-alert" severity="error">
            {getAuthErrorMessage(
              deleteMutation.error,
              "Unable to delete the tournament.",
            )}
          </Alert>
        )}

        <TableContainer>
          <Table aria-label="Tournaments" sx={{ minWidth: 940 }}>
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
                <TableCell>Time control</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Manage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tournamentsQuery.isLoading ? (
                <TableRow>
                  <TableCell align="center" colSpan={7}>
                    <CircularProgress size={26} />
                  </TableCell>
                </TableRow>
              ) : tournamentsQuery.data?.data.length ? (
                tournamentsQuery.data.data.map((tournament) => (
                  <TableRow hover key={tournament.id}>
                    <TableCell>
                      <Typography className="tournament-table-name">
                        {tournament.name}
                      </Typography>
                      <Typography className="tournament-table-description">
                        {tournament.description || "No description"}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(tournament.startDate)}</TableCell>
                    <TableCell>{tournament.maxParticipants}</TableCell>
                    <TableCell>{formatDate(tournament.createdAt)}</TableCell>
                    <TableCell>{tournament.timeControl ?? "—"}</TableCell>
                    <TableCell>
                      <Chip
                        color={statusColor(tournament.status)}
                        label={statusLabel(tournament.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ justifyContent: "flex-end" }}
                      >
                        <Button
                          aria-label={`View ${tournament.name} results`}
                          onClick={() => {
                            setMatchPage(0);
                            setSelectedTournament(tournament);
                          }}
                          size="small"
                          startIcon={<VisibilityRounded />}
                        >
                          Results
                        </Button>
                        {user.role === "player" &&
                          tournament.status === "open" && (
                            <Button
                              disabled={joinMutation.isPending}
                              onClick={() => joinMutation.mutate(tournament.id)}
                              size="small"
                              variant="outlined"
                            >
                              Join
                            </Button>
                          )}
                        {canManage && (
                          <>
                            {canEditTournament(tournament.status) && (
                              <Button
                                aria-label={`Edit ${tournament.name}`}
                                onClick={() => openEditDialog(tournament)}
                                size="small"
                                startIcon={<EditRounded />}
                              >
                                Edit
                              </Button>
                            )}
                            <Button
                              aria-label={`Delete ${tournament.name}`}
                              color="error"
                              onClick={() => setDeleting(tournament)}
                              size="small"
                              startIcon={<DeleteOutlineRounded />}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell align="center" colSpan={7}>
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      {tournamentsQuery.isError
                        ? "Tournament data could not be loaded."
                        : "No tournaments match these filters."}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={tournamentsQuery.data?.meta.total ?? 0}
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

      {!canManage && (
        <Typography className="management-permission-note">
          Only coaches and admins can create or update tournaments.
        </Typography>
      )}

      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => setDialogOpen(false)}
        open={dialogOpen}
      >
        <Box
          component="form"
          onSubmit={form.handleSubmit((values) => {
            setSaveError(null);
            saveMutation.mutate(values);
          })}
        >
          <DialogTitle>
            {editing ? "Update tournament" : "Create tournament"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {saveError && <Alert severity="error">{saveError}</Alert>}
              <Controller
                control={form.control}
                name="name"
                rules={{
                  required: "Tournament name is required.",
                  minLength: {
                    value: 2,
                    message: "Name must be at least 2 characters.",
                  },
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    autoFocus
                    error={Boolean(fieldState.error)}
                    fullWidth
                    helperText={fieldState.error?.message}
                    label="Tournament name"
                  />
                )}
              />
              <Controller
                control={form.control}
                name="description"
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Description"
                    multiline
                    minRows={2}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="timeControl"
                rules={{
                  required: "Time control is required.",
                  validate: (value) => {
                    const parts = /^(\d+)\+(\d+)$/.exec(value.trim());
                    if (!parts) {
                      return "Use minutes+increment, for example 5+0.";
                    }

                    const minutes = Number(parts[1]);
                    const increment = Number(parts[2]);
                    return (
                      (Number.isSafeInteger(minutes) &&
                        minutes > 0 &&
                        Number.isSafeInteger(increment)) ||
                      "Enter a positive number of minutes and a valid increment."
                    );
                  },
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    error={Boolean(fieldState.error)}
                    fullWidth
                    helperText={
                      fieldState.error?.message ??
                      "Minutes per player + increment in seconds, e.g. 5+0."
                    }
                    label="Time control"
                    placeholder="5+0"
                  />
                )}
              />
              <Controller
                control={form.control}
                name="maxParticipants"
                rules={{
                  required: "Participant limit is required.",
                  min: { value: 2, message: "Enter at least 2 participants." },
                  max: {
                    value: 10000,
                    message: "Participant limit is too high.",
                  },
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    error={Boolean(fieldState.error)}
                    fullWidth
                    helperText={fieldState.error?.message}
                    label="Maximum participants"
                    onChange={(event) =>
                      field.onChange(Number(event.target.value))
                    }
                    slotProps={{ htmlInput: { min: 2, max: 10000 } }}
                    type="number"
                  />
                )}
              />
              <Controller
                control={form.control}
                name="startDate"
                rules={{
                  required: "Start date is required.",
                  validate: (value) =>
                    !Number.isNaN(new Date(value).getTime()) ||
                    "Enter a valid start date.",
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    error={Boolean(fieldState.error)}
                    fullWidth
                    helperText={fieldState.error?.message}
                    label="Start date and time"
                    slotProps={{ inputLabel: { shrink: true } }}
                    type="datetime-local"
                  />
                )}
              />
              <Controller
                control={form.control}
                name="endDate"
                rules={{
                  required: "End date is required.",
                  validate: (value) => {
                    const endDate = new Date(value).getTime();
                    const startDate = new Date(
                      form.getValues("startDate"),
                    ).getTime();
                    if (Number.isNaN(endDate)) {
                      return "Enter a valid end date.";
                    }
                    return (
                      endDate > startDate ||
                      "End date must be after the start date."
                    );
                  },
                }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    error={Boolean(fieldState.error)}
                    fullWidth
                    helperText={fieldState.error?.message}
                    label="End date and time"
                    slotProps={{ inputLabel: { shrink: true } }}
                    type="datetime-local"
                  />
                )}
              />
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <TextField {...field} fullWidth label="Status" select>
                    {editableStatuses.map((item) => (
                      <MenuItem key={item} value={item}>
                        {statusLabel(item)}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={saveMutation.isPending}
              type="submit"
              variant="contained"
            >
              {saveMutation.isPending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Create tournament"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        fullWidth
        maxWidth="md"
        onClose={() => setSelectedTournament(null)}
        open={Boolean(selectedTournament)}
      >
        <DialogTitle>
          {selectedTournament?.name ?? "Tournament results"}
        </DialogTitle>
        <DialogContent>
          {selectedTournament && (
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip
                  color={statusColor(selectedTournament.status)}
                  label={statusLabel(selectedTournament.status)}
                  size="small"
                />
                <Chip
                  label={
                    selectedTournament.timeControl ?? "Time control unavailable"
                  }
                  size="small"
                />
                <Chip
                  label={`Starts ${formatDate(selectedTournament.startDate)}`}
                  size="small"
                  variant="outlined"
                />
              </Stack>

              {selectedTournament.status === "completed" && (
                <Alert icon={<EmojiEventsRounded />} severity="success">
                  {leaderboardQuery.data?.[0]
                    ? `Winner: ${leaderboardQuery.data[0].name} (${leaderboardQuery.data[0].points} points)`
                    : leaderboardQuery.isLoading
                      ? "Loading the final winner…"
                      : "The tournament is completed; final standings are not available yet."}
                </Alert>
              )}

              <Typography variant="h6">Standings</Typography>
              {leaderboardQuery.isError && (
                <Alert severity="error">
                  {getAuthErrorMessage(
                    leaderboardQuery.error,
                    "Unable to load tournament standings.",
                  )}
                </Alert>
              )}
              {leaderboardQuery.isLoading ? (
                <CircularProgress aria-label="Loading standings" size={24} />
              ) : leaderboardQuery.data?.length ? (
                <TableContainer>
                  <Table aria-label="Tournament standings" size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Rank</TableCell>
                        <TableCell>Player</TableCell>
                        <TableCell align="right">Points</TableCell>
                        <TableCell align="right">W</TableCell>
                        <TableCell align="right">D</TableCell>
                        <TableCell align="right">L</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaderboardQuery.data.map((standing) => (
                        <TableRow key={standing.userId}>
                          <TableCell>{standing.rank}</TableCell>
                          <TableCell>{standing.name}</TableCell>
                          <TableCell align="right">{standing.points}</TableCell>
                          <TableCell align="right">{standing.wins}</TableCell>
                          <TableCell align="right">{standing.draws}</TableCell>
                          <TableCell align="right">{standing.losses}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">
                  No standings are available yet.
                </Typography>
              )}

              <Divider />
              <Typography variant="h6">Participants</Typography>
              {participantsQuery.isError && (
                <Alert severity="error">
                  {getAuthErrorMessage(
                    participantsQuery.error,
                    "Unable to load tournament participants.",
                  )}
                </Alert>
              )}
              {participantsQuery.isLoading ? (
                <CircularProgress aria-label="Loading participants" size={24} />
              ) : participantsQuery.data?.length ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {participantsQuery.data.map((participant) => (
                    <Chip
                      key={participant.userId}
                      label={`${participant.name} · ${participant.status}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">
                  No students have registered yet.
                </Typography>
              )}
              <Typography color="text.secondary" variant="body2">
                Opponents are assigned automatically; pairings are not managed
                manually.
              </Typography>

              <Divider />
              <Typography variant="h6">Match results</Typography>
              {matchesQuery.isError && (
                <Alert severity="error">
                  {getAuthErrorMessage(
                    matchesQuery.error,
                    "Unable to load tournament matches.",
                  )}
                </Alert>
              )}
              {matchesQuery.isLoading ? (
                <CircularProgress
                  aria-label="Loading match results"
                  size={24}
                />
              ) : matchesQuery.data?.data.length ? (
                <>
                  <TableContainer>
                    <Table aria-label="Tournament match results" size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>White</TableCell>
                          <TableCell>Black</TableCell>
                          <TableCell>Result</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {matchesQuery.data.data.map((match) => (
                          <TableRow key={match.id}>
                            <TableCell>
                              {participantName(match.whitePlayerId)}
                            </TableCell>
                            <TableCell>
                              {participantName(match.blackPlayerId)}
                            </TableCell>
                            <TableCell>
                              {match.result === "white_win"
                                ? "White wins"
                                : match.result === "black_win"
                                  ? "Black wins"
                                  : match.result === "draw"
                                    ? "Draw"
                                    : "—"}
                            </TableCell>
                            <TableCell>
                              {match.status.replaceAll("_", " ")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={matchesQuery.data.meta.total}
                    labelRowsPerPage="Matches per page"
                    onPageChange={(_, nextPage) => setMatchPage(nextPage)}
                    onRowsPerPageChange={(event) => {
                      setMatchRowsPerPage(Number(event.target.value));
                      setMatchPage(0);
                    }}
                    page={matchPage}
                    rowsPerPage={matchRowsPerPage}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                  />
                </>
              ) : (
                <Typography color="text.secondary">
                  No matches have been generated yet.
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelectedTournament(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog onClose={() => setDeleting(null)} open={Boolean(deleting)}>
        <DialogTitle>Delete tournament?</DialogTitle>
        <DialogContent>
          {deleteMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getAuthErrorMessage(
                deleteMutation.error,
                "Unable to delete the tournament.",
              )}
            </Alert>
          )}
          <Typography>
            This action cannot be undone. Delete{" "}
            {deleting?.name ?? "this tournament"}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            disabled={deleteMutation.isPending}
            onClick={() => setDeleting(null)}
          >
            Cancel
          </Button>
          <Button
            color="error"
            disabled={!deleting || deleteMutation.isPending}
            onClick={() => {
              if (deleting) {
                deleteMutation.mutate(deleting);
              }
            }}
            variant="contained"
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete tournament"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        autoHideDuration={4000}
        message={successMessage}
        onClose={() => setSuccessMessage("")}
        open={Boolean(successMessage)}
      />
    </Box>
  );
}
