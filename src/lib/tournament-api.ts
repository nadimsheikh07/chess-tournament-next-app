import api from "@/lib/axios";

export type TournamentStatus =
  | "draft"
  | "upcoming"
  | "active"
  | "completed"
  | "cancelled";

export type Tournament = {
  id: string;
  name: string;
  description: string;
  maxParticipants: number;
  startDate: string;
  endDate: string;
  status: TournamentStatus;
  createdAt: string;
  updatedAt: string;
};

export type TournamentInput = {
  name: string;
  description: string;
  maxParticipants: number;
  startDate: string;
  endDate: string;
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

  async create(input: TournamentInput): Promise<Tournament> {
    const response = await api.post<Tournament>("/api/tournaments", input);
    return response.data;
  },

  async update(id: string, input: TournamentInput): Promise<Tournament> {
    const response = await api.patch<Tournament>(
      `/api/tournaments/${encodeURIComponent(id)}`,
      input,
    );
    return response.data;
  },
};
