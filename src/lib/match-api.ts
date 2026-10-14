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
  tournamentName?: string | null;
  roundNumber: number | null;
  status: MatchStatus;
  result: MatchResult | null;
  endReason:
    | "checkmate"
    | "stalemate"
    | "draw"
    | "resignation"
    | "timeout"
    | null;
  pgn: string | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  incrementMs: number;
  drawOfferedBy: string | null;
  clockStartedAt: string | null;
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
  playerColor: "w" | "b" | null;
  legalMoves: LegalMove[];
  pgn: string;
  moves: { number: number; white: string; black: string | null }[];
  movePositions: string[];
  whiteTimeMs: number;
  blackTimeMs: number;
  clockStartedAt: string | null;
  clockSnapshotAt: string;
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
    const response = await api.get<MatchListResponse>("/api/v1/matches", {
      params,
    });
    return response.data;
  },

  async mine(
    params: Omit<MatchListParams, "tournamentId">,
  ): Promise<MatchListResponse> {
    const response = await api.get<MatchListResponse>("/api/v1/matches/me", {
      params,
    });
    return response.data;
  },

  async findOpponent(): Promise<MatchmakingJoinResult> {
    const response = await api.post<{ data: MatchmakingJoinResult }>(
      "/api/v1/matchmaking",
    );
    return response.data.data;
  },

  async matchmakingStatus(): Promise<MatchmakingEntry | null> {
    try {
      const response = await api.get<{ data: MatchmakingEntry }>(
        "/api/v1/matchmaking/me",
      );
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async one(id: string): Promise<Match> {
    const response = await api.get<{ data: Match }>(
      `/api/v1/matches/${encodeURIComponent(id)}`,
    );
    return response.data.data;
  },

  async game(id: string): Promise<MatchGameState> {
    const response = await api.get<{ data: MatchGameState }>(
      `/api/v1/matches/${encodeURIComponent(id)}/game`,
    );
    return response.data.data;
  },

  async move(
    id: string,
    move: Pick<LegalMove, "from" | "to"> & { promotion?: string },
  ): Promise<Match> {
    const response = await api.post<{ data: Match }>(
      `/api/v1/matches/${encodeURIComponent(id)}/moves`,
      move,
    );
    return response.data.data;
  },

  async offerDraw(id: string): Promise<Match> {
    const response = await api.post<{ data: Match }>(
      `/api/v1/matches/${encodeURIComponent(id)}/draw-offer`,
    );
    return response.data.data;
  },

  async respondToDraw(id: string, accept: boolean): Promise<Match> {
    const action = accept ? "accept" : "decline";
    const response = await api.post<{ data: Match }>(
      `/api/v1/matches/${encodeURIComponent(id)}/draw-offer/${action}`,
    );
    return response.data.data;
  },

  async cancelDrawOffer(id: string): Promise<Match> {
    const response = await api.post<{ data: Match }>(
      `/api/v1/matches/${encodeURIComponent(id)}/draw-offer/cancel`,
    );
    return response.data.data;
  },

  async resign(id: string): Promise<Match> {
    const response = await api.post<{ data: Match }>(
      `/api/v1/matches/${encodeURIComponent(id)}/resign`,
    );
    return response.data.data;
  },
};
