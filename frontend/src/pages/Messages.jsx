import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, MessageSquare, Search, Send } from 'lucide-react'
import { toast } from 'sonner'
import { messageService } from '../lib/services'
import { useAuth } from '../store/auth'
import PageHeader from '../components/PageHeader'
import { Avatar, Button, Spinner } from '../components/ui'

const EASE = [0.22, 1, 0.36, 1]

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return new Date(date).toLocaleDateString()
}

function clock(date) {
  return new Date(date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

function ConversationSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-2.5">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-28" />
            <div className="skeleton h-3 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Messages() {
  const { user } = useAuth()
  const reduce = useReducedMotion()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)
  const scroller = useRef(null)

  useEffect(() => {
    messageService
      .conversations()
      .then((res) => setConversations(res.data.conversations || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [messages])

  const filtered = useMemo(() => {
    if (!search) return conversations
    return conversations.filter((c) => c.user?.name?.toLowerCase().includes(search.toLowerCase()))
  }, [conversations, search])

  async function open(conversation) {
    setSelected(conversation.user)
    setMessages([])
    setLoadingThread(true)
    try {
      const res = await messageService.conversation(conversation.user.id)
      setMessages(res.data.messages || [])
      messageService.markRead(conversation.user.id).catch(() => {})
      setConversations((list) => list.map((c) => (c.user.id === conversation.user.id ? { ...c, unread_count: 0 } : c)))
    } catch {
      toast.error('Could not load conversation')
    } finally {
      setLoadingThread(false)
    }
  }

  async function send(e) {
    e.preventDefault()
    if (!draft.trim() || !selected) return
    setSending(true)
    try {
      const res = await messageService.send({ receiver_id: selected.id, message: draft.trim() })
      setMessages((m) => [...m, res.data.message || { id: Date.now(), sender_id: user?.id, message: draft.trim(), created_at: new Date().toISOString() }])
      setDraft('')
    } catch {
      toast.error('Message could not be sent')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Inbox" title="Messages" subtitle="Talk directly with farmers, buyers and logistics partners." />

      <motion.div
        className="card flex h-[calc(100vh-230px)] min-h-[540px] overflow-hidden"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        {/* Conversation list */}
        <aside className={`w-full shrink-0 flex-col border-r border-[color:var(--hairline)] sm:w-80 ${selected ? 'hidden sm:flex' : 'flex'}`}>
          <div className="border-b border-[color:var(--hairline)] p-4">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" />
              <input
                className="field pl-9"
                placeholder="Search conversations…"
                aria-label="Search conversations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <ConversationSkeleton />
            ) : filtered.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-sand-100 text-sand-400">
                  <MessageSquare size={22} />
                </span>
                <p className="mt-3 text-sm font-semibold text-ink">No conversations yet</p>
                <p className="mt-1 text-xs text-sand-500">Messages from orders appear here.</p>
              </div>
            ) : (
              filtered.map((c) => {
                const active = selected?.id === c.user.id
                return (
                  <button
                    key={c.user.id}
                    type="button"
                    onClick={() => open(c)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full gap-3 border-b border-[color:var(--hairline)] px-4 py-3.5 text-left transition hover:bg-brand-50/40 ${
                      active ? 'bg-brand-50' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar name={c.user.name} size="md" />
                      {c.unread_count > 0 && (
                        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{c.user.name}</span>
                        <span className="shrink-0 text-2xs text-sand-400">
                          {c.last_message?.created_at ? timeAgo(c.last_message.created_at) : ''}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-sand-500">{c.last_message?.message}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className={`min-w-0 flex-1 flex-col ${selected ? 'flex' : 'hidden sm:flex'}`}>
          {!selected ? (
            <div className="grid flex-1 place-items-center px-6 text-center">
              <div>
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <MessageSquare size={26} />
                </span>
                <h2 className="mt-4 font-display text-sm font-bold text-ink">Select a conversation</h2>
                <p className="mt-1 text-xs text-sand-500">Choose a thread to start messaging.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-[color:var(--hairline)] px-4 py-3.5 sm:px-5">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Back to conversations"
                  className="btn-ghost btn-icon sm:hidden"
                >
                  <ArrowLeft size={18} />
                </button>
                <Avatar name={selected.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{selected.name}</p>
                  <p className="text-2xs capitalize text-sand-400">{selected.role?.replace('_', ' ')}</p>
                </div>
              </div>

              <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto bg-sand-50/60 p-4 sm:p-5">
                {loadingThread ? (
                  <Spinner label="Loading messages…" className="py-10" />
                ) : messages.length === 0 ? (
                  <p className="py-16 text-center text-xs text-sand-400">No messages yet. Say hello 👋</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender_id === user?.id
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                            mine
                              ? 'rounded-br-sm bg-brand-600 text-white'
                              : 'rounded-bl-sm border border-[color:var(--hairline)] bg-white text-ink'
                          }`}
                        >
                          <p className="leading-snug">{m.message}</p>
                          <p className={`mt-1 text-right text-2xs ${mine ? 'text-white/60' : 'text-sand-400'}`}>
                            {clock(m.created_at)}{mine && m.is_read ? ' ✓✓' : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <form onSubmit={send} className="flex items-end gap-2 border-t border-[color:var(--hairline)] p-3.5">
                <input
                  className="field"
                  placeholder="Type a message…"
                  aria-label="Message"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <Button
                  type="submit"
                  size="icon-lg"
                  leftIcon={Send}
                  disabled={!draft.trim() || sending}
                  aria-label="Send message"
                />
              </form>
            </>
          )}
        </section>
      </motion.div>
    </div>
  )
}
