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
  const response = await fetch('words.json');
  allWords = await response.json();
  words = [...allWords];
  updateStatus();
  showWord();
}

// Toggle between the German word and its English translation
function toggleTranslation() {
  if (!words.length) return;
  showingEnglish = !showingEnglish;
  const current = words[currentWordIndex];
  document.getElementById('word').innerText = showingEnglish
    ? current.translation
    : current.word;
}

function updateStatus() {
  document.getElementById('progress').innerText = correctAnswers + wrongAnswers;
  document.getElementById('remaining').innerText = words.length - (correctAnswers + wrongAnswers);
}

function showWord() {
  if (currentWordIndex < words.length) {
    // Reset the "answered" flag so each word can only be answered once
    questionAnswered = false;

    showingEnglish = false;
    document.getElementById('word').innerText = words[currentWordIndex].word;

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
  }

  // Disable the 3 article buttons so they can't be re-clicked
  const buttons = document.querySelectorAll('#buttons .button');
  buttons.forEach(btn => btn.disabled = true);

  // Now user can proceed with Next
  document.getElementById('nextButton').disabled = false;

  updateStatus();
}

function nextWord() {
  currentWordIndex++;
  showWord();
}

function stopQuiz() {
  document.getElementById('results').style.display = 'block';

  let wrongWordsList = '';
  if (wrongWords.length > 0) {
    wrongWordsList = '<h3>Words You Got Wrong:</h3><ul>';
    wrongWords.forEach(item => {
      wrongWordsList += `
        <li>
          ${item.word} (correct: ${item.article}, your answer: ${item.yourAnswer})
        </li>`;
    });
    wrongWordsList += '</ul>';
  }

  document.getElementById('results').innerHTML = `
    <h2>Results</h2>
    <p>Correct Answers: ${correctAnswers}</p>
    <p>Wrong Answers: ${wrongAnswers}</p>
    <p>Total Words Answered: ${correctAnswers + wrongAnswers}</p>
    ${wrongWordsList}
  `;

  // Hide quiz controls
  document.getElementById('buttons').style.display = 'none';
  document.getElementById('word').style.display = 'none';
  document.getElementById('nextButton').style.display = 'none';
  document.getElementById('stopButton').style.display = 'none';

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

  // Hide results
  document.getElementById('results').style.display = 'none';
  // Hide the "failed list" and "save" buttons
  document.getElementById('failedListButton').style.display = 'none';
  document.getElementById('saveFailedListButton').style.display = 'none';

  // Show quiz UI again
  document.getElementById('buttons').style.display = 'block';
  document.getElementById('word').style.display = 'block';
  document.getElementById('nextButton').style.display = 'inline-block';
  document.getElementById('stopButton').style.display = 'inline-block';

  updateStatus();
  showWord();
}

// Save the current 'wrongWords' to a new JSON file on the server
async function saveFailedList() {
  try {
    if (wrongWords.length === 0) {
      alert('No failed words to save!');
      return;
    }

    const response = await fetch('/quiz-api/failed-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wrongWords)
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert('Error: ' + (errorData.error || 'Could not save failed list.'));
      return;
    }

    const data = await response.json();
    alert('Saved successfully: ' + data.fileName);
    fetchFailedLists();

  } catch (err) {
    console.error(err);
    alert('Error saving failed list: ' + err.message);
  }
}

// Fetch the list of existing saved failed-lists
async function fetchFailedLists() {
  const select = document.getElementById('failedListsSelect');
  select.innerHTML = '<option value="">-- Choose a file --</option>';

  try {
    const res = await fetch('/quiz-api/failed-lists');
    if (!res.ok) {
      document.getElementById('loadError').innerText = 'Could not load saved lists.';
      return;
    }
    const data = await res.json();
    const files = data.files || [];

    files.forEach(fileName => {
      const option = document.createElement('option');
      option.value = fileName;
      option.innerText = fileName;
      select.appendChild(option);
    });
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
    document.getElementById('loadError').innerText = 'Please select a file first.';
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
      document.getElementById('loadError').innerText = 'No words found in that file.';
      return;
    }

    words = data;
    currentWordIndex = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    wrongWords = [];

    // Hide results
    document.getElementById('results').style.display = 'none';
    document.getElementById('failedListButton').style.display = 'none';
    document.getElementById('saveFailedListButton').style.display = 'none';

    // Show quiz UI again
    document.getElementById('buttons').style.display = 'block';
    document.getElementById('word').style.display = 'block';
    document.getElementById('nextButton').style.display = 'inline-block';
    document.getElementById('stopButton').style.display = 'inline-block';

    updateStatus();
    showWord();
  } catch (err) {
    console.error('Error loading file:', err);
    document.getElementById('loadError').innerText = 'Error: ' + err.message;
  }
}

// On word click, toggle translation
document.getElementById('word').addEventListener('click', toggleTranslation);

// Load initial words on page load
loadWords();