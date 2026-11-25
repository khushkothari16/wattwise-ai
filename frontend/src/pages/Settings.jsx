import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Save, Settings as SettingsIcon, Zap, ExternalLink, Download, CheckCircle2, Circle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSettings, updateSettings } from '../services/api'
import { PageHeader, Card, Input, Select, Button, Spinner, Badge } from '../components/ui/index.jsx'

export default function Settings() {
  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const [form, setForm] = useState({})

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const updateMut = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => toast.success('Settings saved'),
    onError: () => toast.error('Failed to save settings'),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = (e) => {
    e.preventDefault()
    updateMut.mutate({
      household_name: form.household_name,
      tariff_rate: +form.tariff_rate,
      currency: form.currency,
      timezone: form.timezone,
      monthly_budget: form.monthly_budget ? +form.monthly_budget : null,
      anomaly_threshold_pct: +form.anomaly_threshold_pct,
      report_day: +form.report_day,
    })
  }

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size={28} /></div>

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your household and energy preferences" />
      <div className="p-6 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          <Card>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Household</div>
            <div className="space-y-4">
              <Input
                label="Household Name"
                value={form.household_name || ''}
                onChange={e => set('household_name', e.target.value)}
                placeholder="My Home"
              />
            </div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Electricity Tariff</div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Cost per kWh"
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.tariff_rate || ''}
                  onChange={e => set('tariff_rate', e.target.value)}
                  placeholder="0.12"
                />
                <Select label="Currency" value={form.currency || 'USD'} onChange={e => set('currency', e.target.value)}>
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                </Select>
              </div>
              <Input
                label="Monthly Budget (optional)"
                type="number"
                step="0.01"
                min="0"
                value={form.monthly_budget || ''}
                onChange={e => set('monthly_budget', e.target.value)}
                placeholder="Leave empty for no budget"
              />
            </div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">AI & Alerts</div>
            <div className="space-y-4">
              <Input
                label="Anomaly Threshold (%)"
                type="number"
                min="1"
                max="200"
                value={form.anomaly_threshold_pct || ''}
                onChange={e => set('anomaly_threshold_pct', e.target.value)}
              />
              <p className="text-xs text-gray-500 -mt-2">
                Flag consumption that deviates more than this % from the 30-day average.
              </p>
              <Input
                label="Monthly Report Day"
                type="number"
                min="1"
                max="28"
                value={form.report_day || ''}
                onChange={e => set('report_day', e.target.value)}
              />
            </div>
          </Card>

          <Card>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">IBM watsonx.ai</div>
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg px-3 py-3 text-xs text-gray-400 leading-relaxed">
              Configure your IBM Cloud API key and watsonx.ai Project ID in the backend{' '}
              <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300">.env</code> file to enable full AI features.
              <br /><br />
              Required variables: <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300">WATSONX_API_KEY</code>,{' '}
              <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300">WATSONX_PROJECT_ID</code>
            </div>
          </Card>

          {/* ── watsonx Orchestrate ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">IBM watsonx Orchestrate</div>
              <Badge color="purple">Skills Ready</Badge>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              WattWise AI exposes a set of <strong className="text-gray-200">OpenAPI 3.0 skills</strong> that can be imported into
              watsonx Orchestrate so your Orchestrate agents can query energy data, get bill projections,
              detect anomalies, and ask IBM Granite for saving tips — all via natural language.
            </p>

            {/* Skill list */}
            <div className="space-y-2 mb-5">
              {[
                { id: 'getEnergySnapshot',              label: 'Get energy snapshot',                desc: 'Real-time household usage & bill overview' },
                { id: 'listAppliances',                 label: 'List appliances',                    desc: 'All tracked appliances with wattage & kWh' },
                { id: 'getBillEstimate',                label: 'Get bill estimate',                  desc: 'Projected monthly electricity bill' },
                { id: 'getEnergyAnomalies',             label: 'Get anomalies',                      desc: 'Unusual consumption events (last 30 days)' },
                { id: 'getEnergySavingRecommendations', label: 'Get recommendations',               desc: 'AI-powered tips from IBM Granite' },
                { id: 'chatWithEnergyAdvisor',          label: 'Chat with energy advisor',           desc: 'Free-form Q&A powered by IBM Granite' },
              ].map(skill => (
                <div key={skill.id} className="flex items-center gap-2.5 py-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-200">{skill.label}</span>
                    <span className="text-xs text-gray-500 ml-2">{skill.desc}</span>
                  </div>
                  <code className="text-xs text-purple-400 font-mono flex-shrink-0 hidden sm:block">{skill.id}</code>
                </div>
              ))}
            </div>

            {/* Import instructions */}
            <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-3 text-xs text-gray-400 leading-relaxed mb-4">
              <strong className="text-gray-200 block mb-2">How to connect to watsonx Orchestrate:</strong>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Open <strong className="text-gray-300">watsonx Orchestrate</strong> → Skills → Import skill</li>
                <li>Choose <strong className="text-gray-300">From OpenAPI file</strong></li>
                <li>Upload <code className="bg-gray-800 px-1 rounded text-purple-300">wattwise-orchestrate-skill.json</code> from the project root, or use the live URL below</li>
                <li>Set authentication: <strong className="text-gray-300">API Key</strong> header <code className="bg-gray-800 px-1 rounded text-purple-300">X-API-Key</code> → value of <code className="bg-gray-800 px-1 rounded text-purple-300">ORCHESTRATE_API_KEY</code> in your <code className="bg-gray-800 px-1 rounded text-purple-300">.env</code></li>
                <li>Add the imported skills to your Orchestrate agent's tool list</li>
              </ol>
            </div>

            {/* Live skill spec links */}
            <div className="flex flex-wrap gap-2">
              <a
                href="/orchestrate-skill.json"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-1.5 transition-colors"
              >
                <ExternalLink size={11} />
                Live skill spec (JSON)
              </a>
              <a
                href="/orchestrate-skill.json"
                download="wattwise-orchestrate-skill.json"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Download size={11} />
                Download skill file
              </a>
              <a
                href="http://localhost:8000/docs#/watsonx%20Orchestrate%20Skills"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
              >
                <ExternalLink size={11} />
                Swagger UI (skill endpoints)
              </a>
            </div>
          </Card>

          <Button type="submit" disabled={updateMut.isPending} size="lg">
            {updateMut.isPending ? <Spinner size={14} /> : <Save size={14} />}
            Save Settings
          </Button>
        </form>
      </div>
    </div>
  )
}
