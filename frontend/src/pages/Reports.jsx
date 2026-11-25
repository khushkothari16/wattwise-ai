import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Sparkles, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { getReports, generateReport, getAnomalies, getRecommendations } from '../services/api'
import { PageHeader, Card, Button, Badge, EmptyState, Spinner } from '../components/ui/index.jsx'
import { monthName, formatKwh, formatCost } from '../utils/formatters'

function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-white">{monthName(report.month)} {report.year}</div>
          <div className="text-xs text-gray-500 mt-0.5">{formatKwh(report.total_kwh)} · {formatCost(report.estimated_cost)}</div>
        </div>
        <Badge color="blue">AI Report</Badge>
      </div>
      {report.ai_summary && (
        <>
          <div className={`text-sm text-gray-300 leading-relaxed whitespace-pre-wrap ${!expanded ? 'line-clamp-3' : ''}`}>
            {report.ai_summary}
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
          >
            {expanded ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />Read more</>}
          </button>
        </>
      )}
    </Card>
  )
}

export default function Reports() {
  const qc = useQueryClient()
  const { data: reports = [], isLoading } = useQuery({ queryKey: ['reports'], queryFn: getReports })
  const { data: anomalyData } = useQuery({ queryKey: ['anomalies'], queryFn: () => getAnomalies(30) })
  const { data: recData, isLoading: loadingRec } = useQuery({ queryKey: ['recommendations'], queryFn: getRecommendations })

  const generateMut = useMutation({
    mutationFn: () => generateReport(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); toast.success('Report generated!') },
    onError: () => toast.error('Failed to generate report'),
  })

  const anomalies = anomalyData?.anomalies || []
  const recommendations = recData?.recommendations_text || ''

  return (
    <div>
      <PageHeader
        title="Reports & Insights"
        subtitle="AI-generated energy analysis powered by IBM Granite"
        action={
          <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
            {generateMut.isPending ? <Spinner size={14} /> : <Sparkles size={14} />}
            Generate Report
          </Button>
        }
      />
      <div className="p-6 space-y-6">

        {/* Recommendations */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={15} className="text-amber-400" />
            <span className="text-sm font-semibold text-white">AI Recommendations</span>
            <Badge color="amber">IBM Granite</Badge>
          </div>
          {loadingRec ? (
            <div className="flex justify-center py-6"><Spinner size={20} /></div>
          ) : recommendations ? (
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{recommendations}</div>
          ) : (
            <EmptyState icon={Lightbulb} title="No recommendations yet" description="Add appliances to get personalized tips." />
          )}
        </Card>

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} className="text-amber-400" />
              <span className="text-sm font-semibold text-white">Recent Anomalies</span>
              <Badge color="amber">{anomalies.length}</Badge>
            </div>
            <div className="space-y-2">
              {anomalies.map((a, i) => (
                <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-300">{a.appliance_name}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{a.log_date}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">{a.reason}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Monthly reports */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Monthly Reports</div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner size={22} /></div>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No reports yet"
              description="Generate your first monthly energy report using IBM Granite."
              action={<Button onClick={() => generateMut.mutate()}><Sparkles size={14} />Generate Report</Button>}
            />
          ) : (
            <div className="space-y-4">
              {reports.map(r => <ReportCard key={r.id} report={r} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
