
import './style.css'

// Select the HTML elements that JavaScript needs to control.
const form = document.querySelector('#task-form')
const input = document.querySelector('#task-input')
const errorEl = document.querySelector('#error')
const list = document.querySelector('#task-list')
const emptyEl = document.querySelector('#empty')
const countEl = document.querySelector('#count')
const clearBtn = document.querySelector('#clear-completed')
const filterBtns = document.querySelectorAll('[data-filter]')

// Keep the app's data in JavaScript state.
const STORAGE_KEY = 'week4-todos'
let tasks = loadTasks()
let filter = 'all'
let editingId = null

// Load previously saved tasks and recover safely if storage is invalid.
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))

    if (!Array.isArray(saved)) return []

    return saved
      .filter(
        (task) =>
          task &&
          Number.isSafeInteger(task.id) &&
          typeof task.text === 'string' &&
          typeof task.done === 'boolean',
      )
      .map((task) => ({
        id: task.id,
        text: task.text,
        done: task.done,
        priority: ['high', 'medium', 'low'].includes(task.priority)
          ? task.priority
          : 'medium',
      }))
  } catch {
    return []
  }
}

// Save the current task array as JSON in browser storage.
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    showError('Could not save tasks in this browser. Check your storage settings.')
  }
}

// Display a validation or storage message, or hide it when empty.
function showError(message) {
  errorEl.textContent = message
  errorEl.classList.toggle('hidden', message === '')
}

// Return only the tasks that match the currently selected filter.
function getVisibleTasks() {
  if (filter === 'active') {
    return tasks.filter((task) => !task.done)
  }

  if (filter === 'completed') {
    return tasks.filter((task) => task.done)
  }

  return tasks
}

// Create one task row safely, using textContent instead of HTML strings.
function createTaskElement(task) {
  const li = document.createElement('li')
  li.dataset.id = String(task.id)
  li.className = 'flex flex-wrap items-center gap-3 py-4'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.checked = task.done
  checkbox.dataset.action = 'toggle'
  checkbox.className = 'size-5 shrink-0 accent-indigo-600'
  checkbox.setAttribute('aria-label', `Mark ${task.text} as completed`)

  const content = document.createElement('div')
  content.className = 'min-w-0 flex-1'

  // Show an input while editing, otherwise show the task text.
  if (editingId === task.id) {
    const editInput = document.createElement('input')
    editInput.type = 'text'
    editInput.maxLength = 100
    editInput.value = task.text
    editInput.dataset.action = 'edit-input'
    editInput.className =
      'w-full rounded-lg border border-indigo-300 px-3 py-2 text-sm focus:border-indigo-500'
    editInput.setAttribute('aria-label', 'Edit task')
    content.append(editInput)
  } else {
    const span = document.createElement('span')
    span.textContent = task.text
    span.dataset.action = 'edit'
    span.title = 'Double-click to edit'
    span.className = task.done
      ? 'block cursor-text break-words text-sm text-slate-400 line-through'
      : 'block cursor-text break-words text-sm font-medium text-slate-800'
    content.append(span)
  }

  const priority = document.createElement('select')
  priority.dataset.action = 'priority'
  priority.className =
    'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600'
  priority.setAttribute('aria-label', `Priority for ${task.text}`)

  // Build the priority options without inserting user text as HTML.
  for (const level of ['high', 'medium', 'low']) {
    const option = document.createElement('option')
    option.value = level
    option.textContent = `${level[0].toUpperCase()}${level.slice(1)} priority`
    option.selected = task.priority === level
    priority.append(option)
  }

  const deleteBtn = document.createElement('button')
  deleteBtn.type = 'button'
  deleteBtn.dataset.action = 'delete'
  deleteBtn.textContent = 'Delete'
  deleteBtn.className =
    'rounded-lg px-2 py-1.5 text-sm text-slate-400 transition hover:bg-red-50 hover:text-red-600'
  deleteBtn.setAttribute('aria-label', `Delete ${task.text}`)

  li.append(checkbox, content, priority, deleteBtn)

  return li
}

