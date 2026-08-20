// ══════════════════════════════════════
//   State
// ══════════════════════════════════════
let notes = []
let pinned = true
let currentView = 'notes'     // 'notes' | 'calendar'
let editingNoteId = null
let searchQuery = ''
let colorFilter = 'all'

// Calendar state
let calYear = new Date().getFullYear()
let calMonth = new Date().getMonth()
let selectedDate = todayStr()

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ══════════════════════════════════════
//   DOM References
// ══════════════════════════════════════
const tabNotes             = document.getElementById('tabNotes')
const tabCalendar          = document.getElementById('tabCalendar')
const btnNewNote           = document.getElementById('btnNewNote')
const viewTabs             = document.getElementById('viewTabs')
const searchBar            = document.getElementById('searchBar')
const searchInput          = document.getElementById('searchInput')
const colorFilters         = document.getElementById('colorFilters')
const notesView            = document.getElementById('notesView')
const notesList            = document.getElementById('notesList')
const calendarView         = document.getElementById('calendarView')
const calMonthLabel        = document.getElementById('calMonthLabel')
const calPrev              = document.getElementById('calPrev')
const calNext              = document.getElementById('calNext')
const calToday             = document.getElementById('calToday')
const calendarGrid         = document.getElementById('calendarGrid')
const calDateLabel         = document.getElementById('calDateLabel')
const calNotesList         = document.getElementById('calNotesList')
const noteEditor           = document.getElementById('noteEditor')
const editorPaper          = document.getElementById('editorPaper')
const editorBack           = document.getElementById('editorBack')
const editorDelete         = document.getElementById('editorDelete')
const editorTitle          = document.getElementById('editorTitle')
const editorContent        = document.getElementById('editorContent')
const editorColors         = document.getElementById('editorColors')
const editorBgCustom       = document.getElementById('editorBgCustom')
const editorTextColors     = document.getElementById('editorTextColors')
const editorTextColorCustom = document.getElementById('editorTextColorCustom')
const editorDate           = document.getElementById('editorDate')
const editorPin            = document.getElementById('editorPin')
const btnPin               = document.getElementById('btnPin')
const btnMin               = document.getElementById('btnMin')
const btnClose             = document.getElementById('btnClose')
const btnBubble            = document.getElementById('btnBubble')

// ══════════════════════════════════════
//   Helpers
// ══════════════════════════════════════
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}`
}

function formatDateFull(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${MONTHS[parseInt(m,10)-1]} ${parseInt(d,10)}, ${y}`
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDateShort(isoStr.slice(0, 10))
}

// ══════════════════════════════════════
//   Initialization
// ══════════════════════════════════════
async function init() {
  notes = await window.api.loadNotes()
  renderCurrentView()
}

function save() {
  window.api.saveNotes(notes)
}

// ══════════════════════════════════════
//   View Switching
// ══════════════════════════════════════
function switchView(view) {
  currentView = view
  tabNotes.classList.toggle('active', view === 'notes')
  tabCalendar.classList.toggle('active', view === 'calendar')
  searchBar.classList.toggle('hidden', view !== 'notes')
  notesView.classList.toggle('hidden', view !== 'notes')
  calendarView.classList.toggle('hidden', view !== 'calendar')
  noteEditor.classList.add('hidden')
  editingNoteId = null
  renderCurrentView()
}

function renderCurrentView() {
  if (currentView === 'notes') renderNotes()
  else renderCalendar()
}

