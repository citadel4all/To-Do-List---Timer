document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
  loadTheme();
  loadTimerSettings();
  resetTimer();
  updateTaskProgress();
});

// Theme Toggle and Selection
const darkModeToggle = document.getElementById('darkModeToggle');
const themeSelector = document.getElementById('themeSelector');

darkModeToggle.addEventListener('change', toggleDarkMode);
themeSelector.addEventListener('change', changeTheme);

function loadTheme() {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  const theme = localStorage.getItem('theme') || 'default';

  document.body.classList.toggle('dark', darkMode);
  darkModeToggle.checked = darkMode;
  themeSelector.value = theme;
  applyTheme(theme);
}

function toggleDarkMode() {
  const darkMode = darkModeToggle.checked;
  document.body.classList.toggle('dark', darkMode);
  localStorage.setItem('darkMode', darkMode);
}

function changeTheme() {
  const theme = themeSelector.value;
  localStorage.setItem('theme', theme);
  applyTheme(theme);
}

function applyTheme(theme) {
  document.body.className = theme;
}

// To-Do List Functions
const taskList = document.getElementById('taskList');
const taskInput = document.getElementById('taskInput');
const deadlineInput = document.getElementById('deadlineInput');
const priorityInput = document.getElementById('priorityInput');
const categoryInput = document.getElementById('categoryInput');
const filterCategory = document.getElementById('filterCategory');
const addTaskBtn = document.getElementById('addTaskBtn');
const exportTasksBtn = document.getElementById('exportTasksBtn');
const importTasksInput = document.getElementById('importTasksInput');
const taskProgress = document.getElementById('taskProgress');

addTaskBtn.addEventListener('click', addTask);
filterCategory.addEventListener('change', filterTasks);
exportTasksBtn.addEventListener('click', exportTasks);
importTasksInput.addEventListener('change', importTasks);

function addTask() {
  const text = taskInput.value.trim();
  const priority = priorityInput.value;
  const category = categoryInput.value;
  const deadline = deadlineInput.value;
    
  if (!text) return alert("Task cannot be empty!");

  const li = document.createElement('li');
  li.classList.add(priority, category);
  li.dataset.deadline = deadline;
  li.innerHTML = `
    <span>${text}</span>
    <small>${deadline ? `Due: ${new Date(deadline).toLocaleString()}` : 'No Deadline'}</small>
    <button onclick="toggleTaskComplete(this)">Mark Complete</button>
    <button onclick="editTask(this)">Edit</button>
    <button onclick="removeTask(this)">Delete</button>
  `;
  taskList.appendChild(li);

  saveTasks();
  taskInput.value = '';
  deadlineInput.value = '';
  updateTaskProgress();
}

function toggleTaskComplete(button) {
  const li = button.parentElement;
  li.classList.toggle('completed');
  updateTaskProgress();
  saveTasks();
}

function editTask(button) {
  const li = button.parentElement;
  const span = li.querySelector('span');
  const deadline = li.dataset.deadline;

  taskInput.value = span.textContent;
  deadlineInput.value = deadline;
  taskList.removeChild(li);
}

function removeTask(button) {
  const li = button.parentElement;
  taskList.removeChild(li);
  saveTasks();
  updateTaskProgress();
}

function saveTasks() {
  const tasks = Array.from(taskList.children).map(li => ({
    text: li.querySelector('span').textContent,
    priority: li.classList.contains('high') ? 'high' : li.classList.contains('medium') ? 'medium' : 'low',
    category: li.classList.contains('work') ? 'work' : li.classList.contains('study') ? 'study' : 'personal',
    deadline: li.dataset.deadline, completed: li.classList.contains('completed'),
  }));
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
  const savedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  savedTasks.forEach(task => {
    const li = document.createElement('li');
    li.classList.add(task.priority, task.category);
      
    if (task.completed) li.classList.add('completed');
    li.dataset.deadline = task.deadline;
    li.innerHTML = `
      <span>${task.text}</span>
      <small>${task.deadline ? `Due: ${new Date(task.deadline).toLocaleString()}` : 'No Deadline'}</small>
      <button onclick="toggleTaskComplete(this)">Mark Complete</button>
      <button onclick="editTask(this)">Edit</button>
      <button onclick="removeTask(this)">Delete</button>
    `;
    taskList.appendChild(li);
  });
  updateTaskProgress();
}

function filterTasks() {
  const filter = filterCategory.value;
  Array.from(taskList.children).forEach(task => {
    if (filter === 'all' || task.classList.contains(filter)) {
      task.style.display = '';
    } else {
      task.style.display = 'none';
    }
  });
}

