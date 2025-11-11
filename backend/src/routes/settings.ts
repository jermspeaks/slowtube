import express from 'express'
import { settingsQueries } from '../services/database.js'

const router = express.Router()

// Get a setting value by key
router.get('/:key', (req, res) => {
  try {
    const { key } = req.params
    const value = settingsQueries.getSetting(key)
    
    if (value === null) {
      return res.status(404).json({ error: `Setting '${key}' not found` })
    }
    
    res.json({ key, value })
  } catch (error) {
    console.error('Error fetching setting:', error)
    res.status(500).json({ error: 'Failed to fetch setting' })
  }
})

// Set a setting value
router.post('/', (req, res) => {
  try {
    const { key, value } = req.body
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'key and value are required' })
    }
    
    settingsQueries.setSetting(key, String(value))
    
    res.json({ key, value, message: 'Setting updated successfully' })
  } catch (error) {
    console.error('Error setting setting:', error)
    res.status(500).json({ error: 'Failed to set setting' })
  }
})

export default router

