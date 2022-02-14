import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'
import { GoogleDrive } from './google-drive.js'
import { authConfig } from './config/auth.js'
import { variableParser } from './utils.js'

const DEBUG = true

let gds = []

async function generateBasePage(event, current_drive_order = 0, model = {}) {

  const page = await getAssetFromKV({
    request: new Request(`${new URL(event.request.url).origin}/index.html`),
    waitUntil(promise) {
      return promise
    }
  })

  // allow headers to be altered
  let body = await page.text()
  const response = new Response(variableParser(body, current_drive_order, model), page)

  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'unsafe-url')
  response.headers.set('Feature-Policy', 'none')

  return response
}

addEventListener('fetch', event => {
  event.respondWith(handleEvent(event))
})

async function handleEvent(event) {
  let options = {}

  // Initiate google drives if array is empty
  if (gds.length === 0) {
    for (let i = 0; i < authConfig.roots.length; i++) {
      const gd = new GoogleDrive(authConfig, i)
      await gd.init()
      gds.push(gd)
    }
    // This operation is parallel to improve efficiency
    let tasks = []
    gds.forEach(gd => {
      tasks.push(gd.initRootType())
    })
    for (let task of tasks) {
      await task
    }
  }

  let request = event.request

  // Extract drive order from path
  // And get the corresponding gd instance according to drive order
  let gd
  let url = new URL(request.url)
  let path = url.pathname

  function redirectToIndexPage() {
    return new Response('', {status: 301, headers: {'Location': `${url.origin}${gds.length > 1 ? '/0:/' : '/'}`}})
  }
  if (path == '/' && gds.length > 1) return redirectToIndexPage()

  try {
    if ([
      '/app.js',
      '/avatar.png',
      '/avatar.jpg',
      '/favicon.ico',
      '/favicon.png',
      '/style.css'
    ].includes(path.toLowerCase())) {
      if (DEBUG) {
        // customize caching
        options.cacheControl = {
          bypassCache: true,
        }
      }

      const page = await getAssetFromKV(event, options)

      // allow headers to be altered
      const response = new Response(page.body, page)

      response.headers.set('X-XSS-Protection', '1; mode=block')
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('Referrer-Policy', 'unsafe-url')
      response.headers.set('Feature-Policy', 'none')

      return response
    }

    // Special command format
    /*
    const command_reg = /^\/(?<num>\d+):(?<command>[a-zA-Z0-9]+)$/g;
    const match = command_reg.exec(path);
    if (match) {
      const num = match.groups.num;
      const order = Number(num);
      if (order >= 0 && order < gds.length) {
        gd = gds[order];
      } else {
        return redirectToIndexPage()
      }
      // basic auth
      for (const r = await gd.basicAuthResponse(request); r;) return r;
      const command = match.groups.command;
      // search for
      if (command === 'search') {
        if (request.method === 'POST') {
          // search results
          return handleSearch(request, gd);
        } else {
          const params = url.searchParams;
          // Search page
          return generateBasePage(event,
            gd.order, {
              q: params.get("q") || '',
              is_search_page: true,
              root_type: gd.root_type
            }
          );
        }
      } else if (command === 'id2path' && request.method === 'POST') {
        return handleId2Path(request, gd)
      }
    }
    */

    // Expected path format
    const common_reg = /^\/(?<drive>\d+:\/)?(?<path>.*)$/g;
    try {
      let order
      if (!path.match(common_reg)) return redirectToIndexPage()
      let match = common_reg.exec(path)
      if (gds.length === 1 && match.groups.drive)
        return new Response('', {status: 301, headers: {'Location': `${url.origin}/${match.groups.path}`}})
      if (match.groups.drive){
        order = Number(match.groups.drive.slice(0, -2))
      } else {
        order = 0
      }
      if (order >= 0 && order < gds.length) {
        gd = gds[order]
      } else {
        return redirectToIndexPage()
      }
    } catch (e) {
      console.log(e)
      return redirectToIndexPage()
    }

    // basic auth
    const basic_auth_res = await gd.basicAuthResponse(event)

    path = path.replace(gd.url_path_prefix, '') || '/';
    if (request.method == 'POST') {
      return basic_auth_res || apiRequest(request, gd);
    }

    let action = url.searchParams.get('a');

    if (path.substr(-1) == '/' || action != null) {
      return basic_auth_res || generateBasePage(event, gd.order, {root_type: gd.root_type})
    } else {
      if (path.split('/').pop().toLowerCase() == ".password") {
        return basic_auth_res || new Response("", {status: 404});
      }
      let file = await gd.file(path);
      let range = request.headers.get('Range');
      const inline_down = 'true' === url.searchParams.get('inline');
      const filename_down = url.searchParams.get('filename');
      if (gd.root.protect_file_link && basic_auth_res) return basic_auth_res;
      return gd.down(file.id, range, inline_down, filename_down);
    }
  } catch (e) {
    // if an error is thrown try to serve the asset at 404.html
    if (!DEBUG) {
      try {
        let notFoundResponse = await getAssetFromKV(event, {
          mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/404.html`, req),
        })

        return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 })
      } catch (e) {}
    }

    return new Response((e.message || e.toString()) + "\n" + e.stack, { status: 500 })
  }
}

async function apiRequest(request, gd) {
  let url = new URL(request.url);
  let path = url.pathname;
  path = path.replace(gd.url_path_prefix, '') || '/';

  let option = {status: 200, headers: {'Access-Control-Allow-Origin': '*'}}

  if (path.substr(-1) == '/') {
    let form = await request.formData();
    // This can increase the speed when listing the directory for the first time. The disadvantage is that if password verification fails, the overhead of listing directories will still be incurred
    let deferred_list_result = gd.list(path, form.get('page_token'), Number(form.get('page_index')));

    // check .password file, if `enable_password_file_verify` is true
    if (authConfig['enable_password_file_verify']) {
      let password = await gd.password(path);
      if (password && password.replace("\n", "") !== form.get('password')) {
        let html = `{"error": {"code": 401,"message": "password error."}}`;
        return new Response(html, option);
      }
    }

    let list_result = await deferred_list_result;
    return new Response(JSON.stringify(list_result), option);
  } else {
    let file = await gd.file(path);
    let range = request.headers.get('Range');
    return new Response(JSON.stringify(file));
  }
}

String.prototype.trim = function (char) {
  if (char) {
    return this.replace(new RegExp('^\\' + char + '+|\\' + char + '+$', 'g'), '');
  }
  return this.replace(/^\s+|\s+$/g, '');
};