// ══════════════════════════════════════
//   Notes View
// ══════════════════════════════════════
function renderNotes() {
  let filtered = [...notes]

  // Filter by color
  if (colorFilter !== 'all') {
    filtered = filtered.filter(n => n.color === colorFilter)
  }

  // Filter by search
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(n =>
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.content && n.content.toLowerCase().includes(q))
    )
  }

  // Sort: pinned first, then by updatedAt descending
  filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.updatedAt) - new Date(a.updatedAt)
  })

  if (filtered.length === 0) {
    const msg = searchQuery || colorFilter !== 'all'
      ? 'No matching notes found'
      : 'No notes yet'
    const sub = searchQuery || colorFilter !== 'all'
      ? 'Try a different search or filter'
      : 'Tap "+ New" to create your first note'
    notesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        ${msg}<br>${sub}
      </div>`
    return
  }

  let html = ''
  filtered.forEach(n => {
    const title = n.title ? escapeHtml(n.title) : ''
    const preview = n.content ? escapeHtml(n.content).replace(/\n/g, ' ') : ''
    const dateBadge = n.date ? `<span class="note-date-badge">📅 ${formatDateShort(n.date)}</span>` : ''
    const pinnedCls = n.pinned ? ' pinned' : ''

    const isCustomBg = n.color && n.color.startsWith('#')
    const colorClass = isCustomBg ? '' : (n.color || 'yellow')
    const bgStyle = isCustomBg ? `background: ${n.color}; border-color: ${n.color};` : ''

    const isCustomText = n.textColor && n.textColor !== 'default'
    const textStyle = isCustomText ? `style="color: ${n.textColor};"` : ''
    const previewStyle = isCustomText ? `style="color: ${n.textColor}; opacity: 0.85;"` : ''

    html += `
      <div class="note-card ${colorClass}${pinnedCls}" ${bgStyle ? `style="${bgStyle}"` : ''} data-id="${n.id}">
        ${title ? `<div class="note-title" ${textStyle}>${title}</div>` : ''}
        ${preview ? `<div class="note-preview" ${previewStyle}>${preview}</div>` : ''}
        <div class="note-meta">
          ${dateBadge}
          <span>${timeAgo(n.updatedAt)}</span>
        </div>
      </div>`
  })

  notesList.innerHTML = html

  // Bind click to open editor
  notesList.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => openEditor(card.dataset.id))
  })
}

// ══════════════════════════════════════
//   Calendar View
// ══════════════════════════════════════
function renderCalendar() {
  calMonthLabel.textContent = `${MONTHS[calMonth]} ${calYear}`

  // Build calendar grid
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const daysInPrev = new Date(calYear, calMonth, 0).getDate()
  const today = todayStr()

  // Notes grouped by date for this month view
  const notesByDate = {}
  notes.forEach(n => {
    if (n.date) {
      if (!notesByDate[n.date]) notesByDate[n.date] = []
      notesByDate[n.date].push(n)
    }
  })

  let html = ''

  // Weekday headers
  DAYS.forEach(d => {
    html += `<div class="cal-weekday">${d}</div>`
  })

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrev - i
    const prevMonth = calMonth === 0 ? 11 : calMonth - 1
    const prevYear = calMonth === 0 ? calYear - 1 : calYear
    const dateStr = `${prevYear}-${String(prevMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    const dots = buildDots(notesByDate[dateStr])
    html += `<div class="cal-day other-month" data-date="${dateStr}">${day}${dots}</div>`
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    let cls = 'cal-day'
    if (dateStr === today) cls += ' today'
    if (dateStr === selectedDate) cls += ' selected'
    const dots = buildDots(notesByDate[dateStr])
    html += `<div class="${cls}" data-date="${dateStr}">${d}${dots}</div>`
  }

  // Next month days to fill grid
  const totalCells = firstDay + daysInMonth
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = calMonth === 11 ? 0 : calMonth + 1
    const nextYear = calMonth === 11 ? calYear + 1 : calYear
    const dateStr = `${nextYear}-${String(nextMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const dots = buildDots(notesByDate[dateStr])
    html += `<div class="cal-day other-month" data-date="${dateStr}">${d}${dots}</div>`
  }

  calendarGrid.innerHTML = html

  // Bind date clicks
  calendarGrid.querySelectorAll('.cal-day').forEach(el => {
    el.addEventListener('click', () => {
      selectedDate = el.dataset.date
      renderCalendar()
    })
  })

  // Render notes for selected date
  renderCalendarDateNotes()
}

function buildDots(dateNotes) {
  if (!dateNotes || dateNotes.length === 0) return ''
  // Show up to 3 colored dots
  const colors = [...new Set(dateNotes.map(n => n.color || 'yellow'))].slice(0, 3)
  const dots = colors.map(c => {
    if (c.startsWith('#')) return `<div class="cal-dot" style="background:${c};"></div>`
    return `<div class="cal-dot ${c}"></div>`
  }).join('')
  return `<div class="cal-dots">${dots}</div>`
}

function renderCalendarDateNotes() {
  const dateNotes = notes.filter(n => n.date === selectedDate)
  const label = selectedDate === todayStr()
    ? `Today — ${formatDateFull(selectedDate)}`
    : formatDateFull(selectedDate)

  calDateLabel.innerHTML = `
    <span>${label} (${dateNotes.length})</span>
    <button class="cal-add-btn" id="calAddNote">+ Add</button>
  `

  document.getElementById('calAddNote').addEventListener('click', () => {
    createNote(selectedDate)
  })

  if (dateNotes.length === 0) {
    calNotesList.innerHTML = '<div class="cal-empty">No notes for this date</div>'
    return
  }

  let html = ''
  dateNotes.forEach(n => {
    const displayText = n.title || n.content || 'Untitled'
    const isCustomBg = n.color && n.color.startsWith('#')
    const dotStyle = isCustomBg ? `style="background: ${n.color};"` : ''
    const dotClass = isCustomBg ? '' : (n.color || 'yellow')
    const isCustomText = n.textColor && n.textColor !== 'default'
    const textStyle = isCustomText ? `style="color: ${n.textColor};"` : ''

    html += `
      <div class="cal-note-item" data-id="${n.id}">
        <div class="cal-note-color ${dotClass}" ${dotStyle}></div>
        <span class="cal-note-text" ${textStyle}>${escapeHtml(displayText)}</span>
      </div>`
  })

  calNotesList.innerHTML = html

  calNotesList.querySelectorAll('.cal-note-item').forEach(item => {
    item.addEventListener('click', () => openEditor(item.dataset.id))
  })
}

// ══════════════════════════════════════
//   Note CRUD
// ══════════════════════════════════════
function createNote(date) {
  const now = new Date().toISOString()
  const initialColor = (colorFilter !== 'all' && colorFilter) ? colorFilter : 'yellow'
  const note = {
    id: generateId(),
    title: '',
    content: '',
    color: initialColor,
    textColor: initialColor === 'dark' ? '#f8fafc' : 'default',
    date: date || todayStr(),
    pinned: false,
    createdAt: now,
    updatedAt: now
  }
  notes.unshift(note)
  save()
  openEditor(note.id)
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id)
  save()
  closeEditor()
}

// ══════════════════════════════════════
//   Note Editor
// ══════════════════════════════════════
let autoSaveTimer = null

function applyEditorTheme(color, textColor) {
  const isDark = color === 'dark' || (color && color.startsWith('#') && isColorDark(color))
  
  // Transition whole app window to dark mode if dark theme is selected
  document.body.classList.toggle('dark-mode', isDark)

  // Clear any existing theme classes on editor paper
  editorPaper.className = 'editor-paper'
  editorPaper.style.background = ''
  editorPaper.style.borderColor = ''

  if (color && color.startsWith('#')) {
    editorPaper.style.background = color
    editorPaper.style.borderColor = color
  } else if (color) {
    editorPaper.classList.add(`theme-${color}`)
  }

  // Apply text color to inputs
  if (textColor && textColor !== 'default') {
    editorTitle.style.color = textColor
    editorContent.style.color = textColor
  } else {
    editorTitle.style.color = isDark ? '#f8fafc' : '#18181b'
    editorContent.style.color = isDark ? '#f1f5f9' : '#18181b'
  }

  // Update active state on background swatch buttons
  editorColors.querySelectorAll('.swatch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === color)
  })
  if (color && color.startsWith('#')) {
    editorBgCustom.value = color
  }

  // Update active state on text swatch buttons
  editorTextColors.querySelectorAll('.text-swatch').forEach(btn => {
    const isDefault = (!textColor || textColor === 'default') && btn.dataset.textColor === 'default'
    const isMatch = btn.dataset.textColor === textColor
    btn.classList.toggle('active', isDefault || isMatch)
  })
  if (textColor && textColor.startsWith('#')) {
    editorTextColorCustom.value = textColor
  }
}

function isColorDark(hex) {
  if (!hex || !hex.startsWith('#')) return false
  const c = hex.substring(1)
  const rgb = parseInt(c, 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >>  8) & 0xff
  const b = (rgb >>  0) & 0xff
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luma < 128
}

function openEditor(id) {
  const note = notes.find(n => n.id === id)
  if (!note) return

  editingNoteId = id
  editorTitle.value = note.title || ''
  editorContent.value = note.content || ''
  editorDate.value = note.date || ''
  editorPin.classList.toggle('active', note.pinned)

  // Update date label styling
  updateEditorDateLabel()

  // Apply background and text color themes
  applyEditorTheme(note.color || 'yellow', note.textColor || 'default')

  // Hide all other views, show editor
  viewTabs.classList.add('hidden')
  searchBar.classList.add('hidden')
  notesView.classList.add('hidden')
  calendarView.classList.add('hidden')
  noteEditor.classList.remove('hidden')
  editorTitle.focus()
}

function closeEditor() {
  if (editingNoteId) {
    autoSaveNote()
  }
  noteEditor.classList.add('hidden')
  editingNoteId = null
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }

  // Sync window dark mode with current color filter state
  document.body.classList.toggle('dark-mode', colorFilter === 'dark')

  // Restore the tabs and the current view
  viewTabs.classList.remove('hidden')
  switchView(currentView)
}

function autoSaveNote() {
  if (!editingNoteId) return
  const note = notes.find(n => n.id === editingNoteId)
  if (!note) return

  const newTitle = editorTitle.value.trim()
  const newContent = editorContent.value.trim()

  // If both empty and newly created, remove it
  if (!newTitle && !newContent && !note.title && !note.content) {
    notes = notes.filter(n => n.id !== editingNoteId)
    save()
    return
  }

  note.title = newTitle
  note.content = newContent
  note.date = editorDate.value || note.date
  note.updatedAt = new Date().toISOString()
  save()
}

function scheduleAutoSave() {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    autoSaveNote()
  }, 600)
}

function updateEditorDateLabel() {
  const label = editorDate.closest('.editor-btn-icon')
  if (label) {
    label.classList.toggle('active', !!editorDate.value)
  }
}

// ══════════════════════════════════════
//   Event Listeners
// ══════════════════════════════════════

// View tabs
tabNotes.addEventListener('click', () => switchView('notes'))
tabCalendar.addEventListener('click', () => switchView('calendar'))

// New note
btnNewNote.addEventListener('click', () => createNote())

// Search
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value
  renderNotes()
})

// Color filter in search bar (Click toggles filter)
colorFilters.addEventListener('click', (e) => {
  const btn = e.target.closest('.color-dot')
  if (!btn) return
  
  if (colorFilter === btn.dataset.color && colorFilter !== 'all') {
    colorFilter = 'all'
  } else {
    colorFilter = btn.dataset.color
  }

  colorFilters.querySelectorAll('.color-dot').forEach(d => {
    d.classList.toggle('active', d.dataset.color === colorFilter)
  })

  // Toggle dark mode when dark filter is selected
  document.body.classList.toggle('dark-mode', colorFilter === 'dark')

  renderNotes()
})

// Calendar navigation
calPrev.addEventListener('click', () => {
  calMonth--
  if (calMonth < 0) { calMonth = 11; calYear-- }
  renderCalendar()
})

calNext.addEventListener('click', () => {
  calMonth++
  if (calMonth > 11) { calMonth = 0; calYear++ }
  renderCalendar()
})

calToday.addEventListener('click', () => {
  const now = new Date()
  calYear = now.getFullYear()
  calMonth = now.getMonth()
  selectedDate = todayStr()
  renderCalendar()
})

// Editor events
editorBack.addEventListener('click', () => {
  closeEditor()
})

editorDelete.addEventListener('click', () => {
  if (editingNoteId) {
    deleteNote(editingNoteId)
  }
})

editorTitle.addEventListener('input', scheduleAutoSave)
editorContent.addEventListener('input', scheduleAutoSave)

editorDate.addEventListener('change', () => {
  updateEditorDateLabel()
  scheduleAutoSave()
})

editorPin.addEventListener('click', () => {
  const note = notes.find(n => n.id === editingNoteId)
  if (note) {
    note.pinned = !note.pinned
    editorPin.classList.toggle('active', note.pinned)
    save()
  }
})

// Preset background color selector
editorColors.addEventListener('click', (e) => {
  const btn = e.target.closest('.swatch-btn')
  if (!btn) return
  const note = notes.find(n => n.id === editingNoteId)
  if (note) {
    note.color = btn.dataset.color
    // Automatically suggest contrasting text color if switching to/from dark
    if (note.color === 'dark' && (!note.textColor || note.textColor === 'default')) {
      note.textColor = '#f8fafc'
    } else if (note.color !== 'dark' && note.textColor === '#f8fafc') {
      note.textColor = 'default'
    }
    applyEditorTheme(note.color, note.textColor)
    save()
  }
})

// Custom background color picker
editorBgCustom.addEventListener('input', (e) => {
  const note = notes.find(n => n.id === editingNoteId)
  if (note) {
    note.color = e.target.value
    applyEditorTheme(note.color, note.textColor)
    save()
  }
})

// Preset text color selector
editorTextColors.addEventListener('click', (e) => {
  const btn = e.target.closest('.text-swatch')
  if (!btn) return
  const note = notes.find(n => n.id === editingNoteId)
  if (note) {
    note.textColor = btn.dataset.textColor
    applyEditorTheme(note.color, note.textColor)
    save()
  }
})

// Custom text color picker
editorTextColorCustom.addEventListener('input', (e) => {
  const note = notes.find(n => n.id === editingNoteId)
  if (note) {
    note.textColor = e.target.value
    applyEditorTheme(note.color, note.textColor)
    save()
  }
})

// Window controls
btnMin.addEventListener('click', () => window.api.minimize())
btnClose.addEventListener('click', () => window.api.close())
btnBubble.addEventListener('click', () => window.api.minimizeToBubble())

function updatePinButtonUI() {
  btnPin.classList.toggle('active', pinned)
  btnPin.textContent = pinned ? '▲' : '△'
  btnPin.title = pinned ? 'Always on Top: ON (stays over all windows)' : 'Always on Top: OFF (can go behind windows)'
}

btnPin.addEventListener('click', () => {
  pinned = !pinned
  updatePinButtonUI()
  window.api.setPin(pinned)
})

// Initial Pin UI Setup
updatePinButtonUI()

// ══════════════════════════════════════
//   Start
// ══════════════════════════════════════
init()


