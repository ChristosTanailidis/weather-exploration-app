import '@fontsource-variable/inter'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@/App.vue'
import { i18n } from '@/i18n'
import { router } from '@/router'
import '@/assets/main.css'

createApp(App)
  .use(createPinia())
  .use(router)
  .use(i18n)
  .mount('#app')
