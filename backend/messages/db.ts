import { SQLDatabase } from "encore.dev/storage/sqldb";

export const messagesDB = new SQLDatabase("messages", {
  migrations: "./migrations",
});
