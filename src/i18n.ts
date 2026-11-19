import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'

export type MessageSchema = typeof en

/** Named date/time formats, used with `d(date, name)`. */
const datetimeFormats = {
  en: {
    weekday: { weekday: 'short' },
    weekdayHour: { weekday: 'short', hour: 'numeric' },
    hourMinute: { hour: 'numeric', minute: '2-digit' },
    dayMonth: { weekday: 'short', day: 'numeric', month: 'short' },
  },
} satisfies Record<'en', Record<string, Intl.DateTimeFormatOptions>>

export type DateTimeSchema = (typeof datetimeFormats)['en']

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends MessageSchema {}
  export interface DefineDateTimeFormat extends DateTimeSchema {}
}

export const i18n = createI18n<{ message: MessageSchema, datetime: DateTimeSchema }, 'en', false>({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
  datetimeFormats,
})
