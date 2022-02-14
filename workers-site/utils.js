import { uiConfig } from './config/ui.js'
import { authConfig } from './config/auth.js'

export function variableParser(html, current_drive_order = 0, model = {}){
  return html.replace('{{ PAGE_DATA }}', `
<script>
  window.drive_names = JSON.parse('${JSON.stringify(authConfig.roots.map(it => it.name))}');
  window.MODEL = JSON.parse('${JSON.stringify(model)}');
  window.current_drive_order = ${current_drive_order};
  window.UI = JSON.parse('${JSON.stringify(uiConfig)}');
</script>`)
  .replace('{{ PAGE_TITLE }}', authConfig.siteName)
  .replace('{{ PAGE_FAVICON }}', authConfig.siteFavicon)
  .replace('{{ PAGE_AVATAR }}', authConfig.siteAvatar)
}
