import { NextRequest, NextResponse } from 'next/server'
import { geminiService } from 'vigaia-ai/lib/openai'

export async function GET(request: NextRequest) {
     try {
          const { searchParams } = new URL(request.url)
          const provider = searchParams.get('provider') || 'gemini'

          if (provider === 'gemini') {
               const models = await geminiService.listAvailableModels()
               return NextResponse.json({
                    provider: 'gemini',
                    models: models.map((model: { name: string; displayName?: string; supportedGenerationMethods?: string[] }) => ({
                         name: model.name,
                         displayName: model.displayName || model.name,
                         supportedGenerationMethods: model.supportedGenerationMethods || []
                    }))
               })
          }

          return NextResponse.json({
               error: 'Only gemini provider is supported for model listing',
               availableProviders: ['gemini']
          }, { status: 400 })

     } catch (error) {
          console.error('Models API error:', error)
          return NextResponse.json(
               { error: 'Failed to list models' },
               { status: 500 }
          )
     }
}
