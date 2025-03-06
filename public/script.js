let allWords = [];
let words = [];
let currentWordIndex = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
let wrongWords = [];

// Toggling German/English
let showingEnglish = false;

// Prevent repeated clicks on the same question:
let questionAnswered = false;

async function loadWords() {
  try {
    const response = await fetch('words.json');
    
    if (!response.ok) {
      document.getElementById('word').innerText = 'Error loading words';
      return;
    }
    
    allWords = await response.json();
    
    // Shuffle the words for a more engaging experience
    words = [...shuffleArray(allWords)];
    updateStatus();
    showWord();
    
    // Enable buttons once words are loaded
    document.querySelectorAll('.button').forEach(btn => {
      btn.disabled = false;
    });
  } catch (error) {
    console.error('Failed to load words:', error);
    document.getElementById('word').innerText = 'Failed to load words';
  }
}

// Fisher-Yates shuffle algorithm for randomizing words
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Toggle between the German word and its English translation
function toggleTranslation() {
  if (!words.length) return;
  showingEnglish = !showingEnglish;
  const current = words[currentWordIndex];
  
  const wordElement = document.getElementById('word');
  
  // Add a transition effect
  wordElement.style.opacity = '0';
  
  setTimeout(() => {
    wordElement.innerText = showingEnglish
      ? current.translation
      : current.word;
    wordElement.style.opacity = '1';
  }, 150);
}

function updateStatus() {
  document.getElementById('progress').innerText = correctAnswers + wrongAnswers;
  document.getElementById('remaining').innerText = words.length - (correctAnswers + wrongAnswers);
}

function showWord() {
  if (currentWordIndex < words.length) {
    // Reset the "answered" flag so each word can only be answered once
    questionAnswered = false;
    
    // Reset showing English
    showingEnglish = false;
    
    const wordElement = document.getElementById('word');
    wordElement.innerText = words[currentWordIndex].word;
    wordElement.style.opacity = '1';

    // Reset buttons
    document.querySelectorAll('.button').forEach(btn => {
      btn.classList.remove('correct', 'wrong');
      btn.disabled = false;
    });
    
    // Next button is disabled until a user picks an answer
    document.getElementById('nextButton').disabled = true;
  } else {
    stopQuiz();
  }
}

function checkAnswer(article) {
  // If user already answered this word, do nothing
  if (questionAnswered) return;
  questionAnswered = true;

  const correctArticle = words[currentWordIndex].article;

  // Mark correct or wrong
  if (article === correctArticle) {
    correctAnswers++;
    document.querySelector(`button[onclick="checkAnswer('${article}')"]`).classList.add('correct');
    
    // Add a subtle success animation
    animateSuccess();
  } else {
    wrongAnswers++;
    wrongWords.push({
      word: words[currentWordIndex].word,
      article: words[currentWordIndex].article,
      translation: words[currentWordIndex].translation,
      yourAnswer: article
    });
    document.querySelector(`button[onclick="checkAnswer('${article}')"]`).classList.add('wrong');
    document.querySelector(`button[onclick="checkAnswer('${correctArticle}')"]`).classList.add('correct');
    
    // Add a subtle error animation
    animateError();
  }

  // Disable the 3 article buttons so they can't be re-clicked
  const buttons = document.querySelectorAll('#buttons .button');
  buttons.forEach(btn => btn.disabled = true);

  // Now user can proceed with Next
  document.getElementById('nextButton').disabled = false;

  updateStatus();
}

// Simple success animation
function animateSuccess() {
  const wordElement = document.getElementById('word');
  wordElement.style.transform = 'scale(1.05)';
  setTimeout(() => {
    wordElement.style.transform = 'scale(1)';
  }, 300);
}

// Simple error animation
function animateError() {
  const wordElement = document.getElementById('word');
  wordElement.style.transform = 'translateX(5px)';
  setTimeout(() => {
    wordElement.style.transform = 'translateX(-5px)';
    setTimeout(() => {
      wordElement.style.transform = 'translateX(0)';
    }, 100);
  }, 100);
}

function nextWord() {
  currentWordIndex++;
  
  // Add a smooth transition between words
  const wordElement = document.getElementById('word');
  wordElement.style.opacity = '0';
  
  setTimeout(() => {
    showWord();
  }, 150);
}

