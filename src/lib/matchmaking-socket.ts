"use client";

import { io, type Socket } from "socket.io-client";
import type { Match } from "@/lib/match-api";

export type MatchFoundEvent = {
  matchId: string;
  match: Match;
};

export function connectToMatchmaking(accessToken: string): Socket {
  const serverUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;

  return io(serverUrl, {
    auth: { token: accessToken },
    transports: ["websocket"],
  });
}
