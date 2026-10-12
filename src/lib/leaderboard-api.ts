import api from "@/lib/axios";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
};

export const leaderboardApi = {
  async top(limit = 10): Promise<LeaderboardEntry[]> {
    const response = await api.get<{ data: LeaderboardEntry[] }>(
      "/api/v1/leaderboard",
      { params: { page: 1, limit } },
    );
    return response.data.data;
  },

  async standing(userId: string): Promise<LeaderboardEntry> {
    const response = await api.get<{ data: LeaderboardEntry }>(
      `/api/v1/leaderboard/${encodeURIComponent(userId)}`,
    );
    return response.data.data;
  },
};
