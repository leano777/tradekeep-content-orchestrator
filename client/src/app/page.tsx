'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      window.location.href = '/dashboard';
    }
  }, [user]);

  const checkAPI = async () => {
    try {
      const response = await fetch('http://localhost:9001/health');
      const data = await response.json();
      setApiStatus(`Connected - ${data.status}`);
    } catch (error) {
      setApiStatus('API Not Available');
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">
              🚀 TradeKeep Content Orchestrator
            </h1>
            <button 
              onClick={checkAPI}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Check API Status
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">API Status: {apiStatus}</p>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome to Your Content Hub
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Professional content management system for TradeKeep's brand strategy
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create Content Card */}
            <Link href="/content/create">
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-gray-750 transition cursor-pointer transform hover:scale-105">
                <div className="text-4xl mb-3">✍️</div>
                <h2 className="text-xl font-semibold text-white mb-2">Create Content</h2>
                <p className="text-gray-400">Build professional content for your brand</p>
                <button className="mt-4 text-blue-400 hover:text-blue-300">
                  Start Creating →
                </button>
              </div>
            </Link>
            
            {/* Manage Assets Card */}
            <Link href="/assets">
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-green-500 hover:bg-gray-750 transition cursor-pointer transform hover:scale-105">
                <div className="text-4xl mb-3">📁</div>
                <h2 className="text-xl font-semibold text-white mb-2">Manage Assets</h2>
                <p className="text-gray-400">Connect cloud storage for seamless management</p>
                <button className="mt-4 text-green-400 hover:text-green-300">
                  Browse Assets →
                </button>
              </div>
            </Link>
            
            {/* View Analytics Card */}
            <Link href="/analytics">
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500 hover:bg-gray-750 transition cursor-pointer transform hover:scale-105">
                <div className="text-4xl mb-3">📊</div>
                <h2 className="text-xl font-semibold text-white mb-2">View Analytics</h2>
                <p className="text-gray-400">Track performance and engagement metrics</p>
                <button className="mt-4 text-purple-400 hover:text-purple-300">
                  View Dashboard →
                </button>
              </div>
            </Link>
          </div>

          {/* Quick Actions Section */}
          <div className="mt-12 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/content/create">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                  + New Content
                </button>
              </Link>
              <Link href="/campaigns">
                <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
                  📅 Campaigns
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">
                  📊 Dashboard
                </button>
              </Link>
              <button 
                onClick={() => alert('Settings page coming soon!')}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
              >
                ⚙️ Settings
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">System Status</span>
              <div className="flex gap-4">
                <span className="text-green-400">✓ Frontend Active</span>
                <span className="text-yellow-400">⚡ Development Mode</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}