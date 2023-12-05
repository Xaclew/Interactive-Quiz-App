const dataBaseURL = "https://interactive-quiz-app-default-rtdb.firebaseio.com/";
let currentQuestionIndex = 0; // Ensure this is a global variable
let quizQuestions = [];
let userAnswers = {};
let currentUser = null;

///Much of this is based on Original Code by Sean Collier(https://github.com/scollier87), enhanced by me to be compatible with my JSON, html, and CSS files, quite the learning experience in itself!


async function fetchQuestions() {
    try {
        const response = await fetch(dataBaseURL + "data/Questions.json");
        const data = await response.json();
        if (data) {
            let fetchedQuestions = Object.entries(data).map(([id, questionData]) => ({ id, ...questionData }));
            if (!localStorage.getItem('questionOrder')) {
                // Shuffle only if the question order is not saved
                quizQuestions = randomQuestions(fetchedQuestions);
                localStorage.setItem('questionOrder', JSON.stringify(quizQuestions.map(q => q.id)));
            } else {
                // Load questions in saved order
                let savedOrder = JSON.parse(localStorage.getItem('questionOrder'));
                quizQuestions = savedOrder.map(id => fetchedQuestions.find(q => q.id === id));
            }

            console.log("Fetched Questions:", quizQuestions);
        } else {
            console.log("No data found at the specified path.");
        }
    } catch (error) {
        console.error("Error fetching data: ", error);
    }
}






function randomQuestions(array) {
    let shuffledArray = [...array]; // Create a copy of the array
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray; // Return the shuffled array
}



