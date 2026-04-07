import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { PaperWorkspaceContext } from "@/core/paper/types";
import {
  mapPaperAccountRow,
  mapPaperPositionRow,
  mapPaperTradeRow,
  mapWorkspaceActivityRow,
  mapWorkspaceIdentityRow,
} from "@/core/paper/client-mappers";

function sortByDateDesc<T>(items: T[], readDate: (item: T) => string) {
  return [...items].sort((left, right) => readDate(right).localeCompare(readDate(left)));
}

function upsertById<T extends { id: string }>(items: T[], next: T) {
  return [next, ...items.filter((item) => item.id !== next.id)];
}

function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id);
}

function readRow(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  return (payload.eventType === "DELETE" ? payload.old : payload.new) as Record<string, unknown>;
}

export function applyWorkspaceUserRealtime(
  current: PaperWorkspaceContext | undefined,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
) {
  if (!current) return current;
  if (payload.eventType === "DELETE") return current;
  return { ...current, identity: mapWorkspaceIdentityRow(readRow(payload)) };
}

export function applyPaperAccountRealtime(
  current: PaperWorkspaceContext | undefined,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
) {
  if (!current) return current;
  if (payload.eventType === "DELETE") return current;
  return { ...current, account: mapPaperAccountRow(readRow(payload)) };
}

export function applyPaperPositionRealtime(
  current: PaperWorkspaceContext | undefined,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
) {
  if (!current) return current;
  const row = readRow(payload);
  const id = String(row.id ?? "");
  const positions =
    payload.eventType === "DELETE"
      ? removeById(current.positions, id)
      : sortByDateDesc(upsertById(current.positions, mapPaperPositionRow(row)), (item) => item.updatedAt);
  return { ...current, positions };
}

export function applyPaperTradeRealtime(
  current: PaperWorkspaceContext | undefined,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
) {
  if (!current) return current;
  const row = readRow(payload);
  const id = String(row.id ?? "");
  const trades =
    payload.eventType === "DELETE"
      ? removeById(current.trades, id)
      : sortByDateDesc(upsertById(current.trades, mapPaperTradeRow(row)), (item) => item.executedAt).slice(0, 24);
  return { ...current, trades };
}

export function applyWorkspaceActivityRealtime(
  current: PaperWorkspaceContext | undefined,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
) {
  if (!current) return current;
  const row = readRow(payload);
  const id = String(row.id ?? "");
  const workspaceItems = current.activity.filter((item) => item.source === "workspace");
  const recordItems = current.activity.filter((item) => item.source === "record");
  const nextWorkspaceItems =
    payload.eventType === "DELETE"
      ? removeById(workspaceItems, id)
      : sortByDateDesc(upsertById(workspaceItems, mapWorkspaceActivityRow(row)), (item) => item.createdAt).slice(0, 24);

  return {
    ...current,
    activity: sortByDateDesc([...nextWorkspaceItems, ...recordItems], (item) => item.createdAt).slice(0, 24),
  };
}
