import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageCircle, Plus, Trash2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { getChatSessions, sendMessage, deleteChatSession } from '../services/api'
import { PageHeader, Button, Spinner, EmptyState } from '../components/ui/index.jsx'

const SUGGESTIONS = [
  'Which appliance uses the most electricity?',
  'How can I reduce my electricity bill?',
  'Explain my unusual consumption patterns',
  'Give me 5 energy saving tips',
]

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
          <Zap size={12} className="text-blue-400" />
        </div>
      )}
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-blue-600 text-white rounded-br-sm'
          : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-sm'
      }`}>
        {msg.content.split('\n').map((line, i) => (
          <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
        ))}
      </div>
    </div>
  )
}

export default function Chat() {
  const qc = useQueryClient()
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  const { data: sessions = [] } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: getChatSessions,
  })

  const sendMut = useMutation({
    mutationFn: sendMessage,
    onSuccess: (data) => {
      setMessages(data.messages)
      setActiveSession(data.session_id)
      qc.invalidateQueries({ queryKey: ['chat-sessions'] })
    },
    onError: () => toast.error('Failed to send message'),
  })

  const deleteMut = useMutation({
    mutationFn: deleteChatSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-sessions'] })
      setActiveSession(null)
      setMessages([])
      toast.success('Session deleted')
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (text = input) => {
    const msg = text.trim()
    if (!msg || sendMut.isPending) return
    setInput('')
    // Optimistically add user message
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }])
    sendMut.mutate({ message: msg, session_id: activeSession })
  }

  const loadSession = (session) => {
    setActiveSession(session.id)
    setMessages(session.messages)
  }

  const newChat = () => {
    setActiveSession(null)
    setMessages([])
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Session sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-900">
        <div className="p-3 border-b border-gray-800">
          <Button variant="secondary" size="sm" onClick={newChat} className="w-full justify-center">
            <Plus size={13} />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => loadSession(s)}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                s.id === activeSession ? 'bg-blue-600/20 border border-blue-600/30' : 'hover:bg-gray-800'
              }`}
            >
              <span className="text-xs text-gray-300 truncate flex-1">{s.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteMut.mutate(s.id) }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-gray-600 text-center pt-4">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-800">
          <div className="text-sm font-semibold text-white">WattWise AI Assistant</div>
          <div className="text-xs text-gray-500">Powered by IBM Granite · ibm/granite-13b-chat-v2</div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-600/30 flex items-center justify-center mb-4">
                <Zap size={24} className="text-blue-400" />
              </div>
              <div className="text-base font-semibold text-gray-300 mb-1">Ask WattWise AI</div>
              <p className="text-sm text-gray-600 mb-6 text-center max-w-xs">
                Get personalized energy insights, tips, and answers about your household consumption.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="text-left text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-3 py-2.5 transition-colors leading-relaxed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
              {sendMut.isPending && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center flex-shrink-0">
                    <Zap size={12} className="text-blue-400" />
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Ask about your energy usage..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={sendMut.isPending}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sendMut.isPending}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {sendMut.isPending ? <Spinner size={14} /> : <Send size={15} className="text-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
