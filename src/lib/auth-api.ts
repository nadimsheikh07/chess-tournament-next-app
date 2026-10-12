import axios from "axios";
import api from "@/lib/axios";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
};

export type AuthProfile = {
  userId: string;
  email: string;
  role: "player" | "coach" | "admin";
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegistrationDetails = LoginCredentials & {
  name: string;
};

type ApiError = {
  message?: string | string[];
};

export const authApi = {
  async register(details: RegistrationDetails): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>("/api/auth/register", details);
    return response.data;
  },

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>("/api/auth/login", credentials);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post("/api/auth/logout");
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const response = await api.post<AuthTokens>("/api/auth/refresh", {
      refreshToken,
    });
    return response.data;
  },

  async getProfile(): Promise<AuthProfile> {
    const response = await api.get<AuthProfile>("/api/auth/profile");
    return response.data;
  },
};

export function getAuthErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.length > 0 ? message.join(", ") : fallback;
    }
    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
