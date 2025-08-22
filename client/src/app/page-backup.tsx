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
      const response = await fetch('http://localhost:9000/api/health');
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
      {/* Rest of the component */}
    </div>
  );
}