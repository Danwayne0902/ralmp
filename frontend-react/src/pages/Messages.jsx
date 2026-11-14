import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Inbox, Loader2, MessageSquare, RefreshCw, Search, Send,
  ShieldCheck, Sprout,
} from 'lucide-react'
import { PageHeader, Skeleton, Avatar } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { messageService } from '../lib/services'
import { fmtDateTime, relativeDate } from '../lib/format'
import { parseError, cn } from '../lib/utils'
import { useAuth } from '../store/auth'

function sameThread(prev, next) {
  if (prev.length !== next.length) return false
  for (let i = 0; i < prev.length; i += 1) {
    if (prev[i].id !== next[i].id) return false
  }
  return true
}

export default function Messages() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  const activeId = searchParams.get('to') ? Number(searchParams.get('to')) : null
  const activeConversation = conversations.find((item) => item.user?.id === activeId)

  async function loadConversations({ silent = false } = {}) {
    if (!silent) setLoadingList(true)
    try {
      const res = await messageService.conversations()
      setConversations(res.data?.conversations || [])
      setError('')
    } catch (err) {
      if (!silent) setError(parseError(err))
    } finally {
      if (!silent) setLoadingList(false)
    }
  }

  useEffect(() => {
    loadConversations()
  }, [])

  // The API has no websocket transport in this deployment (broadcasting is
  // log-only), so the inbox polls. Threads refresh every 4s while visible;
  // failures are ignored so a blip never clears the conversation.
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        // Read the thread first: opening it clears unread flags, so the
        // conversation list fetched afterwards shows the correct badge.
        const threadRes = activeId ? await messageService.conversation(activeId) : null
        const listRes = await messageService.conversations()
        setConversations(listRes.data?.conversations || [])
        if (threadRes) {
          const next = threadRes.data?.messages || []
          setMessages((prev) => (sameThread(prev, next) ? prev : next))
        }
      } catch {
        // Transient poll failure — keep showing the last known thread.
      }
    }
    const timer = setInterval(tick, 4000)
    return () => clearInterval(timer)
  }, [activeId])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    let active = true
    setLoadingThread(true)
    messageService
      .conversation(activeId)
      .then((res) => {
        if (active) setMessages(res.data?.messages || [])
      })
      .catch((err) => {
        if (active) toast.error(parseError(err))
      })
      .finally(() => {
        if (active) setLoadingThread(false)
      })
    return () => {
      active = false
    }
  }, [activeId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loadingThread])

  function openThread(id) {
    const next = new URLSearchParams(searchParams)
    next.set('to', String(id))
    setSearchParams(next)
  }

  function closeThread() {
    const next = new URLSearchParams(searchParams)
    next.delete('to')
    setSearchParams(next)
  }

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !activeId) return
    setSending(true)
    try {
      const res = await messageService.send({ recipient_id: activeId, message: body })
      const created = res.data?.data
      if (created) setMessages((prev) => [...prev, created])
      setText('')
      await loadConversations({ silent: true })
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setSending(false)
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return conversations
    return conversations.filter((item) =>
      [item.user?.name, item.last_message?.message]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [conversations, q])

  const unreadTotal = conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0)
  const threadName =
    activeConversation?.user?.name ||
    searchParams.get('name') ||
    (activeId ? `Recipient #${activeId}` : 'Select a conversation')

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Secure messaging"
        title="Grower & buyer inbox"
        description="Negotiate volume, grade and collection directly. Keep agreements on the platform record."
        actions={
          <Button variant="outline" size="md" onClick={loadConversations} disabled={loadingList}>
            <RefreshCw size={15} className={loadingList ? 'animate-spin' : ''} /> Refresh
            {unreadTotal > 0 && (
              <span className="ml-1 rounded-full bg-harvest-300 px-1.5 text-[10px] font-bold text-ink">{unreadTotal}</span>
            )}
          </Button>
        }
      />

      {error && (
        <p className="mb-4 rounded-card border border-critical-200 bg-critical-50 px-4 py-3 text-[12.5px] text-critical-600">
          {error}
        </p>
      )}

      <div className="grid min-h-[560px] overflow-hidden rounded-card border border-line bg-white shadow-card md:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Conversation list */}
        <aside className={cn('border-r border-line md:block', activeId ? 'hidden' : 'block')}>
          <div className="border-b border-line p-3">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-line bg-canvas px-3">
              <Search size={14} className="text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="h-full w-full bg-transparent text-[12px] outline-none placeholder:text-muted/60"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Conversations</p>
            <span className="text-[10px] text-muted">{filtered.length}</span>
          </div>

          {loadingList ? (
            <div className="space-y-2 px-3 pb-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-sage-100 text-muted">
                <Inbox size={18} />
              </span>
              <p className="mt-3 text-[12.5px] font-semibold text-ink">No conversations</p>
              <p className="mt-1 text-[11px] leading-4 text-muted">
                Start a thread from an order or lot record. Messages stay attached to the trade.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/orders">Go to orders</Link>
              </Button>
            </div>
          ) : (
            <ul className="max-h-[520px] divide-y divide-line overflow-y-auto scroll-thin">
              {filtered.map((item) => {
                const isActive = item.user?.id === activeId
                return (
                  <li key={item.user?.id}>
                    <button
                      type="button"
                      onClick={() => openThread(item.user?.id)}
                      className={cn(
                        'flex w-full gap-2.5 px-3.5 py-3 text-left transition',
                        isActive ? 'bg-forest-50' : 'hover:bg-sage-50',
                      )}
                    >
                      <Avatar name={item.user?.name} src={item.user?.profile_image} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="break-words text-[12.5px] font-bold text-ink">{item.user?.name || 'Member'}</p>
                          <span className="shrink-0 text-[9.5px] text-muted">
                            {relativeDate(item.last_message?.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] leading-4 text-muted">
                          {item.last_message?.message || 'No messages yet'}
                        </p>
                        {item.unread_count > 0 && (
                          <span className="mt-1 inline-block rounded-full bg-forest-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            {item.unread_count} unread
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Thread */}
        <section className={cn('flex min-w-0 flex-col', activeId ? 'flex' : 'hidden md:flex')}>
          {!activeId ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-forest-50 text-forest-500">
                <MessageSquare size={24} />
              </span>
              <h2 className="mt-4 font-display text-[18px] font-bold text-ink">Select a conversation</h2>
              <p className="mt-1.5 max-w-sm text-[12.5px] leading-5 text-muted">
                Threads are created from orders and lot records so the counterparty and trade context are always
                verifiable.
              </p>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline" size="sm"><Link to="/orders">Orders</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/commodities">Marketplace</Link></Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={closeThread}
                    aria-label="Back to conversations"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sage-100 md:hidden"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <Avatar name={activeConversation?.user?.name || 'Member'} src={activeConversation?.user?.profile_image} size="sm" />
                  <div className="min-w-0">
                    <p className="break-words text-[13px] font-bold text-ink">{threadName}</p>
                    <p className="text-[10px] text-muted">Platform-secured thread</p>
                  </div>
                </div>
                <Badge tone="verified" size="sm"><ShieldCheck size={10} /> Logged</Badge>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4 scroll-thin">
                {loadingThread ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-2/3 rounded-xl" />)}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-10 text-center">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white text-forest-500 shadow-card">
                      <MessageSquare size={19} />
                    </span>
                    <p className="mt-3 text-[12.5px] font-semibold text-ink">Start the conversation</p>
                    <p className="mx-auto mt-1 max-w-xs text-[11px] leading-5 text-muted">
                      Introduce your volume requirement, grade expectation or collection window.
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const mine = message.sender_id === user?.id
                    return (
                      <div key={message.id} className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start')}>
                        {!mine && (
                          <Avatar name={message.sender?.name} src={message.sender?.profile_image} size="sm" className="mt-auto h-7 w-7 rounded-lg" />
                        )}
                        <div className={cn('max-w-[78%]', mine && 'text-right')}>
                          <div
                            className={cn(
                              'rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-5',
                              mine
                                ? 'rounded-br-md bg-forest-500 text-white'
                                : 'rounded-bl-md border border-line bg-white text-ink-soft',
                            )}
                          >
                            {message.message}
                          </div>
                          <p className="mt-1 text-[9.5px] text-muted">
                            {mine ? 'You' : message.sender?.name || 'Member'} · {fmtDateTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <form onSubmit={send} className="border-t border-line bg-white p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send(e)
                      }
                    }}
                    rows={1}
                    maxLength={2000}
                    placeholder="Write a message… (Enter to send)"
                    aria-label="Message body"
                    className="max-h-32 min-h-[44px] flex-1 resize-y rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-[12.5px] outline-none transition placeholder:text-muted/60 focus:border-forest-500"
                  />
                  <Button type="submit" size="md" disabled={sending || !text.trim()}>
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>
                <p className="mt-1.5 flex items-center gap-1 text-[9.5px] text-muted">
                  <Sprout size={10} /> Keep price and volume agreements in the thread for dispute evidence.
                </p>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
