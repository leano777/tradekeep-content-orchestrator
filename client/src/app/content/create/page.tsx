'use client';

import { useAuth } from '@/hooks/useAuth';
import { EnhancedContentEditor } from '@/components/content/EnhancedContentEditor';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function CreateContentPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner size="lg" className="min-h-screen" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoginForm />
      </div>
    );
  }

  const handleSave = async (data: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/v1/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save content');
      }

      window.location.href = '/content';
    } catch (error) {
      throw error;
    }
  };

  const handleCancel = () => {
    window.location.href = '/dashboard';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Content</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Build professional content aligned with TradeKeep's brand pillars
          </p>
        </div>

        <EnhancedContentEditor onSave={handleSave} onCancel={handleCancel} />
      </div>
    </DashboardLayout>
  );
}