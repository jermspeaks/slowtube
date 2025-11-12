import express from 'express'
import multer from 'multer'
import { importFromDataJson, importFromData2Json, importFromLetterboxdCSV } from '../services/import.js'

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    const isCsv = file.mimetype === 'text/csv' || 
                 file.mimetype === 'application/csv' || 
                 file.originalname.endsWith('.csv')
    
    if (isCsv) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are allowed'))
    }
  },
})

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

// Import from Letterboxd CSV file
router.post('/letterboxd', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a Letterboxd CSV file.' })
    }

    // Validate CSV file
    const fileName = req.file.originalname.toLowerCase()
    const isCsv = fileName.endsWith('.csv') || 
                  req.file.mimetype === 'text/csv' || 
                  req.file.mimetype === 'application/csv'

    if (!isCsv) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a CSV file.' })
    }

    const fileContent = req.file.buffer.toString('utf-8')
    const result = await importFromLetterboxdCSV(fileContent)

    res.json({
      message: 'Import completed',
      ...result,
    })
  } catch (error: any) {
    console.error('Error importing from Letterboxd CSV:', error)
    res.status(500).json({ error: error.message || 'Failed to import from Letterboxd CSV' })
  }
})

export default router

