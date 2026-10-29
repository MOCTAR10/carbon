'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Bot, Send, Trash2, Loader2, AlertCircle, BookOpen, Sparkles, Zap, Globe, FileText } from 'lucide-react'

interface Source {
  title: string
  code: string | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  error?: boolean
}

const SUGGESTIONS = [
  { icon: Zap,      text: 'Quels équipements entrent dans le Scope 1 ?' },
  { icon: Globe,    text: 'Comment calculer les émissions de ma flotte de véhicules ?' },
  { icon: FileText, text: 'Différence entre Scope 2 market-based et location-based ?' },
  { icon: Sparkles, text: "Que impose l'Ordonnance N°019/PR/2021 aux entreprises ?" },
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return

    const userMsg: Message = { role: 'user', content: question.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '', sources: [] }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: err.error ?? 'Une erreur est survenue. Vérifiez que GROQ_API_KEY est configuré.',
            error: true,
          }
          return updated
        })
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let sources: Source[] = []

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
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.token,
                  sources,
                }
                return updated
              })
            }
          } catch { /* skip malformed */ }
        }
      }

      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last.role === 'assistant') {
          updated[updated.length - 1] = { ...last, sources }
        }
        return updated
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Erreur de connexion. Vérifiez votre réseau et réessayez.',
          error: true,
        }
        return updated
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col -m-6 h-screen bg-white">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 bg-white flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900 leading-tight">Assistant IA Carbone</h1>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {['ISO 14064', 'GHG Protocol', 'Ord. N°019/PR/2021', 'Base Carbone ADEME'].map(tag => (
                <span key={tag} className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full leading-none">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Nouvelle conversation
          </button>
        )}
      </header>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/60">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full px-6 py-6 gap-5">
            <div className="text-center space-y-2">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto shadow-md"
                   style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Comment puis-je vous aider ?</h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                Posez vos questions sur le bilan GES, les scopes d&apos;émissions, les facteurs
                d&apos;émissions ADEME ou la réglementation gabonaise.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl">
              {SUGGESTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => sendMessage(text)}
                  className="group flex items-start gap-3 text-left bg-white border border-gray-200 hover:border-brand-300 hover:shadow-md rounded-xl px-4 py-3 transition-all duration-150"
                >
                  <div className="w-7 h-7 bg-brand-50 group-hover:bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                    <Icon className="w-3.5 h-3.5 text-brand-600" />
                  </div>
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 leading-snug transition-colors">{text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.length > 0 && (
          <div className="max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {/* Bot avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm"
                       style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end max-w-[70%]' : 'items-start flex-1 min-w-0'}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'text-white rounded-tr-sm shadow-sm'
                      : msg.error
                        ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                  }`}
                  style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' } : undefined}
                  >
                    {msg.error && <AlertCircle className="w-4 h-4 inline mr-1.5 mb-0.5" />}
                    {msg.content}
                    {msg.role === 'assistant' && !msg.content && !msg.error && (
                      <span className="inline-flex gap-1 ml-1 align-middle">
                        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, j) => (
                        <span key={j} className="inline-flex items-center gap-1.5 text-[10px] font-medium bg-gray-100 border border-gray-200 text-gray-500 px-2.5 py-1 rounded-full">
                          <BookOpen className="w-2.5 h-2.5 flex-shrink-0" />
                          {src.code ? `${src.code} — ` : ''}{src.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3 bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 focus-within:border-brand-400 focus-within:shadow-[0_0_0_3px_rgba(22,163,74,0.08)] transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question sur le bilan GES, les scopes, la réglementation…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none py-0.5 max-h-36 overflow-y-auto leading-relaxed"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 disabled:bg-gray-100 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-all self-end shadow-sm disabled:shadow-none"
              style={(!input.trim() || loading) ? undefined : { background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
            >
              {loading
                ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-2">
            Entrée pour envoyer · Maj+Entrée pour un saut de ligne
          </p>
        </form>
      </div>

    </div>
  )
}
