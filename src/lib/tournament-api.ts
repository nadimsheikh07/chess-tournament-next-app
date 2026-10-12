import api from "@/lib/axios";

export type TournamentStatus = "draft" | "open" | "ongoing" | "completed";

export type Tournament = {
  id: string;
  name: string;
  description: string;
  timeControl?: string;
  maxParticipants: number;
  startDate: string;
  endDate: string | null;
  status: TournamentStatus;
  createdAt: string;
  updatedAt: string;
};

type TournamentFields = {
  name: string;
  description: string;
  timeControl: string;
  maxParticipants: number;
  startDate: string;
  endDate: string | null;
};

export type TournamentCreateInput = TournamentFields;

export type TournamentUpdateInput = TournamentFields & {
  status: "draft" | "open";
};

export type TournamentParticipant = {
  userId: string;
  name: string;
  status: "registered" | "waiting" | "eliminated" | "completed";
  joinedAt: string;
};

export type TournamentScheduleEntry = {
  tournamentId: string;
  tournamentName: string;
  startDate: string;
  endDate: string | null;
  tournamentStatus: TournamentStatus;
  participantStatus: TournamentParticipant["status"];
  points: number;
};

export type TournamentStanding = {
  rank: number;
  userId: string;
  name: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
};

export type TournamentSortBy =
  | "name"
  | "startDate"
  | "createdAt"
  | "maxParticipants";

export type TournamentListParams = {
  page: number;
  limit: number;
  search?: string;
  sortBy: TournamentSortBy;
  sortOrder: "ASC" | "DESC";
  status?: TournamentStatus;
};

export type TournamentListResponse = {
  data: Tournament[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export const tournamentApi = {
  async list(params: TournamentListParams): Promise<TournamentListResponse> {
    const response = await api.get<TournamentListResponse>(
      "/api/v1/tournaments",
      {
        params,
      },
    );
    return response.data;
  },

  async create(input: TournamentCreateInput): Promise<Tournament> {
    const response = await api.post<{ data: Tournament }>(
      "/api/v1/tournaments",
      input,
    );
    return response.data.data;
  },

  async update(id: string, input: TournamentUpdateInput): Promise<Tournament> {
    const response = await api.patch<{ data: Tournament }>(
      `/api/v1/tournaments/${encodeURIComponent(id)}`,
      input,
    );
    return response.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/tournaments/${encodeURIComponent(id)}`);
  },

  async join(id: string): Promise<void> {
    await api.post(`/api/v1/tournaments/${encodeURIComponent(id)}/join`);
  },

  async mySchedule(): Promise<TournamentScheduleEntry[]> {
    const response = await api.get<{ data: TournamentScheduleEntry[] }>(
      "/api/v1/tournaments/my-schedule",
    );
    return response.data.data;
  },

  async participants(id: string): Promise<TournamentParticipant[]> {
    const response = await api.get<{ data: TournamentParticipant[] }>(
      `/api/v1/tournaments/${encodeURIComponent(id)}/participants`,
    );
    return response.data.data;
  },

  async leaderboard(id: string): Promise<TournamentStanding[]> {
    const response = await api.get<{ data: TournamentStanding[] }>(
      `/api/v1/tournaments/${encodeURIComponent(id)}/leaderboard`,
    );
    return response.data.data;
  },
};
