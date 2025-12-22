/**
 * Color Axis Loader
 * Loads product color axis mapping from CSV file
 * Maps product handles to their color axes (Green, Pink, Blue, Yellow)
 */

import fs from 'fs';
import path from 'path';

type ColorAxis = 'Green' | 'Pink' | 'Blue' | 'Yellow';

interface ProductColorMapping {
     handle: string;
     colorAxis: ColorAxis;
     productName: string;
     benefits?: string;
}

// Cache for the color axis mapping
let colorAxisMap: Map<string, ColorAxis> | null = null;
let productDetailsMap: Map<string, { colorAxis: ColorAxis; productName: string; benefits?: string }> | null = null;

/**
 * Parse CSV file and extract product handle to color axis mapping
 * Handles multi-line quoted fields properly
 */
function parseColorAxisCSV(): { handleToColor: Map<string, ColorAxis>; handleToDetails: Map<string, { colorAxis: ColorAxis; productName: string; benefits?: string }> } {
     const csvPath = path.join(process.cwd(), 'products-data', 'product-list-with-color-axes.csv');
     
     if (!fs.existsSync(csvPath)) {
          console.warn('[ColorAxis] CSV file not found at:', csvPath);
          return { handleToColor: new Map(), handleToDetails: new Map() };
     }

     const csvContent = fs.readFileSync(csvPath, 'utf-8');
     
     const handleToColor = new Map<string, ColorAxis>();
     const handleToDetails = new Map<string, { colorAxis: ColorAxis; productName: string; benefits?: string }>();

     // Parse CSV properly handling quoted fields that may span multiple lines
     const rows: string[][] = [];
     let currentRow: string[] = [];
     let currentField = '';
     let inQuotes = false;
     
     for (let i = 0; i < csvContent.length; i++) {
          const char = csvContent[i];
          const nextChar = csvContent[i + 1];
          
          if (char === '"') {
               // Handle escaped quotes ("")
               if (nextChar === '"') {
                    currentField += '"';
                    i++; // Skip next quote
               } else {
                    inQuotes = !inQuotes;
               }
          } else if (char === ',' && !inQuotes) {
               // End of field
               currentRow.push(currentField.trim());
               currentField = '';
          } else if ((char === '\n' || char === '\r') && !inQuotes) {
               // End of row (but only if not in quotes)
               if (currentField || currentRow.length > 0) {
                    currentRow.push(currentField.trim());
                    if (currentRow.length > 0 && currentRow.some(f => f.length > 0)) {
                         rows.push(currentRow);
                    }
                    currentRow = [];
                    currentField = '';
               }
               // Skip \r\n combination
               if (char === '\r' && nextChar === '\n') {
                    i++;
               }
          } else {
               currentField += char;
          }
     }
     
     // Add last field and row if any
     if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          if (currentRow.length > 0 && currentRow.some(f => f.length > 0)) {
               rows.push(currentRow);
          }
     }
     
     // Skip header row
     const dataRows = rows.slice(1);
     
     for (const row of dataRows) {
          if (row.length >= 4) {
               const productName = row[0].replace(/^"|"$/g, '').replace(/\n+/g, ' ').trim();
               const handle = row[1].trim();
               const benefits = row[2].replace(/^"|"$/g, '').replace(/\n+/g, ' ').trim();
               const boxColor = row[3].trim() as ColorAxis;
               
               // Validate color axis
               if (['Green', 'Pink', 'Blue', 'Yellow'].includes(boxColor)) {
                    handleToColor.set(handle, boxColor);
                    handleToDetails.set(handle, {
                         colorAxis: boxColor,
                         productName,
                         benefits: benefits || undefined
                    });
               } else {
                    console.warn(`[ColorAxis] Invalid color axis "${boxColor}" for handle "${handle}"`);
               }
          }
     }

     console.log(`[ColorAxis] Loaded ${handleToColor.size} product color mappings from CSV`);
     return { handleToColor, handleToDetails };
}

/**
 * Get color axis for a product handle
 * @param handle - Product handle (e.g., "vitamine-b12")
 * @returns Color axis or undefined if not found
 */
export function getColorAxisForHandle(handle: string): ColorAxis | undefined {
     if (!handle) {
          return undefined;
     }

     // Load mapping if not cached
     if (!colorAxisMap) {
          const { handleToColor, handleToDetails } = parseColorAxisCSV();
          colorAxisMap = handleToColor;
          productDetailsMap = handleToDetails;
     }

     return colorAxisMap.get(handle);
}

/**
 * Get full product details including color axis, name, and benefits
 * @param handle - Product handle
 * @returns Product details or undefined if not found
 */
export function getProductDetailsForHandle(handle: string): { colorAxis: ColorAxis; productName: string; benefits?: string } | undefined {
     if (!handle) {
          return undefined;
     }

     // Load mapping if not cached
     if (!productDetailsMap) {
          const { handleToDetails } = parseColorAxisCSV();
          productDetailsMap = handleToDetails;
          if (!colorAxisMap) {
               const { handleToColor } = parseColorAxisCSV();
               colorAxisMap = handleToColor;
          }
     }

     return productDetailsMap.get(handle);
}

/**
 * Get all color axis mappings (for debugging or bulk operations)
 */
export function getAllColorAxisMappings(): Map<string, ColorAxis> {
     if (!colorAxisMap) {
          const { handleToColor } = parseColorAxisCSV();
          colorAxisMap = handleToColor;
     }
     return new Map(colorAxisMap);
}

/**
 * Clear the cache (useful for testing or when CSV is updated)
 */
export function clearColorAxisCache(): void {
     colorAxisMap = null;
     productDetailsMap = null;
}

