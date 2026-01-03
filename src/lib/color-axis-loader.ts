/**
 * Color Axis Loader
 * Loads product color axes from CSV file and provides lookup function
 */

import * as fs from 'fs';
import * as path from 'path';

type ColorAxis = 'Green' | 'Pink' | 'Blue' | 'Yellow';

// Cache for color axis mapping (handle -> color axis)
let colorAxisMap: Map<string, ColorAxis> | null = null;
let loadAttempted = false;

/**
 * Parses CSV content and extracts handle -> color axis mapping
 * CSV format: Found Product Name,Product Handle,Benefits,Box Color
 */
function parseCSV(content: string): Map<string, ColorAxis> {
    const map = new Map<string, ColorAxis>();
    const lines = content.split('\n');

    // Skip header row
    let currentLine = '';
    let inQuotedField = false;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Handle multi-line fields (quoted fields with newlines)
        if (inQuotedField) {
            currentLine += '\n' + line;
            // Check if this line closes the quoted field
            const quoteCount = (currentLine.match(/"/g) || []).length;
            if (quoteCount % 2 === 0) {
                inQuotedField = false;
                // Process the complete line
                processCSVLine(currentLine, map);
                currentLine = '';
            }
        } else {
            // Check if this line starts a multi-line quoted field
            const quoteCount = (line.match(/"/g) || []).length;
            if (quoteCount % 2 !== 0) {
                inQuotedField = true;
                currentLine = line;
            } else {
                // Single line, process directly
                processCSVLine(line, map);
            }
        }
    }

    return map;
}

/**
 * Process a single CSV line and extract handle -> color axis
 */
function processCSVLine(line: string, map: Map<string, ColorAxis>): void {
    if (!line.trim()) return;

    // Parse CSV fields (handle quoted fields)
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current.trim()); // Add last field

    // CSV columns: Found Product Name, Product Handle, Benefits, Box Color
    // Index:       0                   1               2         3
    if (fields.length >= 4) {
        const handle = fields[1];
        const boxColor = fields[3];

        // Validate color axis
        if (handle && boxColor) {
            const normalizedColor = boxColor.trim();
            if (['Green', 'Pink', 'Blue', 'Yellow'].includes(normalizedColor)) {
                map.set(handle, normalizedColor as ColorAxis);
            }
        }
    }
}

/**
 * Loads the color axis mapping from CSV file
 * Returns cached map if already loaded
 */
function loadColorAxisMap(): Map<string, ColorAxis> {
    if (colorAxisMap !== null) {
        return colorAxisMap;
    }

    if (loadAttempted) {
        // Already tried and failed, return empty map
        return new Map();
    }

    loadAttempted = true;

    try {
        // Try multiple possible paths for the CSV file
        const possiblePaths = [
            path.join(process.cwd(), 'products-data', 'product-list-with-color-axes.csv'),
            path.join(process.cwd(), '..', 'products-data', 'product-list-with-color-axes.csv'),
            path.resolve(__dirname, '..', '..', '..', 'products-data', 'product-list-with-color-axes.csv'),
        ];

        let csvContent: string | null = null;
        let loadedPath: string | null = null;

        for (const csvPath of possiblePaths) {
            try {
                if (fs.existsSync(csvPath)) {
                    csvContent = fs.readFileSync(csvPath, 'utf-8');
                    loadedPath = csvPath;
                    break;
                }
            } catch {
                // Try next path
            }
        }

        if (!csvContent) {
            console.warn('[ColorAxisLoader] CSV file not found in any expected location');
            colorAxisMap = new Map();
            return colorAxisMap;
        }

        colorAxisMap = parseCSV(csvContent);
        console.log(`[ColorAxisLoader] Loaded ${colorAxisMap.size} product color axes from ${loadedPath}`);

        // Log the mapping for debugging
        if (colorAxisMap.size > 0) {
            console.log('[ColorAxisLoader] Color axis distribution:');
            const distribution: Record<string, number> = { Green: 0, Pink: 0, Blue: 0, Yellow: 0 };
            colorAxisMap.forEach((axis) => {
                distribution[axis]++;
            });
            console.log('[ColorAxisLoader]   Green:', distribution.Green);
            console.log('[ColorAxisLoader]   Pink:', distribution.Pink);
            console.log('[ColorAxisLoader]   Blue:', distribution.Blue);
            console.log('[ColorAxisLoader]   Yellow:', distribution.Yellow);
        }

        return colorAxisMap;
    } catch (error) {
        console.error('[ColorAxisLoader] Error loading color axis CSV:', error);
        colorAxisMap = new Map();
        return colorAxisMap;
    }
}

/**
 * Gets the color axis for a given product handle
 * @param handle - The product handle (e.g., "vitamine-b12")
 * @returns The color axis (Green, Pink, Blue, Yellow) or undefined if not found
 */
export function getColorAxisForHandle(handle: string | undefined): ColorAxis | undefined {
    if (!handle) {
        return undefined;
    }

    const map = loadColorAxisMap();
    return map.get(handle);
}

/**
 * Gets all color axis mappings (for debugging/admin purposes)
 * @returns Map of handle -> color axis
 */
export function getAllColorAxes(): Map<string, ColorAxis> {
    return loadColorAxisMap();
}

/**
 * Forces reload of the color axis mapping from CSV
 * Useful if the CSV file has been updated
 */
export function reloadColorAxes(): Map<string, ColorAxis> {
    colorAxisMap = null;
    loadAttempted = false;
    return loadColorAxisMap();
}
