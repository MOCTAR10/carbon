'use client'

import { useState, useEffect } from 'react'
import { Award, X, CheckCircle, XCircle, Clock, User, AlertCircle, FileText, Eye, Send, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import QRCodeImage from '@/components/QRCodeImage'

interface Certification {
  id: number
  assessmentId: number
  assessmentName: string
  assessmentYear: number
  siteName: string
  totalCo2eq: number
  scope1: number
  scope2: number
  scope3: number
  status: string
  expertName: string | null
  expertEmail: string | null
  inspectionDate: string | null
  inspectionNotes: string | null
  companyMessage: string | null
  adminNotes: string | null
  rejectionReason: string | null
  certifiedAt: string | null
  certificateNumber: string | null
  requestedAt: string
  company: { id: number; name: string }
  documents: { id: number; docType: string; originalName: string; fileSize: number; createdAt: string }[]
}

const STATUS_LABELS: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:          { label: 'En attente',      cls: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  assigned:         { label: 'Expert assigné',  cls: 'bg-blue-500/20 text-blue-400',     icon: <User className="w-3 h-3" /> },
  in_progress:      { label: 'Audit en cours',  cls: 'bg-violet-500/20 text-violet-400', icon: <AlertCircle className="w-3 h-3" /> },
  audit_done:       { label: 'Audit finalisé',  cls: 'bg-teal-500/20 text-teal-400',     icon: <ShieldCheck className="w-3 h-3" /> },
  submitted_to_cnc: { label: 'Déposé à la DGEPN', cls: 'bg-amber-500/20 text-amber-400',   icon: <Send className="w-3 h-3" /> },
  certified:        { label: 'Certifié DGEPN',  cls: 'bg-green-500/20 text-green-400',   icon: <CheckCircle className="w-3 h-3" /> },
  rejected:         { label: 'Rejeté',          cls: 'bg-red-500/20 text-red-400',       icon: <XCircle className="w-3 h-3" /> },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, cls: 'bg-gray-700 text-gray-400', icon: null }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  )
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

type ModalMode = 'assign' | 'reject' | 'notes' | null

