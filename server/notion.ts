import { Client } from "@notionhq/client";

// Initialize Notion client only if the secret is available
export const notion = process.env.NOTION_INTEGRATION_SECRET 
  ? new Client({
      auth: process.env.NOTION_INTEGRATION_SECRET,
    })
  : null;

// Extract the page ID from the Notion page URL
function extractPageIdFromUrl(pageUrl: string): string {
    const match = pageUrl.match(/([a-f0-9]{32})(?:[?#]|$)/i);
    if (match && match[1]) {
        return match[1];
    }

    throw Error("Failed to extract page ID");
}

export const NOTION_PAGE_ID = process.env.NOTION_PAGE_URL 
  ? extractPageIdFromUrl(process.env.NOTION_PAGE_URL)
  : null;

/**
 * Import content from a specific Notion page URL
 * @param pageUrl - The Notion page URL to import from
 * @returns {Promise<{title: string, content: string}>} - Page title and content
 */
export async function importNotionPage(pageUrl: string) {
    if (!notion) {
        throw new Error("Notion integration is not configured");
    }
    
    try {
        const pageId = extractPageIdFromUrl(pageUrl);
        
        // Get page properties
        const page = await notion.pages.retrieve({ page_id: pageId });
        
        // Get page content (blocks)
        const blocks = await notion.blocks.children.list({ 
            block_id: pageId,
            page_size: 100
        });
        
        // Extract title from page properties
        let title = "Untitled";
        let createdDate = null;
        let lastEditedDate = null;
        
        if ('properties' in page && page.properties) {
            const titleProperty = Object.values(page.properties).find(
                (prop: any) => prop.type === 'title'
            ) as any;
            
            if (titleProperty && titleProperty.title && titleProperty.title.length > 0) {
                title = titleProperty.title[0].plain_text;
            }
        }
        
        // Extract creation and last edited dates
        if ('created_time' in page) {
            createdDate = new Date(page.created_time);
            console.log('Notion created_time:', page.created_time, 'Parsed:', createdDate);
        }
        
        if ('last_edited_time' in page) {
            lastEditedDate = new Date(page.last_edited_time);
            console.log('Notion last_edited_time:', page.last_edited_time, 'Parsed:', lastEditedDate);
        }
        
        // Extract creation and last edited dates
        if ('created_time' in page) {
            createdDate = new Date(page.created_time);
        }
        
        if ('last_edited_time' in page) {
            lastEditedDate = new Date(page.last_edited_time);
        }
        
        // Convert blocks to structured content with sections
        let content = `# ${title}\n\n*Imported from Notion*\n\n`;
        let currentSection = '';
        let sectionContent: string[] = [];
        
        for (const block of blocks.results) {
            const blockContent = extractBlockContent(block as any);
            if (blockContent) {
                // Detect new sections based on headings
                if (blockContent.startsWith('# ') || blockContent.startsWith('## ') || blockContent.startsWith('### ')) {
                    // Save previous section if it exists
                    if (currentSection && sectionContent.length > 0) {
                        content += `\n## ${currentSection}\n\n${sectionContent.join('\n')}\n`;
                    }
                    
                    // Start new section
                    currentSection = blockContent.replace(/^#+\s*/, '');
                    sectionContent = [];
                } else if (blockContent.trim()) {
                    sectionContent.push(blockContent);
                }
            }
        }
        
        // Add final section
        if (currentSection && sectionContent.length > 0) {
            content += `\n## ${currentSection}\n\n${sectionContent.join('\n')}\n`;
        } else if (sectionContent.length > 0) {
            content += `\n${sectionContent.join('\n')}\n`;
        }
        
        return {
            title: title,
            content: content,
            description: convertToRichText(content),
            createdDate,
            lastEditedDate
        };
        
    } catch (error) {
        console.error("Error importing Notion page:", error);
        throw new Error(`Failed to import Notion page: ${error}`);
    }
}

/**
 * Extract content from a Notion block
 */
function extractBlockContent(block: any): string {
    if (!block || !block.type) return '';
    
    switch (block.type) {
        case 'paragraph':
            return extractRichText(block.paragraph?.rich_text) || '';
        case 'heading_1':
            return `# ${extractRichText(block.heading_1?.rich_text) || ''}`;
        case 'heading_2':
            return `## ${extractRichText(block.heading_2?.rich_text) || ''}`;
        case 'heading_3':
            return `### ${extractRichText(block.heading_3?.rich_text) || ''}`;
        case 'bulleted_list_item':
            return `- ${extractRichText(block.bulleted_list_item?.rich_text) || ''}`;
        case 'numbered_list_item':
            return `1. ${extractRichText(block.numbered_list_item?.rich_text) || ''}`;
        case 'to_do':
            const checked = block.to_do?.checked ? '✓' : '☐';
            return `${checked} ${extractRichText(block.to_do?.rich_text) || ''}`;
        case 'code':
            const codeText = extractRichText(block.code?.rich_text) || '';
            const language = block.code?.language || 'plaintext';
            return `\`\`\`${language}\n${codeText}\n\`\`\``;
        case 'image':
            const imageUrl = block.image?.file?.url || block.image?.external?.url || '';
            const caption = extractRichText(block.image?.caption) || '';
            if (imageUrl) {
                return caption ? `![${caption}](${imageUrl})` : `![Image](${imageUrl})`;
            }
            return '';
        case 'quote':
            return `> ${extractRichText(block.quote?.rich_text) || ''}`;
        case 'divider':
            return '\n---\n';
        case 'callout':
            const calloutText = extractRichText(block.callout?.rich_text) || '';
            const icon = block.callout?.icon?.emoji || '💡';
            return `> ${icon} **Note:** ${calloutText}`;
        case 'toggle':
            const toggleText = extractRichText(block.toggle?.rich_text) || '';
            return `<details>\n<summary>${toggleText}</summary>\n\n</details>`;
        default:
            return '';
    }
}

/**
 * Extract plain text from Notion rich text array
 */
function extractRichText(richText: any[]): string {
    if (!richText || !Array.isArray(richText)) return '';
    
    return richText.map(text => {
        if (text.type === 'text') {
            let content = text.text?.content || '';
            
            // Apply formatting
            if (text.annotations?.bold) content = `**${content}**`;
            if (text.annotations?.italic) content = `*${content}*`;
            if (text.annotations?.code) content = `\`${content}\``;
            if (text.annotations?.strikethrough) content = `~~${content}~~`;
            
            return content;
        }
        return text.plain_text || '';
    }).join('');
}

/**
 * Convert markdown content to rich text format for the editor
 */
function convertToRichText(content: string): any {
    const lines = content.split('\n');
    const doc = {
        type: 'doc',
        content: [] as any[]
    };
    
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Handle code blocks
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                // End code block
                doc.content.push({
                    type: 'codeBlock',
                    attrs: { language: codeBlockLanguage },
                    content: [{ type: 'text', text: codeBlockContent.join('\n') }]
                });
                inCodeBlock = false;
                codeBlockContent = [];
                codeBlockLanguage = '';
            } else {
                // Start code block
                inCodeBlock = true;
                codeBlockLanguage = line.substring(3).trim();
            }
            continue;
        }
        
        if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
        }
        
        if (line.trim() === '') {
            continue;
        }
        
        let paragraph: any = {
            type: 'paragraph',
            content: []
        };
        
        // Handle different markdown elements
        if (line.startsWith('# ')) {
            paragraph = {
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: line.substring(2) }]
            };
        } else if (line.startsWith('## ')) {
            paragraph = {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: line.substring(3) }]
            };
        } else if (line.startsWith('### ')) {
            paragraph = {
                type: 'heading',
                attrs: { level: 3 },
                content: [{ type: 'text', text: line.substring(4) }]
            };
        } else if (line.startsWith('> ')) {
            paragraph = {
                type: 'blockquote',
                content: [{
                    type: 'paragraph',
                    content: processInlineFormatting(line.substring(2))
                }]
            };
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            paragraph = {
                type: 'bulletList',
                content: [{
                    type: 'listItem',
                    content: [{
                        type: 'paragraph',
                        content: processInlineFormatting(line.substring(2))
                    }]
                }]
            };
        } else if (/^\d+\.\s/.test(line)) {
            paragraph = {
                type: 'orderedList',
                content: [{
                    type: 'listItem',
                    content: [{
                        type: 'paragraph',
                        content: processInlineFormatting(line.replace(/^\d+\.\s/, ''))
                    }]
                }]
            };
        } else if (line.startsWith('![')) {
            // Handle images
            const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
            if (imageMatch) {
                const [, alt, src] = imageMatch;
                paragraph = {
                    type: 'paragraph',
                    content: [{
                        type: 'image',
                        attrs: {
                            src: src,
                            alt: alt || 'Image',
                            title: alt || null
                        }
                    }]
                };
            } else {
                paragraph = {
                    type: 'paragraph',
                    content: processInlineFormatting(line)
                };
            }
        } else if (line === '---') {
            paragraph = {
                type: 'horizontalRule'
            };
        } else {
            // Process inline formatting
            const processedText = processInlineFormatting(line);
            paragraph.content = processedText;
        }
        
        doc.content.push(paragraph);
    }
    
    // Handle unclosed code block
    if (inCodeBlock && codeBlockContent.length > 0) {
        doc.content.push({
            type: 'codeBlock',
            attrs: { language: codeBlockLanguage },
            content: [{ type: 'text', text: codeBlockContent.join('\n') }]
        });
    }
    
    return doc;
}