// Redraw the task list and keep the screen synchronized with the data.
function render() {
  const visibleTasks = getVisibleTasks()

  list.replaceChildren(...visibleTasks.map(createTaskElement))

  emptyEl.classList.toggle('hidden', visibleTasks.length !== 0)

  const remaining = tasks.filter((task) => !task.done).length
  countEl.textContent =
    `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left`

  for (const btn of filterBtns) {
    const active = btn.dataset.filter === filter

    btn.classList.toggle('bg-indigo-600', active)
    btn.classList.toggle('text-white', active)
    btn.classList.toggle('text-slate-600', !active)
    btn.classList.toggle('hover:bg-slate-100', !active)
    btn.setAttribute('aria-pressed', String(active))
  }

  saveTasks()
}

// Add a new task after validating the user's input.
form.addEventListener('submit', (event) => {
  event.preventDefault()

  const text = input.value.trim()

  if (text === '') {
    showError('Please type a task first.')
    input.focus()
    return
  }

  if (text.length > 100) {
    showError('Keep your task under 100 characters.')
    input.focus()
    return
  }

  tasks.push({
    id: Date.now(),
    text,
    done: false,
    priority: 'medium',
  })

  showError('')
  form.reset()
  render()
  input.focus()
})

// Handle completing and deleting tasks with one delegated click listener.
list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]')

  if (!button) return

  const li = button.closest('li')
  if (!li) return

  const id = Number(li.dataset.id)
  const action = button.dataset.action

  if (action === 'delete') {
    tasks = tasks.filter((task) => task.id !== id)

    if (editingId === id) editingId = null

    showError('')
    render()
  }
})

// Toggle a task when its checkbox changes.
list.addEventListener('change', (event) => {
  const target = event.target
  const li = target.closest('li')

  if (!li) return

  const id = Number(li.dataset.id)

  if (target.dataset.action === 'toggle') {
    const task = tasks.find((item) => item.id === id)

    if (!task) return

    task.done = target.checked
    render()
  }

  // Update a task's priority when the select menu changes.
  if (target.dataset.action === 'priority') {
    const task = tasks.find((item) => item.id === id)

    if (!task) return

    if (!['high', 'medium', 'low'].includes(target.value)) return

    task.priority = target.value
    render()
  }
})

// Switch into edit mode when the user double-clicks a task's text.
list.addEventListener('dblclick', (event) => {
  const span = event.target.closest('[data-action="edit"]')

  if (!span) return

  const li = span.closest('li')
  if (!li) return

  editingId = Number(li.dataset.id)
  showError('')
  render()

  const editInput = list.querySelector('[data-action="edit-input"]')
  editInput?.focus()
  editInput?.select()
})

// Save an edited task or cancel editing using the keyboard.
list.addEventListener('keydown', (event) => {
  const target = event.target

  if (target.dataset.action !== 'edit-input') return

  const li = target.closest('li')
  if (!li) return

  const id = Number(li.dataset.id)

  if (event.key === 'Enter') {
    event.preventDefault()

    const text = target.value.trim()

    if (text === '') {
      showError('A task cannot be empty.')
      target.focus()
      return
    }

    const task = tasks.find((item) => item.id === id)
    if (!task) return

    task.text = text
    editingId = null
    showError('')
    render()
  }

  if (event.key === 'Escape') {
    editingId = null
    showError('')
    render()
  }
})

// Commit an edit when its input loses focus.
list.addEventListener(
  'focusout',
  (event) => {
    const target = event.target

    if (target.dataset.action !== 'edit-input') return
    if (editingId === null) return

    const id = editingId
    const text = target.value.trim()
    const task = tasks.find((item) => item.id === id)

    if (!task) {
      editingId = null
      render()
      return
    }

    if (text === '') {
      showError('A task cannot be empty.')
    } else {
      task.text = text
      showError('')
    }

    editingId = null
    render()
  },
  true,
)

// Display all, active, or completed tasks when a filter is selected.
for (const btn of filterBtns) {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter
    editingId = null
    showError('')
    render()
  })
}

// Remove all completed tasks while keeping active tasks.
clearBtn.addEventListener('click', () => {
  tasks = tasks.filter((task) => !task.done)
  editingId = null
  showError('')
  render()
})

// Draw the saved task list when the application first opens.
render()
