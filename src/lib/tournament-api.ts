import api from "@/lib/axios";

export type TournamentStatus = "draft" | "open" | "ongoing" | "completed";

export type Tournament = {
  id: string;
  name: string;
  description: string;
  timeControl?: string;
  maxParticipants: number;
  startDate: string;
  endDate: string;
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
  endDate: string;
};

export type TournamentCreateInput = TournamentFields;

export type TournamentUpdateInput = TournamentFields & {
  status: "draft" | "open";
};

export type TournamentParticipant = {
  userId: string;
  name: string;
  status: "registered" | "waiting" | "active" | "completed" | "withdrawn";
  joinedAt: string;
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
    const response = await api.get<TournamentListResponse>("/api/tournaments", {
      params,
    });
    return response.data;
  },

  async create(input: TournamentCreateInput): Promise<Tournament> {
    const response = await api.post<Tournament>("/api/tournaments", input);
    return response.data;
  },

  async update(id: string, input: TournamentUpdateInput): Promise<Tournament> {
    const response = await api.patch<Tournament>(
      `/api/tournaments/${encodeURIComponent(id)}`,
      input,
    );
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/tournaments/${encodeURIComponent(id)}`);
  },

  async join(id: string): Promise<void> {
    await api.post(`/api/tournaments/${encodeURIComponent(id)}/join`);
  },

  async participants(id: string): Promise<TournamentParticipant[]> {
    const response = await api.get<TournamentParticipant[]>(
      `/api/tournaments/${encodeURIComponent(id)}/participants`,
    );
    return response.data;
  },

  async leaderboard(id: string): Promise<TournamentStanding[]> {
    const response = await api.get<TournamentStanding[]>(
      `/api/tournaments/${encodeURIComponent(id)}/leaderboard`,
    );
    return response.data;
  },
};
