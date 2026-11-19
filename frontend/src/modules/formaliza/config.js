// Link da página de agendamento (Microsoft Bookings ou outra ferramenta), definido no build via VITE_FORMALIZA_BOOKING_URL.
// Sem o link, a página funciona e o botão aparece como "Agendamento em breve". Só aceita https.
const raw = (import.meta.env.VITE_FORMALIZA_BOOKING_URL || '').trim()
export const BOOKING_URL = /^https:\/\//i.test(raw) ? raw : ''
export const BOOKING_READY = Boolean(BOOKING_URL)
