'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface BrandGuideline {
  id: string;
  name: string;
  category: string;
  content: string;
  isActive: boolean;
}

interface ContentPillar {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  toneGuide: string;
  examples: string[];
}

const TRADING_PILLARS: ContentPillar[] = [
  {
    id: 'internal-os',
    name: 'Internal Operating System',
    description: 'Your trading results are outputs of your internal operating system',
    keywords: ['mindset', 'beliefs', 'habits', 'discipline', 'psychology'],
    toneGuide: 'Empowering, introspective, transformational',
    examples: [
      'Your trading results are outputs of your internal operating system. Upgrade your beliefs, habits, and decision frameworks.',
      'The difference between successful and struggling traders isn\'t strategy - it\'s their internal programming.',
      'Master your mind before you master the markets.'
    ]
  },
  {
    id: 'systems-vs-reactive',
    name: 'Systems vs Reactive Trading',
    description: 'Systematic trading is logical trading vs emotional reactive trading',
    keywords: ['systems', 'process', 'methodology', 'consistency', 'logic'],
    toneGuide: 'Analytical, structured, confident',
    examples: [
      'Reactive trading is emotional trading. Systematic trading is logical trading.',
      'The difference between success and failure often comes down to following a proven system vs reacting to market emotions.',
      'Build systems that work when emotions don\'t.'
    ]
  },
  {
    id: 'discipline-over-dopamine',
    name: 'Discipline Over Dopamine',
    description: 'Choose discipline over the dopamine hit of impulsive trades',
    keywords: ['discipline', 'patience', 'self-control', 'delayed gratification'],
    toneGuide: 'Motivational, challenging, inspiring',
    examples: [
      'The markets will seduce you with quick profits and exciting moves. Choose discipline over dopamine.',
      'Sustainable success comes from choosing boring discipline over exciting impulses.',
      'Build systems that reward patience, not impulses.'
    ]
  }
];

const BRAND_VOICE = {
  tone: 'Professional yet approachable, authoritative without being condescending',
  personality: 'Expert mentor, systematic thinker, results-focused',
  style: 'Clear, actionable, insight-driven',
  avoid: 'Hype, get-rich-quick promises, complex jargon without explanation'
};

const BRAND_COLORS = {
  primary: '#1E40AF', // Blue
  secondary: '#059669', // Green
  accent: '#DC2626', // Red
  neutral: '#374151' // Gray
};

