import { api, APIError } from "encore.dev/api";
import { messagesDB } from "./db";

export interface AutoMarkReadRequest {
  token: string;
  messageIds: number[];
}

export interface AutoMarkReadResponse {
  markedMessages: Array<{
    id: number;
    expiresAt: Date;
    timeToRead: number;
  }>;
}

// Automatically marks unread messages as read when user opens conversation.
export const autoMarkRead = api<AutoMarkReadRequest, AutoMarkReadResponse>(
  { expose: true, method: "POST", path: "/messages/auto-mark-read" },
  async (req) => {
    const currentUserId = getUserIdFromToken(req.token);
    if (!currentUserId) {
      throw APIError.unauthenticated("invalid token");
    }

    const markedMessages: Array<{
      id: number;
      expiresAt: Date;
      timeToRead: number;
    }> = [];

    for (const messageId of req.messageIds) {
      // Get the message and verify the user is the recipient
      const message = await messagesDB.queryRow<{
        id: number;
        recipient_id: number;
        word_count: number;
        is_read: boolean;
      }>`
        SELECT id, recipient_id, word_count, is_read
        FROM messages
        WHERE id = ${messageId} AND recipient_id = ${currentUserId} AND is_read = FALSE
      `;

      if (message) {
        // Calculate expiration time based on word count (divisible by 5)
        const baseSeconds = Math.max(5, Math.ceil(message.word_count / 5) * 5);
        const expiresAt = new Date(Date.now() + baseSeconds * 1000);

        // Mark as read and set expiration
        await messagesDB.exec`
          UPDATE messages 
          SET is_read = TRUE, read_at = NOW(), expires_at = ${expiresAt}
          WHERE id = ${messageId}
        `;

        markedMessages.push({
          id: messageId,
          expiresAt,
          timeToRead: baseSeconds,
        });
      }
    }

    return { markedMessages };
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
