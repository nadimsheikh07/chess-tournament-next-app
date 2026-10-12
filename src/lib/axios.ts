import axios from "axios";
import { readAuthTokens } from "@/lib/auth-storage";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const tokens = readAuthTokens();
  if (tokens) {
    config.headers.set(
      "Authorization",
      `${tokens.tokenType} ${tokens.accessToken}`,
    );
  }
  return config;
});

export default api;
