# How to use
- Install [`rclone`](https://rclone.org/)
- Create your Google Drive API `client_id` and `client_secret`
  - You can follow [this guide](https://rclone.org/drive/#making-your-own-client-id) to do so
- Create a rclone config for your Google Drive Account following [this guide](https://rclone.org/drive/)
- Run `rclone config file` in a terminal to determine the path of `rclone.conf`
- Open `rclone.conf` and take note of `client_id`, `client_secret` and `refresh_token`
- Install [`wrangler`](https://developers.cloudflare.com/workers/cli-wrangler/install-update) (Manual install is recomanded)
- Run in a terminal `wrangler login` and allow the app to manage the Account
- Login into your [Cloudflare Dashboard](https://dash.cloudflare.com/) and click on `Workers` on the left.
- Take note of your `Account ID` on the right side of the page.
- Rename `wrangler.example.toml` into `wrangler.toml` and then edit it:
  - Inside the quotes next to `account_id` paste your `Account ID`
- Rename `workers-site/config/auth.example.js` into `auth.js` and then edit it:
  - Inside the quotes next to `client_id` paste your `client_id`
  - Inside the quotes next to `client_secret` paste your `client_secret`
  - Inside the quotes next to `refresh_token` paste your `refresh_token`
  - Change `siteName`, `siteFavicon` and `siteAvatar` as you like
  - Add your `roots`, the folder ids are taken from the url of the folder on Google Drive
- Rename `workers-site/config/ui.example.js` into `ui.js` and then edit it as you like
- Run `wrangler publish` to upload the app

## Thanks to:
- [donwa](https://github.com/donwa)
- [yanzai](https://github.com/yanzai/goindex)
