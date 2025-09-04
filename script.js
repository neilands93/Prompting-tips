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
// Removed resetAllBtn reference

const placeholderClassic = "Your prompt will appear here...";
const placeholderCombo = "Your generated prompt will appear here...";
const originalCopyText = 'Copy';
const originalSendText = 'Send to Combo';

// --- Function Definitions ---

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
    const originalText = originalCopyText;
    resetButtonState(button, originalText);
    if (textToCopy === placeholderClassic || textToCopy === placeholderCombo || !textToCopy.trim()) {
        button.textContent = "Nothing to copy!"; button.classList.add('feedback');
        button._feedbackTimeoutId = setTimeout(() => { resetButtonState(button, originalText); }, 1500);
        return;
    }
    try {
        await navigator.clipboard.writeText(textToCopy);
        button.textContent = "Copied!"; button.classList.add('feedback');
    } catch (err) {
        console.error("Clipboard copy failed: ", err);
        button.textContent = "Copy Failed"; button.classList.add('feedback');
    } finally {
        button._feedbackTimeoutId = setTimeout(() => { resetButtonState(button, originalText); }, 1500);
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
// Removed Reset All listener

// --- Initial Setup ---
loadInputs();
updatePrompts(); // Update display based on initial (empty) values
