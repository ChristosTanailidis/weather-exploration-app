import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'

export type MessageSchema = typeof en

/** English with British date order and 24-hour times, as in the design. */
const LOCALE = 'en-GB'

/** Named date/time formats, used with `d(date, name)`. */
const datetimeFormats = {
  [LOCALE]: {
    weekday: { weekday: 'short' },
    weekdayDay: { weekday: 'short', day: 'numeric' },
    dayMonth: { weekday: 'short', day: 'numeric', month: 'short' },
    hourMinute: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
    weekdayHourMinute: { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  },
} satisfies Record<typeof LOCALE, Record<string, Intl.DateTimeFormatOptions>>

export type DateTimeSchema = (typeof datetimeFormats)[typeof LOCALE]

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends MessageSchema {}
  export interface DefineDateTimeFormat extends DateTimeSchema {}
}

export const i18n = createI18n<{ message: MessageSchema, datetime: DateTimeSchema }, typeof LOCALE, false>({
  legacy: false,
  locale: LOCALE,
  fallbackLocale: LOCALE,
  messages: { [LOCALE]: en },
  datetimeFormats,
})
