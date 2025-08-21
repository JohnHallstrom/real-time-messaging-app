import { api, APIError } from "encore.dev/api";
import { messagesDB } from "./db";

export interface ListMessagesRequest {
  token: string;
  otherUserId: number;
}

export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  wordCount: number;
  extraTime: number;
  isRead: boolean;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface ListMessagesResponse {
  messages: Message[];
}

// Lists messages between current user and another user.
export const list = api<ListMessagesRequest, ListMessagesResponse>(
  { expose: true, method: "POST", path: "/messages/list" },
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

    const messages = await messagesDB.queryAll<{
      id: number;
      sender_id: number;
      recipient_id: number;
      content: string;
      word_count: number;
      extra_time: number;
      is_read: boolean;
      read_at: Date | null;
      expires_at: Date | null;
      created_at: Date;
    }>`
      SELECT id, sender_id, recipient_id, content, word_count, extra_time, is_read, read_at, expires_at, created_at
      FROM messages
      WHERE (sender_id = ${currentUserId} AND recipient_id = ${req.otherUserId})
         OR (sender_id = ${req.otherUserId} AND recipient_id = ${currentUserId})
      ORDER BY created_at ASC
    `;

    return {
      messages: messages.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        recipientId: msg.recipient_id,
        content: msg.content,
        wordCount: msg.word_count,
        extraTime: msg.extra_time,
        isRead: msg.is_read,
        readAt: msg.read_at || undefined,
        expiresAt: msg.expires_at || undefined,
        createdAt: msg.created_at,
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
