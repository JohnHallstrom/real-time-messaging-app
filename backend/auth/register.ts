import { api, APIError } from "encore.dev/api";
import { authDB } from "./db";
import bcrypt from "bcrypt";

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  token: string;
}

// Registers a new user with username and password.
export const register = api<RegisterRequest, RegisterResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    if (!req.username || req.username.length < 3) {
      throw APIError.invalidArgument("username must be at least 3 characters");
    }
    
    if (!req.password || req.password.length < 6) {
      throw APIError.invalidArgument("password must be at least 6 characters");
    }

    // Check if username already exists
    const existingUser = await authDB.queryRow`
      SELECT id FROM users WHERE username = ${req.username}
    `;
    
    if (existingUser) {
      throw APIError.alreadyExists("username already taken");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(req.password, 10);

    // Create user
    const user = await authDB.queryRow<{ id: number; username: string }>`
      INSERT INTO users (username, password_hash, is_online)
      VALUES (${req.username}, ${passwordHash}, TRUE)
      RETURNING id, username
    `;

    if (!user) {
      throw APIError.internal("failed to create user");
    }

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');

    return {
      id: user.id,
      username: user.username,
      token,
    };
  }
);
