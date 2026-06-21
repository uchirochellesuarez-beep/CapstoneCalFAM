export const MANILA_TZ = 'Asia/Manila'

const manilaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export const getManilaTodayString = () => manilaDateFormatter.format(new Date())

export const normalizeDateString = (value) => {
  if (!value) return null
  if (typeof value === 'string') return value.split('T')[0].trim()
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return manilaDateFormatter.format(value)
  }
  return String(value).split('T')[0].trim()
}

const parseDateOnlyParts = (value) => {
  const dateStr = normalizeDateString(value)
  if (!dateStr) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  }
}

const formatDateParts = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const addDays = (dateStr, days) => {
  const parts = parseDateOnlyParts(dateStr)
  if (!parts) return null
  const date = new Date(parts.year, parts.month - 1, parts.day)
  date.setDate(date.getDate() + days)
  return formatDateParts(date)
}

export const addMonths = (dateStr, months) => {
  const parts = parseDateOnlyParts(dateStr)
  if (!parts) return null
  const date = new Date(parts.year, parts.month - 1, parts.day)
  date.setMonth(date.getMonth() + months)
  return formatDateParts(date)
}

export const isPastDueDate = (dueDateStr) => {
  const due = normalizeDateString(dueDateStr)
  if (!due) return false
  return getManilaTodayString() > due
}

export const getMachineryDueDateString = (bookingDate) => addDays(bookingDate, 30)

export const isMachineryOverdue = (bookingDate) => {
  const dueDate = getMachineryDueDateString(bookingDate)
  return due ? isPastDueDate(dueDate) : false
}

export const formatManilaDateLabel = (value) => {
  const dateStr = normalizeDateString(value)
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: MANILA_TZ
  })
}

/** @deprecated Use getManilaTodayString — kept for existing loan API query params */
export const getManilaReferenceDateString = () => getManilaTodayString()
