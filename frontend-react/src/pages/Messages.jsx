import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Check, Inbox, Loader2, MessageSquare, RefreshCw, Search, Send,
  ShieldCheck, Sprout, Wallet, X,
} from 'lucide-react'
import { PageHeader, Skeleton, Avatar } from '../components/ui/Data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { deliveryOfferService, messageService } from '../lib/services'
import { fmtDateTime, money, relativeDate } from '../lib/format'
import { parseError, cn } from '../lib/utils'
import { useAuth } from '../store/auth'

// Merge messages by id and keep them oldest-first. Older pages are prepended,
// polled messages appended, and offer updates replace the previous copy.
function mergeThread(prev, incoming) {
  if (!incoming?.length) return prev
  const byId = new Map(prev.map((message) => [message.id, message]))
  incoming.forEach((message) => byId.set(message.id, message))
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

function OfferMessage({ offer, user, busy, onAccept, onDecline, onCounter }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const isBuyer = user?.id === offer?.buyer_id
  const isDriver = user?.id === offer?.driver_id
  const isRecipient = offer?.proposed_by !== user?.id
  const statusTone = offer?.status === 'accepted' ? 'verified' : offer?.status === 'proposed' ? 'pending' : 'neutral'

  async function submit(e) {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Enter the price you want to offer.')
      return
    }
    setError('')
    await onCounter(offer, value, note.trim())
    setOpen(false)
    setAmount('')
    setNote('')
  }

  return (
    <div className="mx-auto w-full max-w-[440px] rounded-2xl border border-forest-200 bg-white p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-forest-50 text-forest-600">
            <Wallet size={15} />
          </span>
          <div>
            <p className="text-[11.5px] font-bold text-ink">Delivery price offer</p>
            <p className="text-[10px] text-muted">Order #{offer.order_id} · {fmtDateTime(offer.created_at)}</p>
          </div>
        </div>
        <Badge tone={statusTone} size="sm" className="capitalize">{offer.status}</Badge>
      </div>

      <p className="mt-2.5 font-display text-[24px] font-extrabold tracking-tight text-forest-600 tnum">
        {money(offer.amount)}
      </p>
      {offer.driver?.name && (
        <p className="text-[10.5px] text-muted">Driver: {offer.driver.name}</p>
      )}
      {offer.note && <p className="mt-1 text-[11px] leading-5 text-ink-soft">{offer.note}</p>}

      {offer.status === 'proposed' && isRecipient && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(isBuyer || isDriver) && (
            <Button size="sm" className="h-7 px-2.5 text-[10.5px]" onClick={() => onAccept(offer)} disabled={busy}>
              <Check size={12} /> Accept
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-[10.5px]" onClick={() => setOpen((v) => !v)} disabled={busy}>
            Counter
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2.5 text-[10.5px]" onClick={() => onDecline(offer)} disabled={busy}>
            <X size={12} /> Decline
          </Button>
        </div>
      )}

      {offer.status === 'accepted' && (
        <p className="mt-2.5 text-[10.5px] leading-4 text-forest-700">
          Price locked in. {isBuyer ? 'Pay it from the order page before pickup.' : 'The buyer pays it into escrow before pickup.'}
        </p>
      )}

      {open && offer.status === 'proposed' && (
        <form onSubmit={submit} className="mt-2.5 space-y-2 border-t border-line pt-2.5">
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Your price (₦)"
            aria-label="Counter-offer amount"
            className="h-9 w-full rounded-lg border border-line bg-canvas px-2.5 text-[12px] outline-none focus:border-forest-500"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={255}
            placeholder="Short note (optional)"
            aria-label="Counter-offer note"
            className="h-9 w-full rounded-lg border border-line bg-canvas px-2.5 text-[11.5px] outline-none focus:border-forest-500"
          />
          {error && <p className="text-[10.5px] text-critical-600">{error}</p>}
          <Button type="submit" size="sm" className="w-full" disabled={busy}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send counter-offer
          </Button>
        </form>
      )}

      <Link
        to={`/orders/${offer.order_id}`}
        className="mt-2.5 inline-block text-[10.5px] font-semibold text-forest-600 hover:underline"
      >
        Open order #{offer.order_id}
      </Link>
    </div>
  )
}