/**
 * Process inline formatting like **bold**, *italic*, etc.
 */
function processInlineFormatting(text: string): any[] {
    const result = [];
    let current = '';
    let i = 0;
    
    while (i < text.length) {
        if (text.substring(i, i + 2) === '**') {
            if (current) {
                result.push({ type: 'text', text: current });
                current = '';
            }
            // Find closing **
            const end = text.indexOf('**', i + 2);
            if (end !== -1) {
                const boldText = text.substring(i + 2, end);
                result.push({
                    type: 'text',
                    text: boldText,
                    marks: [{ type: 'bold' }]
                });
                i = end + 2;
            } else {
                current += text[i];
                i++;
            }
        } else if (text[i] === '*') {
            if (current) {
                result.push({ type: 'text', text: current });
                current = '';
            }
            // Find closing *
            const end = text.indexOf('*', i + 1);
            if (end !== -1) {
                const italicText = text.substring(i + 1, end);
                result.push({
                    type: 'text',
                    text: italicText,
                    marks: [{ type: 'italic' }]
                });
                i = end + 1;
            } else {
                current += text[i];
                i++;
            }
        } else {
            current += text[i];
            i++;
        }
    }
    
    if (current) {
        result.push({ type: 'text', text: current });
    }
    
    return result.length > 0 ? result : [{ type: 'text', text: text }];
}

