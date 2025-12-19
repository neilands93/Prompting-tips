// --- Debounce Utility ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- DOM Element References & Constants ---
const LS_KEY = 'promptBuilderInputs';
const DEBOUNCE_DELAY = 300;

const tabButtons = document.querySelectorAll('.tab-buttons button[role="tab"]');
const tabPanels = document.querySelectorAll('.tab-section[role="tabpanel"]');

// Get all input/select elements by ID now
const inputElements = document.querySelectorAll('#panel-classic input, #panel-classic select, #panel-combo input, #panel-combo select');

// Use specific IDs directly now, removed inputMap
const classicGoal = document.getElementById('goal');
const classicContext = document.getElementById('context');
const classicExpectations = document.getElementById('expectations');
const comboTask = document.getElementById('task');
const comboReasoning = document.getElementById('reasoning');
const comboRole = document.getElementById('role');
const comboFormat = document.getElementById('format');

const outputClassic = document.getElementById('outputClassic');
const outputCombo = document.getElementById('outputCombo');
const clearClassicBtn = document.querySelector('.clear-classic');
const sendToComboBtn = document.querySelector('.send-to-combo');
const copyClassicBtn = document.querySelector('.copy-button[data-target="outputClassic"]');
const clearComboBtn = document.querySelector('.clear-combo');
const copyComboBtn = document.querySelector('.copy-button[data-target="outputCombo"]');
const themeToggleBtn = document.getElementById('theme-toggle');
const randomBtn = document.getElementById('random-btn');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');

const placeholderClassic = "Your prompt will appear here...";
const placeholderCombo = "Your generated prompt will appear here...";
const HISTORY_KEY = 'promptBuilderHistory';
const originalCopyText = 'Copy';
const originalSendText = 'Send to Combo';

// --- Function Definitions ---

