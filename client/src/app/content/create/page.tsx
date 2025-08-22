'use client';

import { useAuth } from '@/hooks/useAuth';
import { EnhancedContentEditor } from '@/components/content/EnhancedContentEditor';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import apiClient from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function CreateContentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
      const result = await apiClient.createContent(data);
      router.push('/content');
      return result;
    } catch (error) {
      console.error('Failed to save content:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
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