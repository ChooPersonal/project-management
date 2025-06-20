import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Paperclip, X, Image, FileText, Wifi, WifiOff } from 'lucide-react';
import { formatDate, getInitials, formatFileSize } from '@/lib/utils';
import { useTeamMembers } from '@/hooks/use-team-members';
import { useWebSocket } from '@/hooks/use-websocket';

interface CommentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface Comment {
  id: string;
  content: string;
  author: {
    id: number;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  attachments?: CommentAttachment[];
  mentions?: number[];
  replyTo?: string;
  replies?: Comment[];
}

interface CommentsSectionProps {
  projectId: number;
}

export default function CommentsSection({ projectId }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<CommentAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: teamMembers = [] } = useTeamMembers();
  const { isConnected, lastMessage, sendComment, sendTyping } = useWebSocket(projectId);
  
  const [comments, setComments] = useState<Comment[]>([]);

  // Handle real-time WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'comment-added') {
      setComments(prev => [...prev, lastMessage.comment]);
    }

    if (lastMessage.type === 'user-typing') {
      const userName = lastMessage.user?.name;
      if (userName) {
        setTypingUsers(prev => {
          if (!prev.includes(userName)) {
            return [...prev, userName];
          }
          return prev;
        });

        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(name => name !== userName));
        }, 3000);
      }
    }
  }, [lastMessage]);

  // File upload handlers
  const handleFileSelect = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const attachment: CommentAttachment = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file)
      };
      setAttachments(prev => [...prev, attachment]);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  // Mention handling, slash commands, and typing indicators
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setNewComment(value);
    
    // Send typing indicator
    if (value.trim() && isConnected) {
      sendTyping({ name: 'John Doe', id: 1 });
      
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout to stop typing indicator
      const timeout = setTimeout(() => {
        // Typing stopped
      }, 2000);
      setTypingTimeout(timeout);
    }
    
    // Check for slash commands
    const beforeCursor = value.substring(0, cursorPosition);
    const slashMatch = beforeCursor.match(/\/(\w*)$/);
    
    if (slashMatch) {
      setShowSlashCommands(true);
      setShowMentions(false);
    } else {
      setShowSlashCommands(false);
      
      // Check for @ mentions
      const mentionMatch = beforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch) {
        setShowMentions(true);
        setMentionQuery(mentionMatch[1]);
        setMentionPosition(cursorPosition - mentionMatch[1].length - 1);
      } else {
        setShowMentions(false);
        setMentionQuery('');
      }
    }
  };

  const insertMention = (member: any) => {
    const beforeMention = newComment.substring(0, mentionPosition);
    const afterMention = newComment.substring(mentionPosition + mentionQuery.length + 1);
    const newContent = beforeMention + `@${member.fullName} ` + afterMention;
    
    setNewComment(newContent);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredMembers = teamMembers.filter(member => 
    member.fullName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    member.username.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const slashCommands = [
    { command: '/image', description: 'Upload an image', icon: Image },
    { command: '/file', description: 'Upload a file', icon: Paperclip },
  ];

  const handleSlashCommand = (command: string) => {
    if (command === '/image' || command === '/file') {
      fileInputRef.current?.click();
    }
    
    // Remove the slash command from textarea
    const commandLength = command.length;
    const beforeCommand = newComment.substring(0, newComment.lastIndexOf('/'));
    const afterCommand = newComment.substring(newComment.lastIndexOf('/') + commandLength);
    setNewComment(beforeCommand + afterCommand);
    setShowSlashCommands(false);
    textareaRef.current?.focus();
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setNewComment(`@${comment.author.name} `);
    textareaRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  const handleSubmitComment = () => {
    if (!newComment.trim() && attachments.length === 0) return;

    // Extract mentions from comment content
    const mentionMatches = newComment.match(/@(\w+\s*\w*)/g) || [];
    const mentions = mentionMatches.map(mention => {
      const name = mention.substring(1);
      const member = teamMembers.find(m => m.fullName === name);
      return member?.id;
    }).filter(Boolean) as number[];

    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      author: {
        id: 1,
        name: 'John Doe',
        avatar: undefined,
      },
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
      replyTo: replyingTo?.id,
    };

    // Add comment locally first
    setComments(prev => [...prev, comment]);
    
    // Broadcast to other users via WebSocket
    if (isConnected) {
      sendComment(comment);
    }

    setNewComment('');
    setAttachments([]);
    setReplyingTo(null);
    
    // Clear typing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Comments ({comments.length})
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center text-green-600">
                <Wifi className="w-4 h-4 mr-1" />
                <span className="text-xs">Live</span>
              </div>
            ) : (
              <div className="flex items-center text-gray-400">
                <WifiOff className="w-4 h-4 mr-1" />
                <span className="text-xs">Offline</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Comments */}
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={comment.author.avatar} />
                <AvatarFallback className="text-xs">
                  {getInitials(comment.author.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.author.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(comment.createdAt)}
                  </span>
                  {comment.mentions && comment.mentions.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {comment.mentions.length} mention{comment.mentions.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {comment.replyTo && (
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border-l-2 border-blue-200">
                      <span>Replying to {comments.find(c => c.id === comment.replyTo)?.author.name}</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {comment.content.split(/(@\w+\s*\w*)/).map((part, index) => 
                      part.startsWith('@') ? (
                        <Badge key={index} variant="outline" className="text-xs mx-1">
                          {part}
                        </Badge>
                      ) : (
                        <span key={index}>{part}</span>
                      )
                    )}
                  </div>
                </div>
                
                {/* Comment Attachments */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {comment.attachments.map((attachment) => (
                      <div key={attachment.id}>
                        {attachment.type.startsWith('image/') ? (
                          <div className="space-y-2">
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="max-w-sm max-h-64 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => window.open(attachment.url, '_blank')}
                            />
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Image className="w-3 h-3" />
                              <span>{attachment.name}</span>
                              <span>•</span>
                              <span>{formatFileSize(attachment.size)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {attachment.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(attachment.url, '_blank')}
                            >
                              <Paperclip className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Actions */}
                <div className="mt-2 flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReply(comment)}
                    className="text-xs text-gray-500 hover:text-gray-700 h-6 px-2"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 italic">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.length === 1 
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`
              }
            </span>
          </div>
        )}

        {/* Add New Comment */}
        <div className="border-t pt-4">
          <div className="flex space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">JD</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              {/* Reply Indicator */}
              {replyingTo && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">Replying to {replyingTo.author.name}</span>
                    <p className="text-xs text-blue-600 mt-1 truncate max-w-md">
                      {replyingTo.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelReply}
                    className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              <div className="relative">
                <div
                  className={`relative ${
                    isDragOver ? 'border-2 border-dashed border-blue-400 bg-blue-50' : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Textarea
                    ref={textareaRef}
                    placeholder="Add a comment... (Type @ to mention team members)"
                    value={newComment}
                    onChange={handleTextareaChange}
                    className="min-h-[80px] resize-none pr-10"
                  />
                  {isDragOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 border-2 border-dashed border-blue-400 rounded-md">
                      <div className="text-center">
                        <Paperclip className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm text-blue-600 font-medium">Drop files here</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Slash Commands Dropdown */}
                {showSlashCommands && (
                  <div className="absolute z-10 w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {slashCommands.map((cmd) => (
                      <button
                        key={cmd.command}
                        onClick={() => handleSlashCommand(cmd.command)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <cmd.icon className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{cmd.command}</p>
                          <p className="text-xs text-gray-500">{cmd.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Mention Dropdown */}
                {showMentions && filteredMembers.length > 0 && (
                  <div className="absolute z-10 w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredMembers.slice(0, 5).map((member) => (
                      <button
                        key={member.id}
                        onClick={() => insertMention(member)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={member.avatar ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(member.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{member.fullName}</p>
                          <p className="text-xs text-gray-500">@{member.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600 font-medium">Attachments:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="relative">
                        {attachment.type.startsWith('image/') ? (
                          <div className="relative group">
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg"></div>
                            <button
                              onClick={() => removeAttachment(attachment.id)}
                              className="absolute top-2 right-2 w-6 h-6 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 rounded-b-lg">
                              <p className="truncate">{attachment.name}</p>
                              <p className="text-gray-300">{formatFileSize(attachment.size)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg border">
                            <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {attachment.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>
                            <button
                              onClick={() => removeAttachment(attachment.id)}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Paperclip className="w-4 h-4 mr-1" />
                    Attach
                  </Button>
                  <span className="text-xs text-gray-400">
                    or drag and drop files
                  </span>
                </div>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() && attachments.length === 0}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        </div>

        {comments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}