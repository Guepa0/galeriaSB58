import { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { showToast } from '../components/Toast'

const DRIVE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY

// Busca archivo "portada.*" en una carpeta de Drive y devuelve su thumbnail URL
async function resolveCoverFromDrive(folderId) {
  try {
    const url = new URL('https://www.googleapis.com/drive/v3/files')
    url.searchParams.set('q', `'${folderId}' in parents and trashed = false and name contains 'portada'`)
    url.searchParams.set('fields', 'files(id,name,mimeType,thumbnailLink)')
    url.searchParams.set('pageSize', '5')
    url.searchParams.set('key', DRIVE_API_KEY)
    const data = await fetch(url.toString()).then((r) => r.json())
    const cover = (data.files || []).find(
      (f) => f.name.toLowerCase().replace(/\.[^.]+$/, '') === 'portada'
    )
    if (cover?.thumbnailLink) {
      return cover.thumbnailLink.replace(/=s\d+$/, '=s600')
    }
  } catch {
    // Si falla la búsqueda, no es crítico
  }
  return ''
}

// Extrae el ID de una URL de Google Drive o devuelve el texto tal cual si ya es un ID
function extractDriveFolderId(input) {
  const trimmed = input.trim()
  // Intenta extraer el ID de URLs como:
  //   https://drive.google.com/drive/folders/ID
  //   https://drive.google.com/drive/u/0/folders/ID
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{10,})/)
  if (match) return match[1]
  return trimmed
}

// Parsea "YYYY-MM-DD" sin conversión de zona horaria
function parseLocalDate(dateStr) {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const EMPTY_FORM = {
  name: '',
  description: '',
  driveFolderId: '',
  eventDate: '',
  coverUrl: '',
  published: false,
}

export default function Admin() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null) // null = create, object = edit
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function loadActivities() {
    try {
      const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error(err)
      showToast('Error al cargar actividades', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(act) {
    setEditing(act)
    setForm({
      name: act.name || '',
      description: act.description || '',
      driveFolderId: act.driveFolderId || '',
      eventDate: act.eventDate || '',
      coverUrl: act.coverUrl || '',
      published: act.published || false,
    })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) return showToast('El nombre es requerido', 'error')
    if (!form.driveFolderId.trim()) return showToast('El ID de carpeta Drive es requerido', 'error')

    setSaving(true)
    try {
      // Si no hay coverUrl manual, buscar automáticamente "portada.*" en Drive
      let resolvedCover = form.coverUrl
      if (!resolvedCover.trim() && form.driveFolderId) {
        resolvedCover = await resolveCoverFromDrive(form.driveFolderId)
      }
      const dataToSave = { ...form, coverUrl: resolvedCover }

      if (editing) {
        await updateDoc(doc(db, 'activities', editing.id), {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        })
        showToast('Actividad actualizada', 'success')
      } else {
        await addDoc(collection(db, 'activities'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        showToast('Actividad creada', 'success')
      }
      setShowModal(false)
      await loadActivities()
    } catch (err) {
      console.error(err)
      showToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublish(act) {
    try {
      await updateDoc(doc(db, 'activities', act.id), {
        published: !act.published,
        updatedAt: serverTimestamp(),
      })
      showToast(act.published ? 'Actividad ocultada' : 'Actividad publicada', 'success')
      await loadActivities()
    } catch {
      showToast('Error al cambiar estado', 'error')
    }
  }

  async function handleDelete(act) {
    if (!window.confirm(`¿Eliminar "${act.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteDoc(doc(db, 'activities', act.id))
      showToast('Actividad eliminada', 'success')
      await loadActivities()
    } catch {
      showToast('Error al eliminar', 'error')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>⚙️ Administración</h1>
          <p>Gestiona las actividades de la galería</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nueva actividad
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📂</div>
          <h3>No hay actividades</h3>
          <p>Crea tu primera actividad para empezar.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Fecha del evento</th>
                <th>ID Carpeta Drive</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((act) => (
                <tr key={act.id}>
                  <td>
                    <strong>{act.name}</strong>
                    {act.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {act.description.slice(0, 60)}{act.description.length > 60 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    {act.eventDate
                      ? parseLocalDate(act.eventDate).toLocaleDateString('es', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td>
                    <code style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {act.driveFolderId ? act.driveFolderId.slice(0, 20) + '…' : '—'}
                    </code>
                  </td>
                  <td>
                    <span className={`badge ${act.published ? 'badge-published' : 'badge-draft'}`}>
                      {act.published ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(act)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className={`btn btn-sm ${act.published ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => handleTogglePublish(act)}
                        title={act.published ? 'Ocultar' : 'Publicar'}
                      >
                        {act.published ? '👁️ Ocultar' : '✅ Publicar'}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(act)}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Editar actividad' : 'Nueva actividad'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Nombre *</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Campamento de verano 2024"
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  className="form-control"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe brevemente la actividad…"
                />
              </div>
              <div className="form-group">
                <label>URL o ID de carpeta en Google Drive *</label>
                <input
                  className="form-control"
                  value={form.driveFolderId}
                  onChange={(e) =>
                    setForm({ ...form, driveFolderId: extractDriveFolderId(e.target.value) })
                  }
                  placeholder="Pega la URL completa o solo el ID de la carpeta"
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Abre la carpeta en Drive, copia la URL del navegador y pégala aquí.
                  El ID se extrae automáticamente.
                  {form.driveFolderId && (
                    <span style={{ display: 'block', marginTop: 4 }}>
                      ID detectado: <code>{form.driveFolderId}</code>
                    </span>
                  )}
                </small>
              </div>
              <div className="form-group">
                <label>Fecha del evento</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Imagen de portada (opcional)</label>
                <input
                  className="form-control"
                  value={form.coverUrl}
                  onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                  placeholder="URL de cualquier imagen (Drive, link directo, etc.)"
                />
                <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Si dejas vacío, se mostrará un ícono genérico en la galería.
                </small>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="published"
                  checked={form.published}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="published" style={{ margin: 0 }}>Publicar en la galería</label>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
