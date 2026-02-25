import { FormEvent, useEffect, useMemo, useState } from 'react'
import './App.css'

type Filter = 'all' | 'active' | 'completed'
type Theme = 'light' | 'dark'

interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
]

const TODO_STORAGE_KEY = 'react-todo-list'
const THEME_STORAGE_KEY = 'react-todo-theme'

const getStoredTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return null
}

const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const formatCreationTime = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))

function App() {
  const [draft, setDraft] = useState('')
  const [todos, setTodos] = useState<Todo[]>(() => {
    if (typeof window === 'undefined') return []
    const storedList = localStorage.getItem(TODO_STORAGE_KEY)
    if (!storedList) return []
    try {
      const parsed = JSON.parse(storedList)
      if (Array.isArray(parsed)) return parsed
    } catch (error) {
      console.error(error)
    }
    return []
  })
  const [filter, setFilter] = useState<Filter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [exitingIds, setExitingIds] = useState<string[]>([])
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() ?? getSystemTheme())
  const [manualTheme, setManualTheme] = useState<boolean>(() => getStoredTheme() !== null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    if (typeof window === 'undefined') return
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (manualTheme) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [manualTheme])

  const stats = useMemo(() => {
    const completed = todos.reduce((count, todo) => (todo.completed ? count + 1 : count), 0)
    return {
      total: todos.length,
      completed,
      active: todos.length - completed,
    }
  }, [todos])

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === 'active') return !todo.completed
      if (filter === 'completed') return todo.completed
      return true
    })
  }, [todos, filter])

  const addTodo = () => {
    const text = draft.trim()
    if (!text) return
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
    }
    setTodos((prev) => [...prev, newTodo])
    setDraft('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    addTodo()
  }

  const toggleComplete = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    )
  }

  const startEditing = (id: string, text: string) => {
    setEditingId(id)
    setEditingText(text)
  }

  const finishEditing = () => {
    if (!editingId) return
    const text = editingText.trim()
    if (!text) {
      triggerRemove(editingId)
    } else {
      setTodos((prev) =>
        prev.map((todo) => (todo.id === editingId ? { ...todo, text } : todo)),
      )
    }
    setEditingId(null)
    setEditingText('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingText('')
  }

  const triggerRemove = (id: string) => {
    setExitingIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setTimeout(() => {
      setTodos((prev) => prev.filter((todo) => todo.id !== id))
      setExitingIds((prev) => prev.filter((item) => item !== id))
    }, 320)
  }

  const clearCompleted = () => {
    const completedIds = todos.filter((todo) => todo.completed).map((todo) => todo.id)
    completedIds.forEach((id) => triggerRemove(id))
  }

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      finishEditing()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEditing()
    }
  }

  const handleDragStart = (event: React.DragEvent<HTMLLIElement>, id: string) => {
    setDraggingId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
    requestAnimationFrame(() => event.currentTarget.classList.add('dragging'))
  }

  const handleDragOver = (event: React.DragEvent<HTMLLIElement>, id: string) => {
    event.preventDefault()
    setDragOverId(id)
    event.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDrop = (event: React.DragEvent<HTMLLIElement>, id: string) => {
    event.preventDefault()
    const draggedId = event.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === id) {
      handleDragEnd()
      return
    }
    const fromIndex = todos.findIndex((todo) => todo.id === draggedId)
    const toIndex = todos.findIndex((todo) => todo.id === id)
    if (fromIndex === -1 || toIndex === -1) {
      handleDragEnd()
      return
    }
    setTodos((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    handleDragEnd()
  }

  const handleDropToEnd = (event: React.DragEvent<HTMLUListElement>) => {
    event.preventDefault()
    const draggedId = event.dataTransfer.getData('text/plain')
    if (!draggedId) return
    const fromIndex = todos.findIndex((todo) => todo.id === draggedId)
    if (fromIndex === -1 || fromIndex === todos.length - 1) {
      handleDragEnd()
      return
    }
    setTodos((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.push(moved)
      return next
    })
    handleDragEnd()
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setManualTheme(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    }
  }

  return (
    <div className="app-shell">
      <div className="app-card">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Level up your focus</p>
            <h1>Lineargrade Todo</h1>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} type="button" aria-label="切换主题">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </header>

        <form className="todo-input" onSubmit={handleSubmit}>
          <div className="input-sphere" aria-hidden>
            <span />
          </div>
          <input
            placeholder="Create a new task and press Enter"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addTodo()
              }
            }}
            aria-label="添加 Todo"
          />
        </form>

        <section className="todo-section">
          {filteredTodos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration">
                <span />
                <span />
                <span />
              </div>
              <p>Your workspace is calm and ready for action.</p>
              <small>Create something to get started.</small>
            </div>
          ) : (
            <ul className="todo-list" onDragOver={(event) => event.preventDefault()} onDrop={handleDropToEnd}>
              {filteredTodos.map((todo) => (
                <li
                  key={todo.id}
                  className={`todo-item${todo.completed ? ' completed' : ''}${draggingId === todo.id ? ' dragging' : ''}${dragOverId === todo.id ? ' drag-over' : ''}${exitingIds.includes(todo.id) ? ' leaving' : ''}`}
                  draggable
                  onDragStart={(event) => handleDragStart(event, todo.id)}
                  onDragOver={(event) => handleDragOver(event, todo.id)}
                  onDrop={(event) => handleDrop(event, todo.id)}
                  onDragEnd={handleDragEnd}
                >
                  <button
                    type="button"
                    className={`status-toggle${todo.completed ? ' active' : ''}`}
                    onClick={() => toggleComplete(todo.id)}
                    aria-pressed={todo.completed}
                  />
                  <div className="todo-content" onDoubleClick={() => startEditing(todo.id, todo.text)}>
                    {editingId === todo.id ? (
                      <input
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={finishEditing}
                        autoFocus
                        className="edit-input"
                      />
                    ) : (
                      <p>
                        {todo.text}
                        <span>Created {formatCreationTime(todo.createdAt)}</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => triggerRemove(todo.id)}
                    aria-label="删除任务"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="todo-footer">
          <div className="counts">
            <span>Total <strong>{stats.total}</strong></span>
            <span>Completed <strong>{stats.completed}</strong></span>
            <span>Active <strong>{stats.active}</strong></span>
          </div>
          <div className="filters">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.value}
                className={filter === item.value ? 'active' : ''}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="clear-btn"
            onClick={clearCompleted}
            disabled={stats.completed === 0}
          >
            Clear completed
          </button>
        </footer>
      </div>
    </div>
  )
}

export default App
