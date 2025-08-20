import { api, APIError } from "encore.dev/api";
import { usersDB } from "./db";
import { SQLDatabase } from "encore.dev/storage/sqldb";

export interface ListUsersRequest {
  token: string;
}

export interface User {
  id: number;
  username: string;
  isOnline: boolean;
  lastSeen: Date;
  unreadCount: number;
}

export interface ListUsersResponse {
  users: User[];
}

const messagesDB = SQLDatabase.named("messages");

// Lists all users with their online status and unread message counts.
export const list = api<ListUsersRequest, ListUsersResponse>(
  { expose: true, method: "POST", path: "/users/list" },
  async (req) => {
    const currentUserId = getUserIdFromToken(req.token);
    if (!currentUserId) {
      throw APIError.unauthenticated("invalid token");
    }

    // Clean up expired messages first
    await messagesDB.exec`
      DELETE FROM messages 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `;

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

    // Get unread message counts for each user
    const usersWithUnread = await Promise.all(
      users.map(async (user) => {
        const unreadResult = await messagesDB.queryRow<{ count: number }>`
          SELECT COUNT(*) as count
          FROM messages
          WHERE sender_id = ${user.id} 
            AND recipient_id = ${currentUserId} 
            AND is_read = FALSE
        `;

        return {
          id: user.id,
          username: user.username,
          isOnline: user.is_online,
          lastSeen: user.last_seen,
          unreadCount: unreadResult?.count || 0,
        };
      })
    );

    return { users: usersWithUnread };
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
