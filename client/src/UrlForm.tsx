import { useState } from 'react'
import ScoreCard from './components/ScoreCard'
import ProblemsList from './components/ProblemsList'
import { clsTone, lcpTone, scoreTone } from './rating'
import type { AuditResult } from './types'

export default function UrlForm() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AuditResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    const cleaned = url.trim()
    const fullUrl = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`

    setLoading(true)
    try {
      const res = await fetch('http://localhost:3000/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-blue-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>

      {loading && (
        <p className="mt-4 text-sm text-slate-500">
          Running the audit, this can take up to 30 seconds...
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {result && (
        <section className="mt-8 space-y-8">
          <div>
            <p className="mb-3 break-all text-sm text-slate-500">
              Mobile results for {result.url}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <ScoreCard
                label="Performance score"
                value={`${result.score} / 100`}
                tone={scoreTone(result.score)}
              />
              <ScoreCard
                label="LCP (loading)"
                value={result.lcp}
                hint="Good: 2.5 s or less"
                tone={lcpTone(result.lcp)}
              />
              <ScoreCard
                label="CLS (stability)"
                value={result.cls}
                hint="Good: 0.1 or less"
                tone={clsTone(result.cls)}
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ScoreCard
                label="Page weight"
                value={result.pageWeightMb !== null ? `${result.pageWeightMb} MB` : 'n/a'}
              />
              <ScoreCard
                label="Network requests"
                value={result.requests !== null ? String(result.requests) : 'n/a'}
              />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Top problems to fix</h2>
            <ProblemsList problems={result.problems} />
          </div>
        </section>
      )}
    </div>
  )
}