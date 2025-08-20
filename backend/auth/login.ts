import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";
import bcrypt from "bcrypt";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: number;
  username: string;
  token: string;
}

// Logs in a user with username and password.
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    const user = await authDB.queryRow<{ id: number; username: string; password_hash: string }>`
      SELECT id, username, password_hash FROM users WHERE username = ${req.username}
    `;

    if (!user) {
      throw APIError.unauthenticated("invalid username or password");
    }

    const isValidPassword = await bcrypt.compare(req.password, user.password_hash);
    if (!isValidPassword) {
      throw APIError.unauthenticated("invalid username or password");
    }

    // Update user online status
    await authDB.exec`
      UPDATE users SET is_online = TRUE, last_seen = NOW() WHERE id = ${user.id}
    `;

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');

    return {
      id: user.id,
      username: user.username,
      token,
    };
  }
);
