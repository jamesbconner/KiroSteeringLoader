#!/usr/bin/env node

/**
 * Cleanup compiled JavaScript files from tests directory
 */

import fs from 'fs';
import path from 'path';

function cleanupDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      cleanupDirectory(fullPath);
    } else if (item.endsWith('.js') || item.endsWith('.js.map')) {
      console.log(`Removing: ${fullPath}`);
      fs.unlinkSync(fullPath);
    }
  }
}

console.log('Cleaning up compiled JavaScript files from tests directory...');
cleanupDirectory('tests');
console.log('Cleanup complete!');