function updateTaskProgress() {
  const tasks = Array.from(taskList.children);
  const completed = tasks.filter(task => task.classList.contains('completed')).length;
  const percentage = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  taskProgress.textContent = `Tasks Completed: ${percentage}%`;
}

// Export/Import Tasks
document.getElementById('exportTasksBtn').addEventListener('click', exportTasks);
document.getElementById('importTasksInput').addEventListener('change', importTasks);

function exportTasks() {
  const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
  const blob = new Blob([JSON.stringify(tasks)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tasks.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importTasks(event) {
  const file = event.target.files[0];
  if (!file) return;
    
  const reader = new FileReader();
  reader.onload = () => {
    const tasks = JSON.parse(reader.result);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    taskList.innerHTML = ''; // Clear existing tasks
    loadTasks();
  };
  reader.readAsText(file);
}

// Pomodoro Timer Functions
let timer;
let minutes = 25;
let seconds = 0;
let isRunning = false;
let isBreak = false;
let workTime = 0;
let breakTime = 0;

const timeDisplay = document.getElementById('timeDisplay');
const startTimerBtn = document.getElementById('startTimerBtn');
const resetTimerBtn = document.getElementById('resetTimerBtn');
const workDurationInput = document.getElementById('workDuration');
const breakDurationInput = document.getElementById('breakDuration');
const progressBar = document.getElementById('progressBar');
const sessionCounter = document.getElementById('sessionCounter');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const analytics = document.getElementById('analytics');

let completedSessions = parseInt(localStorage.getItem('completedSessions')) || 0;
sessionCounter.textContent = `Completed Sessions: ${completedSessions}`;

workDurationInput.addEventListener('input', validateTimerInputs);
breakDurationInput.addEventListener('input', validateTimerInputs);

startTimerBtn.addEventListener('click', toggleTimer);
resetTimerBtn.addEventListener('click', resetTimer);
saveSettingsBtn.addEventListener('click', saveSettings);

function validateTimerInputs() {
  if (workDurationInput.value < 0) workDurationInput.value = 0;
  if (breakDurationInput.value < 0) breakDurationInput.value = 0;
}

function toggleTimer() {
  if (isRunning) {
    clearInterval(timer);
    startTimerBtn.textContent = 'Start';
  } else {
    timer = setInterval(updateTimer, 1000);
    startTimerBtn.textContent = 'Pause';
  }
  isRunning = !isRunning;
}


function updateTimer() {
  if (seconds === 0) {
    if (minutes === 0) {
      clearInterval(timer);
        
      if (!isBreak) {
        isBreak = true;
        minutes = parseInt(breakDurationInput.value) || 5;
        workTime += minutes;
        notifyUser('Break started!');
      } else {
        isBreak = false;
        minutes = parseInt(workDurationInput.value) || 25;
        completedSessions++;
        sessionCounter.textContent = `Completed Sessions: ${completedSessions}`;
        localStorage.setItem('completedSessions', completedSessions);
        breakTime += minutes;
        notifyUser('Break ended! Back to work!');
      }
      updateAnalytics();
      seconds = 0;
      toggleTimer();
      return;
    }
    minutes--;
    seconds = 59;
  } else {
    seconds--;
  }
  updateTimerDisplay();
}

function updateTimerDisplay() {
  timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalSeconds = (isBreak ? parseInt(breakDurationInput.value) : parseInt(workDurationInput.value)) * 60;
  const elapsedSeconds = totalSeconds - (minutes * 60 + seconds);
  progressBar.style.width = `${(elapsedSeconds / totalSeconds) * 100}%`;
}

function resetTimer() {
  clearInterval(timer);
  isBreak = false;
  isRunning = false;
  minutes = parseInt(workDurationInput.value) || 25;
  seconds = 0;
  progressBar.style.width = '0%';
  updateTimerDisplay();
  startTimerBtn.textContent = 'Start';
}

function saveSettings() {
  localStorage.setItem('workDuration', workDurationInput.value);
  localStorage.setItem('breakDuration', breakDurationInput.value);
  resetTimer();
}

function loadTimerSettings() {
  workDurationInput.value = localStorage.getItem('workDuration') || 25;
  breakDurationInput.value = localStorage.getItem('breakDuration') || 5;
}

function updateAnalytics() {
  document.getElementById('workTime').textContent = workTime;
  document.getElementById('breakTime').textContent = breakTime;
}

// Pop-up Help Info
document.querySelectorAll('.info-btn').forEach(button => {
  button.addEventListener('click', () => {
    const info = button.dataset.info;
    alert(info);
  });
}); 

// Notifications
function notifyUser(message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(message);
  }
}

// Request Notification Permission
if ('Notification' in window && Notification.permission !== 'granted') {
  Notification.requestPermission();
}
