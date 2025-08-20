'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { getSocket } from '@/lib/socket';

interface Comment {
  id: string;
  text: string;
  userId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  parentId?: string;
  replies?: Comment[];
  createdAt: string;
}

interface CommentsPanelProps {
  contentId: string;
}

export default function CommentsPanel({ contentId }: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();

    const socket = getSocket();
    if (socket) {
      socket.on('new-comment', (comment: Comment) => {
        if (comment.parentId) {
          setComments(prev => updateReplies(prev, comment.parentId!, comment));
        } else {
          setComments(prev => [...prev, comment]);
        }
      });

      return () => {
        socket.off('new-comment');
      };
    }
  }, [contentId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/v1/content/${contentId}/comments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const updateReplies = (comments: Comment[], parentId: string, newReply: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply]
        };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateReplies(comment.replies, parentId, newReply)
        };
      }
      return comment;
    });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    const socket = getSocket();
    
    if (socket) {
      // Extract mentions
      const mentions = extractMentions(newComment);
      
      socket.emit('add-comment', {
        contentId,
        text: newComment,
        mentions
      });

      setNewComment('');
    }
    setLoading(false);
  };

  const handleAddReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    setLoading(true);
    const socket = getSocket();
    
    if (socket) {
      const mentions = extractMentions(replyText);
      
      socket.emit('add-comment', {
        contentId,
        text: replyText,
        parentId,
        mentions
      });

      setReplyText('');
      setReplyingTo(null);
    }
    setLoading(false);
  };

  const extractMentions = (text: string): string[] => {
    const mentionPattern = /@(\w+)/g;
    const matches = text.match(mentionPattern);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  const renderComment = (comment: Comment, depth = 0) => (
    <div key={comment.id} className={`${depth > 0 ? 'ml-8' : ''} mb-4`}>
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-sm">{comment.user.name || comment.user.email}</span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-gray-800 whitespace-pre-wrap">{comment.text}</p>
          </div>
        </div>
        
        <div className="mt-3 flex items-center gap-4">
          <button
            onClick={() => setReplyingTo(comment.id)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Reply
          </button>
        </div>

        {replyingTo === comment.id && (
          <div className="mt-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="w-full p-2 border border-gray-300 rounded-lg resize-none"
              rows={2}
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => handleAddReply(comment.id)}
                disabled={loading || !replyText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Post Reply
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map(reply => renderComment(reply, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Comments</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
        ) : (
          comments.filter(c => !c.parentId).map(comment => renderComment(comment))
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment... Use @username to mention someone"
          className="w-full p-3 border border-gray-300 rounded-lg resize-none"
          rows={3}
        />
        <div className="mt-2">
          <button
            onClick={handleAddComment}
            disabled={loading || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Post Comment
          </button>
        </div>
      </div>
    </div>
  );
}