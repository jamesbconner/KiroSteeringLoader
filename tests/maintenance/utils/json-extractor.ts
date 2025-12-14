/**
 * Utility for extracting and parsing JSON from command output that may contain
 * non-JSON content like npm command prompts, warnings, and other text.
 */

export interface JsonExtractionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rawOutput?: string;
}

/**
 * Extracts JSON from command output that may contain mixed content.
 * Handles common scenarios like npm command output with prompts and warnings.
 */
export function extractJsonFromOutput<T = any>(output: string): JsonExtractionResult<T> {
  if (!output || typeof output !== 'string') {
    return {
      success: false,
      error: 'No output provided or output is not a string',
      rawOutput: output
    };
  }

  const lines = output.split('\n');
  let jsonStart = -1;
  let jsonEnd = -1;
  let braceCount = 0;
  let inJson = false;

  // Find the start and end of JSON output by tracking braces
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and common npm output patterns
    if (!line || 
        line.startsWith('>') || 
        line.startsWith('npm') ||
        line.includes('deprecated') ||
        line.includes('WARN') ||
        line.includes('ERR!')) {
      continue;
    }

    // Look for JSON start
    if (line.startsWith('{') && !inJson) {
      jsonStart = i;
      inJson = true;
      braceCount = 1;
      
      // Count braces in the first line
      for (let j = 1; j < line.length; j++) {
        if (line[j] === '{') braceCount++;
        if (line[j] === '}') braceCount--;
      }
      
      // Check if JSON is complete on first line
      if (braceCount === 0) {
        jsonEnd = i;
        break;
      }
    } else if (inJson) {
      // Count braces in subsequent lines
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      // JSON is complete when brace count reaches 0
      if (braceCount === 0) {
        jsonEnd = i;
        break;
      }
    }
  }

  if (jsonStart === -1) {
    return {
      success: false,
      error: 'No JSON object found in output',
      rawOutput: output
    };
  }

  if (jsonEnd === -1) {
    return {
      success: false,
      error: 'Incomplete JSON object found in output',
      rawOutput: output
    };
  }

  try {
    const jsonOutput = lines.slice(jsonStart, jsonEnd + 1).join('\n');
    const parsed = JSON.parse(jsonOutput);
    
    return {
      success: true,
      data: parsed,
      rawOutput: output
    };
  } catch (parseError) {
    return {
      success: false,
      error: `JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      rawOutput: output
    };
  }
}

/**
 * Extracts JSON array from command output.
 * Similar to extractJsonFromOutput but specifically handles array responses.
 */
export function extractJsonArrayFromOutput<T = any>(output: string): JsonExtractionResult<T[]> {
  if (!output || typeof output !== 'string') {
    return {
      success: false,
      error: 'No output provided or output is not a string',
      rawOutput: output
    };
  }

  const lines = output.split('\n');
  let jsonStart = -1;
  let jsonEnd = -1;
  let bracketCount = 0;
  let inJson = false;

  // Find the start and end of JSON array output
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and common npm output patterns
    if (!line || 
        line.startsWith('>') || 
        line.startsWith('npm') ||
        line.includes('deprecated') ||
        line.includes('WARN') ||
        line.includes('ERR!')) {
      continue;
    }

    // Look for JSON array start
    if (line.startsWith('[') && !inJson) {
      jsonStart = i;
      inJson = true;
      bracketCount = 1;
      
      // Count brackets in the first line
      for (let j = 1; j < line.length; j++) {
        if (line[j] === '[') bracketCount++;
        if (line[j] === ']') bracketCount--;
      }
      
      // Check if JSON array is complete on first line
      if (bracketCount === 0) {
        jsonEnd = i;
        break;
      }
    } else if (inJson) {
      // Count brackets in subsequent lines
      for (const char of line) {
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
      
      // JSON array is complete when bracket count reaches 0
      if (bracketCount === 0) {
        jsonEnd = i;
        break;
      }
    }
  }

  if (jsonStart === -1) {
    return {
      success: false,
      error: 'No JSON array found in output',
      rawOutput: output
    };
  }

  if (jsonEnd === -1) {
    return {
      success: false,
      error: 'Incomplete JSON array found in output',
      rawOutput: output
    };
  }

  try {
    const jsonOutput = lines.slice(jsonStart, jsonEnd + 1).join('\n');
    const parsed = JSON.parse(jsonOutput);
    
    if (!Array.isArray(parsed)) {
      return {
        success: false,
        error: 'Parsed JSON is not an array',
        rawOutput: output
      };
    }
    
    return {
      success: true,
      data: parsed,
      rawOutput: output
    };
  } catch (parseError) {
    return {
      success: false,
      error: `JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      rawOutput: output
    };
  }
}