export default function Messages() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setChats] = useState([])
  const [messages, setMessages] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const [offerBusy, setOfferBusy] = useState(false)
  const scrollRef = useRef(null)
  const stickRef = useRef(true)
  const restoreScrollRef = useRef(null)
  const newestIdRef = useRef(0)

  const activeId = searchParams.get('to') ? Number(searchParams.get('to')) : null
  const activeConversation = conversations.find((item) => item.user?.id === activeId)

  async function loadChats({ silent = false } = {}) {
    if (!silent) setLoadingList(true)
    try {
      const res = await messageService.conversations()
      setChats(res.data?.conversations || [])
      setError('')
    } catch (err) {
      if (!silent) setError(parseError(err))
    } finally {
      if (!silent) setLoadingList(false)
    }
  }

  useEffect(() => {
    loadChats()
  }, [])

  // The API has no websocket transport in this deployment (broadcasting is
  // log-only), so the inbox polls. Only messages newer than the last one we
  // already have are requested, so a long thread is not re-downloaded every
  // few seconds. Failures are ignored so a blip never clears the conversation.
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        let incoming = []
        if (activeId) {
          const afterId = newestIdRef.current
          const threadRes = await messageService.conversation(activeId, {
            after_id: afterId || undefined,
            per_page: afterId ? 100 : 30,
          })
          incoming = threadRes.data?.messages || []
          if (!afterId) setHasMore(Boolean(threadRes.data?.meta?.has_more))
        }

        // Read the thread first because opening it clears unread flags; the
        // list fetched afterwards then shows the correct badge.
        const listRes = await messageService.conversations()
        setChats(listRes.data?.conversations || [])

        if (incoming.length) {
          setMessages((prev) => mergeThread(prev, incoming))
        }
      } catch {
        // Transient poll failure — keep showing the last known thread.
      }
    }
    const timer = setInterval(tick, 4000)
    return () => clearInterval(timer)
  }, [activeId])

  useEffect(() => {
    newestIdRef.current = messages.length ? messages[messages.length - 1].id : 0
  }, [messages])

  // Opening a thread loads only its newest page. Older pages arrive on demand
  // through loadOlder(), and polling fills in anything newer.
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      setHasMore(false)
      return
    }
    let active = true
    setMessages([])
    setHasMore(false)
    setLoadingThread(true)
    stickRef.current = true
    restoreScrollRef.current = null
    messageService
      .conversation(activeId, { per_page: 30 })
      .then((res) => {
        if (!active) return
        setMessages(res.data?.messages || [])
        setHasMore(Boolean(res.data?.meta?.has_more))
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
    const el = scrollRef.current
    if (!el) return

    // Prepending older messages must keep the reader at the same spot.
    if (restoreScrollRef.current) {
      const { height, top } = restoreScrollRef.current
      restoreScrollRef.current = null
      el.scrollTop = el.scrollHeight - height + top
      return
    }

    if (stickRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, loadingThread])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  async function loadOlder() {
    if (!activeId || loadingMore || !hasMore || !messages.length) return

    const el = scrollRef.current
    if (el) restoreScrollRef.current = { height: el.scrollHeight, top: el.scrollTop }

    setLoadingMore(true)
    try {
      const res = await messageService.conversation(activeId, {
        before_id: messages[0].id,
        per_page: 30,
      })
      const older = res.data?.messages || []
      if (older.length) {
        setMessages((prev) => mergeThread(prev, older))
      } else {
        // Nothing to prepend, so the saved scroll position is no longer needed.
        restoreScrollRef.current = null
      }
      setHasMore(Boolean(res.data?.meta?.has_more))
    } catch (err) {
      restoreScrollRef.current = null
      toast.error(parseError(err))
    } finally {
      setLoadingMore(false)
    }
  }

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
      if (created) {
        // Your own message should bring the thread back to the bottom.
        stickRef.current = true
        setMessages((prev) => mergeThread(prev, [created]))
      }
      setText('')
      await loadChats({ silent: true })
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setSending(false)
    }
  }

  // Delivery prices are agreed in the thread. Accepting locks the price and
  // assigns the driver, a counter-offer replaces the open one, so both refresh.
  async function refreshThread() {
    if (!activeId) return
    const res = await messageService.conversation(activeId, { per_page: 100 })
    // Merge rather than replace, so any older pages already loaded stay put.
    setMessages((prev) => mergeThread(prev, res.data?.messages || []))
  }

  async function acceptOffer(offer) {
    setOfferBusy(true)
    try {
      await deliveryOfferService.accept(offer.id)
      await refreshThread()
      toast.success('Delivery price locked in. Pay it from the order page before pickup.')
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setOfferBusy(false)
    }
  }

  async function declineOffer(offer) {
    setOfferBusy(true)
    try {
      await deliveryOfferService.decline(offer.id)
      await refreshThread()
      toast.success('Offer declined.')
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setOfferBusy(false)
    }
  }

  async function counterOffer(offer, amount, note) {
    setOfferBusy(true)
    try {
      await deliveryOfferService.propose(offer.order_id, {
        amount,
        note: note || undefined,
        driver_id: offer.driver_id,
      })
      await refreshThread()
      toast.success('Counter-offer sent.')
    } catch (err) {
      toast.error(parseError(err))
    } finally {
      setOfferBusy(false)
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
    (activeId ? `Recipient #${activeId}` : 'Choose a chat')

  return (
    <div className="page-wrap page-pad">
      <PageHeader
        eyebrow="Messages"
        title="Your messages"
        description="Talk about amount, quality and pickup. Keep it here so there is a record."
        actions={
          <Button variant="outline" size="md" onClick={loadChats} disabled={loadingList}>
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
                placeholder="Search messages"
                aria-label="Search messages"
                className="h-full w-full bg-transparent text-[12px] outline-none placeholder:text-muted/60"
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Chats</p>
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
              <p className="mt-3 text-[12.5px] font-semibold text-ink">No messages yet</p>
              <p className="mt-1 text-[11px] leading-4 text-muted">
                Start a thread from an order or lot record. Messages stay attached to the trade.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/orders">Go to my orders</Link>
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
              <h2 className="mt-4 font-display text-[18px] font-bold text-ink">Choose a chat</h2>
              <p className="mt-1.5 max-w-sm text-[12.5px] leading-5 text-muted">
                Chats start from a real order or listing, so you always know who you are talking to and which trade
                it is about.
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
                    aria-label="Back to chats"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sage-100 md:hidden"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <Avatar name={activeConversation?.user?.name || 'Member'} src={activeConversation?.user?.profile_image} size="sm" />
                  <div className="min-w-0">
                    <p className="break-words text-[13px] font-bold text-ink">{threadName}</p>
                    <p className="text-[10px] text-muted">Private on RALMP</p>
                  </div>
                </div>
                <Badge tone="verified" size="sm"><ShieldCheck size={10} /> Logged</Badge>
              </div>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4 scroll-thin"
              >
                {hasMore && !loadingThread && (
                  <div className="flex justify-center pb-1">
                    <button
                      type="button"
                      onClick={loadOlder}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:text-ink disabled:opacity-60"
                    >
                      {loadingMore && <RefreshCw size={12} className="animate-spin" />}
                      {loadingMore ? 'Loading earlier messages…' : 'Load earlier messages'}
                    </button>
                  </div>
                )}
                {loadingThread ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-2/3 rounded-xl" />)}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-10 text-center">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white text-forest-500 shadow-card">
                      <MessageSquare size={19} />
                    </span>
                    <p className="mt-3 text-[12.5px] font-semibold text-ink">Say hello</p>
                    <p className="mx-auto mt-1 max-w-xs text-[11px] leading-5 text-muted">
                      Introduce your volume requirement, grade expectation or collection window.
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    if (message.type === 'offer' && message.offer) {
                      return (
                        <div key={message.id} className="py-0.5">
                          <OfferMessage
                            offer={message.offer}
                            user={user}
                            busy={offerBusy}
                            onAccept={acceptOffer}
                            onDecline={declineOffer}
                            onCounter={counterOffer}
                          />
                        </div>
                      )
                    }
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
                    placeholder="Write a message… (press Enter to send)"
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