async function loadQuizProgress() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${dataBaseURL}data/Users/${currentUser}/progress.json`);
        const progress = await response.json();

        if (progress) {
            const lastQuestionIndex = quizQuestions.findIndex(q => q.id === progress.lastQuestionId);
            currentQuestionIndex = lastQuestionIndex + 1;

            // Check if the currentQuestionIndex is beyond the list of questions
            if (currentQuestionIndex >= quizQuestions.length) {
                currentQuestionIndex = -1; // Indicate all questions have been answered
            }
        } else {
            currentQuestionIndex = 0; // Start from the beginning if no progress is found
        }
    } catch (error) {
        console.error("Error loading quiz progress:", error);
    }
}

function findNextUnansweredQuestion() {
    for (let i = 0; i < quizQuestions.length; i++) {
        if (!userAnswers.hasOwnProperty(quizQuestions[i].id)) {
            return i; // Return index of next unanswered question
        }
    }
    return -1; // Return -1 if all questions are answered
}


function setupEventDelegationForNavigation() {
    const navigationContainer = document.querySelector('.navigation');

    if (navigationContainer) {
        navigationContainer.addEventListener('click', handleNavButtonClick);
    }
}


function handleNavButtonClick(event) {
    const target = event.target;

    if (target.classList.contains('prev')) {
        // Handle previous button click
        handlePreviousButtonClick();
    } else if (target.classList.contains('next')) {
        // Handle next button click
        handleNextButtonClick();
    } else if (target.classList.contains('submit')) {
        // Handle submit button click
        validateAnswers();
        resetUserData();
    }
}

function resetUserData() {
    if (!currentUser) return;

    // Reset progress
    const initialProgress = {
        lastQuestionId: null,
        totalScore: 0
    };
    fetch(`${dataBaseURL}data/Users/${currentUser}/progress.json`, {
        method: 'PUT',
        body: JSON.stringify(initialProgress),
        headers: {'Content-Type': 'application/json'}
    }).catch(error => console.error('Error resetting progress:', error));

    // Clear responses
    const clearResponses = {};
    fetch(`${dataBaseURL}data/Users/${currentUser}/responses.json`, {
        method: 'PUT',
        body: JSON.stringify(clearResponses),
        headers: {'Content-Type': 'application/json'}
    }).catch(error => console.error('Error clearing responses:', error));
}

function handlePreviousButtonClick() {
    console.log('Current Index Before Previous:', currentQuestionIndex);
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        console.log('Current Index After Previous:', currentQuestionIndex);
        displayQuestion(currentQuestionIndex);
        updateProgressBar();
    } else {
        console.log('Already at the first question, cannot go back further.');
    }
}

function updateProgressBar(){
    document.getElementById("prog-bar-hide").style.width = (100 - ((Object.keys(userAnswers).length/12)*100))+'%';
}


function handleNextButtonClick() {
    console.log('Current Index Before Next:', currentQuestionIndex);
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        console.log('Current Index After Next:', currentQuestionIndex);
        displayQuestion(currentQuestionIndex);
        updateProgressBar();
        console.log(userAnswers);
    }
}



function validateAnswers() {
    /*
    if (Object.keys(userAnswers).length < quizQuestions.length) {
        alert("Please answer all questions to submit.");
        return;
    }
    */
    console.log('validate answers is called...')
    let correctCount = quizQuestions.reduce((count, question) => {
        // Check if the question is of 'matching' type
        if (question.type === "matching") {
            // Compare each key-value pair in the answer object
            let isMatchCorrect = true;
            for (let key in question.answer) {
                if (!userAnswers[question.id] || userAnswers[question.id][key] !== question.answer[key]) {
                    isMatchCorrect = false;
                    break;
                }
            }
            return count + (isMatchCorrect ? 1 : 0);
        }
        // For 'ordering' questions, compare the order of the array elements
        else if (Array.isArray(question.answer)) {
            const isOrderCorrect = Array.isArray(userAnswers[question.id]) &&
                                    userAnswers[question.id].length === question.answer.length &&
                                    userAnswers[question.id].every((value, index) => value === question.answer[index]);
            return count + (isOrderCorrect ? 1 : 0);
        }
        // For other question types (like multiple choice, fill-in-the-blank)
        else {
            return count + (userAnswers[question.id] === question.answer ? 1 : 0);
        }
    }, 0);

    alert(`You got ${correctCount} out of ${quizQuestions.length} questions correct.`);
    localStorage.removeItem('quizProgress');
}




function displayCurrentQuestion() {
    // Check if there are no questions available
    if (quizQuestions.length === 0) {
        console.error('No quiz questions available.');
        displayMessage('No questions are available at this time.');
        return;
    }

    // Check if all questions have been answered
    if (currentQuestionIndex === -1) {
        console.log('All questions have been answered.');
        displayMessage('You have completed all questions. Check your results!');
        return;
    }

    // Check for an invalid index
    if (currentQuestionIndex < 0 || currentQuestionIndex >= quizQuestions.length) {
        console.error('Invalid question index:', currentQuestionIndex);
        displayMessage('Invalid question index. Please restart the quiz.');
        return;
    }

    // Display the current question
    displayQuestion(currentQuestionIndex);
    updateProgressBar();
}

function displayMessage(message) {
    const questionsArea = document.querySelector('.quiz-container');
    questionsArea.innerHTML = `<p>${message}</p>`;
}

function displayQuestion(index) {
    if (index < 0 || index >= quizQuestions.length) {
        console.error('Invalid question index:', index);
        return; // Exit the function if index is invalid
    }

    const question = quizQuestions[index];
    if (!question) {
        console.error('No question found at index:', index);
        return; // Exit the function if question is undefined
    }
    clearPreviousQuestionDisplay();

    switch (question.type) {
        case 'fill-in-the-blank':
            console.log("test");
            displayFillInTheBlankQuestion(question);
            break;
        case "matching":
            console.log("matching-function-called");
            displayMatchingQuestion(question);
            break;
        case "ordering":
            displayOrderingQuestion(question);
            break;
        default:
            displayMultipleChoiceQuestion(question);

    }

    const submitButton = document.querySelector('#submit');
    if (submitButton) {
    if (index === quizQuestions.length - 1) {
        submitButton.style.display = 'block';
    } else {
        submitButton.style.display = 'none';
    }
}

}



function clearPreviousQuestionDisplay() {
    const questionArea = document.querySelector('#quiz-container');
    if (questionArea) {
        questionArea.innerHTML = '';
    }

    const fillInTheBlankContainer = document.querySelector('.fill-in-the-blank');
    console.log("text");
    if (fillInTheBlankContainer) {
        fillInTheBlankContainer.style.display = 'none';
    }
}


function displayFillInTheBlankQuestion(question) {
    clearPreviousQuestionDisplay();
    console.log(question.text);

    // Display the question
    const questionsArea = document.querySelector('.quiz-container');
    questionsArea.innerHTML = question.text + 
    `
    <div class="fill-in-the-blank" style="display: none;">
    <label for="fill-in-answer" class="fill-in-question-text"></label>
    <input type="text" id="fill-in-answer" class="blank-input" placeholder="Type your answer here"> 
