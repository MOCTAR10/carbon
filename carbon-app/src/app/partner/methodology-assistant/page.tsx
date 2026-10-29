'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, User, BookOpen, Loader2, ChevronDown, RotateCcw } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Source {
  title: string
  code: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  loading?: boolean
}

// ─── Suggested questions ──────────────────────────────────────────────────────

const SUGGESTED = [
  'Quelle méthodologie pour un projet REDD+ de 500ha au Gabon ?',
  'Quels paramètres dois-je surveiller pour VM0048 ?',
  'Comment fonctionne le buffer pool AFOLU dans le registre Verra ?',
  'Quelles sont les exigences d\'additionnalité pour un projet forestier ?',
  'Quel est le processus de validation et vérification VVB ?',
  'Comment calculer les émissions de référence pour VM0048 ?',
]

const METHODOLOGY_FILTERS = [
  { value: '', label: 'Toutes les méthodologies' },
  { value: 'VM0048', label: 'VM0048 — REDD+' },
]

// ─── Message renderer ─────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
        ${isUser ? 'bg-emerald-600' : 'bg-gray-800 border border-gray-700'}`}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Bot className="w-4 h-4 text-emerald-400" />
        }
      </div>

      {/* Bubble */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-emerald-600 text-white rounded-tr-sm'
            : 'bg-gray-800 text-gray-100 rounded-tl-sm border border-gray-700'
          }`}>
          {msg.loading
            ? <span className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération en cours…
              </span>
            : msg.content
          }
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {msg.sources.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                <BookOpen className="w-3 h-3" />
                {s.code ? `${s.code}` : s.title.slice(0, 30)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MethodologyAssistantPage() {
  const [messages, setMessages]         = useState<Message[]>([])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [filter, setFilter]             = useState('')
  const [showSuggested, setShowSuggested] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return

    const userMsg: Message = { role: 'user', content: question }
    const placeholder: Message = { role: 'assistant', content: '', loading: true }

    setMessages(prev => [...prev, userMsg, placeholder])
    setInput('')
    setLoading(true)
    setShowSuggested(false)

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, methodologyFilter: filter || undefined }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Erreur réseau' }))
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `Erreur : ${err.error ?? 'Impossible de contacter l\'assistant.'}` },
        ])
        return
      }

      // Stream SSE response
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let sources: Source[] = []
      let fullText = ''
      let buffer   = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6).trim()
          if (json === '[DONE]') break
          try {
            const parsed = JSON.parse(json)
            if (parsed.sources) {
              sources = parsed.sources
            } else if (parsed.token) {
              fullText += parsed.token
              setMessages(prev => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: fullText, sources, loading: false },
              ])
            }
          } catch { /* skip */ }
        }
      }

      // Finalize
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: fullText || 'Aucune réponse générée.', sources },
      ])
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: 'Erreur de connexion. Vérifiez votre accès.' },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function reset() {
    setMessages([])
    setInput('')
    setShowSuggested(true)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-900/50 border border-emerald-800 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Assistant Méthodologies</h1>
            <p className="text-xs text-gray-500">Verra VCS · VM0048 REDD+ · Registre Verra</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Methodology filter */}
          <div className="relative">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-1.5 appearance-none pr-7 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {METHODOLOGY_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          {messages.length > 0 && (
            <button onClick={reset}
              className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg"
              title="Nouvelle conversation">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">

        {/* Welcome + suggested questions */}
        {messages.length === 0 && showSuggested && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-900/30 border border-emerald-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-white font-semibold mb-1">Assistant Méthodologies Carbone</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Posez vos questions sur les méthodologies Verra, les exigences de monitoring, les critères d&apos;éligibilité, ou le processus de certification.
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2 px-1">
                Questions suggérées
              </p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    className="text-left text-sm text-gray-300 bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-3 hover:bg-gray-800 hover:border-emerald-800/60 hover:text-emerald-300 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="mt-3 bg-gray-800/50 border border-gray-700 rounded-2xl p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question sur les méthodologies Verra… (Entrée pour envoyer)"
            rows={2}
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5">
          Basé sur VM0048 v1.0, Verra Registry ToU Oct 2024, Verra Registry User Guide
        </p>
      </div>
    </div>
  )
}
