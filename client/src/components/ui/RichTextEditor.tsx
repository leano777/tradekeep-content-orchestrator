'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Link, List, ListOrdered, 
  Quote, Code, ImageIcon, Type, AlignLeft, AlignCenter, 
  AlignRight, Undo, Redo, Eye, FileText
} from 'lucide-react';
import { Button } from './Button';
import ReactMarkdown from 'react-markdown';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  showPreview?: boolean;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Start writing...",
  className = "",
  minHeight = 300,
  showPreview = true
}: RichTextEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002'}/api/v1/content-templates`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (response.ok) {
        const result = await response.json();
        setTemplates(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      // Fallback to hardcoded templates
      setTemplates(getDefaultTemplates());
    }
  };

  const getDefaultTemplates = () => [
    {
      name: "Blog Post Template",
      content: `# Your Blog Post Title

## Introduction
Start with a compelling introduction that hooks your reader...

## Main Points
- Key point 1
- Key point 2  
- Key point 3

## Conclusion
Wrap up with a strong conclusion that reinforces your main message...

---
*Call to action: What do you want readers to do next?*`
    },
    {
      name: "Social Media Post",
      content: `🚀 **Key Message Here**

Quick engaging hook to grab attention...

✨ Main value points:
• Point 1
• Point 2
• Point 3

💡 **Takeaway:** One liner that summarizes the value

#hashtag #relevant #tags`
    },
    {
      name: "LinkedIn Article",
      content: `# Professional Headline That Gets Attention

**The challenge:** Describe the problem your audience faces...

**The insight:** Share your unique perspective or solution...

**The action:** What specific steps can readers take?

---
*What's your experience with this? Share in the comments below.*`
    },
    {
      name: "Email Newsletter",
      content: `# Week in Review 📧

Hey [Name],

Hope you're having a great week! Here's what caught our attention...

## 🔥 This Week's Highlight
Brief description of the main topic...

## 📚 Quick Reads
- [Article Title](link) - Brief description
- [Article Title](link) - Brief description

## 💡 Thought of the Week
A quick insight or reflection...

---
*Reply and let us know what you thought of this week's content!*

Best,
Your Name`
    }
  ];

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);

    // Set cursor position
    setTimeout(() => {
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const formatButtons = [
    { icon: Bold, action: () => insertText('**', '**'), title: 'Bold' },
    { icon: Italic, action: () => insertText('*', '*'), title: 'Italic' },
    { icon: Underline, action: () => insertText('<u>', '</u>'), title: 'Underline' },
    { icon: Quote, action: () => insertText('> '), title: 'Quote' },
    { icon: Code, action: () => insertText('`', '`'), title: 'Code' },
    { icon: Link, action: () => insertText('[', '](url)'), title: 'Link' },
    { icon: List, action: () => insertText('- '), title: 'Bullet List' },
    { icon: ListOrdered, action: () => insertText('1. '), title: 'Numbered List' },
    { icon: ImageIcon, action: () => insertText('![alt text](', ')'), title: 'Image' }
  ];

  const insertTemplate = (template: any) => {
    onChange(template.content);
    setShowTemplates(false);
  };

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 bg-gray-50 rounded-t-lg">
        <div className="flex flex-wrap items-center gap-1">
          {/* Formatting buttons */}
          {formatButtons.map((button, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={button.action}
              title={button.title}
              className="h-8 w-8 p-0"
            >
              <button.icon size={16} />
            </Button>
          ))}
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          {/* Heading buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('# ')}
            title="Heading 1"
            className="text-xs px-2 h-8"
          >
            H1
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('## ')}
            title="Heading 2"
            className="text-xs px-2 h-8"
          >
            H2
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertText('### ')}
            title="Heading 3"
            className="text-xs px-2 h-8"
          >
            H3
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Templates button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
            title="Templates"
            className="flex items-center gap-1 h-8 px-2"
          >
            <FileText size={16} />
            Templates
          </Button>

          {/* Preview toggle */}
          {showPreview && (
            <>
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <Button
                variant={isPreviewMode ? "primary" : "ghost"}
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                title="Preview"
                className="flex items-center gap-1 h-8 px-2"
              >
                <Eye size={16} />
                Preview
              </Button>
            </>
          )}
        </div>

        {/* Templates dropdown */}
        {showTemplates && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-h-64 overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Content Templates</h4>
            <div className="space-y-1">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => insertTemplate(template)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Editor/Preview Area */}
      <div className="relative">
        {isPreviewMode ? (
          <div 
            className="p-4 prose prose-sm max-w-none overflow-y-auto"
            style={{ minHeight: `${minHeight}px` }}
          >
            <ReactMarkdown>{value || '*No content to preview*'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-4 border-0 resize-none focus:outline-none focus:ring-0"
            style={{ minHeight: `${minHeight}px` }}
          />
        )}
      </div>

      {/* Footer with character count */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 rounded-b-lg">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{value.length} characters</span>
          <span>{value.split(/\s+/).filter(word => word.length > 0).length} words</span>
        </div>
      </div>
    </div>
  );
}