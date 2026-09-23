import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import logo from '../assets/logo.png'

// Parsea "YYYY-MM-DD" sin conversión de zona horaria
function parseLocalDate(dateStr) {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default function Home() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const q = query(
          collection(db, 'activities'),
          where('published', '==', true),
          orderBy('eventDate', 'desc')
        )
        const snap = await getDocs(q)
        setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error('Error loading activities:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <div className="hero">
        <img src={logo} alt="SanBorja58" className="hero-logo" />
        <h1>Galería de Actividades</h1>
        <p>Grupo Scout San Borja 58 — Limatambo</p>
      </div>

      <div className="activities-section">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <span>Cargando actividades…</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏕️</div>
            <h3>No hay actividades publicadas aún</h3>
            <p>Vuelve pronto para ver el contenido.</p>
          </div>
        ) : (
          <>
            <div className="section-title">Actividades</div>
            <div className="activities-grid">
              {activities.map((act) => (
                <ActivityCard key={act.id} activity={act} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function ActivityCard({ activity }) {
  return (
    <Link to={`/actividad/${activity.id}`} style={{ textDecoration: 'none' }}>
      <div className="card activity-card">
        <div className="cover">
          {activity.coverUrl ? (
            <img src={activity.coverUrl} alt={activity.name} />
          ) : (
            <span>🏕️</span>
          )}
          <div className="cover-overlay" />
        </div>
        <div className="info">
          <h3>{activity.name}</h3>
          {activity.description && <p>{activity.description}</p>}
          <div className="meta">
            {activity.eventDate && (
              <span>
                📅{' '}
                {parseLocalDate(activity.eventDate)?.toLocaleDateString('es', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
