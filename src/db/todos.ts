import { type SQLiteDatabase } from 'expo-sqlite';

import { type Todo } from '@/db/types';

interface TodoRow {
  id: number;
  title: string;
  description: string | null;
  created_at_ms: number;
  completed_at_ms: number | null;
  completion_note: string | null;
}

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAtMs: row.created_at_ms,
    completedAtMs: row.completed_at_ms,
    completionNote: row.completion_note,
  };
}

/** Open todos oldest-first, then completed todos most-recently-completed-first. */
export async function listTodos(db: SQLiteDatabase): Promise<Todo[]> {
  const rows = await db.getAllAsync<TodoRow>(
    `SELECT * FROM todos
     ORDER BY completed_at_ms IS NOT NULL,
              CASE WHEN completed_at_ms IS NULL THEN created_at_ms END ASC,
              completed_at_ms DESC`,
  );
  return rows.map(toTodo);
}

export async function addTodo(db: SQLiteDatabase, title: string, description: string | null): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO todos (title, description, created_at_ms) VALUES (?, ?, ?)',
    title,
    description,
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function completeTodo(db: SQLiteDatabase, id: number, note: string | null) {
  await db.runAsync('UPDATE todos SET completed_at_ms = ?, completion_note = ? WHERE id = ?', Date.now(), note, id);
}

export async function uncompleteTodo(db: SQLiteDatabase, id: number) {
  await db.runAsync('UPDATE todos SET completed_at_ms = NULL, completion_note = NULL WHERE id = ?', id);
}

export async function deleteTodo(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM todos WHERE id = ?', id);
}
