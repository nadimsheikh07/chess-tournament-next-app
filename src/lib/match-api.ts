import axios from "axios";
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

export type MatchmakingEntry = {
  id: string;
  userId: string;
  rating: number;
  status: "waiting" | "matched" | "cancelled";
  matchId: string | null;
  queuedAt: string;
};

export type MatchmakingJoinResult = {
  queueEntry: MatchmakingEntry;
  match: Match | null;
};

export type LegalMove = {
  from: string;
  to: string;
  promotion?: string;
};

export type MatchGameState = {
  match: Match;
  fen: string;
  turn: "w" | "b";
  playerColor: "w" | "b";
  legalMoves: LegalMove[];
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
  tournamentId?: string;
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

  async mine(
    params: Omit<MatchListParams, "tournamentId">,
  ): Promise<MatchListResponse> {
    const response = await api.get<MatchListResponse>("/api/matches/me", {
      params,
    });
    return response.data;
  },

  async findOpponent(): Promise<MatchmakingJoinResult> {
    const response = await api.post<MatchmakingJoinResult>("/api/matchmaking");
    return response.data;
  },

  async matchmakingStatus(): Promise<MatchmakingEntry | null> {
    try {
      const response = await api.get<MatchmakingEntry>("/api/matchmaking/me");
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async one(id: string): Promise<Match> {
    const response = await api.get<Match>(
      `/api/matches/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  async game(id: string): Promise<MatchGameState> {
    const response = await api.get<MatchGameState>(
      `/api/matches/${encodeURIComponent(id)}/game`,
    );
    return response.data;
  },

  async move(
    id: string,
    move: Pick<LegalMove, "from" | "to"> & { promotion?: string },
  ): Promise<Match> {
    const response = await api.post<Match>(
      `/api/matches/${encodeURIComponent(id)}/moves`,
      move,
    );
    return response.data;
  },
};
