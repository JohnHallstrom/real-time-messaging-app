import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";

export interface LogoutRequest {
  token: string;
}

// Logs out a user and sets them offline.
export const logout = api<LogoutRequest, void>(
  { expose: true, method: "POST", path: "/auth/logout" },
  async (req) => {
    const userId = getUserIdFromToken(req.token);
    if (!userId) {
      throw APIError.unauthenticated("invalid token");
    }

    await authDB.exec`
      UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE id = ${userId}
    `;
  }
);

function getUserIdFromToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [userId] = decoded.split(':');
    return parseInt(userId, 10);
  } catch {
    return null;
  }
}
