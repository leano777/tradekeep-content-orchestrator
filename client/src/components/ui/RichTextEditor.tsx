'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  NumberedListIcon,
  LinkIcon,
  PhotoIcon,
  CodeBracketIcon,
  QuoteIcon,
  HashtagIcon as H1Icon,
  HashtagIcon as H2Icon,
  Bars3BottomLeftIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { clsx } from 'clsx';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onAssetLink?: () => void;
  className?: string;
  minHeight?: number;
}

interface FormatButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  command: string;
  value?: string;
}

const FORMAT_BUTTONS: FormatButton[] = [
  { icon: BoldIcon, label: 'Bold', command: 'bold' },
  { icon: ItalicIcon, label: 'Italic', command: 'italic' },
  { icon: UnderlineIcon, label: 'Underline', command: 'underline' },
];

const STRUCTURE_BUTTONS: FormatButton[] = [
  { icon: H1Icon, label: 'Heading 1', command: 'formatBlock', value: 'h1' },
  { icon: H2Icon, label: 'Heading 2', command: 'formatBlock', value: 'h2' },
  { icon: Bars3BottomLeftIcon, label: 'Paragraph', command: 'formatBlock', value: 'p' },
  { icon: ListBulletIcon, label: 'Bullet List', command: 'insertUnorderedList' },
  { icon: NumberedListIcon, label: 'Numbered List', command: 'insertOrderedList' },
  { icon: QuoteIcon, label: 'Quote', command: 'formatBlock', value: 'blockquote' },
  { icon: CodeBracketIcon, label: 'Code Block', command: 'formatBlock', value: 'pre' },
];

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Start writing...', 
  onAssetLink,
  className,
  minHeight = 300
}: RichTextEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState<{ [key: string]: boolean }>({});

  // Convert markdown-like syntax to HTML for preview
  const renderPreview = useCallback((text: string) => {
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" class="text-tk-blue-400 hover:text-tk-blue-300">$1</a>')
      // Line breaks
      .replace(/\n/gim, '<br>');

    return html;
  }, []);

  // Handle editor content changes
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  }, [onChange]);

  // Execute formatting command
  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleContentChange();
    updateActiveStates();
  }, [handleContentChange]);

  // Update active formatting states
  const updateActiveStates = useCallback(() => {
    const newActiveStates: { [key: string]: boolean } = {};
    
    FORMAT_BUTTONS.forEach(button => {
      newActiveStates[button.command] = document.queryCommandState(button.command);
    });
    
    STRUCTURE_BUTTONS.forEach(button => {
      if (button.value) {
        newActiveStates[`${button.command}-${button.value}`] = document.queryCommandValue(button.command) === button.value;
      } else {
        newActiveStates[button.command] = document.queryCommandState(button.command);
      }
    });
    
    setIsActive(newActiveStates);
  }, []);

  // Handle selection change to update active states
  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveStates();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateActiveStates]);

  // Handle link insertion
  const handleInsertLink = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setLinkText(selection.toString());
    }
    setShowLinkDialog(true);
  };

  const insertLink = () => {
    if (linkUrl) {
      if (linkText) {
        // Insert link with custom text
        const linkHtml = `<a href="${linkUrl}" class="text-tk-blue-400 hover:text-tk-blue-300">${linkText}</a>`;
        document.execCommand('insertHTML', false, linkHtml);
      } else {
        // Use selected text for link
        document.execCommand('createLink', false, linkUrl);
      }
    }
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
    handleContentChange();
  };

  // Handle asset link insertion
  const handleAssetLinkInsert = (assetInfo: { name: string; url: string; type: string }) => {
    let assetHtml = '';
    
    if (assetInfo.type.startsWith('image')) {
      assetHtml = `<img src="${assetInfo.url}" alt="${assetInfo.name}" class="max-w-full h-auto rounded-lg my-4" />`;
    } else {
      assetHtml = `<a href="${assetInfo.url}" class="inline-flex items-center text-tk-blue-400 hover:text-tk-blue-300 my-2">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clip-rule="evenodd"></path>
        </svg>
        ${assetInfo.name}
      </a>`;
    }
    
    document.execCommand('insertHTML', false, assetHtml);
    handleContentChange();
  };

  return (
    <div className={`border border-tk-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="bg-tk-gray-800 border-b border-tk-gray-700 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* Mode Toggle */}
            <div className="flex mr-4">
              <button
                onClick={() => setMode('write')}
                className={clsx(
                  'px-3 py-1 text-xs rounded-l border transition-colors',
                  mode === 'write'
                    ? 'bg-tk-blue-600 text-white border-tk-blue-600'
                    : 'text-tk-gray-400 border-tk-gray-600 hover:bg-tk-gray-700'
                )}
              >
                <PencilIcon className="w-3 h-3 mr-1 inline" />
                Write
              </button>
              <button
                onClick={() => setMode('preview')}
                className={clsx(
                  'px-3 py-1 text-xs rounded-r border-l-0 border transition-colors',
                  mode === 'preview'
                    ? 'bg-tk-blue-600 text-white border-tk-blue-600'
                    : 'text-tk-gray-400 border-tk-gray-600 hover:bg-tk-gray-700'
                )}
              >
                <EyeIcon className="w-3 h-3 mr-1 inline" />
                Preview
              </button>
            </div>

            {mode === 'write' && (
              <>
                {/* Text Formatting */}
                <div className="flex items-center space-x-1 border-r border-tk-gray-700 pr-2 mr-2">
                  {FORMAT_BUTTONS.map((button) => (
                    <button
                      key={button.command}
                      onClick={() => executeCommand(button.command, button.value)}
                      className={clsx(
                        'p-1.5 rounded text-tk-gray-400 hover:text-white hover:bg-tk-gray-700 transition-colors',
                        isActive[button.command] && 'bg-tk-blue-600 text-white'
                      )}
                      title={button.label}
                    >
                      <button.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                {/* Structure Formatting */}
                <div className="flex items-center space-x-1 border-r border-tk-gray-700 pr-2 mr-2">
                  {STRUCTURE_BUTTONS.map((button) => {
                    const key = button.value ? `${button.command}-${button.value}` : button.command;
                    return (
                      <button
                        key={key}
                        onClick={() => executeCommand(button.command, button.value)}
                        className={clsx(
                          'p-1.5 rounded text-tk-gray-400 hover:text-white hover:bg-tk-gray-700 transition-colors',
                          isActive[key] && 'bg-tk-blue-600 text-white'
                        )}
                        title={button.label}
                      >
                        <button.icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>

                {/* Insert Tools */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleInsertLink}
                    className="p-1.5 rounded text-tk-gray-400 hover:text-white hover:bg-tk-gray-700 transition-colors"
                    title="Insert Link"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  {onAssetLink && (
                    <button
                      onClick={onAssetLink}
                      className="p-1.5 rounded text-tk-gray-400 hover:text-white hover:bg-tk-gray-700 transition-colors"
                      title="Insert Asset"
                    >
                      <PhotoIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Word Count (approximate) */}
          <div className="text-xs text-tk-gray-500">
            ~{value.replace(/<[^>]*>/g, '').split(/\s+/).length} words
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        {mode === 'write' ? (
          <div
            ref={editorRef}
            contentEditable
            className="p-4 text-white bg-tk-gray-900 outline-none min-h-[300px] prose prose-invert max-w-none"
            style={{ minHeight }}
            onInput={handleContentChange}
            dangerouslySetInnerHTML={{ __html: value }}
            data-placeholder={placeholder}
          />
        ) : (
          <div
            className="p-4 text-white bg-tk-gray-900 min-h-[300px] prose prose-invert max-w-none"
            style={{ minHeight }}
            dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
          />
        )}

        {/* Placeholder for empty editor */}
        {!value && mode === 'write' && (
          <div className="absolute top-4 left-4 text-tk-gray-500 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-tk-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Insert Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tk-gray-300 mb-1">
                  URL
                </label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-tk-gray-300 mb-1">
                  Link Text (optional)
                </label>
                <Input
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link description"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={insertLink} disabled={!linkUrl}>
                Insert Link
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: #6b7280;
        }
        
        .prose h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 1em 0 0.5em 0;
        }
        
        .prose h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 1em 0 0.5em 0;
        }
        
        .prose h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 1em 0 0.5em 0;
        }
        
        .prose p {
          margin: 0.75em 0;
        }
        
        .prose ul, .prose ol {
          margin: 1em 0;
          padding-left: 2em;
        }
        
        .prose blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          color: #d1d5db;
        }
        
        .prose pre {
          background-color: #1f2937;
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin: 1em 0;
        }
        
        .prose code {
          background-color: #374151;
          padding: 0.25em 0.5em;
          border-radius: 0.25em;
          font-family: 'Courier New', monospace;
        }
        
        .prose a {
          color: #60a5fa;
          text-decoration: underline;
        }
        
        .prose a:hover {
          color: #93c5fd;
        }
      `}</style>
    </div>
  );
}