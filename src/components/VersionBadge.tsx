import React from "react";

/**
 * VersionBadge — safe, additive UI element to show build info.
 * It reads optional env vars (VITE_GIT_COMMIT, VITE_BUILD_TIME) and falls back gracefully.
 * No emojis and no external deps.
 */
export default function VersionBadge() {
  const env: any = (import.meta as any)?.env || {};
  const commit = (env.VITE_GIT_COMMIT as string) || "";
  const builtAt = (env.VITE_BUILD_TIME as string) || "";

  const shortCommit = commit ? commit.slice(0, 7) : "live";
  const stamp =
    builtAt ||
    new Date().toISOString().slice(0, 19).replace("T", " "); // fallback: runtime ISO (UTC) yyyy-mm-dd hh:mm:ss

  return (
    <div className="mt-2 text-xs text-muted-foreground">
      version: {shortCommit} • built: {stamp}
    </div>
  );
}