function saveHistory(promptText) {
    if (!promptText || promptText === placeholderClassic || promptText === placeholderCombo) return;

    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    // Avoid duplicates at the top
    if (history.length > 0 && history[0].text === promptText) return;

    history.unshift({
        text: promptText,
        timestamp: new Date().toLocaleString()
    });

    if (history.length > 10) history.pop(); // Keep last 10

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<p style="padding:10px; opacity:0.6;">No history yet.</p>';
        return;
    }

    history.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<span class="timestamp">${item.timestamp}</span>${item.text.substring(0, 60)}...`;
        div.addEventListener('click', () => {
             // For simplicity, we just load it into the active tab's main input or clipboard
             // Better: Copy to clipboard immediately
             navigator.clipboard.writeText(item.text).then(() => showToast("Restored to clipboard!"));
        });
        historyList.appendChild(div);
    });
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showToast("History cleared");
}

function randomizeInputs() {
    const prompts = [
        { task: "explain quantum computing", role: "Subject Matter Expert", format: "a short paragraph", reasoning: "step-by-step" },
        { task: "write a python script to scrape a website", role: "Code Reviewer", format: "Markdown", reasoning: "step-by-step" },
        { task: "draft a cold email to a potential client", role: "Marketing Specialist", format: "an executive summary", reasoning: "" },
        { task: "analyze the benefits of remote work", role: "Business Analyst", format: "a bullet list", reasoning: "proscons" },
        { task: "create a meal plan for a week", role: "Strategic Advisor", format: "a table", reasoning: "hypothetical" }
    ];

    const random = prompts[Math.floor(Math.random() * prompts.length)];

    // Switch to Combo tab as it supports these fields best
    switchTab('panel-combo');

    comboTask.value = random.task;
    comboRole.value = random.role;
    comboFormat.value = random.format;
    comboReasoning.value = random.reasoning;

    updatePrompts();
    saveInputs();
    showToast("Random prompt generated!");
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeToggleBtn.textContent = isDark ? 'Theme: Light' : 'Theme: Dark';
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    // Remove after animation
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function switchTab(targetPanelId) {
    tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === targetPanelId));
    tabButtons.forEach(button => {
        const isSelected = button.getAttribute('aria-controls') === targetPanelId;
        button.classList.toggle('active', isSelected);
        button.setAttribute('aria-selected', isSelected);
    });
    updatePrompts();
}

function resetButtonState(button, originalText) {
    if (button._feedbackTimeoutId) { clearTimeout(button._feedbackTimeoutId); button._feedbackTimeoutId = null; }
    button.textContent = originalText; button.classList.remove('feedback');
}

function clearClassic() {
    classicGoal.value = "";
    classicContext.value = "";
    classicExpectations.value = "";
    resetButtonState(copyClassicBtn, originalCopyText);
    resetButtonState(sendToComboBtn, originalSendText);
    saveInputs();
    updatePrompts();
}

function clearCombo() {
    comboTask.value = "";
    comboReasoning.value = "";
    comboRole.value = "";
    comboFormat.value = "";
    resetButtonState(copyComboBtn, originalCopyText);
    saveInputs();
    updatePrompts();
}

// --- Removed Reset All Function ---

async function copyText(elementId, button) {
    const textElement = document.getElementById(elementId);
    const textToCopy = textElement.textContent;

    if (textToCopy === placeholderClassic || textToCopy === placeholderCombo || !textToCopy.trim()) {
        showToast("Nothing to copy!");
        return;
    }
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast("Copied to clipboard!");
        saveHistory(textToCopy); // Save to history on successful copy
    } catch (err) {
        console.error("Clipboard copy failed: ", err);
        showToast("Copy failed.");
    }
}

function sendToCombo() {
    resetButtonState(sendToComboBtn, originalSendText);
    const goalText = classicGoal.value.trim();
    if (goalText) {
        comboTask.value = goalText;
        switchTab('panel-combo');
        saveInputs();
        updatePrompts();
        comboTask.classList.add('highlight-feedback');
        setTimeout(() => comboTask.classList.remove('highlight-feedback'), 500);
    } else {
        sendToComboBtn.textContent = "Nothing to Send";
        sendToComboBtn.classList.add('feedback');
        sendToComboBtn._feedbackTimeoutId = setTimeout(() => { resetButtonState(sendToComboBtn, originalSendText); }, 1500);
    }
}

// --- Save and Load Input Data Functions ---
function saveInputs() {
    const data = {
        goal: classicGoal.value,
        context: classicContext.value,
        expectations: classicExpectations.value,
        task: comboTask.value,
        reasoning: comboReasoning.value,
        role: comboRole.value,
        format: comboFormat.value,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function loadInputs() {
    const data = JSON.parse(localStorage.getItem(LS_KEY));
    if (data) {
        classicGoal.value = data.goal || '';
        classicContext.value = data.context || '';
        classicExpectations.value = data.expectations || '';
        comboTask.value = data.task || '';
        comboReasoning.value = data.reasoning || '';
        comboRole.value = data.role || '';
        comboFormat.value = data.format || '';
    }
}

/**
 * Updates both prompt output areas based on current input values.
 * (Now uses specific element IDs)
 */
function updatePrompts() {
  // --- Classic Prompt Logic ---
  const g = classicGoal.value.trim();
  const c = classicContext.value.trim();
  const e = classicExpectations.value.trim();
  const promptParts = [];
  if (g) {
    promptParts.push(`Your task is to ${g}.`);
  }
  if (c) {
    promptParts.push(`For context, this is needed because ${c}.`);
  }
  if (e) {
    promptParts.push(`Your answer should be formatted as ${e}.`);
  }
  const classicPrompt = promptParts.join(' ');
  outputClassic.textContent = classicPrompt.trim() || placeholderClassic;
  outputClassic.classList.toggle('has-content', classicPrompt.trim() !== '');

  // --- Combo Prompt Logic ---
  const task = comboTask.value.trim();
  const reasoning = comboReasoning.value;
  const role = comboRole.value;
  const format = comboFormat.value;
  let comboPrompt = "";
  if (role) comboPrompt += `Act as a ${role}. `;
  if (task) {
    let formattedTask = task.charAt(0).toUpperCase() + task.slice(1);
    if (!/[.?!]$/.test(formattedTask)) {
      formattedTask += '.';
    }
    comboPrompt += `${formattedTask} `;
  }
  if (reasoning) { switch (reasoning) { case "step-by-step": comboPrompt += "Explain step-by-step. "; break; case "compare": comboPrompt += "Compare and contrast the options. "; break; case "proscons": comboPrompt += "List the pros and cons. "; break; case "hypothetical": comboPrompt += "Use a hypothetical scenario. "; break; } }
  if (format) { comboPrompt += `Format your answer as ${format}.`; }
  outputCombo.textContent = comboPrompt.trim() || placeholderCombo;
  outputCombo.classList.toggle('has-content', comboPrompt.trim() !== '');
}

// --- Debounced Update Function ---
const debouncedUpdateAndSave = debounce(() => {
    updatePrompts();
    saveInputs();
}, DEBOUNCE_DELAY);


// --- Event Listeners ---
tabButtons.forEach(button => button.addEventListener('click', () => switchTab(button.getAttribute('aria-controls'))));

// Use the debounced function for text inputs and selects
inputElements.forEach(el => el.addEventListener('input', debouncedUpdateAndSave));

clearClassicBtn.addEventListener('click', clearClassic);
clearComboBtn.addEventListener('click', clearCombo);
sendToComboBtn.addEventListener('click', sendToCombo);
copyClassicBtn.addEventListener('click', () => copyText('outputClassic', copyClassicBtn));
copyComboBtn.addEventListener('click', () => copyText('outputCombo', copyComboBtn));
themeToggleBtn.addEventListener('click', toggleTheme);
randomBtn.addEventListener('click', randomizeInputs);
clearHistoryBtn.addEventListener('click', clearHistory);
// Removed Reset All listener

// --- Initial Setup ---
loadInputs();
renderHistory();
updatePrompts(); // Update display based on initial (empty) values
