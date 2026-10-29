import { AsyncSearchSelect, type LookupOption } from "@/components/async-search-select";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Archive, ArrowLeft, Mail, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { messaging, type Conversation } from "@/lib/messaging-api";
import { getErrorMessage } from "@/lib/errors";
const selectClass = "w-full rounded-lg border border-slate-200 bg-white p-2 text-sm";
const searchRecipients = async (query: string) => (await messaging.recipients(query)).items.map(item => ({
  id: item.key, label: `${item.name} — ${item.role}`
}));
export default function MessagesPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("conversation") || "";
  const location = useLocation();
  const [folder, setFolder] = useState("INBOX");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [actorKey, setActorKey] = useState("");
  const [thread, setThread] = useState<Conversation | null>(null);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [threadError, setThreadError] = useState("");
  const [listError, setListError] = useState("");
  const [compose, setCompose] = useState(false);
  const [recipient, setRecipient] = useState<LookupOption | null>(null);
  const recipientKey = recipient?.id ?? "";
  const [contexts, setContexts] = useState<{ type: string; id: string; label: string }[]>([]);
  const [contextValue, setContextValue] = useState("NONE");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const currentId = useRef(selected);
  currentId.current = selected;
  const cursor = useRef(0);
  const moreRef = useRef(false);
  const request = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setOffset(0); }, 250); return () => clearTimeout(timer); }, [search]);
  const loadList = useCallback(async () => {
    const version = ++generation.current;
    try { const data = await messaging.list(folder, query, offset); if (version !== generation.current) return;
      setItems(data.items); setTotal(data.total); setUnread(data.unreadCount); setActorKey(data.actorKey); setListError("");
    } catch (error) { if (version === generation.current) setListError(getErrorMessage(error, "Could not load messages")); }
  }, [folder, query, offset]);
  useEffect(() => { void loadList(); const timer = setInterval(() => void loadList(), 10000); return () => { clearInterval(timer); generation.current++; }; }, [loadList]);
  const reloadList = useRef(loadList);
  reloadList.current = loadList;
  const threadGeneration = useRef(0);
  const loadThread = useCallback(async (id: string, after = 0) => {
    const version = ++threadGeneration.current;
    try {
      const data = await messaging.history(id, after);
      if (currentId.current !== id || version !== threadGeneration.current) return;
      setThread(previous => ({ ...data, messages: after && previous?.id === id ? [...new Map([...previous.messages, ...data.messages].map(message => [message.id, message])).values()].sort((a,b) => a.sequence - b.sequence) : data.messages }));
      cursor.current = data.messages.at(-1)?.sequence ?? after;
      moreRef.current = data.hasMore; setMore(data.hasMore); setActorKey(data.actorKey); setThreadError("");
      if (!document.hidden && cursor.current) { await messaging.read(id, cursor.current); void reloadList.current(); window.dispatchEvent(new Event("messaging-updated")); }
    } catch (error) { if (currentId.current === id) setThreadError(getErrorMessage(error, "Could not load conversation")); }
    finally { if (currentId.current === id) setLoading(false); }
  }, []);
  useEffect(() => {
    setThread(null); setThreadError(""); setReply(""); cursor.current = 0; moreRef.current = false;
    if (!selected) return;
    setCompose(false); setLoading(true); void loadThread(selected);
    const refresh = () => { if (!document.hidden && !moreRef.current) void loadThread(selected, cursor.current); };
    const timer = setInterval(refresh, 8000); window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [selected, loadThread]);
  useEffect(() => {
    setContextValue("NONE"); setContexts([]); let active = true;
    if (recipientKey) void messaging.contexts(recipientKey).then(data => { if (active) setContexts(data.items); }).catch(() => { if (active) toast.error("Could not load conversation context"); });
    return () => { active = false; };
  }, [recipientKey]);
  async function send(newThread: boolean) {
    if (busy || (newThread && !recipientKey)) return;
    const [contextType, contextId] = contextValue.split(":");
    const payload = newThread ? { recipientKey, subject: subject.trim(), content: body.trim(), contextType, contextId } : { id: selected, content: reply.trim() };
    const signature = JSON.stringify(payload);
    if (request.current?.signature !== signature) request.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    try {
      if (newThread) {
        const result = await messaging.start({ recipientKey, subject: subject.trim(), content: body.trim(), contextType, contextId, clientRequestId: request.current.key });
        setBody(""); setSubject(""); setCompose(false); setFolder("SENT"); setOffset(0); setParams({ conversation: result.id });
      } else {
        await messaging.reply(selected, reply.trim(), request.current.key); setReply(""); await loadThread(selected, cursor.current);
      }
      request.current = null; await loadList();
    } catch (error) { toast.error(getErrorMessage(error, "Message could not be sent. Your draft is preserved; retry to send it.")); }
    finally { setBusy(false); }
  }
  async function archive() {
    if (!thread) return;
    setBusy(true);
    try { await messaging.archive(thread.id, !thread.participants.find(item => item.actorKey === actorKey)?.archivedAt); await loadThread(thread.id, cursor.current); await loadList(); }
    catch (error) { toast.error(getErrorMessage(error, "Could not update conversation")); }
    finally { setBusy(false); }
  }
  const own = thread?.participants.find(item => item.actorKey === actorKey);
  return <main className="mx-auto w-full max-w-7xl space-y-4 p-3 md:p-6">
    <header className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-950">Messages</h1><p className="text-sm text-slate-500" aria-live="polite">{unread} unread messages</p></div>
      <Button onClick={() => { setParams({}); setCompose(true); }}><Plus className="mr-2 h-4 w-4" />New conversation</Button></header>
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className={`${selected || compose ? "hidden lg:block" : ""} rounded-2xl border border-slate-200 bg-white p-3`}>
        <div className="grid grid-cols-2 gap-1" aria-label="Message folders">{["INBOX", "SENT", "UNREAD", "ARCHIVED"].map(value => <Button key={value} variant={folder === value ? "default" : "ghost"} aria-pressed={folder === value} onClick={() => { setFolder(value); setOffset(0); }}>{value.charAt(0) + value.slice(1).toLowerCase()}</Button>)}</div>
        <Input className="my-3" aria-label="Search conversations" placeholder="Search messages or people" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} />
        {listError ? <p role="alert" className="text-sm text-rose-700">{listError} <button onClick={() => void loadList()}>Retry</button></p> : null}
        {!items.length && !listError ? <p className="p-4 text-sm text-slate-500">No conversations in this folder.</p> : null}
        <div className="max-h-[65vh] space-y-2 overflow-y-auto">{items.map(item => <button key={item.id} onClick={() => setParams({ conversation: item.id })} className={`w-full rounded-xl border p-3 text-left ${selected === item.id ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
          <div className="flex justify-between gap-2"><span className="break-words font-semibold">{item.subject}</span>{!!item.unreadCount && <span className="h-fit rounded-full bg-blue-700 px-2 text-xs text-white">{item.unreadCount}</span>}</div>
          <p className="mt-1 truncate text-xs text-slate-500">{item.participants.filter(person => person.actorKey !== actorKey).map(person => person.displayName).join(", ")}</p>
          <p className="mt-2 line-clamp-2 break-words text-sm text-slate-600">{item.messages[0]?.content}</p><time className="text-xs text-slate-400">{new Date(item.updatedAt).toLocaleString()}</time>
        </button>)}</div>
        <div className="mt-3 flex items-center justify-between"><Button variant="ghost" size="sm" disabled={!offset} onClick={() => setOffset(value => Math.max(0, value - 30))}>Previous</Button><span className="text-xs">{total} conversations</span><Button variant="ghost" size="sm" disabled={offset + items.length >= total} onClick={() => setOffset(value => value + 30)}>Next</Button></div>
      </aside>
      <section className={`${!selected && !compose ? "hidden lg:block" : ""} min-w-0 rounded-2xl border border-slate-200 bg-white p-4 md:p-6`}>
        {(selected || compose) && <Button variant="ghost" className="mb-3 lg:hidden" onClick={() => { setParams({}); setCompose(false); }}><ArrowLeft className="mr-2 h-4 w-4" />Back to messages</Button>}
        {compose ? <form className="space-y-4" onSubmit={event => { event.preventDefault(); void send(true); }}>
          <h2 className="text-lg font-semibold">New conversation</h2>
          <AsyncSearchSelect label="To" placeholder="Type a recipient’s name…" value={recipient}
            onChange={setRecipient} search={searchRecipients} disabled={busy} />
          <p className="text-xs text-slate-500">You can contact linked renters/landlords or an administrator. Type a name and select the matching person and user role.</p>
          <label className="block space-y-1 text-sm"><span>Subject</span><Input required value={subject} maxLength={160} onChange={event => setSubject(event.target.value)} /></label>
          <label className="block space-y-1 text-sm"><span>Related to (optional)</span><select className={selectClass} value={contextValue} onChange={event => setContextValue(event.target.value)}><option value="NONE">General conversation</option>{(location.pathname.startsWith("/app") || recipientKey.startsWith("STAFF:")) && <option value="SUPPORT">Support request</option>}{contexts.map(item => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{item.type.toLowerCase()}: {item.label}</option>)}</select></label>
          <label className="block space-y-1 text-sm"><span>Message</span><Textarea required rows={6} maxLength={10000} value={body} onChange={event => setBody(event.target.value)} /></label>
          <Button disabled={busy || !body.trim() || !subject.trim() || !recipientKey} type="submit"><Send className="mr-2 h-4 w-4" />{busy ? "Sending…" : "Send message"}</Button>
        </form> : selected ? <>
          {loading && <p role="status">Loading conversation…</p>}{threadError && <p role="alert" className="text-rose-700">{threadError} <button onClick={() => void loadThread(selected)}>Retry</button></p>}
          {thread && <><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-xl font-semibold">{thread.subject}</h2><p className="mt-1 text-sm text-slate-500">{thread.participants.map(item => `${item.displayName} (${item.role.toLowerCase()})`).join(" ↔ ")}</p>{thread.contextLabel && <p className="mt-2 text-sm text-blue-700">{thread.contextType.toLowerCase()}: {thread.contextLabel}</p>}</div><Button variant="outline" disabled={busy} onClick={() => void archive()}><Archive className="mr-2 h-4 w-4" />{own?.archivedAt ? "Reopen" : "Archive"}</Button></div>
            <div className="my-5 max-h-[60vh] space-y-4 overflow-y-auto" aria-label="Conversation history">{thread.messages.map(message => {
              const sender = thread.participants.find(item => item.id === message.senderId)!;
              const receiver = thread.participants.find(item => item.id !== message.senderId)!;
              const mine = sender.actorKey === actorKey;
              const isNew = !mine && message.sequence > (own?.readThrough ?? 0);
              return <article key={message.id} className={`rounded-xl border p-4 ${mine ? "border-blue-100 bg-blue-50 lg:ml-8" : "border-slate-200 bg-slate-50 lg:mr-8"}`}>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{sender.displayName} → {receiver.displayName}{isNew ? " · New" : ""}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time></div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-900">{message.content}</p>{mine && <p className="mt-2 text-xs text-slate-500">{receiver.readThrough >= message.sequence ? "Read" : "Sent"}</p>}
              </article>;
            })}</div>
            {more && <Button variant="outline" onClick={() => void loadThread(selected, cursor.current)}>Load next messages</Button>}
            <form className="space-y-3 border-t pt-4" onSubmit={event => { event.preventDefault(); void send(false); }}><label className="block text-sm font-medium" htmlFor="reply">Reply</label><Textarea id="reply" required rows={4} maxLength={10000} value={reply} onChange={event => setReply(event.target.value)} placeholder="Write your reply…" /><Button disabled={busy || !reply.trim() || more} type="submit"><Send className="mr-2 h-4 w-4" />{busy ? "Sending…" : "Send reply"}</Button>{more && <p className="text-xs text-slate-500">Load the remaining messages before replying.</p>}</form>
          </>}
        </> : <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-slate-500"><Mail className="h-10 w-10" /><p>Select a conversation or start a new one.</p></div>}
      </section>
    </div>
  </main>;
}