function stopQuiz() {
  document.getElementById('results').style.display = 'block';

  let wrongWordsList = '';
  let resultsContent = '';
  
  resultsContent += `
    <p><strong>Correct Answers:</strong> ${correctAnswers}</p>
    <p><strong>Wrong Answers:</strong> ${wrongAnswers}</p>
    <p><strong>Total Words Answered:</strong> ${correctAnswers + wrongAnswers}</p>
  `;
  
  // Calculate percentage score
  const percentage = correctAnswers > 0 ? 
    Math.round((correctAnswers / (correctAnswers + wrongAnswers)) * 100) : 0;
  
  resultsContent += `<p><strong>Score:</strong> ${percentage}%</p>`;
  
  if (wrongWords.length > 0) {
    wrongWordsList = '<h3>Words to Practice:</h3><ul>';
    wrongWords.forEach(item => {
      wrongWordsList += `
        <li>
          <div><strong>${item.word}</strong> (${item.translation})</div>
          <div>Correct: <strong>${item.article}</strong>, Your answer: <span style="color: var(--wrong)">${item.yourAnswer}</span></div>
        </li>`;
    });
    wrongWordsList += '</ul>';
    
    resultsContent += wrongWordsList;
  } else if (correctAnswers > 0) {
    resultsContent += '<p>Perfect score! You got all the articles right! 🎉</p>';
  }

  document.getElementById('results-content').innerHTML = resultsContent;

  // Hide quiz container
  document.querySelector('.quiz-container').style.display = 'none';

  // Show "Failed list" button & "Save" if any failures
  if (wrongWords.length > 0) {
    document.getElementById('failedListButton').style.display = 'inline-block';
    document.getElementById('saveFailedListButton').style.display = 'inline-block';
  }

  // Show container for previously saved lists
  document.getElementById('failedListsContainer').style.display = 'block';
  fetchFailedLists();
}

// Start a new quiz with only the previously wrong words
function startFailedListQuiz() {
  words = [...wrongWords];
  currentWordIndex = 0;
  correctAnswers = 0;
  wrongAnswers = 0;
  wrongWords = [];

  // Shuffle the mistake words
  words = shuffleArray(words);

  // Hide results
  document.getElementById('results').style.display = 'none';
  // Hide the "failed list" and "save" buttons
  document.getElementById('failedListButton').style.display = 'none';
  document.getElementById('saveFailedListButton').style.display = 'none';
  
  // Hide container for previously saved lists
  document.getElementById('failedListsContainer').style.display = 'none';

  // Show quiz container again
  document.querySelector('.quiz-container').style.display = 'block';

  updateStatus();
  showWord();
}

// Save the current 'wrongWords' to a new JSON file on the server
async function saveFailedList() {
  try {
    if (wrongWords.length === 0) {
      alert('No words to save! You got everything right!');
      return;
    }

    const response = await fetch('/quiz-api/failed-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wrongWords)
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert('Error: ' + (errorData.error || 'Could not save list.'));
      return;
    }

    const data = await response.json();
    alert('List saved successfully as: ' + data.fileName);
    fetchFailedLists();

  } catch (err) {
    console.error(err);
    alert('Error saving list: ' + err.message);
  }
}

// Fetch the list of existing saved failed-lists
async function fetchFailedLists() {
  const select = document.getElementById('failedListsSelect');
  select.innerHTML = '<option value="">-- Select a saved list --</option>';

  try {
    const res = await fetch('/quiz-api/failed-lists');
    if (!res.ok) {
      document.getElementById('loadError').innerText = 'Could not load saved lists.';
      return;
    }
    const data = await res.json();
    const files = data.files || [];

    if (files.length === 0) {
      document.getElementById('loadError').innerText = 'No saved lists found.';
      return;
    }

    files.forEach(fileName => {
      const option = document.createElement('option');
      option.value = fileName;
      option.innerText = fileName;
      select.appendChild(option);
    });
    
    document.getElementById('loadError').innerText = '';
  } catch (err) {
    console.error('Error fetching lists:', err);
    document.getElementById('loadError').innerText = 'Error fetching lists: ' + err.message;
  }
}

// Load the words from the selected saved file and start a quiz with them
async function loadSelectedFailedList() {
  const select = document.getElementById('failedListsSelect');
  const fileName = select.value;
  if (!fileName) {
    document.getElementById('loadError').innerText = 'Please select a list first.';
    return;
  }
  document.getElementById('loadError').innerText = '';

  try {
    const res = await fetch('/quiz-api/failed-lists/' + fileName);
    if (!res.ok) {
      document.getElementById('loadError').innerText = 'Error loading file.';
      return;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      document.getElementById('loadError').innerText = 'No words found in that list.';
      return;
    }

    words = shuffleArray(data);
    currentWordIndex = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    wrongWords = [];

    // Hide results
    document.getElementById('results').style.display = 'none';
    document.getElementById('failedListButton').style.display = 'none';
    document.getElementById('saveFailedListButton').style.display = 'none';
    
    // Hide container for previously saved lists
    document.getElementById('failedListsContainer').style.display = 'none';

    // Show quiz container again
    document.querySelector('.quiz-container').style.display = 'block';

    updateStatus();
    showWord();
  } catch (err) {
    console.error('Error loading file:', err);
    document.getElementById('loadError').innerText = 'Error: ' + err.message;
  }
}

// On word click, toggle translation
document.getElementById('word').addEventListener('click', toggleTranslation);

// Initialize the app with animations and transitions
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.button').forEach(btn => {
    btn.disabled = true; // Disable buttons until words are loaded
  });
  
  // Add transition for word element
  const wordElement = document.getElementById('word');
  wordElement.style.transition = 'opacity 0.15s ease, transform 0.3s ease';
  
  // Load words
  loadWords();
});