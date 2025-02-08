// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// For parsing JSON POST bodies
app.use(express.json());

// Serve all static files (including articles.html) from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Directory where we'll save the failed-lists
const FAILED_LISTS_DIR = path.join(__dirname, 'failed-lists');

// Ensure the directory exists
if (!fs.existsSync(FAILED_LISTS_DIR)) {
  fs.mkdirSync(FAILED_LISTS_DIR);
}

/**
 * POST /failed-lists
 * Body: JSON array of failed words
 * Saves the array to a new JSON file in failed-lists/ folder,
 * with a timestamp-based filename.
 */
app.post('/failed-lists', (req, res) => {
  try {
    // The posted data: an array of failed words, e.g. wrongWords
    const failedWords = req.body;
    if (!Array.isArray(failedWords)) {
      return res.status(400).json({ error: 'Data must be an array.' });
    }
    if (failedWords.length === 0) {
      return res.status(400).json({ error: 'No words to save.' });
    }

    // Create a unique filename with current date/time
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `failed_${timestamp}.json`;
    const filePath = path.join(FAILED_LISTS_DIR, fileName);

    // Write the file
    fs.writeFileSync(filePath, JSON.stringify(failedWords, null, 2), 'utf-8');

    return res.json({ message: 'Failed list saved.', fileName });
  } catch (error) {
    console.error('Error saving file:', error);
    return res.status(500).json({ error: 'Error saving file.' });
  }
});

/**
 * GET /failed-lists
 * Returns an array of all the JSON filenames in the failed-lists/ folder.
 */
app.get('/failed-lists', (req, res) => {
  fs.readdir(FAILED_LISTS_DIR, (err, files) => {
    if (err) {
      console.error('Error reading failed-lists dir:', err);
      return res.status(500).json({ error: 'Cannot read failed-lists directory.' });
    }

    // Filter only .json files
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    return res.json({ files: jsonFiles });
  });
});

/**
 * GET /failed-lists/:fileName
 * Returns the contents of a specific failed-list file as JSON.
 */
app.get('/failed-lists/:fileName', (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(FAILED_LISTS_DIR, fileName);

  // Basic check to avoid going outside the folder, etc.
  if (!fileName.endsWith('.json')) {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return res.status(500).json({ error: 'Cannot read the file.' });
    }
    try {
      const jsonData = JSON.parse(data);
      return res.json(jsonData);
    } catch (parseErr) {
      console.error('Error parsing JSON:', parseErr);
      return res.status(500).json({ error: 'File is not valid JSON.' });
    }
  });
});

// Start the server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
