"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
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
import {
  type Tournament,
  type TournamentInput,
  type TournamentSortBy,
  type TournamentStatus,
  tournamentApi,
} from "@/lib/tournament-api";

type TournamentFormValues = {
  name: string;
  description: string;
  maxParticipants: number;
  startDate: string;
  endDate: string;
};

const statuses: TournamentStatus[] = [
  "draft",
  "upcoming",
  "active",
  "completed",
  "cancelled",
];

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
    case "upcoming":
      return "success";
    case "active":
      return "info";
    case "draft":
      return "warning";
    case "cancelled":
      return "error";
    default:
      return "default";
  }
}

export default function TournamentManagement() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<TournamentSortBy>("startDate");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");
  const [status, setStatus] = useState<TournamentStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
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
      maxParticipants: 16,
      startDate: "",
      endDate: "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: TournamentFormValues) => {
      const input: TournamentInput = {
        name: values.name.trim(),
        description: values.description.trim(),
        maxParticipants: Number(values.maxParticipants),
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
      };
      return editing
        ? tournamentApi.update(editing.id, input)
        : tournamentApi.create(input);
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

  function openCreateDialog() {
    setEditing(null);
    setSaveError(null);
    form.reset({
      name: "",
      description: "",
      maxParticipants: 16,
      startDate: "",
      endDate: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(tournament: Tournament) {
    setEditing(tournament);
    setSaveError(null);
    form.reset({
      name: tournament.name,
      description: tournament.description ?? "",
      maxParticipants: tournament.maxParticipants,
      startDate: toDateTimeLocal(tournament.startDate),
      endDate: toDateTimeLocal(tournament.endDate),
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
            Search, sort, and manage chess events.
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
                  {item}
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

        <TableContainer>
          <Table aria-label="Tournaments" sx={{ minWidth: 760 }}>
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
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tournamentsQuery.isLoading ? (
                <TableRow>
                  <TableCell align="center" colSpan={6}>
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
                    <TableCell>
                      <Chip
                        color={statusColor(tournament.status)}
                        label={tournament.status}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {canManage && (
                        <Button
                          aria-label={`Edit ${tournament.name}`}
                          onClick={() => openEditDialog(tournament)}
                          size="small"
                          startIcon={<EditRounded />}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell align="center" colSpan={6}>
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

      <Snackbar
        autoHideDuration={4000}
        message={successMessage}
        onClose={() => setSuccessMessage("")}
        open={Boolean(successMessage)}
      />
    </Box>
  );
}
