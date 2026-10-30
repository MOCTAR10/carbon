'use client'

import { useState } from 'react'
import { Archive, Send, Award, Download, Upload, XCircle, AlertTriangle, CheckCircle, FileText } from 'lucide-react'

export interface CertDocument {
  id: number
  docType: string
  originalName: string
  fileSize: number
  createdAt: string
}

export interface CncDepositData {
  id: number
  status: string
  submittedToCncAt: string | null
  cncDepositReference: string | null
  certificateNumber: string | null
  certifiedAt: string | null
  documents: CertDocument[]
}

interface Props {
  cert: CncDepositData
  /** The expert drives these steps; the admin only follows them */
  role: 'expert' | 'admin'
  onRefresh: () => void
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

const today = () => new Date().toISOString().slice(0, 10)

async function downloadFile(url: string, fallbackName: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Téléchargement impossible')
  }
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/.exec(disposition)
  const name = match ? decodeURIComponent(match[1] ?? match[2]) : fallbackName
  const blobUrl = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = name
  a.click()
  URL.revokeObjectURL(blobUrl)
}

export default function CncDepositCard({ cert, role, onRefresh }: Props) {
  const isExpert = role === 'expert'
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [depositDate, setDepositDate] = useState(today())
  const [depositRef, setDepositRef] = useState('')

  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [certNumber, setCertNumber] = useState(cert.certificateNumber ?? '')
  const [certDate, setCertDate] = useState(cert.certifiedAt?.slice(0, 10) ?? today())

  const [showRefusal, setShowRefusal] = useState(false)
  const [refusalReason, setRefusalReason] = useState('')

  const deposited = ['submitted_to_cnc', 'certified'].includes(cert.status)
  const certified = cert.status === 'certified'
  const certificates = cert.documents.filter(d => d.docType === 'certificate')

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError('')
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
    finally { setBusy(null) }
  }

  const patch = (body: object) => run('patch', async () => {
    const res = await fetch(`/api/expert/certifications/${cert.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erreur')
    setShowRefusal(false)
    onRefresh()
  })

  const uploadCertificate = () => run('upload', async () => {
    if (!file) throw new Error('Sélectionnez le fichier du certificat')
    const form = new FormData()
    form.append('file', file)
    form.append('certificateNumber', certNumber.trim())
    form.append('certifiedAt', certDate)
    const res = await fetch(`/api/expert/certifications/${cert.id}/certificate`, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erreur lors du téléversement')
    setShowUpload(false); setFile(null)
    onRefresh()
  })

  const input = 'w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500'
  const label = 'block text-xs font-medium text-gray-400 mb-1'

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-700 flex items-center gap-2.5">
        <Send className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-white">Dépôt à la DGEPN &amp; certificat</span>
      </div>

      <div className="divide-y divide-gray-700">
        {error && (
          <div className="mx-5 my-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
          </div>
        )}

        {/* 1 — Full dossier */}
        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Archive className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">1. Dossier complet</p>
              <p className="text-xs text-gray-400 mt-0.5">
                ZIP : dossier de certification, rapport d&apos;audit expert, détail des émissions et pièces justificatives de l&apos;entreprise.
              </p>
            </div>
          </div>
          <button
            onClick={() => run('zip', () => downloadFile(`/api/expert/certifications/${cert.id}/dossier`, `dossier-cnc-${cert.id}.zip`))}
            disabled={busy !== null}
            className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />{busy === 'zip' ? 'Préparation…' : 'Télécharger'}
          </button>
        </div>

        {/* 2 — Deposit at the DGEPN */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <Send className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">2. Dépôt du dossier à la DGEPN</p>
              {deposited ? (
                <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Déposé le {fmtDate(cert.submittedToCncAt)}{cert.cncDepositReference && ` · Réf. ${cert.cncDepositReference}`}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">
                  {cert.status === 'audit_done'
                    ? (isExpert ? 'Après le dépôt physique à la DGEPN, enregistrez-le ici.' : 'En attente du dépôt par l\'expert.')
                    : 'Disponible une fois l\'audit finalisé.'}
                </p>
              )}
            </div>
          </div>

          {isExpert && cert.status === 'audit_done' && (
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end pl-7">
              <div>
                <label className={label}>Date du dépôt *</label>
                <input type="date" value={depositDate} max={today()} onChange={e => setDepositDate(e.target.value)} className={input} />
              </div>
              <div>
                <label className={label}>Référence / n° de récépissé</label>
                <input type="text" value={depositRef} onChange={e => setDepositRef(e.target.value)} placeholder="Optionnel" className={input} />
              </div>
              <button
                onClick={() => patch({ action: 'submit_to_cnc', depositDate, depositReference: depositRef })}
                disabled={busy !== null || !depositDate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {busy === 'patch' ? 'Enregistrement…' : 'Confirmer le dépôt'}
              </button>
            </div>
          )}
        </div>

        {/* 3 — DGEPN certificate (after the CNC's avis) */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Award className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">3. Certificat délivré par la DGEPN</p>
                {certified ? (
                  <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    N° {cert.certificateNumber} · délivré le {fmtDate(cert.certifiedAt)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {deposited
                      ? (isExpert ? 'Téléversez la copie numérique du certificat dès réception.' : 'En attente de l\'avis du CNC et du certificat de la DGEPN.')
                      : 'Disponible après le dépôt à la DGEPN.'}
                  </p>
                )}
              </div>
            </div>
            {isExpert && deposited && !showUpload && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg transition-colors flex-shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />{certified ? 'Remplacer' : 'Téléverser'}
              </button>
            )}
          </div>

          {certificates.length > 0 && (
            <ul className="pl-7 space-y-1.5">
              {certificates.map((d, i) => (
                <li key={d.id} className="flex items-center justify-between gap-3 bg-gray-900 rounded-lg px-3 py-2">
                  <span className="flex items-center gap-2 text-xs text-gray-300 min-w-0">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
                    <span className="truncate">{d.originalName}</span>
                    <span className="text-gray-500 flex-shrink-0">{fmtSize(d.fileSize)} · {fmtDate(d.createdAt)}{i > 0 && ' · remplacé'}</span>
                  </span>
                  <button
                    onClick={() => run(`doc-${d.id}`, () => downloadFile(`/api/certification-documents/${d.id}`, d.originalName))}
                    disabled={busy !== null}
                    className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 flex-shrink-0"
                  >
                    {busy === `doc-${d.id}` ? '…' : 'Télécharger'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {isExpert && showUpload && (
            <div className="pl-7 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={label}>N° du certificat DGEPN *</label>
                  <input type="text" value={certNumber} onChange={e => setCertNumber(e.target.value)} placeholder="Tel qu'inscrit sur le certificat" className={input} />
                </div>
                <div>
                  <label className={label}>Date de délivrance *</label>
                  <input type="date" value={certDate} max={today()} onChange={e => setCertDate(e.target.value)} className={input} />
                </div>
              </div>
              <div>
                <label className={label}>Copie numérique (PDF, JPG ou PNG — 20 Mo max) *</label>
                <input
                  type="file" accept="application/pdf,image/jpeg,image/png"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white hover:file:bg-gray-600"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={uploadCertificate}
                  disabled={busy !== null || !file || !certNumber.trim() || !certDate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  {busy === 'upload' ? 'Téléversement…' : 'Enregistrer le certificat'}
                </button>
                <button onClick={() => { setShowUpload(false); setFile(null) }} className="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 text-sm hover:text-white transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* The DGEPN can still refuse the dossier after deposit */}
          {isExpert && cert.status === 'submitted_to_cnc' && !showUpload && (
            showRefusal ? (
              <div className="pl-7 space-y-2">
                <textarea
                  value={refusalReason} onChange={e => setRefusalReason(e.target.value)} rows={3}
                  placeholder="Motif communiqué par la DGEPN…"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowRefusal(false)} className="px-4 py-2 rounded-xl bg-gray-700 text-gray-300 text-sm hover:text-white transition-colors">Annuler</button>
                  <button
                    onClick={() => patch({ action: 'reject', rejectionReason: `Refus de la DGEPN : ${refusalReason.trim()}` })}
                    disabled={busy !== null || !refusalReason.trim()}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    Confirmer le refus
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowRefusal(true)} className="ml-7 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300">
                <XCircle className="w-3.5 h-3.5" />La DGEPN a refusé le dossier
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