/**
 * Lists all child databases contained within NOTION_PAGE_ID
 * @returns {Promise<Array<{id: string, title: string}>>} - Array of database objects with id and title
 */
export async function getNotionDatabases() {
    if (!notion) {
        throw new Error("Notion integration is not configured");
    }
    
    try {
        const response = await notion.search({
            filter: { property: "object", value: "database" }
        });

        return response.results;
    } catch (error) {
        console.error("Error listing databases:", error);
        throw error;
    }
}

// Find get a Notion database with the matching title
export async function findDatabaseByTitle(title: string) {
    if (!notion) {
        throw new Error("Notion integration is not configured");
    }
    
    const databases = await getNotionDatabases();

    for (const db of databases) {
        const dbTitle = (db as any).title?.[0]?.plain_text?.toLowerCase() || "";
        if (dbTitle === title.toLowerCase()) {
            return db;
        }
    }

    return null;
}

// Get all projects from Notion
export async function getNotionProjects() {
    if (!notion) {
        throw new Error("Notion integration is not configured");
    }
    
    try {
        // First, try to find a Projects database
        let projectsDb = await findDatabaseByTitle("Projects");
        
        if (!projectsDb) {
            // If no Projects database found, get all databases and try to find project-like data
            const databases = await getNotionDatabases();
            console.log("Available databases:", databases.map(db => (db as any).title?.[0]?.plain_text || 'Untitled'));
            
            // Use the first database if available
            if (databases.length > 0) {
                projectsDb = databases[0];
            } else {
                throw new Error("No databases found in the Notion page");
            }
        }

        console.log(`Using database: ${(projectsDb as any).title?.[0]?.plain_text || 'Untitled'}`);

        const response = await notion.databases.query({
            database_id: projectsDb.id,
        });

        return response.results.map((page: any) => {
            const properties = page.properties;

            // Try to extract common project fields
            const title = extractTextProperty(properties.Title || properties.Name || properties.Project);
            const description = extractTextProperty(properties.Description || properties.Notes);
            const status = extractSelectProperty(properties.Status) || 'planning';
            const priority = extractSelectProperty(properties.Priority) || 'medium';
            const startDate = extractDateProperty(properties.StartDate || properties['Start Date']);
            const dueDate = extractDateProperty(properties.DueDate || properties['Due Date'] || properties.Deadline);

            return {
                notionId: page.id,
                title: title || "Untitled Project",
                description: description || "",
                status: mapStatus(status),
                priority: mapPriority(priority),
                startDate,
                dueDate,
                url: page.url
            };
        });
    } catch (error) {
        console.error("Error fetching projects from Notion:", error);
        throw new Error("Failed to fetch projects from Notion");
    }
}

// Helper functions to extract property values
function extractTextProperty(property: any): string {
    if (!property) return "";
    
    if (property.title && Array.isArray(property.title)) {
        return property.title.map((item: any) => item.plain_text || "").join("");
    }
    
    if (property.rich_text && Array.isArray(property.rich_text)) {
        return property.rich_text.map((item: any) => item.plain_text || "").join("");
    }
    
    return "";
}

function extractSelectProperty(property: any): string {
    if (!property) return "";
    return property.select?.name || "";
}

function extractDateProperty(property: any): Date | null {
    if (!property || !property.date) return null;
    return property.date.start ? new Date(property.date.start) : null;
}

// Map Notion status to our system
function mapStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
        'not started': 'planning',
        'in progress': 'in-progress',
        'done': 'completed',
        'completed': 'completed',
        'cancelled': 'cancelled',
        'on hold': 'on-hold'
    };
    
    return statusMap[status.toLowerCase()] || 'planning';
}

// Map Notion priority to our system
function mapPriority(priority: string): string {
    const priorityMap: { [key: string]: string } = {
        'high': 'high',
        'medium': 'medium',
        'low': 'low',
        'urgent': 'urgent'
    };
    
    return priorityMap[priority.toLowerCase()] || 'medium';
}