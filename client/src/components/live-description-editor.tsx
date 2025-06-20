import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Image, Paperclip, Save, Eye, Edit3, X, Bold, Italic, Palette, Type, AtSign } from 'lucide-react';
import { useUpdateProject } from '@/hooks/use-projects';
import { useUploadFiles, useTeamMembers } from '@/hooks/use-team-members';
import { toast } from '@/hooks/use-toast';



interface LiveDescriptionEditorProps {
  projectId: number;
  description: any;
  onUpdate?: (description: any) => void;
}

export default function LiveDescriptionEditor({ 
  projectId, 
  description, 
  onUpdate 
}: LiveDescriptionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [content, setContent] = useState(() => {
    if (typeof description === 'string') {
      return description;
    }
    if (description && description.content) {
      // Extract text from rich text object
      const extractText = (node: any): string => {
        if (node.type === 'text') {
          return node.text || '';
        }
        if (node.type === 'image') {
          return `![${node.attrs?.alt || 'image'}](${node.attrs?.src || ''})`;
        }
        if (node.content && Array.isArray(node.content)) {
          return node.content.map(extractText).join('');
        }
        return '';
      };
      
      const extractedContent = description.content.map((node: any) => {
        if (node.type === 'heading') {
          const level = '#'.repeat(node.attrs?.level || 1);
          return `${level} ${extractText(node)}`;
        }
        if (node.type === 'paragraph') {
          return extractText(node);
        }
        return extractText(node);
      }).join('\n');
      
      return extractedContent;
    }
    return '';
  });
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const updateProject = useUpdateProject();
  const uploadFiles = useUploadFiles();
  const { data: teamMembers = [] } = useTeamMembers();

  const slashCommands = [
    { command: '/image', description: 'Upload an image', icon: Image },
    { command: '/file', description: 'Upload a file', icon: Paperclip },
    { command: '/save', description: 'Save changes manually', icon: Save },
    { command: '/@', description: 'Mention team member', icon: AtSign },
  ];

  const formatCommands = [
    { command: 'bold', description: 'Bold text', icon: Bold, shortcut: 'Ctrl+B' },
    { command: 'italic', description: 'Italic text', icon: Italic, shortcut: 'Ctrl+I' },
    { command: 'highlight', description: 'Highlight text', icon: Palette, shortcut: 'Ctrl+H' },
    { command: 'size-sm', description: 'Small text', icon: Type, shortcut: 'Ctrl+,' },
    { command: 'size-lg', description: 'Large text', icon: Type, shortcut: 'Ctrl+.' },
  ];

  const scheduleAutoSave = useCallback((newContent: string) => {
    setAutoSaveStatus('saving');
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Schedule auto-save after 2 seconds of inactivity
    autoSaveTimeoutRef.current = setTimeout(() => {
      updateProject.mutate(
        { id: projectId, data: { description: newContent } },
        {
          onSuccess: () => {
            setAutoSaveStatus('saved');
            onUpdate?.(newContent);
            
            // Reset status after 2 seconds
            setTimeout(() => setAutoSaveStatus('idle'), 2000);
          },
          onError: () => {
            setAutoSaveStatus('idle');
            toast({
              title: "Auto-save failed",
              description: "Changes could not be saved automatically.",
              variant: "destructive",
            });
          }
        }
      );
    }, 2000);
  }, [projectId, updateProject, onUpdate]);

  const handleSlashCommand = (command: string) => {
    switch (command) {
      case '/image':
      case '/file':
        fileInputRef.current?.click();
        break;
      case '/save':
        scheduleAutoSave(content);
        break;
      case '/@':
        setShowMentions(true);
        setMentionQuery('');
        break;
    }
    setShowSlashCommands(false);
  };

  const handleTextSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea || !isEditing || typeof content !== 'string') return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const selected = content.substring(start, end);
      setSelectedText(selected);
      setSelectionStart(start);
      setSelectionEnd(end);
      setShowFormatToolbar(true);
    } else {
      setShowFormatToolbar(false);
    }
  };

  const applyFormatting = (formatType: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !selectedText || typeof content !== 'string') return;

    const beforeText = content.substring(0, selectionStart);
    const afterText = content.substring(selectionEnd);
    let formattedText = selectedText;

    switch (formatType) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'highlight':
        formattedText = `===${selectedText}===`;
        break;
      case 'size-sm':
        formattedText = `<small>${selectedText}</small>`;
        break;
      case 'size-lg':
        formattedText = `<large>${selectedText}</large>`;
        break;
    }

    const newContent = beforeText + formattedText + afterText;
    setContent(newContent);
    scheduleAutoSave(newContent);
    setShowFormatToolbar(false);

    // Update cursor position
    setTimeout(() => {
      const newCursorPosition = selectionStart + formattedText.length;
      textarea.selectionStart = newCursorPosition;
      textarea.selectionEnd = newCursorPosition;
      textarea.focus();
    }, 0);
  };

  const handleMentionSelect = (member: any) => {
    const textarea = textareaRef.current;
    if (!textarea || typeof content !== 'string') return;

    const cursorPosition = textarea.selectionStart;
    const beforeCursor = content.substring(0, cursorPosition);
    const afterCursor = content.substring(cursorPosition);
    
    // Replace the @ with mention
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    const beforeMention = beforeCursor.substring(0, lastAtIndex);
    const mention = `@${member.fullName}`;
    
    const newContent = beforeMention + mention + ' ' + afterCursor;
    setContent(newContent);
    scheduleAutoSave(newContent);
    setShowMentions(false);
    setMentionQuery('');

    // Update cursor position
    setTimeout(() => {
      const newCursorPosition = beforeMention.length + mention.length + 1;
      textarea.selectionStart = newCursorPosition;
      textarea.selectionEnd = newCursorPosition;
      textarea.focus();
    }, 0);
  };

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    try {
      const uploadedFiles = await uploadFiles.mutateAsync(files);
      
      // Insert file references at cursor position or end
      const textarea = textareaRef.current;
      if (typeof content !== 'string') return;
      
      const cursorPosition = textarea?.selectionStart || content.length;
      const beforeCursor = content.substring(0, cursorPosition);
      const afterCursor = content.substring(cursorPosition);
      
      let insertContent = '';
      uploadedFiles.forEach((file: any, index: number) => {
        console.log('Uploading file:', file);
        const prefix = index === 0 && !beforeCursor.endsWith('\n') && beforeCursor !== '' ? '\n' : '';
        
        if (file.type.startsWith('image/')) {
          insertContent += `${prefix}![image](${file.url})\n`;
        } else {
          insertContent += `${prefix}[${file.name}](${file.url})\n`;
        }
      });
      
      console.log('Insert content:', insertContent);
      const newContent = beforeCursor + insertContent + afterCursor;
      console.log('New content:', newContent);
      setContent(newContent);
      scheduleAutoSave(newContent);
      
      // Position cursor after uploaded content with better timing
      setTimeout(() => {
        if (textarea && isEditing) {
          textarea.focus();
          const newCursorPosition = cursorPosition + insertContent.length;
          textarea.setSelectionRange(newCursorPosition, newCursorPosition);
          textarea.scrollTop = textarea.scrollHeight;
        }
      }, 150);
      
      toast({
        title: "Files uploaded",
        description: `${files.length} file(s) added to description.`,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      let errorMessage = "Could not upload files.";
      
      if (error.response?.status === 413) {
        errorMessage = "File too large. Maximum size is 50MB per file.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const formatNumberedList = (content: string): string => {
    if (typeof content !== 'string') return '';
    const lines = content.split('\n');
    let numberedLines: string[] = [];
    let currentNumber = 1;
    let inNumberedSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line starts with a number followed by a dot or period
      const numberMatch = line.match(/^(\d+)\.?\s*(.*)$/);
      
      if (numberMatch) {
        // Start or continue numbered list
        inNumberedSection = true;
        numberedLines.push(`${currentNumber}. ${numberMatch[2]}`);
        currentNumber++;
      } else if (line === '' && inNumberedSection) {
        // Empty line in numbered section - preserve it
        numberedLines.push('');
        inNumberedSection = false;
        currentNumber = 1;
      } else if (line === '') {
        // Regular empty line
        numberedLines.push('');
        if (inNumberedSection) {
          inNumberedSection = false;
          currentNumber = 1;
        }
      } else {
        // Regular line - check if it should start a new numbered list
        if (line.toLowerCase().includes('need to') || 
            line.toLowerCase().includes('should') || 
            line.toLowerCase().includes('must') ||
            (i > 0 && lines[i-1].trim() === '' && line.length > 0)) {
          // Could be start of a list, keep as is for now
          numberedLines.push(line);
          inNumberedSection = false;
          currentNumber = 1;
        } else {
          numberedLines.push(line);
          inNumberedSection = false;
          currentNumber = 1;
        }
      }
    }
    
    return numberedLines.join('\n');
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newContent = e.target.value;
    
    // Auto-format numbered lists as user types
    const cursorPosition = e.target.selectionStart;
    const beforeCursor = newContent.substring(0, cursorPosition);
    const afterCursor = newContent.substring(cursorPosition);
    
    // Check if user just typed a newline after a numbered item
    if (beforeCursor.endsWith('\n') && beforeCursor.split('\n').length > 1) {
      const previousLine = beforeCursor.split('\n')[beforeCursor.split('\n').length - 2];
      const numberMatch = previousLine.trim().match(/^(\d+)\.\s*(.+)$/);
      
      if (numberMatch && numberMatch[2].trim() !== '') {
        // Auto-continue numbered list
        const nextNumber = parseInt(numberMatch[1]) + 1;
        const newLineContent = `${nextNumber}. `;
        newContent = beforeCursor + newLineContent + afterCursor;
        
        // Update cursor position
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = beforeCursor.length + newLineContent.length;
            textareaRef.current.selectionEnd = beforeCursor.length + newLineContent.length;
          }
        }, 0);
      }
    }
    
    setContent(newContent);
    
    if (isEditing) {
      scheduleAutoSave(newContent);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isEditing) return;
    
    const textarea = event.target as HTMLTextAreaElement;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPosition);
    
    // Handle keyboard shortcuts for formatting
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault();
          if (selectedText) applyFormatting('bold');
          return;
        case 'i':
          event.preventDefault();
          if (selectedText) applyFormatting('italic');
          return;
        case 'h':
          event.preventDefault();
          if (selectedText) applyFormatting('highlight');
          return;
        case ',':
          event.preventDefault();
          if (selectedText) applyFormatting('size-sm');
          return;
        case '.':
          event.preventDefault();
          if (selectedText) applyFormatting('size-lg');
          return;
      }
    }
    
    // Handle @ mentions
    if (event.key === '@') {
      const lastChar = textBeforeCursor.slice(-1);
      if (lastChar === '' || lastChar === ' ' || lastChar === '\n') {
        setShowMentions(true);
        setMentionQuery('');
      }
    } else if (showMentions) {
      if (event.key === 'Escape') {
        setShowMentions(false);
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const filteredMembers = teamMembers.filter(member => 
          member.fullName.toLowerCase().includes(mentionQuery.toLowerCase())
        );
        if (filteredMembers.length > 0) {
          handleMentionSelect(filteredMembers[0]);
        }
      } else if (event.key === 'Backspace' && mentionQuery === '') {
        setShowMentions(false);
      } else if (event.key.length === 1) {
        setMentionQuery(prev => prev + event.key);
      }
    }
    
    // Handle slash commands
    if (event.key === '/') {
      const lastChar = textBeforeCursor.slice(-1);
      if (lastChar === '' || lastChar === ' ' || lastChar === '\n') {
        setShowSlashCommands(true);
        setSlashQuery('');
      }
    } else if (showSlashCommands) {
      if (event.key === 'Escape') {
        setShowSlashCommands(false);
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        const filteredCommands = slashCommands.filter(cmd => 
          cmd.command.toLowerCase().includes(slashQuery.toLowerCase())
        );
        if (filteredCommands.length > 0) {
          handleSlashCommand(filteredCommands[0].command);
        }
      } else if (event.key === 'Backspace' && slashQuery === '') {
        setShowSlashCommands(false);
      } else if (event.key.length === 1) {
        setSlashQuery(prev => prev + event.key);
      }
    }
  };

  const toggleEditing = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      // Focus textarea when entering edit mode
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          // Position cursor at end of content
          const length = textarea.value.length;
          textarea.setSelectionRange(length, length);
        }
      }, 200);
    }
  };

  const filteredSlashCommands = slashCommands.filter(cmd =>
    cmd.command.toLowerCase().includes(slashQuery.toLowerCase())
  );

  const filteredMembers = teamMembers.filter(member => 
    member.fullName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    member.username.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const formatInlineText = (text: string): string => {
    let formatted = text;
    
    // Format mentions
    formatted = formatted.replace(/@([A-Za-z\s]+)/g, '<span class="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-sm font-medium">@$1</span>');
    
    // Format bold text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Format italic text
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Format highlighted text
    formatted = formatted.replace(/===([^=]+)===/g, '<span class="bg-yellow-200 px-1 rounded">$1</span>');
    
    // Format small text
    formatted = formatted.replace(/<small>([^<]+)<\/small>/g, '<span class="text-sm">$1</span>');
    
    // Format large text
    formatted = formatted.replace(/<large>([^<]+)<\/large>/g, '<span class="text-lg font-medium">$1</span>');
    
    return formatted;
  };





  const renderEditingThumbnails = useCallback((text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    const imagePositions: Array<{ lineIdx: number; imageUrl: string; altText: string }> = [];
    
    // Find all image positions
    lines.forEach((line, lineIdx) => {
      const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        const [, altText, imageUrl] = imageMatch;
        imagePositions.push({ lineIdx, imageUrl, altText });
      }
    });

    if (imagePositions.length === 0) return null;
    
    return (
      <div className="absolute -right-20 top-0 w-16 space-y-2">
        {imagePositions.map(({ lineIdx, imageUrl, altText }, idx) => (
          <div
            key={`${lineIdx}-${idx}`}
            className="relative bg-white border rounded-lg shadow-md p-1 w-16 h-16"
          >
            <img
              src={imageUrl}
              alt={altText || "thumbnail"}
              className="w-full h-full object-cover rounded"
              onError={(e) => {
                e.currentTarget.parentElement!.style.display = 'none';
              }}
            />
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
              🖼
            </div>
          </div>
        ))}
      </div>
    );
  }, []);

  const renderDescription = (desc: any) => {
    console.log('Rendering description:', desc); // Debug log
    
    if (!desc) {
      return <p className="text-gray-500 italic">No description available</p>;
    }
    
    if (typeof desc === 'string') {
      const lines = desc.split('\n');
      console.log('Description lines:', lines); // Debug log
      
      return (
        <div className="prose prose-sm max-w-none space-y-2">
          {lines.map((line, idx) => {
            // Handle image markdown - more flexible pattern
            const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
            if (imageMatch) {
              const [, altText, imageUrl] = imageMatch;
              console.log('Image found:', { altText, imageUrl }); // Debug log
              
              // Use simple label instead of filename
              const filename = 'image';
              
              return (
                <div key={idx} className="my-4">
                  <img
                    src={imageUrl}
                    alt={altText || 'Uploaded image'}
                    className="max-w-full h-auto rounded-lg border shadow-sm"
                    loading="lazy"
                    onError={(e) => {
                      console.error('Image failed to load:', imageUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                  />
                  <div className="text-xs text-gray-500 mt-2 flex items-center">
                    <span className="mr-1">📷</span>
                    <span className="truncate">{filename}</span>
                  </div>
                </div>
              );
            }
            
            // Handle file links markdown
            const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
              const [, linkText, linkUrl] = linkMatch;
              return (
                <div key={idx} className="my-2">
                  <a
                    href={linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 underline"
                  >
                    <Paperclip className="w-4 h-4 mr-1" />
                    {linkText}
                  </a>
                </div>
              );
            }
            
            // Handle numbered lists
            const numberMatch = line.trim().match(/^(\d+)\.\s*(.+)$/);
            if (numberMatch) {
              const [, number, text] = numberMatch;
              return (
                <div key={idx} className="flex items-start space-x-2 my-1">
                  <span className="text-blue-600 font-medium min-w-[1.5rem]">{number}.</span>
                  <span dangerouslySetInnerHTML={{ __html: formatInlineText(text) }} />
                </div>
              );
            }
            
            // Regular text or empty lines
            if (line.trim() === '') {
              return <div key={idx} className="h-2" />;
            }
            
            return (
              <p key={idx} className="mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInlineText(line) }} />
            );
          })}
        </div>
      );
    }
    
    return <p className="text-gray-500 italic">No description available</p>;
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className={isDragOver ? 'border-2 border-dashed border-blue-400 bg-blue-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Description</CardTitle>
        <div className="flex items-center space-x-2">
          {autoSaveStatus === 'saving' && (
            <Badge variant="secondary" className="text-xs">
              Saving...
            </Badge>
          )}
          {autoSaveStatus === 'saved' && (
            <Badge variant="outline" className="text-xs text-green-600">
              Saved
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleEditing}
            className="text-sm"
          >
            {isEditing ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="min-h-[200px]"
          >
            {isEditing ? (
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setContent(newValue);
                    scheduleAutoSave(newValue);
                  }}
                  onKeyDown={handleKeyDown}
                  onSelect={handleTextSelection}
                  onMouseUp={handleTextSelection}
                  placeholder="Type your project description... Use @ to mention, / for actions"
                  className="min-h-[200px] resize-none border-0 focus:ring-0 p-0 text-sm bg-transparent relative z-10"
                />
                {/* Image thumbnails overlay */}
                <div className="absolute inset-0 pointer-events-none z-20">
                  {renderEditingThumbnails(content)}
                </div>
              </div>
            ) : (
              renderDescription(content || description)
            )}
            
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 rounded-md">
                <div className="text-center">
                  <Paperclip className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-blue-600 font-medium">Drop files here</p>
                </div>
              </div>
            )}
          </div>

          {/* Formatting Toolbar */}
          {showFormatToolbar && isEditing && (
            <div className="absolute z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center space-x-1">
              {formatCommands.map((cmd) => (
                <Button
                  key={cmd.command}
                  variant="ghost"
                  size="sm"
                  onClick={() => applyFormatting(cmd.command)}
                  className="h-8 w-8 p-0"
                  title={`${cmd.description} (${cmd.shortcut})`}
                >
                  <cmd.icon className="w-4 h-4" />
                </Button>
              ))}
            </div>
          )}

          {/* Mentions Dropdown */}
          {showMentions && isEditing && filteredMembers.length > 0 && (
            <div className="absolute z-10 w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredMembers.slice(0, 5).map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMentionSelect(member)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-${member.color}-500`}>
                    {member.fullName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.fullName}</p>
                    <p className="text-xs text-gray-500">@{member.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Slash Commands Dropdown */}
          {showSlashCommands && isEditing && (
            <div className="absolute z-10 w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
              {filteredSlashCommands.map((cmd) => (
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

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {isEditing && (
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>Tips: Type <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">/</kbd> for actions, <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">@</kbd> to mention team members</p>
            <p>Select text for formatting: <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+B</kbd> bold, <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+I</kbd> italic, <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+H</kbd> highlight</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}