import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Plug, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAppliances, createAppliance, updateAppliance, deleteAppliance, getCategories } from '../services/api'
import {
  PageHeader, Card, Badge, Button, Input, Select,
  Modal, Spinner, EmptyState,
} from '../components/ui/index.jsx'
import { formatKwh, CATEGORY_COLORS } from '../utils/formatters'

const EMPTY_FORM = {
  name: '', category: 'other', wattage: '', daily_hours: '', quantity: 1, room: '', is_active: true,
}

function ApplianceForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const daily_kwh = form.wattage && form.daily_hours
    ? ((+form.wattage * +form.daily_hours * (+form.quantity || 1)) / 1000).toFixed(3)
    : null

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <Input label="Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Refrigerator" required />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)}>
          {['cooling','heating','lighting','kitchen','entertainment','laundry','office','security','other'].map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </Select>
        <Input label="Room (optional)" value={form.room} onChange={e => set('room', e.target.value)} placeholder="e.g. Living Room" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input label="Wattage (W)" type="number" min="0" step="0.1" value={form.wattage}
          onChange={e => set('wattage', e.target.value)} placeholder="100" required />
        <Input label="Daily Hours" type="number" min="0" max="24" step="0.1" value={form.daily_hours}
          onChange={e => set('daily_hours', e.target.value)} placeholder="8" required />
        <Input label="Quantity" type="number" min="1" value={form.quantity}
          onChange={e => set('quantity', e.target.value)} />
      </div>
      {daily_kwh && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-sm text-blue-300">
          ⚡ Estimated: <strong>{daily_kwh} kWh/day</strong> · <strong>{(+daily_kwh * 30).toFixed(2)} kWh/month</strong>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? <Spinner size={14} /> : null}
          {initial ? 'Update' : 'Add Appliance'}
        </Button>
      </div>
    </form>
  )
}

export default function Appliances() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null) // null | 'add' | {editing: appliance}
  const [search, setSearch] = useState('')

  const { data: appliances = [], isLoading } = useQuery({
    queryKey: ['appliances'],
    queryFn: getAppliances,
  })

  const createMut = useMutation({
    mutationFn: createAppliance,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appliances'] }); setModal(null); toast.success('Appliance added') },
    onError: () => toast.error('Failed to add appliance'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateAppliance(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appliances'] }); setModal(null); toast.success('Updated') },
    onError: () => toast.error('Failed to update'),
  })
  const deleteMut = useMutation({
    mutationFn: deleteAppliance,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appliances'] }); toast.success('Removed') },
    onError: () => toast.error('Failed to delete'),
  })

  const filtered = appliances.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  )

  const totalDailyKwh = appliances.filter(a => a.is_active).reduce((s, a) => s + (a.daily_kwh || 0), 0)
  const totalMonthlyKwh = appliances.filter(a => a.is_active).reduce((s, a) => s + (a.monthly_kwh || 0), 0)

  return (
    <div>
      <PageHeader
        title="Appliances"
        subtitle={`${appliances.length} total · ${formatKwh(totalDailyKwh)}/day · ${formatKwh(totalMonthlyKwh)}/month`}
        action={
          <Button onClick={() => setModal('add')}>
            <Plus size={14} />
            Add Appliance
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <input
          className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Search appliances..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size={28} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Plug}
            title="No appliances yet"
            description="Add your household appliances to start tracking consumption."
            action={<Button onClick={() => setModal('add')}><Plus size={14} />Add First Appliance</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(a => (
              <Card key={a.id} className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: CATEGORY_COLORS[a.category] || '#6b7280' }} />
                    <div>
                      <div className="text-sm font-semibold text-white">{a.name}</div>
                      {a.room && <div className="text-xs text-gray-500">{a.room}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModal({ editing: a })}
                      className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-all"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Remove ${a.name}?`)) deleteMut.mutate(a.id) }}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Wattage</span>
                    <span className="text-gray-200 font-medium">{a.wattage}W × {a.quantity}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Daily Use</span>
                    <span className="text-gray-200">{a.daily_hours}h/day</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Daily kWh</span>
                    <span className="text-blue-400 font-semibold">{formatKwh(a.daily_kwh)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Monthly kWh</span>
                    <span className="text-purple-400 font-semibold">{formatKwh(a.monthly_kwh)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
                  <Badge color={a.category === 'other' ? 'gray' : 'blue'}>{a.category}</Badge>
                  <Badge color={a.is_active ? 'green' : 'gray'}>{a.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Add Appliance">
        <ApplianceForm
          onSubmit={(data) => createMut.mutate({ ...data, wattage: +data.wattage, daily_hours: +data.daily_hours, quantity: +data.quantity })}
          onCancel={() => setModal(null)}
          loading={createMut.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      {modal?.editing && (
        <Modal open onClose={() => setModal(null)} title="Edit Appliance">
          <ApplianceForm
            initial={modal.editing}
            onSubmit={(data) => updateMut.mutate({
              id: modal.editing.id,
              data: { ...data, wattage: +data.wattage, daily_hours: +data.daily_hours, quantity: +data.quantity },
            })}
            onCancel={() => setModal(null)}
            loading={updateMut.isPending}
          />
        </Modal>
      )}
    </div>
  )
}
