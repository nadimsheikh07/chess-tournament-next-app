import api from "@/lib/axios";

export type MatchStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type MatchResult = "white_win" | "black_win" | "draw";

export type Match = {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  tournamentId: string | null;
  status: MatchStatus;
  result: MatchResult | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchSortBy =
  | "createdAt"
  | "updatedAt"
  | "completedAt"
  | "status"
  | "result"
  | "whitePlayerId"
  | "blackPlayerId";

export type MatchListParams = {
  page: number;
  limit: number;
  search?: string;
  sortBy: MatchSortBy;
  sortOrder: "ASC" | "DESC";
  status?: MatchStatus;
};

export type MatchListResponse = {
  data: Match[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export const matchApi = {
  async list(params: MatchListParams): Promise<MatchListResponse> {
    const response = await api.get<MatchListResponse>("/api/matches", {
      params,
    });
    return response.data;
  },
};
