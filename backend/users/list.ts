import { api, APIError } from "encore.dev/api";
import { usersDB } from "./db";

export interface ListUsersRequest {
  token: string;
}

export interface User {
  id: number;
  username: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface ListUsersResponse {
  users: User[];
}

// Lists all users with their online status.
export const list = api<ListUsersRequest, ListUsersResponse>(
  { expose: true, method: "POST", path: "/users/list" },
  async (req) => {
    const currentUserId = getUserIdFromToken(req.token);
    if (!currentUserId) {
      throw APIError.unauthenticated("invalid token");
    }

    const users = await usersDB.queryAll<{
      id: number;
      username: string;
      is_online: boolean;
      last_seen: Date;
    }>`
      SELECT id, username, is_online, last_seen 
      FROM users 
      WHERE id != ${currentUserId}
      ORDER BY is_online DESC, username ASC
    `;

    return {
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        isOnline: user.is_online,
        lastSeen: user.last_seen,
      })),
    };
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
