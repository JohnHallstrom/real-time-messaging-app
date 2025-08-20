import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";

export interface VerifyRequest {
  token: string;
}

export interface VerifyResponse {
  id: number;
  username: string;
}

// Verifies a user token and returns user info.
export const verify = api<VerifyRequest, VerifyResponse>(
  { expose: true, method: "POST", path: "/auth/verify" },
  async (req) => {
    const userId = getUserIdFromToken(req.token);
    if (!userId) {
      throw APIError.unauthenticated("invalid token");
    }

    const user = await authDB.queryRow<{ id: number; username: string }>`
      SELECT id, username FROM users WHERE id = ${userId}
    `;

    if (!user) {
      throw APIError.unauthenticated("user not found");
    }

    // Update last seen
    await authDB.exec`
      UPDATE users SET last_seen = NOW() WHERE id = ${userId}
    `;

    return user;
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