export default function BrandGuidelinesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedPillar, setSelectedPillar] = useState<ContentPillar | null>(null);
  const [contentAnalysis, setContentAnalysis] = useState<{
    text: string;
    score: number;
    suggestions: string[];
    pillarMatch: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const analyzeContent = (text: string) => {
    let score = 70; // Base score
    const suggestions: string[] = [];
    let bestMatch = 'internal-os';
    
    // Check for brand pillar alignment
    const pillarScores = TRADING_PILLARS.map(pillar => {
      const keywordMatches = pillar.keywords.filter(keyword => 
        text.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      return { pillar: pillar.id, name: pillar.name, score: keywordMatches };
    });
    
    const topPillar = pillarScores.reduce((a, b) => a.score > b.score ? a : b);
    bestMatch = topPillar.pillar;
    
    if (topPillar.score === 0) {
      score -= 20;
      suggestions.push('Consider aligning with one of our core trading pillars');
    }
    
    // Check tone and voice
    const hypeWords = ['guaranteed', 'secret', 'amazing', 'incredible', 'revolutionary'];
    const hypeCount = hypeWords.filter(word => text.toLowerCase().includes(word)).length;
    if (hypeCount > 0) {
      score -= 15;
      suggestions.push('Avoid hype words - maintain professional tone');
    }
    
    // Check for actionable content
    const actionWords = ['build', 'create', 'develop', 'practice', 'implement'];
    const actionCount = actionWords.filter(word => text.toLowerCase().includes(word)).length;
    if (actionCount > 0) {
      score += 10;
    } else {
      suggestions.push('Add actionable advice or clear next steps');
    }
    
    // Check length appropriateness
    if (text.length < 50) {
      score -= 10;
      suggestions.push('Content may be too short for meaningful impact');
    }
    
    if (text.length > 500) {
      suggestions.push('Consider breaking into smaller, digestible pieces');
    }
    
    // Check for trader psychology terms
    const psychologyTerms = ['mindset', 'discipline', 'system', 'process', 'emotion'];
    const psychTerms = psychologyTerms.filter(term => text.toLowerCase().includes(term)).length;
    if (psychTerms > 0) {
      score += 5;
    }
    
    setContentAnalysis({
      text,
      score: Math.min(100, Math.max(0, score)),
      suggestions,
      pillarMatch: bestMatch
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                🎨 Brand Guidelines
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Brand Voice & Style */}
            <div className="lg:col-span-2 space-y-6">
              {/* Brand Voice */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Brand Voice & Personality</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Tone</h3>
                      <p className="text-sm text-gray-600">{BRAND_VOICE.tone}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Personality</h3>
                      <p className="text-sm text-gray-600">{BRAND_VOICE.personality}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Style</h3>
                      <p className="text-sm text-gray-600">{BRAND_VOICE.style}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Avoid</h3>
                      <p className="text-sm text-gray-600">{BRAND_VOICE.avoid}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Pillars */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Content Pillars</h2>
                  <p className="text-sm text-gray-500 mt-1">Core themes that guide our content strategy</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TRADING_PILLARS.map((pillar) => (
                      <div
                        key={pillar.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedPillar?.id === pillar.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedPillar(pillar)}
                      >
                        <h3 className="font-medium text-gray-900 mb-2">{pillar.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{pillar.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {pillar.keywords.slice(0, 3).map((keyword) => (
                            <span
                              key={keyword}
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedPillar && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">{selectedPillar.name} - Detailed Guide</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm font-medium text-blue-800">Tone Guide: </span>
                          <span className="text-sm text-blue-700">{selectedPillar.toneGuide}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-blue-800">Keywords: </span>
                          <span className="text-sm text-blue-700">{selectedPillar.keywords.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-blue-800 block mb-1">Examples:</span>
                          <ul className="text-sm text-blue-700 space-y-1 ml-4">
                            {selectedPillar.examples.map((example, idx) => (
                              <li key={idx} className="list-disc">{example}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Analyzer */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Content Brand Analyzer</h2>
                  <p className="text-sm text-gray-500 mt-1">Check if your content aligns with brand guidelines</p>
                </div>
                <div className="p-6">
                  <textarea
                    placeholder="Paste your content here to analyze brand alignment..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => {
                      if (e.target.value.trim()) {
                        analyzeContent(e.target.value);
                      } else {
                        setContentAnalysis(null);
                      }
                    }}
                  />
                  
                  {contentAnalysis && (
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">Brand Alignment Score</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(contentAnalysis.score)}`}>
                          {contentAnalysis.score}/100
                        </span>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-900">Best Pillar Match: </span>
                        <span className="text-blue-600 font-medium">
                          {TRADING_PILLARS.find(p => p.id === contentAnalysis.pillarMatch)?.name}
                        </span>
                      </div>
                      
                      {contentAnalysis.suggestions.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Suggestions for Improvement:</h4>
                          <ul className="space-y-1">
                            {contentAnalysis.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-start">
                                <span className="text-yellow-500 mr-2">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Brand Assets & Colors */}
            <div className="space-y-6">
              {/* Brand Colors */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Brand Colors</h2>
                </div>
                <div className="p-6 space-y-3">
                  {Object.entries(BRAND_COLORS).map(([name, color]) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="capitalize font-medium text-gray-900">{name}</span>
                      </div>
                      <code className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {color}
                      </code>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Reference */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Quick Reference</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">✅ Do's</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Use clear, actionable language</li>
                      <li>• Focus on psychological aspects</li>
                      <li>• Provide systematic approaches</li>
                      <li>• Include real examples</li>
                      <li>• Maintain professional tone</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">❌ Don'ts</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Avoid hype or exaggeration</li>
                      <li>• Don't promise guaranteed results</li>
                      <li>• No get-rich-quick messaging</li>
                      <li>• Avoid complex jargon</li>
                      <li>• Don't be condescending</li>
                    </ul>
                  </div>
                  
                  <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-1">Remember</h4>
                    <p className="text-sm text-blue-700">
                      We're building traders who think systematically and act with discipline. Every piece of content should reinforce this core message.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}