export default function AdminCertifications() {
  const router = useRouter()
  const [certs, setCerts] = useState<Certification[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Certification | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [submitting, setSubmitting] = useState(false)

  // Expert list for dropdown
  const [experts, setExperts] = useState<{ id: number; firstName: string; lastName: string; email: string }[]>([])
  const [expertUserId, setExpertUserId] = useState('')

  // Form states
  const [inspectionDate, setInspectionDate] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/certifications')
    const data = await res.json()
    setCerts(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Load experts for dropdown
    fetch('/api/admin/experts?limit=100')
      .then(r => r.json())
      .then(data => setExperts(data.experts || []))
      .catch(() => {})
  }, [])

  const filtered = statusFilter === 'all' ? certs : certs.filter(c => c.status === statusFilter)

  const openModal = (cert: Certification, mode: ModalMode) => {
    setSelected(cert)
    setModalMode(mode)
    setExpertUserId('')
    setInspectionDate(cert.inspectionDate ? cert.inspectionDate.slice(0, 10) : '')
    setAdminNotes(cert.adminNotes || '')
    setRejectionReason('')
  }

  const closeModal = () => {
    setSelected(null)
    setModalMode(null)
  }

  const submit = async () => {
    if (!selected) return
    setSubmitting(true)

    let body: object = { action: modalMode }
    if (modalMode === 'assign') {
      body = { action: 'assign', expertUserId: parseInt(expertUserId), inspectionDate: inspectionDate || null, adminNotes }
    } else if (modalMode === 'reject') {
      body = { action: 'reject', rejectionReason, adminNotes }
    } else if (modalMode === 'notes') {
      body = { action: 'notes', adminNotes }
    }

    await fetch(`/api/admin/certifications/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setSubmitting(false)
    closeModal()
    load()
  }

  const quickAction = async (cert: Certification, action: string) => {
    await fetch(`/api/admin/certifications/${cert.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    load()
  }

  const counts = {
    all: certs.length,
    pending: certs.filter(c => c.status === 'pending').length,
    assigned: certs.filter(c => c.status === 'assigned').length,
    in_progress: certs.filter(c => c.status === 'in_progress').length,
    audit_done: certs.filter(c => c.status === 'audit_done').length,
    submitted_to_cnc: certs.filter(c => c.status === 'submitted_to_cnc').length,
    certified: certs.filter(c => c.status === 'certified').length,
    rejected: certs.filter(c => c.status === 'rejected').length,
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Certifications</h1>
        <p className="text-gray-400 text-sm mt-1">
          {counts.all} demande{counts.all !== 1 ? 's' : ''} · {counts.pending} en attente
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: `Toutes (${counts.all})` },
          { key: 'pending', label: `En attente (${counts.pending})` },
          { key: 'assigned', label: `Assignées (${counts.assigned})` },
          { key: 'in_progress', label: `En cours (${counts.in_progress})` },
          { key: 'audit_done', label: `Audit finalisé (${counts.audit_done})` },
          { key: 'submitted_to_cnc', label: `Déposées à la DGEPN (${counts.submitted_to_cnc})` },
          { key: 'certified', label: `Certifiées (${counts.certified})` },
          { key: 'rejected', label: `Rejetées (${counts.rejected})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-brand-600 text-white'
                : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && (
        <div className="text-center py-10 text-gray-500">Chargement...</div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-10 text-gray-500">Aucune certification dans cette catégorie.</div>
      )}
      <div className="space-y-3">
        {filtered.map(cert => (
          <div key={cert.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <StatusBadge status={cert.status} />
                  {cert.certificateNumber && (
                    <span className="text-xs text-gray-500 font-mono">#{cert.certificateNumber}</span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-white">
                  {cert.company.name}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {cert.assessmentName} · {cert.assessmentYear} · {cert.siteName}
                </p>
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                  <span>Total: <span className="text-gray-300">{cert.totalCo2eq.toFixed(1)} tCO₂e</span></span>
                  <span>S1: {cert.scope1.toFixed(1)}</span>
                  <span>S2: {cert.scope2.toFixed(1)}</span>
                  <span>S3: {cert.scope3.toFixed(1)}</span>
                  <span>Demandé: {formatDate(cert.requestedAt)}</span>
                </div>
                {cert.expertName && (
                  <p className="text-xs text-blue-400 mt-1.5">
                    Expert: {cert.expertName} {cert.expertEmail ? `(${cert.expertEmail})` : ''}
                    {cert.inspectionDate ? ` · Inspection: ${formatDate(cert.inspectionDate)}` : ''}
                  </p>
                )}
                {cert.companyMessage && (
                  <p className="text-xs text-gray-400 mt-1.5 italic border-l-2 border-gray-600 pl-2">{cert.companyMessage}</p>
                )}
                {cert.rejectionReason && (
                  <p className="text-xs text-red-400 mt-1.5">Motif rejet: {cert.rejectionReason}</p>
                )}
                {cert.documents.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-500">{cert.documents.length} document{cert.documents.length > 1 ? 's' : ''} joint{cert.documents.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap sm:flex-col gap-2 sm:items-end flex-shrink-0">
                <button
                  onClick={() => router.push(`/admin/certifications/${cert.id}`)}
                  className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />Voir détail
                </button>
                {cert.status === 'certified' && cert.certificateNumber && (
                  <QRCodeImage certNumber={cert.certificateNumber} size={56} />
                )}
                {cert.status === 'pending' && (
                  <>
                    <button
                      onClick={() => openModal(cert, 'assign')}
                      className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Assigner expert
                    </button>
                    <button
                      onClick={() => openModal(cert, 'reject')}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Rejeter
                    </button>
                  </>
                )}
                {cert.status === 'assigned' && (
                  <>
                    <button
                      onClick={() => quickAction(cert, 'in_progress')}
                      className="text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Marquer en cours
                    </button>
                    <button
                      onClick={() => openModal(cert, 'reject')}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Rejeter
                    </button>
                  </>
                )}
                {cert.status === 'in_progress' && (
                  <>
                    <button
                      onClick={() => openModal(cert, 'reject')}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Rejeter
                    </button>
                  </>
                )}
                <button
                  onClick={() => openModal(cert, 'notes')}
                  className="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Notes admin
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selected && modalMode && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">
                {modalMode === 'assign' && 'Assigner un expert'}
                {modalMode === 'reject' && 'Rejeter la demande'}
                {modalMode === 'notes' && 'Notes administrateur'}
              </h2>
              <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-400">{selected.company.name} · {selected.assessmentName}</p>

              {modalMode === 'assign' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Expert certifieur *</label>
                    {experts.length === 0 ? (
                      <p className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2.5">
                        Aucun expert enregistré. Créez-en un dans la section <strong>Experts</strong>.
                      </p>
                    ) : (
                      <select
                        value={expertUserId}
                        onChange={e => setExpertUserId(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                      >
                        <option value="">Sélectionner un expert...</option>
                        {experts.map(ex => (
                          <option key={ex.id} value={ex.id}>
                            {ex.firstName} {ex.lastName} ({ex.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Date d&apos;inspection prévue</label>
                    <input
                      type="date"
                      value={inspectionDate}
                      onChange={e => setInspectionDate(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Notes admin (internes)</label>
                    <textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 resize-none"
                      placeholder="Notes internes..."
                    />
                  </div>
                </>
              )}

              {modalMode === 'reject' && (
                <>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Motif du rejet *</label>
                    <textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 resize-none"
                      placeholder="Expliquer le motif du rejet..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Notes admin (internes)</label>
                    <textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 resize-none"
                    />
                  </div>
                </>
              )}

              {modalMode === 'notes' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Notes administrateur</label>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    rows={5}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 resize-none"
                    placeholder="Notes internes..."
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-700">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submit}
                disabled={submitting || (modalMode === 'assign' && !expertUserId) || (modalMode === 'reject' && !rejectionReason)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white
                  ${modalMode === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'}`}
              >
                {submitting ? 'En cours...' : (
                  modalMode === 'assign' ? 'Assigner' :
                  modalMode === 'reject' ? 'Rejeter' : 'Sauvegarder'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
