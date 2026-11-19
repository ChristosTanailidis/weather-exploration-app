import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'

export type MessageSchema = typeof en

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends MessageSchema {}
}

export const i18n = createI18n<[MessageSchema], 'en', false>({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en },
})
