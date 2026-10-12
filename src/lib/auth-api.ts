import axios from "axios";
import api, { refreshAuthSession } from "@/lib/axios";

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
  async register(details: RegistrationDetails): Promise<void> {
    await api.post("/api/v1/auth/register", details);
  },

  async login(credentials: LoginCredentials): Promise<void> {
    await api.post("/api/v1/auth/login", credentials);
  },

  async logout(): Promise<void> {
    await api.post("/api/v1/auth/logout");
  },

  async refresh(): Promise<void> {
    await refreshAuthSession();
  },

  async getProfile(): Promise<AuthProfile> {
    const response = await api.get<{ data: AuthProfile }>("/api/v1/me");
    return response.data.data;
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
