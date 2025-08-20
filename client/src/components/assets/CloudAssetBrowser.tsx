'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Asset } from '@/types';

interface CloudAssetBrowserProps {
  onSelectAsset?: (asset: Asset) => void;
  allowMultiple?: boolean;
}

export function CloudAssetBrowser({ onSelectAsset, allowMultiple = false }: CloudAssetBrowserProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'document'>('all');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:9001/api/v1/cloud-assets', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || asset.type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAssetSelect = (asset: Asset) => {
    if (allowMultiple) {
      const isSelected = selectedAssets.find(a => a.id === asset.id);
      if (isSelected) {
        setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id));
      } else {
        setSelectedAssets([...selectedAssets, asset]);
      }
    } else {
      setSelectedAssets([asset]);
      onSelectAsset?.(asset);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'document':
        return '📄';
      default:
        return '📁';
    }
  };

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'image':
        return 'success';
      case 'video':
        return 'info';
      case 'document':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'image' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('image')}
          >
            Images
          </Button>
          <Button
            variant={filter === 'video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('video')}
          >
            Videos
          </Button>
          <Button
            variant={filter === 'document' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('document')}
          >
            Documents
          </Button>
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No assets found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search terms.' : 'Upload some assets to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const isSelected = selectedAssets.find(a => a.id === asset.id);
            return (
              <Card
                key={asset.id}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:shadow-md'
                }`}
                onClick={() => handleAssetSelect(asset)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-2xl">{getAssetIcon(asset.type)}</div>
                    <Badge variant={getAssetTypeColor(asset.type) as any}>
                      {asset.type}
                    </Badge>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 dark:text-white truncate mb-2">
                    {asset.name}
                  </h4>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                    <div>Size: {formatFileSize(asset.size)}</div>
                    <div>Added: {new Date(asset.createdAt).toLocaleDateString()}</div>
                  </div>
                  
                  {asset.type === 'image' && (
                    <div className="mt-3 aspect-video bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {allowMultiple && selectedAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Assets ({selectedAssets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedAssets.map((asset) => (
                <Badge key={asset.id} variant="info">
                  {asset.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id));
                    }}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}