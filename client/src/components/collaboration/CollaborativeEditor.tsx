'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { debounce } from 'lodash';

interface CollaborativeEditorProps {
  contentId: string;
  initialContent: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

interface ContentUpdate {
  userId: string;
  changes: {
    content: string;
    cursor?: { line: number; column: number };
  };
  version: number;
}

export default function CollaborativeEditor({
  contentId,
  initialContent,
  onChange,
  placeholder = 'Start typing...'
}: CollaborativeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [version, setVersion] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUsersCursors, setOtherUsersCursors] = useState<Map<string, { email: string; position: number }>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    
    if (socket) {
      // Listen for content updates from other users
      socket.on('content-update', (update: ContentUpdate) => {
        setContent(update.changes.content);
        setVersion(update.version);
        
        if (onChange) {
          onChange(update.changes.content);
        }
      });

      // Listen for cursor positions
      socket.on('cursor-position', (data: { userId: string; email: string; line: number; column: number }) => {
        // Convert line/column to character position
        const lines = content.split('\n');
        let position = 0;
        for (let i = 0; i < data.line && i < lines.length; i++) {
          position += lines[i].length + 1; // +1 for newline
        }
        position += data.column;

        setOtherUsersCursors(prev => {
          const next = new Map(prev);
          next.set(data.userId, { email: data.email, position });
          return next;
        });
      });

      return () => {
        socket.off('content-update');
        socket.off('cursor-position');
      };
    }
  }, [content, onChange]);

  // Debounced function to emit content changes
  const emitContentChange = useCallback(
    debounce((newContent: string, newVersion: number) => {
      const socket = socketRef.current;
      if (socket) {
        socket.emit('content-change', {
          contentId,
          changes: { content: newContent },
          version: newVersion
        });
      }
    }, 500),
    [contentId]
  );

  // Debounced function to emit cursor position
  const emitCursorPosition = useCallback(
    debounce((position: number) => {
      const socket = socketRef.current;
      if (socket && textareaRef.current) {
        const text = textareaRef.current.value;
        const lines = text.substring(0, position).split('\n');
        const line = lines.length - 1;
        const column = lines[lines.length - 1].length;

        socket.emit('cursor-update', {
          contentId,
          line,
          column
        });
      }
    }, 100),
    [contentId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newVersion = version + 1;
    
    setContent(newContent);
    setVersion(newVersion);
    setIsTyping(true);

    if (onChange) {
      onChange(newContent);
    }

    // Emit changes to other users
    emitContentChange(newContent, newVersion);

    // Clear typing indicator after a delay
    setTimeout(() => setIsTyping(false), 1000);
  };

  const handleSelectionChange = () => {
    if (textareaRef.current) {
      const position = textareaRef.current.selectionStart;
      emitCursorPosition(position);
    }
  };

  const renderCursorIndicators = () => {
    if (otherUsersCursors.size === 0) return null;

    return (
      <div className="absolute top-2 right-2 space-y-1">
        {Array.from(otherUsersCursors.entries()).map(([userId, { email }]) => (
          <div
            key={userId}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
          >
            {email.split('@')[0]} is editing
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative h-full">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onSelect={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onClick={handleSelectionChange}
        placeholder={placeholder}
        className="w-full h-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        style={{ minHeight: '400px' }}
      />
      
      {renderCursorIndicators()}
      
      {isTyping && (
        <div className="absolute bottom-2 left-2 text-xs text-gray-500">
          Saving...
        </div>
      )}
      
      <div className="absolute bottom-2 right-2 text-xs text-gray-500">
        Version {version}
      </div>
    </div>
  );
}