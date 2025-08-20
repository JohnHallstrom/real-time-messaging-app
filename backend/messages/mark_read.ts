import { api, APIError } from "encore.dev/api";
import { messagesDB } from "./db";

export interface MarkReadRequest {
  token: string;
  messageId: number;
}

export interface MarkReadResponse {
  expiresAt: Date;
}

// Marks a message as read and starts the disappearing timer.
export const markRead = api<MarkReadRequest, MarkReadResponse>(
  { expose: true, method: "POST", path: "/messages/mark-read" },
  async (req) => {
    const currentUserId = getUserIdFromToken(req.token);
    if (!currentUserId) {
      throw APIError.unauthenticated("invalid token");
    }

    // Get the message and verify the user is the recipient
    const message = await messagesDB.queryRow<{
      id: number;
      recipient_id: number;
      word_count: number;
      is_read: boolean;
    }>`
      SELECT id, recipient_id, word_count, is_read
      FROM messages
      WHERE id = ${req.messageId}
    `;

    if (!message) {
      throw APIError.notFound("message not found");
    }

    if (message.recipient_id !== currentUserId) {
      throw APIError.permissionDenied("not authorized to read this message");
    }

    if (message.is_read) {
      throw APIError.invalidArgument("message already read");
    }

    // Calculate expiration time based on word count (divisible by 5)
    const baseSeconds = Math.max(5, Math.ceil(message.word_count / 5) * 5);
    const expiresAt = new Date(Date.now() + baseSeconds * 1000);

    // Mark as read and set expiration
    await messagesDB.exec`
      UPDATE messages 
      SET is_read = TRUE, read_at = NOW(), expires_at = ${expiresAt}
      WHERE id = ${req.messageId}
    `;

    return { expiresAt };
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
