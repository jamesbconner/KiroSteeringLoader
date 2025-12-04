/**
 * Front matter parser for extracting YAML metadata from markdown files
 * 
 * Parses YAML front matter blocks delimited by --- at the start of markdown files
 */

export interface FrontMatterMetadata {
  [key: string]: string | string[] | number | boolean | undefined;
  title?: string;
  description?: string;
  tags?: string[];
  author?: string;
  date?: string;
}

export interface ParsedContent {
  metadata: FrontMatterMetadata;
  content: string;
}

/**
 * Parses YAML front matter from markdown content
 * @param content - Markdown file content
 * @returns Parsed metadata and remaining content
 */
export function parseFrontMatter(content: string): ParsedContent {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return {
      metadata: {},
      content: content
    };
  }

  const yamlContent = match[1].trim();
  const markdownContent = match[2];

  // Handle empty front matter
  if (!yamlContent) {
    return {
      metadata: {},
      content: markdownContent
    };
  }

  try {
    const metadata = parseYaml(yamlContent);
    return {
      metadata,
      content: markdownContent
    };
  } catch (error) {
    // If YAML parsing fails, return empty metadata
    return {
      metadata: {},
      content: content
    };
  }
}

/**
 * Simple YAML parser for front matter
 * Supports basic key-value pairs, arrays, and nested objects
 * @param yaml - YAML content string
 * @returns Parsed metadata object
 */
function parseYaml(yaml: string): FrontMatterMetadata {
  const metadata: FrontMatterMetadata = {};
  const lines = yaml.split('\n');
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Array item
    if (trimmed.startsWith('- ')) {
      if (currentKey) {
        const value = trimmed.substring(2).trim();
        // Only add non-empty values
        if (value) {
          currentArray.push(value);
        }
      }
      continue;
    }

    // If we were building an array, save it
    if (currentKey && currentArray.length > 0) {
      metadata[currentKey] = currentArray;
      currentArray = [];
      currentKey = null;
    }

    // Key-value pair
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (value === '') {
        // Empty value might indicate an array follows
        currentKey = key;
        currentArray = [];
      } else {
        // Parse the value - skip if it's only whitespace
        const parsedValue = parseValue(value);
        if (typeof parsedValue === 'string' && parsedValue.trim() === '') {
          // Skip empty string values
          currentKey = null;
        } else {
          metadata[key] = parsedValue;
          currentKey = null;
        }
      }
    }
  }

  // Save any remaining array
  if (currentKey && currentArray.length > 0) {
    metadata[currentKey] = currentArray;
  }

  return metadata;
}

/**
 * Parses a YAML value to appropriate JavaScript type
 * @param value - String value from YAML
 * @returns Parsed value (string, number, boolean)
 */
function parseValue(value: string): string | number | boolean {
  const trimmed = value.trim();
  
  // Remove quotes if present
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.substring(1, trimmed.length - 1);
  }

  // Boolean
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Number
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') {
    return num;
  }

  // String (return trimmed value)
  return trimmed;
}

/**
 * Extracts specific metadata fields for display
 * @param metadata - Parsed front matter metadata
 * @returns Formatted metadata for display
 */
export function extractDisplayMetadata(metadata: FrontMatterMetadata): {
  title?: string;
  description?: string;
  tags?: string[];
} {
  return {
    title: typeof metadata.title === 'string' ? metadata.title : undefined,
    description: typeof metadata.description === 'string' ? metadata.description : undefined,
    tags: Array.isArray(metadata.tags) ? metadata.tags.map(String) : undefined
  };
}
