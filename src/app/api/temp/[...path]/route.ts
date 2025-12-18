import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getTempDir } from '@/lib/pdf';

export async function GET(
     request: NextRequest,
     { params }: { params: Promise<{ path: string[] }> }
) {
     try {
          const { path: pathArray } = await params;
          const filePath = pathArray.join('/');
          const tempDir = getTempDir();
          const fullPath = path.join(tempDir, filePath);

          // Security check - ensure the file is within the temp directory
          const resolvedPath = path.resolve(fullPath);
          const resolvedTempDir = path.resolve(tempDir);

          if (!resolvedPath.startsWith(resolvedTempDir)) {
               return NextResponse.json(
                    { error: 'Access denied' },
                    { status: 403 }
               );
          }

          // Check if file exists
          if (!fs.existsSync(fullPath)) {
               return NextResponse.json(
                    { error: 'File not found' },
                    { status: 404 }
               );
          }

          // Read file
          const fileBuffer = fs.readFileSync(fullPath);
          const fileName = path.basename(fullPath);

          // Determine content type based on file extension
          const ext = path.extname(fileName).toLowerCase();
          let contentType = 'application/octet-stream';

          switch (ext) {
               case '.pdf':
                    contentType = 'application/pdf';
                    break;
               case '.jpg':
               case '.jpeg':
                    contentType = 'image/jpeg';
                    break;
               case '.png':
                    contentType = 'image/png';
                    break;
               case '.txt':
                    contentType = 'text/plain';
                    break;
          }

          // Return file with appropriate headers
          return new NextResponse(fileBuffer, {
               status: 200,
               headers: {
                    'Content-Type': contentType,
                    'Content-Disposition': `inline; filename="${fileName}"`,
                    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
               },
          });

     } catch (error) {
          console.error('Error serving file:', error);
          return NextResponse.json(
               { error: 'Internal server error' },
               { status: 500 }
          );
     }
}