</div>
    
    `

    // Find the fill-in-the-blank container and input field
    const fillInTheBlankContainer = document.querySelector('.fill-in-the-blank');
    const blankInput = document.querySelector('.blank-input');
console.log(blankInput);
    // Remove existing event listeners from the input field
    const newInput = blankInput.cloneNode(true);
    
    fillInTheBlankContainer.replaceChild(newInput, blankInput);

    // Update the input field value based on the stored answer or reset it
    newInput.value = userAnswers[question.id] || '';

    // Show the fill-in-the-blank container
    fillInTheBlankContainer.style.display = 'block';

    // Update the stored answer whenever the input changes
    newInput.addEventListener('input', function() {
        userAnswers[question.id] = newInput.value;
        localStorage.setItem('quizProgress', JSON.stringify({ currentQuestionIndex, userAnswers }));
    });
}




function displayMatchingQuestion(question) {
    clearPreviousQuestionDisplay();
    const questionsArea = document.querySelector('#quiz-container');
    questionsArea.innerHTML = question.text;

    const matchingArea = document.createElement('div');
    matchingArea.className = 'matching';

    //store user's selection for this question
    let userSelection = {};

    Object.keys(question.pairs).forEach((key, index) => {
        const label = document.createElement('label');
        label.textContent = key + ': ';
        label.htmlFor = 'match-' + index;
        matchingArea.appendChild(label);

        const select = document.createElement('select');
        select.id = 'match-' + index;

        //add an empty default option
        const defaultOption = document.createElement('option');
        defaultOption.textContent = '--select--';
        defaultOption.value = '';
        select.appendChild(defaultOption);

        Object.values(question.pairs).forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        //set current selection if available
        if (userAnswers[question.id] && userAnswers[question.id][key]) {
            select.value = userAnswers[question.id][key];
        }

        //update the selection in the useranswers object
        select.addEventListener('change', () => {
            userSelection[key] = select.value;
            userAnswers[question.id] = userSelection;
            storeAnswer(question.id, userSelection);
        })

        matchingArea.appendChild(select);
        matchingArea.appendChild(document.createElement('br'));
    });

    questionsArea.appendChild(matchingArea);
}




function displayOrderingQuestion(question) {
    clearPreviousQuestionDisplay();
    const questionsArea = document.querySelector('#quiz-container');
    questionsArea.innerHTML = '';

    // Displaying question text
    const questionText = document.createElement('p');
    questionText.textContent = question.Question;
    questionsArea.appendChild(questionText);

    // Create list for ordering items
    const list = document.createElement('ul');
    list.id = 'ordering-list';

    // Populate list with items
    const orderFromStorage = userAnswers[question.id];
    console.log(userAnswers[question.id]);
    const items = orderFromStorage || question.items;
    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = item;
        listItem.classList.add('ordering-item');
        listItem.addEventListener('click', function() {
            toggleSelection(listItem);
        });
        list.appendChild(listItem);
    });
    questionsArea.appendChild(list);
    addMovementButtons(list, question.id);
    const orderedItems = Array.from(list.querySelectorAll('.ordering-item')).map(item => item.textContent);
    storeAnswer(question.id, orderedItems);
}

function toggleSelection(listItem) {
    // Clear the 'selected' class from all items
    listItem.closest('ul').querySelectorAll('.ordering-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Toggle the 'selected' class on the clicked item
    listItem.classList.add('selected');
}




function addMovementButtons(list, questionId) {
    const moveUpButton = document.createElement('button');
    moveUpButton.textContent = 'Move Up';
    moveUpButton.addEventListener('click', function() {
        moveItem(list, -1, questionId);
    });

    const moveDownButton = document.createElement('button');
    moveDownButton.textContent = 'Move Down';
    moveDownButton.addEventListener('click', function() {
        moveItem(list, 1, questionId);
    });

    const buttonsContainer = document.createElement('div');
    buttonsContainer.appendChild(moveUpButton);
    buttonsContainer.appendChild(moveDownButton);

    const questionsArea = document.querySelector('#quiz-container');
    questionsArea.appendChild(buttonsContainer);
}


function moveItem(list, direction, questionId) {
    const selected = list.querySelector('.selected');
    if (!selected) return;

    if (direction === -1 && selected.previousElementSibling) {
        list.insertBefore(selected, selected.previousElementSibling);
    } else if (direction === 1 && selected.nextElementSibling) {
        list.insertBefore(selected.nextElementSibling, selected);
    }
    saveOrder(list, questionId);
}



function saveOrder(list, questionId) {
    const orderedItems = Array.from(list.querySelectorAll('.ordering-item')).map(item => item.textContent);
    userAnswers[questionId] = orderedItems;
    storeAnswer(questionId, orderedItems);
}

function storeAnswer(questionId, answer) {
    if (!currentUser) return;

    // Update the user's responses
    const timestamp = new Date().toISOString();
    const userResponse = { response: answer, timestamp };
    fetch(`${dataBaseURL}data/Users/${currentUser}/responses/${questionId}.json`, {
        method: 'PUT',
        body: JSON.stringify(userResponse),
        headers: {'Content-Type': 'application/json'}
    }).catch(error => console.error('Error saving response:', error));

    // Update the userAnswers object
    userAnswers[questionId] = answer;

    // Calculate the total score
    let totalScore = 0;
    quizQuestions.forEach(question => {
        const userAnswer = userAnswers[question.id];
        if (userAnswer && userAnswer === question.answer) {
            totalScore++; // Increment score for each correct answer
        }
    });

    // Update the user's progress
    const progress = { lastQuestionId: questionId, totalScore: totalScore };
    fetch(`${dataBaseURL}data/Users/${currentUser}/progress.json`, {
        method: 'PUT',
        body: JSON.stringify(progress),
        headers: {'Content-Type': 'application/json'}
    }).catch(error => console.error('Error updating progress:', error));
}




function displayMultipleChoiceQuestion(question) {
    clearPreviousQuestionDisplay();

    const questionsArea = document.querySelector('#quiz-container');
    questionsArea.innerHTML = '';

    const questionText = document.createElement('p');
    console.log(question.text);
    questionText.textContent = question.text;
    questionsArea.appendChild(questionText);

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options';

    question.options.forEach(option => {
        const optionButton = document.createElement('button');
        optionButton.classList.add('option');
        optionButton.textContent = option;

        optionButton.addEventListener('click', function() {
            optionsContainer.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected');
            });
            optionButton.classList.add('selected');
            storeAnswer(question.id, option);
        })
        optionsContainer.appendChild(optionButton);
    });
    questionsArea.appendChild(optionsContainer);
}




async function initQuiz() {
    await loadQuizProgress();
    await fetchQuestions();
    displayCurrentQuestion();
    setupEventDelegationForNavigation();
}
document.addEventListener('DOMContentLoaded', async () => {
    showModal();
    await fetchQuestions();
    await loadQuizProgress();
    setupEventDelegationForNavigation();
    displayCurrentQuestion();
});



document.addEventListener('DOMContentLoaded', initQuiz);


document.addEventListener('DOMContentLoaded', loadQuizProgress); 


function showModal() {
    document.getElementById('login-modal').style.display = 'block';
    document.getElementById('prog').style.display = 'none';
    document.getElementById('btn-container').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'none';
}

function closeModal() {
    document.getElementById('login-modal').style.display = 'none';
        document.getElementById('prog').style.display = 'flex';
    document.getElementById('btn-container').style.display = 'block';
    document.getElementById('quiz-container').style.display = 'flex';
}

document.getElementById('login-button').addEventListener('click', async function() {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        alert("Please enter a username.");
        return;
    }

    const userExists = await checkUserExists(username);
    if (userExists) {
        currentUser = username;
        closeModal();
        initQuiz(); // Start/resume the quiz
    } else {
        alert("User not found. Please enter a valid username.");
    }
});

async function checkUserExists(username) {
    try {
        const response = await fetch(`${dataBaseURL}data/Users/${username}.json`);
        const data = await response.json();
        return data !== null; // User exists if data is not null
    } catch (error) {
        console.error("Error checking user:", error);
        return false;
    }
}
