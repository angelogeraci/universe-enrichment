'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Database, 
  Gauge, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Users,
  FileCheck,
  Zap,
  BarChart3,
  Globe,
  RefreshCw
} from 'lucide-react'

interface PerformanceData {
  projects: {
    total: number
    byStatus: Record<string, number>
    recent: number
    active: number
    paused: number
    activeDetails: Array<{
      id: string
      name: string
      slug: string
      enrichmentStatus: string
      currentCategoryIndex: number
      createdAt: string
      updatedAt: string
      pausedAt: string | null
      _count: { criteres: number }
    }>
    qualityMetrics: {
      totalProjects: number
      withSuggestions: number
      withoutSuggestions: number
      byStatus: Record<string, number>
      avgQualityScore: number
      avgProcessingTime: number
    }
    performanceByCountry: Array<{
      country: string
      _count: { id: number }
      _avg: { currentCategoryIndex: number }
    }>
  }
  interestChecks: {
    total: number
    byStatus: Record<string, number>
    recent: number
    active: number
    paused: number
    activeDetails: Array<{
      id: string
      name: string
      slug: string
      enrichmentStatus: string
      currentInterestIndex: number
      createdAt: string
      updatedAt: string
      pausedAt: string | null
      _count: { interests: number }
    }>
    qualityMetrics: {
      totalInterests: number
      withSuggestions: number
      withoutSuggestions: number
      byStatus: Record<string, number>
      avgQualityScore: number
      avgProcessingTime: number
    }
    performanceByCountry: Array<{
      country: string
      _count: { id: number }
      _avg: { currentInterestIndex: number }
    }>
  }
  facebookApi: {
    cache: {
      totalEntries: number
      byCountry: Record<string, number>
      hitsToday: number
      hitRate: number
    }
    usage: {
      projects: {
        active: number
        estimated_requests_per_hour: number
      }
      interestChecks: {
        active: number
        estimated_requests_per_hour: number
      }
    }
    estimatedRequestsPerHour: number
    rateLimitRecommendation: string
    logs: {
      requests24h: number
      errors24h: number
      avgResponseTime: number
    }
  }
  cache: {
    totalEntries: number
    memoryEntries: number
  }
  systemHealth: {
    dbStatus: string
    facebookApiStatus: string
    memoryStatus: string
  }
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/performance')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh toutes les 30s
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string, count: number) => {
    const colors = {
      'done': 'bg-green-100 text-green-800',
      'processing': 'bg-blue-100 text-blue-800',  
      'in_progress': 'bg-blue-100 text-blue-800',
      'pending': 'bg-amber-100 text-amber-800',
      'paused': 'bg-gray-100 text-gray-800',
      'failed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-red-100 text-red-800'
    }
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {count}
      </Badge>
    )
  }

  const getRateLimitColor = (recommendation: string) => {
    switch (recommendation) {
      case 'safe': return 'text-green-600'
      case 'warning': return 'text-amber-600'
      case 'danger': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`
    return `${Math.round(seconds / 3600)}h`
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-lg">Chargement des métriques...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Erreur: {error || 'Données non disponibles'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'projects', label: 'Projets', icon: Users },
    { id: 'interest-checks', label: 'Interest Checks', icon: FileCheck },
    { id: 'facebook-api', label: 'API Facebook', icon: Zap }
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Performance & Monitoring
          </h1>
          <p className="text-gray-600 mt-2">
            Surveillance en temps réel des projets, Interest Checks et API Facebook
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Base de données</CardDescription>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-5 w-5 ${data.systemHealth.dbStatus === 'OK' ? 'text-green-500' : 'text-red-500'}`} />
              <span className="font-semibold">{data.systemHealth.dbStatus}</span>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>API Facebook</CardDescription>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-5 w-5 ${data.systemHealth.facebookApiStatus === 'OK' ? 'text-green-500' : 'text-red-500'}`} />
              <span className="font-semibold">{data.systemHealth.facebookApiStatus}</span>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Mémoire</CardDescription>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-5 w-5 ${data.systemHealth.memoryStatus === 'OK' ? 'text-green-500' : 'text-red-500'}`} />
              <span className="font-semibold">{data.systemHealth.memoryStatus}</span>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* VUE D'ENSEMBLE */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Projets */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Projets totaux</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Users className="h-6 w-6 text-blue-600" />
                    {data.projects.total}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Actifs:</span>
                      <span className="font-semibold text-blue-600">{data.projects.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Récents (7j):</span>
                      <span className="font-semibold">{data.projects.recent}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Interest Checks */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Interest Checks totaux</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <FileCheck className="h-6 w-6 text-green-600" />
                    {data.interestChecks.total}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Actifs:</span>
                      <span className="font-semibold text-green-600">{data.interestChecks.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Récents (7j):</span>
                      <span className="font-semibold">{data.interestChecks.recent}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API Usage */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Estimation API/h</CardDescription>
                  <CardTitle className={`text-2xl flex items-center gap-2 ${getRateLimitColor(data.facebookApi.rateLimitRecommendation)}`}>
                    <Zap className="h-6 w-6" />
                    {data.facebookApi.estimatedRequestsPerHour}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={
                    data.facebookApi.rateLimitRecommendation === 'safe' ? 'bg-green-100 text-green-800' :
                    data.facebookApi.rateLimitRecommendation === 'warning' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {data.facebookApi.rateLimitRecommendation === 'safe' ? 'Sécurisé' :
                     data.facebookApi.rateLimitRecommendation === 'warning' ? 'Attention' : 'Danger'}
                  </Badge>
                </CardContent>
              </Card>

              {/* Cache */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Cache Facebook</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Database className="h-6 w-6 text-purple-600" />
                    {data.facebookApi.cache.totalEntries}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Hit rate:</span>
                      <span className="font-semibold">{data.facebookApi.cache.hitRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hits 24h:</span>
                      <span className="font-semibold">{data.facebookApi.cache.hitsToday}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Répartition par pays */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Projets par pays
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.projects.performanceByCountry.slice(0, 5).map((country) => (
                      <div key={country.country} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{country.country}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{country._count.id}</span>
                          <Progress 
                            value={(country._count.id / data.projects.total) * 100} 
                            className="w-20 h-2" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Interest Checks par pays
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.interestChecks.performanceByCountry.slice(0, 5).map((country) => (
                      <div key={country.country} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{country.country}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{country._count.id}</span>
                          <Progress 
                            value={(country._count.id / data.interestChecks.total) * 100} 
                            className="w-20 h-2" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* PROJETS */}
        {activeTab === 'projects' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(data.projects.byStatus).map(([status, count]) => (
                <Card key={status}>
                  <CardHeader className="pb-2">
                    <CardDescription className="capitalize">{status.replace('_', ' ')}</CardDescription>
                    <CardTitle className="text-2xl">{count}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getStatusBadge(status, count)}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Métriques qualité - Projets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {data.projects.qualityMetrics.avgQualityScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Score qualité moyen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatDuration(data.projects.qualityMetrics.avgProcessingTime)}
                    </div>
                    <div className="text-sm text-muted-foreground">Temps traitement moyen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {((data.projects.qualityMetrics.withSuggestions / data.projects.qualityMetrics.totalProjects) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Avec suggestions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Projects */}
            {data.projects.activeDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Projets actifs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.projects.activeDetails.map((project) => (
                      <div key={project.id} className="flex justify-between items-center p-2 rounded border">
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {project.currentCategoryIndex || 0}/{project._count.criteres} critères
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(project.enrichmentStatus, 1)}
                          <Progress 
                            value={((project.currentCategoryIndex || 0) / project._count.criteres) * 100} 
                            className="w-20 h-2" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* INTEREST CHECKS */}
        {activeTab === 'interest-checks' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(data.interestChecks.byStatus).map(([status, count]) => (
                <Card key={status}>
                  <CardHeader className="pb-2">
                    <CardDescription className="capitalize">{status.replace('_', ' ')}</CardDescription>
                    <CardTitle className="text-2xl">{count}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getStatusBadge(status, count)}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Métriques qualité - Interest Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {data.interestChecks.qualityMetrics.avgQualityScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Score qualité moyen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatDuration(data.interestChecks.qualityMetrics.avgProcessingTime)}
                    </div>
                    <div className="text-sm text-muted-foreground">Temps traitement moyen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {((data.interestChecks.qualityMetrics.withSuggestions / data.interestChecks.qualityMetrics.totalInterests) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Avec suggestions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Interest Checks */}
            {data.interestChecks.activeDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Interest Checks actifs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.interestChecks.activeDetails.map((interestCheck) => (
                      <div key={interestCheck.id} className="flex justify-between items-center p-2 rounded border">
                        <div>
                          <div className="font-medium">{interestCheck.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {interestCheck.currentInterestIndex || 0}/{interestCheck._count.interests} intérêts
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(interestCheck.enrichmentStatus, 1)}
                          <Progress 
                            value={((interestCheck.currentInterestIndex || 0) / interestCheck._count.interests) * 100} 
                            className="w-20 h-2" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* API FACEBOOK */}
        {activeTab === 'facebook-api' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Requêtes estimées/h</CardDescription>
                  <CardTitle className={`text-2xl ${getRateLimitColor(data.facebookApi.rateLimitRecommendation)}`}>
                    {data.facebookApi.estimatedRequestsPerHour}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={
                    data.facebookApi.rateLimitRecommendation === 'safe' ? 'bg-green-100 text-green-800' :
                    data.facebookApi.rateLimitRecommendation === 'warning' ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {data.facebookApi.rateLimitRecommendation === 'safe' ? 'Sécurisé' :
                     data.facebookApi.rateLimitRecommendation === 'warning' ? 'Attention' : 'Danger'}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Cache total</CardDescription>
                  <CardTitle className="text-2xl">{data.facebookApi.cache.totalEntries}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Hit rate: {data.facebookApi.cache.hitRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Hits aujourd'hui</CardDescription>
                  <CardTitle className="text-2xl">{data.facebookApi.cache.hitsToday}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Depuis minuit
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Mémoire cache</CardDescription>
                  <CardTitle className="text-2xl">{data.cache.memoryEntries}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Entrées en RAM
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Usage Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Répartition de l'usage API
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="font-medium">Projets</div>
                    <div className="flex justify-between">
                      <span className="text-sm">Actifs:</span>
                      <span className="font-semibold">{data.facebookApi.usage.projects.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Requêtes/h estimées:</span>
                      <span className="font-semibold">{data.facebookApi.usage.projects.estimated_requests_per_hour}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium">Interest Checks</div>
                    <div className="flex justify-between">
                      <span className="text-sm">Actifs:</span>
                      <span className="font-semibold">{data.facebookApi.usage.interestChecks.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Requêtes/h estimées:</span>
                      <span className="font-semibold">{data.facebookApi.usage.interestChecks.estimated_requests_per_hour}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
} 