import { useState, useEffect, useRef } from 'react'

const toasts = []
let listeners = []

function notify() {
  listeners.forEach((fn) => fn([...toasts]))
}

export function showToast(message, type = 'default') {
  const id = Date.now()
  toasts.push({ id, message, type })
  notify()
  setTimeout(() => {
    const idx = toasts.findIndex((t) => t.id === id)
    if (idx !== -1) {
      toasts.splice(idx, 1)
      notify()
    }
  }, 3000)
}

export function ToastContainer() {
  const [list, setList] = useState([])

  useEffect(() => {
    listeners.push(setList)
    return () => {
      listeners = listeners.filter((l) => l !== setList)
    }
  }, [])

  if (!list.length) return null

  return (
    <div className="toast-container">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
