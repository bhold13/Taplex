"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { readApiResponse } from "@/lib/client-response";
import type { TapLexConnection } from "@/lib/connections";

export default function ConnectionsList({ initialConnections }: { initialConnections: TapLexConnection[] }) {
  const [connections, setConnections] = useState(initialConnections);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return connections;
    return connections.filter((connection) => `${connection.displayName} ${connection.handle} ${connection.headline} ${connection.note}`.toLowerCase().includes(search));
  }, [connections, query]);

  async function saveNote(id: string, note: string) {
    const response = await fetch("/api/connections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, note }),
    });
    const data = await readApiResponse<{ note?: string }>(response);
    if (!response.ok) {
      setMessage(data.error ?? "Note could not be saved.");
      return;
    }
    setConnections((current) => current.map((item) => item.id === id ? { ...item, note: data.note ?? note } : item));
    setMessage("Note saved.");
  }

  async function remove(id: string) {
    const response = await fetch(`/api/connections?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await readApiResponse<Record<string, never>>(response);
    if (!response.ok) {
      setMessage(data.error ?? "Connection could not be removed.");
      return;
    }
    setConnections((current) => current.filter((item) => item.id !== id));
    setMessage("Removed from People I Met.");
  }

  return <>
    <div className="connections-toolbar">
      <label><span>Find someone</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, @handle, work, or notes" /></label>
      <b>{connections.length} saved</b>
    </div>
    {message ? <p className="connections-message" role="status">{message}</p> : null}
    {filtered.length ? <div className="connections-grid">{filtered.map((connection) => <article key={connection.id}>
      <Link className="connection-person" href={`/p/${connection.handle}`}>
        <span className="connection-avatar">{connection.avatarUrl ? <img src={connection.avatarUrl} alt="" /> : connection.displayName.charAt(0).toUpperCase()}</span>
        <span><small>Met {formatMetAt(connection.metAt)}</small><b>{connection.displayName}</b><em>@{connection.handle}</em>{connection.headline ? <p>{connection.headline}</p> : null}</span>
      </Link>
      <label className="connection-note"><span>How you met / reminder</span><textarea defaultValue={connection.note} maxLength={280} placeholder="Example: Met at the barber expo—asked about a website." onBlur={(event) => void saveNote(connection.id, event.currentTarget.value)} /></label>
      <div className="connection-actions"><Link href={`/p/${connection.handle}`}>Open profile →</Link><button type="button" onClick={() => void remove(connection.id)}>Remove</button></div>
    </article>)}</div> : <div className="connections-empty"><span>◎</span><h2>{connections.length ? "No matches found" : "No saved people yet"}</h2><p>{connections.length ? "Try another name, handle, or note." : "When you meet someone through TapLex, open their profile and tap “Remember this person.” They’ll show up here."}</p><Link href="/">Explore TapLex</Link></div>}
  </>;
}

function formatMetAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "recently" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}
