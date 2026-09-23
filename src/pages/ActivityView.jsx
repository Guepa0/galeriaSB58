import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import Download from 'yet-another-react-lightbox/plugins/download'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { showToast } from '../components/Toast'

const DRIVE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY

// Parsea "YYYY-MM-DD" sin conversión de zona horaria
function parseLocalDate(dateStr) {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getDriveFiles(folderId) {
  const url = new URL('https://www.googleapis.com/drive/v3/files')
  url.searchParams.set('q', `'${folderId}' in parents and trashed = false`)
  url.searchParams.set('fields', 'files(id,name,mimeType,thumbnailLink,size,webContentLink)')
  url.searchParams.set('pageSize', '200')
  url.searchParams.set('orderBy', 'name')
  url.searchParams.set('key', DRIVE_API_KEY)
  return fetch(url.toString()).then((r) => r.json())
}

// Devuelve el archivo "portada.*" si existe en la lista
function findCoverFile(files) {
  return files.find((f) =>
    f.name.toLowerCase().replace(/\.[^.]+$/, '') === 'portada' && isImage(f.mimeType)
  ) || null
}

function getThumbnail(file) {
  // Drive provee thumbnailLink; para fotos públicas también podemos usar la URL directa
  if (file.thumbnailLink) return file.thumbnailLink.replace('=s220', '=s400')
  return `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`
}

function getFullUrl(file) {
  // Usamos el thumbnail en alta resolución para el lightbox (evita CORS)
  return file.thumbnailLink
    ? file.thumbnailLink.replace(/=s\d+$/, '=s1600')
    : `https://drive.google.com/thumbnail?id=${file.id}&sz=w1600`
}

function getDownloadUrl(file) {
  return `https://drive.google.com/uc?export=download&id=${file.id}`
}

function isImage(mimeType) {
  return mimeType?.startsWith('image/')
}

function isVideo(mimeType) {
  return mimeType?.startsWith('video/')
}

export default function ActivityView() {
  const { id } = useParams()
  const [activity, setActivity] = useState(null)
  const [files, setFiles] = useState([])
  const [coverUrl, setCoverUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const docSnap = await getDoc(doc(db, 'activities', id))
        if (!docSnap.exists()) return
        const act = { id: docSnap.id, ...docSnap.data() }
        setActivity(act)

        if (act.driveFolderId) {
          const data = await getDriveFiles(act.driveFolderId)
          const allFiles = data.files || []
          const mediaFiles = allFiles.filter(
            (f) => isImage(f.mimeType) || isVideo(f.mimeType)
          )
          setFiles(mediaFiles)

          // Prioridad: URL manual del admin → archivo "portada.*" en Drive → null
          if (act.coverUrl) {
            setCoverUrl(act.coverUrl)
          } else {
            const coverFile = findCoverFile(allFiles)
            if (coverFile) {
              setCoverUrl(getThumbnail(coverFile))
            }
          }
        } else if (act.coverUrl) {
          setCoverUrl(act.coverUrl)
        }
      } catch (err) {
        console.error('Error loading activity:', err)
        showToast('Error al cargar la actividad', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const imageFiles = files.filter((f) => isImage(f.mimeType))
  const lightboxSlides = imageFiles.map((f) => ({
    src: getFullUrl(f),
    download: getDownloadUrl(f),
    title: f.name,
  }))

  const downloadAll = useCallback(async () => {
    if (!files.length) return
    setDownloading(true)
    showToast('Preparando descarga ZIP…')
    try {
      const zip = new JSZip()
      await Promise.all(
        files.map(async (f) => {
          const resp = await fetch(getDownloadUrl(f))
          const blob = await resp.blob()
          zip.file(f.name, blob)
        })
      )
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `${activity.name || 'galeria'}.zip`)
      showToast('Descarga completada', 'success')
    } catch {
      showToast('Error al generar el ZIP', 'error')
    } finally {
      setDownloading(false)
    }
  }, [files, activity])

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner" />
          <span>Cargando fotos…</span>
        </div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="icon">❌</div>
          <h3>Actividad no encontrada</h3>
          <Link to="/">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="breadcrumb">
        <Link to="/">Inicio</Link>
        <span>/</span>
        <span>{activity.name}</span>
      </div>

      <div className="page-header">
        <div>
          <h1>{activity.name}</h1>
          {activity.description && (
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>{activity.description}</p>
          )}
          {activity.eventDate && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              📅{' '}
              {parseLocalDate(activity.eventDate)?.toLocaleDateString('es', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13, alignSelf: 'center' }}>
            {files.length} archivo{files.length !== 1 ? 's' : ''}
          </span>
          {files.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={downloadAll}
              disabled={downloading}
            >
              {downloading ? '⏳ Preparando…' : '⬇️ Descargar todo (ZIP)'}
            </button>
          )}
        </div>
      </div>

      {files.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📂</div>
          <h3>No hay archivos en esta actividad</h3>
          <p>La carpeta de Drive está vacía o no es accesible.</p>
        </div>
      ) : (
        <div className="photos-grid">
          {files.map((file, idx) => {
            const imgIdx = imageFiles.findIndex((f) => f.id === file.id)
            return (
              <div
                key={file.id}
                className={`photo-item ${isVideo(file.mimeType) ? 'video-item' : ''}`}
                onClick={() => {
                  if (isImage(file.mimeType)) setLightboxIndex(imgIdx)
                  if (isVideo(file.mimeType)) window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank')
                }}
              >
                <img
                  src={getThumbnail(file)}
                  alt={file.name}
                  loading="lazy"
                />
                <div className="overlay">
                  {isImage(file.mimeType) && (
                    <button
                      title="Ver en grande"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLightboxIndex(imgIdx)
                      }}
                    >
                      🔍
                    </button>
                  )}
                  <button
                    title="Descargar"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(getDownloadUrl(file), '_blank')
                    }}
                  >
                    ⬇️
                  </button>
                  {isVideo(file.mimeType) && (
                    <button
                      title="Ver video"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank')
                      }}
                    >
                      ▶️
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lightboxIndex >= 0 && (
        <Lightbox
          open={lightboxIndex >= 0}
          close={() => setLightboxIndex(-1)}
          index={lightboxIndex}
          slides={lightboxSlides}
          plugins={[Download]}
        />
      )}
    </div>
  )
}
