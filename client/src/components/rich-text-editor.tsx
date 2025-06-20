import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import ImageExtension from '@tiptap/extension-image';
import { createLowlight, common } from 'lowlight';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link,
  ImageIcon,
  Code,
  Type
} from 'lucide-react';

interface RichTextEditorProps {
  content: any;
  onChange: (content: any) => void;
  placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  // Create lowlight instance with common languages
  const lowlight = createLowlight(common);
  
  // Add additional languages for syntax highlighting
  const supportedLanguages = [
    { value: 'bash', label: 'Bash' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'sql', label: 'SQL' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'scss', label: 'SCSS' },
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'dockerfile', label: 'Dockerfile' },
    { value: 'nginx', label: 'Nginx' },
    { value: 'apache', label: 'Apache' },
    { value: 'plaintext', label: 'Plain Text' },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block to use our custom one
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
        languageClassPrefix: 'language-',
      }),
      ImageExtension.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'notion-image max-w-full h-auto rounded-lg shadow-sm',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  if (!editor) {
    return null;
  }

  const toolbarItems = [
    {
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
      icon: Bold,
      label: 'Bold'
    },
    {
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
      icon: Italic,
      label: 'Italic'
    },
    {
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
      icon: List,
      label: 'Bullet List'
    },
    {
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
      icon: ListOrdered,
      label: 'Numbered List'
    },
    {
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive('codeBlock'),
      icon: Code,
      label: 'Code Block'
    },
    {
      action: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
              alert('File too large. Maximum size is 50MB.');
              return;
            }
            
            try {
              const formData = new FormData();
              formData.append('file', file);
              
              const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              });
              
              if (!response.ok) {
                throw new Error('Upload failed');
              }
              
              const data = await response.json();
              editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
            } catch (error) {
              console.error('Image upload failed:', error);
              alert('Failed to upload image. Please try again.');
            }
          }
        };
        input.click();
      },
      isActive: false,
      icon: ImageIcon,
      label: 'Image'
    }
  ];

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Toolbar */}
      <div className="flex items-center space-x-2 p-3 border-b border-gray-200 bg-gray-50">
        {toolbarItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={item.action}
              className={`h-8 w-8 p-0 ${
                item.isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
            </Button>
          );
        })}
        <Separator orientation="vertical" className="h-6" />
        
        {/* Language selector for code blocks */}
        {editor.isActive('codeBlock') && (
          <div className="flex items-center space-x-2">
            <Type className="w-4 h-4 text-gray-600" />
            <Select
              value={editor.getAttributes('codeBlock').language || 'plaintext'}
              onValueChange={(language) => {
                editor.chain().focus().updateAttributes('codeBlock', { language }).run();
              }}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="notion-text-editor code-block-container">
        <EditorContent 
          editor={editor} 
          className="min-h-[120px] prose prose-sm max-w-none focus:outline-none p-4"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
