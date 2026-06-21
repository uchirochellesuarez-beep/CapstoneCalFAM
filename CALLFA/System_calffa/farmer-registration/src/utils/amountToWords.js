const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function chunkToWords(n) {
  if (n === 0) return ''
  if (n < 20) return ones[n]
  if (n < 100) return `${tens[Math.floor(n / 10)]}${ones[n % 10] ? ` ${ones[n % 10]}` : ''}`.trim()
  return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${chunkToWords(n % 100)}` : ''}`.trim()
}

function integerToWords(n) {
  if (!Number.isFinite(n) || n < 0) return ''
  if (n === 0) return 'Zero'
  const parts = []
  const million = Math.floor(n / 1000000)
  const thousand = Math.floor((n % 1000000) / 1000)
  const rest = n % 1000
  if (million) parts.push(`${chunkToWords(million)} Million`)
  if (thousand) parts.push(`${chunkToWords(thousand)} Thousand`)
  if (rest) parts.push(chunkToWords(rest))
  return parts.join(' ').trim()
}

/** Convert peso amount to words for official receipts (e.g. "Six Hundred Seventy-Five Pesos and Fifty Centavos"). */
export function amountToWords(amount) {
  const value = Math.round((parseFloat(amount) || 0) * 100) / 100
  const pesos = Math.floor(value)
  const centavos = Math.round((value - pesos) * 100)
  let text = `${integerToWords(pesos)} Pesos`
  if (centavos > 0) {
    text += ` and ${integerToWords(centavos)} Centavo${centavos === 1 ? '' : 's'}`
  }
  return text
}
