import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'

import { schemaTypes } from './sanity/schemas'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'o4p78bwk'

const workspace = (name: string, title: string, dataset: string, basePath: string) => ({
  name,
  title,
  projectId,
  dataset,
  basePath,
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
})

export default defineConfig([
  workspace('production', 'Production', 'production', '/production'),
  workspace('qa', 'QA', 'qa', '/qa'),
])
