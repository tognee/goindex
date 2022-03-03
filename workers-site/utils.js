import { uiConfig } from './config/ui.js'
import { authConfig } from './config/auth.js'

export function variableParser(html, current_drive_order = 0, model = {}){
  let data = html.replace('{{ PAGE_DATA }}', `
<script>
  window.drive_names = JSON.parse('${JSON.stringify(authConfig.roots.map(it => it.name))}');
  window.MODEL = JSON.parse('${JSON.stringify(model)}');
  window.current_drive_order = ${current_drive_order};
  window.UI = JSON.parse('${JSON.stringify(uiConfig)}');
</script>`)
  .replace('{{ PAGE_TITLE }}', authConfig.siteName)
  if (authConfig.favicon)
    data = data.replace('{{ PAGE_FAVICON }}', authConfig.siteFavicon)
  else
    data = data.replace('{{ PAGE_FAVICON }}', "/favicon.png")
  if (authConfig.avatar)
    data = data.replace('{{ PAGE_AVATAR }}', authConfig.siteAvatar)
  else
    data = data.replace('{{ PAGE_AVATAR }}', "/avatar.png")
  return data
}
