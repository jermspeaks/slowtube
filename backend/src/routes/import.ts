import express from 'express'
import { importFromDataJson } from '../services/import.js'

const router = express.Router()

// Import from data.json
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

export default router

