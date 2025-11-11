import express from 'express'
import { importFromDataJson, importFromData2Json } from '../services/import.js'

const router = express.Router()

// Import from data.json (TMDB IDs)
router.post('/tmdb', async (req, res) => {
  try {
    const result = await importFromDataJson()
    res.json({
      message: 'Import completed',
      ...result,
    })
  } catch (error: any) {
    console.error('Error importing from data.json:', error)
    res.status(500).json({ error: error.message || 'Failed to import from data.json' })
  }
})

// Import from data2.json (IMDb IDs)
router.post('/imdb', async (req, res) => {
  try {
    const result = await importFromData2Json()
    res.json({
      message: 'Import completed',
      ...result,
    })
  } catch (error: any) {
    console.error('Error importing from data2.json:', error)
    res.status(500).json({ error: error.message || 'Failed to import from data2.json' })
  }
})

export default router

