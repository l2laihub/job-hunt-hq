import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApplicationStore, toast } from '@/src/stores';
import { researchCompany } from '@/src/services/gemini';
import { Button, Input, Card, CardHeader, CardContent, Badge } from '@/src/components/ui';
import { ResearchEmptyState } from '@/src/components/shared';
import { cn } from '@/src/lib/utils';
import type { CompanyResearch } from '@/src/types';
import {
  Globe,
  Search,
  Building,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Newspaper,
  Code,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export const ResearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const applications = useApplicationStore((s) => s.applications);
  const setResearch = useApplicationStore((s) => s.setResearch);

  const [companyName, setCompanyName] = useState('');
  const [roleContext, setRoleContext] = useState('');
  const [research, setResearch_] = useState<CompanyResearch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [linkedAppId, setLinkedAppId] = useState<string | null>(null);

  // Pre-fill from URL params or linked application
  useEffect(() => {
    const company = searchParams.get('company');
    const appId = searchParams.get('appId');

    if (company) {
      setCompanyName(company);
    }

    if (appId) {
      const app = applications.find((a) => a.id === appId);
      if (app) {
        setLinkedAppId(appId);
        setCompanyName(app.company);
        setRoleContext(app.role);
        if (app.companyResearch) {
          setResearch_(app.companyResearch);
        }
      }
    }
  }, [searchParams, applications]);

  const handleResearch = async () => {
    if (!companyName.trim()) {
      toast.error('Missing company name', 'Please enter a company name to research');
      return;
    }

    setIsLoading(true);
    try {
      const result = await researchCompany(companyName, roleContext || undefined);
      setResearch_(result);

      // If linked to an application, save the research
      if (linkedAppId) {
        setResearch(linkedAppId, result);
        toast.success('Research saved', 'Company research linked to application');
      } else {
        toast.success('Research complete', `Found intel on ${companyName}`);
      }
    } catch (error) {
      console.error('Research failed:', error);
      toast.error('Research failed', 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setCompanyName('');
    setRoleContext('');
    setResearch_(null);
    setLinkedAppId(null);
  };

  const getVerdictColor = (verdict: 'green' | 'yellow' | 'red') => {
    switch (verdict) {
      case 'green':
        return 'bg-green-900/30 border-green-700 text-green-300';
      case 'yellow':
        return 'bg-yellow-900/30 border-yellow-700 text-yellow-300';
      case 'red':
        return 'bg-red-900/30 border-red-700 text-red-300';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-500" />
            Company Research
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Get AI-powered company intel using web search for interview preparation
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Stripe, Notion, Figma"
                  leftIcon={<Building className="w-4 h-4" />}
                />
              </div>
              <div className="flex-1">
                <Input
                  label="Role Context (Optional)"
                  value={roleContext}
                  onChange={(e) => setRoleContext(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="primary"
                  onClick={handleResearch}
                  disabled={!companyName.trim() || isLoading}
                  isLoading={isLoading}
                  leftIcon={<Search className="w-4 h-4" />}
                >
                  Research
                </Button>
                {(research || companyName) && (
                  <Button variant="ghost" onClick={handleClear}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {research ? (
          <div className="space-y-6">
            {/* Verdict Banner */}
            <div
              className={cn(
                'p-4 rounded-xl border',
                getVerdictColor(research.verdict.overall)
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{research.companyName}</h3>
                  <p className="text-sm opacity-80 mt-1">{research.verdict.summary}</p>
                </div>
                <Badge
                  variant={
                    research.verdict.overall === 'green'
                      ? 'success'
                      : research.verdict.overall === 'yellow'
                      ? 'warning'
                      : 'danger'
                  }
                  size="lg"
                >
                  {research.verdict.overall.toUpperCase()}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {research.verdict.topPositive && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span>{research.verdict.topPositive}</span>
                  </div>
                )}
                {research.verdict.topConcern && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                    <span>{research.verdict.topConcern}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Overview */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Building className="w-4 h-4" /> Company Overview
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-gray-300 mb-4">{research.overview.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Industry</span>
                    <span className="text-white">{research.overview.industry}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Size</span>
                    <span className="text-white">{research.overview.size}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Founded</span>
                    <span className="text-white">{research.overview.founded}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">HQ</span>
                    <span className="text-white">{research.overview.headquarters}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Funding</span>
                    <span className="text-white">{research.overview.fundingStatus}</span>
                  </div>
                  {research.overview.lastFunding && (
                    <div>
                      <span className="text-gray-500 block">Last Round</span>
                      <span className="text-white">{research.overview.lastFunding}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Engineering Culture */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Code className="w-4 h-4" /> Engineering Culture
                </h3>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {research.engineeringCulture.knownStack.map((tech) => (
                    <Badge key={tech} variant="default" size="sm">
                      {tech}
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {research.engineeringCulture.teamSize && (
                    <div>
                      <span className="text-gray-500 block">Team Size</span>
                      <span className="text-white">{research.engineeringCulture.teamSize}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 block">Remote Policy</span>
                    <span className="text-white capitalize">
                      {research.engineeringCulture.remotePolicy}
                    </span>
                  </div>
                  {research.engineeringCulture.techBlog && (
                    <div>
                      <span className="text-gray-500 block">Tech Blog</span>
                      <a
                        href={research.engineeringCulture.techBlog}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {research.engineeringCulture.openSource && (
                    <div>
                      <span className="text-gray-500 block">Open Source</span>
                      <a
                        href={research.engineeringCulture.openSource}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        GitHub <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
                {research.engineeringCulture.notes && (
                  <p className="text-sm text-gray-400 italic">
                    {research.engineeringCulture.notes}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent News */}
            {research.recentNews.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Newspaper className="w-4 h-4" /> Recent News
                  </h3>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {research.recentNews.map((news, i) => (
                      <div
                        key={i}
                        className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-white text-sm">{news.headline}</h4>
                          <Badge
                            variant={
                              news.sentiment === 'positive'
                                ? 'success'
                                : news.sentiment === 'negative'
                                ? 'danger'
                                : 'default'
                            }
                            size="sm"
                          >
                            {news.sentiment}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{news.summary}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>{news.source}</span>
                          <span>•</span>
                          <span>{news.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Flags */}
            <div className="grid md:grid-cols-2 gap-4">
              {research.greenFlags.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-green-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Green Flags
                    </h3>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    {research.greenFlags.map((flag, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-white">{flag.flag}</span>
                        <p className="text-gray-400 text-xs mt-0.5">{flag.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {research.redFlags.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Red Flags
                    </h3>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    {research.redFlags.map((flag, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-white">{flag.flag}</span>
                        <p className="text-gray-400 text-xs mt-0.5">{flag.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Interview Intel */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4" /> Interview Intel
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  {research.interviewIntel.glassdoorRating && (
                    <div>
                      <span className="text-gray-500 block">Glassdoor</span>
                      <span className="text-white">{research.interviewIntel.glassdoorRating}</span>
                    </div>
                  )}
                  {research.interviewIntel.interviewDifficulty && (
                    <div>
                      <span className="text-gray-500 block">Difficulty</span>
                      <span className="text-white">
                        {research.interviewIntel.interviewDifficulty}
                      </span>
                    </div>
                  )}
                  {research.interviewIntel.salaryRange && (
                    <div>
                      <span className="text-gray-500 block">Salary Range</span>
                      <span className="text-white">{research.interviewIntel.salaryRange}</span>
                    </div>
                  )}
                  {research.interviewIntel.employeeSentiment && (
                    <div>
                      <span className="text-gray-500 block">Sentiment</span>
                      <span className="text-white">
                        {research.interviewIntel.employeeSentiment}
                      </span>
                    </div>
                  )}
                </div>
                {research.interviewIntel.commonTopics.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase mb-2 block">
                      Common Interview Topics
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {research.interviewIntel.commonTopics.map((topic) => (
                        <Badge key={topic} variant="info" size="sm">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sources */}
            <div className="text-xs text-gray-500 flex items-center justify-between">
              <span>
                Researched: {new Date(research.searchedAt).toLocaleString()}
              </span>
              <span>Sources: {research.sourcesUsed.join(', ')}</span>
            </div>
          </div>
        ) : (
          <Card className="min-h-[400px] flex items-center justify-center">
            <ResearchEmptyState />
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResearchPage;
