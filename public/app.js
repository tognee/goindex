function init() {
  document.siteName = $("title").html()
  if (UI.dark_mode) $(":root").attr("dark", true)
  if (UI.enable_avatar) {
    $("#avatar").removeClass('hidden')
    $('#nav').addClass('withAvatar')
  }
}
const Os = {
  isWindows: navigator.platform.toUpperCase().indexOf("WIN") > -1,
  isMac: navigator.platform.toUpperCase().indexOf("MAC") > -1,
  isMacLike: /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform),
  isIos: /(iPhone|iPod|iPad)/i.test(navigator.platform),
  isMobile: /Android|webOS|iPhone|iPad|iPod|iOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
}
function getDocumentHeight() {
  return Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.body.clientHeight,
    document.documentElement.clientHeight
  )
}
const loading_bar = `<div id="loading-bar" class="progress"><div class="bar indeterminate"></div></div>`
function render(path) {
  if (path.indexOf("?") > 0) path = path.substr(0, path.indexOf("?"))
  $("title").html(`${document.siteName}`)
  nav(path)
  let reg = /\/\d+:$/g
  if (path.match(reg) || path.substr(-1) == "/") {
    window.scroll_status = { event_bound: !1, loading_lock: !1 }
    list(path)
  } else {
    file(path)
  }
}
function nav(path) {
  let model = window.MODEL
  let html = ""
  let cur = window.current_drive_order || 0
  let names = window.drive_names
  let rootPath = ""
  let driveSelect = ''
  if (names.length > 1){
    driveSelect += `<select onchange="window.location.href=this.value" style="overflow:visible; width: inherit; margin-left: 8px;">`
    names.forEach((name, idx) => {
      driveSelect += `<option value="/${idx}:/" ${idx === cur ? 'selected="selected"' : ""}>${name}</option>`
    })
    driveSelect += `</select>`
    rootPath = `/${cur}:`
  }
  html += `<a href="${rootPath}/" class="root-folder">${document.siteName}</a>`
  html += driveSelect
  let arr = path.trim("/").split("/")
  let p = "/"
  if (arr.length && arr[0].match(/\d+:$/g)) arr.shift() // Remove drive number from path
  for (let i in arr) {
    let n = arr[i]
    n = decodeURI(n)
    p += n + "/"
    if (n == "") break
    html += `<span class="material-icons" style="margin:0;">chevron_right</span><a href="${rootPath}${p}">${n}</a>`
  }
  $("#nav").html(html)
}

function requestListPath(path, params, resultCallback, authErrorCallback) {
  let p = {
    password: params.password || null,
    page_token: params.page_token || null,
    page_index: params.page_index || 0,
  }
  $.post(path, p, function (data, status) {
    let res = jQuery.parseJSON(data)
    if (res && res.error && res.error.code == "401") {
      if (authErrorCallback) authErrorCallback(path)
    } else if (res && res.data) {
      if (resultCallback) resultCallback(res, path, p)
    }
  })
}

function list(path) {
  let content = `
  <table id="contentTable">
    <thead>
      <tr>
        <th>
          File
          <span class="material-icons icon-sort" data-sort="name" data-order="more">expand_more</span>
        </th>
        <th class="right hide-on-mobile no-wrap">
          Date Modified
          <span class="material-icons icon-sort" data-sort="name" data-order="more">expand_more</span>
        </th>
        <th class="right hide-on-mobile no-wrap">
          Size
          <span class="material-icons icon-sort" data-sort="name" data-order="more">expand_more</span>
        </th>
      </tr>
    </thead>
    <tbody id="list"> </tbody>
  </table>
  <div id="count" class="hidden">Total <span class="number"></span> Item</div>`
  $("#content").html(content)
  let password = localStorage.getItem("password" + path)

  $("#list").html(`<tr><td colspan="3">${loading_bar}</td></tr>`)

  function successResultCallback(res, path, prevReqParams) {
    $("#list")
      .data("nextPageToken", res.nextPageToken)
      .data("curPageIndex", res.curPageIndex)

    $("#spinner").remove()
    // it's a single page
    if (res.nextPageToken === null) {
      $(window).off("scroll")
      window.scroll_status.event_bound = !1
      window.scroll_status.loading_lock = !1
      append_files_to_list(path, res.data.files)
    // there are multiple pages
    } else {
      append_files_to_list(path, res.data.files)
      if (window.scroll_status.event_bound !== !0) {
        // ???
        $(window).on("scroll", function () {
          let scrollTop = $(this).scrollTop()
          let scrollHeight = getDocumentHeight()
          let windowHeight = $(this).height()
          if (scrollTop + windowHeight > scrollHeight - (Os.isMobile ? 130 : 80)) {
            if (window.scroll_status.loading_lock === !0) return
            window.scroll_status.loading_lock = !0
            $(
              `<div id="spinner" class="mdui-spinner mdui-spinner-colorful mdui-center"></div>`
            ).insertBefore("#readme_md")
            let $list = $("#list")
            requestListPath( path,
              {
                password: prevReqParams.password,
                page_token: $list.data("nextPageToken"),
                page_index: $list.data("curPageIndex") + 1,
              },
              successResultCallback,
              null
            )
          }
        })
        window.scroll_status.event_bound = !0
      }
    }
    if (window.scroll_status.loading_lock === !0) {
      window.scroll_status.loading_lock = !1
    }
  }

  function authErrorCallback(path) {
    $("#spinner").remove()
    let pass = prompt("Directory encrypted, Please enter the Password", "")
    localStorage.setItem("password" + path, pass)
    if (pass != null && pass != "") {
      list(path)
    } else {
      history.go(-1)
    }
  }
  requestListPath(path, { password }, successResultCallback, authErrorCallback)
}

function append_files_to_list(path, files) {
  let $list = $("#list")
  let is_lastpage_loaded = null === $list.data("nextPageToken")
  let is_firstpage = "0" == $list.data("curPageIndex")
  let html = ""
  let targetFiles = []
  for (let i in files) {
    let item = files[i]
    let p = path + item.name + "/"
    if (item.size == undefined) item.size = ""
    item.modifiedTime = utc2beijing(item.modifiedTime)
    item.size = formatFileSize(item.size)
    if (item.mimeType == "application/vnd.google-apps.folder") {
      html += `
        <tr class="list_item" onclick="window.location=\`${encodeURI(p)}\`">
          <td title="${item.name}">
            <div class="icon-file">
              <span class="material-icons">folder_open</span>
              <span>${item.name}</span>
            </div>
          </td>
          <td class="right hide-on-mobile no-wrap">${item["modifiedTime"]}</td>
          <td class="right hide-on-mobile no-wrap">${item["size"]}</td>
        </tr>`
    } else {
      let p = path + item.name
      const filepath = path + item.name
      let c = "file"

      let ext = p.split(".").pop().toLowerCase()
      if (
        "|html|php|css|go|java|js|json|txt|sh|md|mp4|webm|avi|bmp|jpg|jpeg|png|gif|m4a|mp3|flac|wav|ogg|mpg|mpeg|mkv|rm|rmvb|mov|wmv|asf|ts|flv|pdf|".indexOf(`|${ext}|`) >= 0) {
        targetFiles.push(filepath)
        p += "?a=view"
        c += " view"
      }
      html += `
        <tr gd-type="${item.mimeType}" class="list_item ${c}" onclick="window.location=\`${encodeURI(p)}\`">
          <td title="${item.name}">
            <div class="icon-file">
              <span class="material-icons">insert_drive_file</span>
              <span>${item.name}</span>
            </div>
          </td>
          <td class="right hide-on-mobile no-wrap">${item["modifiedTime"]}</td>
          <td class="right hide-on-mobile no-wrap">${item["size"]}</td>
        </tr>`
    }
  }
  if (targetFiles.length > 0) {
    let old = localStorage.getItem(path)
    let new_children = targetFiles
    if (!is_firstpage && old) {
      let old_children
      try {
        old_children = JSON.parse(old)
        if (!Array.isArray(old_children)) {
          old_children = []
        }
      } catch (e) {
        old_children = []
      }
      new_children = old_children.concat(targetFiles)
    }
    localStorage.setItem(path, JSON.stringify(new_children))
  }
  $list.html(($list.data("curPageIndex") == "0" ? "" : $list.html()) + html)
  if (is_lastpage_loaded) {
    $("#count")
      .removeClass("hidden")
      .find(".number")
      .text($list.find("tr.list_item").length)
  }
}

function get_file(path, file, callback) {
  let key = "file_path_" + path + file.modifiedTime
  let data = localStorage.getItem(key)
  if (data != undefined) {
    return callback(data)
  } else {
    $.get(path, function (d) {
      localStorage.setItem(key, d)
      callback(d)
    })
  }
}
function file(path) {
  let name = path.split("/").pop()
  let ext = name
    .split(".")
    .pop()
    .toLowerCase()
    .replace(`?a=view`, "")
    .toLowerCase()
  if ("|html|php|css|go|java|js|json|txt|sh|md|".indexOf(`|${ext}|`) >= 0) {
    return file_code(path)
  }
  if ("|mp4|webm|avi|".indexOf(`|${ext}|`) >= 0) {
    return file_video(path)
  }
  if ("|mpg|mpeg|mkv|rm|rmvb|mov|wmv|asf|ts|flv|".indexOf(`|${ext}|`) >= 0) {
    return file_video(path)
  }
  if ("|mp3|flac|wav|ogg|m4a|".indexOf(`|${ext}|`) >= 0) {
    return file_audio(path)
  }
  if ("|bmp|jpg|jpeg|png|gif|".indexOf(`|${ext}|`) >= 0) {
    return file_image(path)
  }
  if ("pdf" === ext) return file_pdf(path)
}
function file_code(path) {
  let type = {
    html: "html",
    php: "php",
    css: "css",
    go: "golang",
    java: "java",
    js: "javascript",
    json: "json",
    txt: "Text",
    sh: "sh",
    md: "Markdown",
  }
  let name = path.split("/").pop()
  let ext = name.split(".").pop().toLowerCase()
  let href = window.location.origin + path
  let content = `
<div class="mdui-container">
<pre id="editor" ></pre>
</div>
<div class="mdui-textfield">
	<label class="mdui-textfield-label">Download Link</label>
	<input class="mdui-textfield-input" type="text" value="${href}"/>
</div>
<a href="${href}" class="mdui-fab mdui-fab-fixed mdui-ripple mdui-color-theme-accent"><i class="mdui-icon material-icons">file_download</i></a>`
  $("#content").html(content)
  $.get(path, function (data) {
    $("#editor").html($("<div/>").text(data).html())
    let code_type = "Text"
    if (type[ext] != undefined) {
      code_type = type[ext]
    }
    let editor = ace.edit("editor")
    editor.setTheme("ace/theme/ambiance")
    editor.setFontSize(18)
    editor.session.setMode("ace/mode/" + code_type)
    editor.setOptions({
      enableBasicAutocompletion: !0,
      enableSnippets: !0,
      enableLiveAutocompletion: !0,
      maxLines: Infinity,
    })
  })
}
function copyToClipboard(str) {
  const $temp = $("<input>")
  $("body").append($temp)
  $temp.val(str).select()
  document.execCommand("copy")
  $temp.remove()
}
function file_video(path) {
  const url = window.location.origin + path
  let player_items = [
    {
      text: "MXPlayer(Free)",
      href: `intent:${url}#Intent;package=com.mxtech.videoplayer.ad;S.title=${path};end`,
    },
    {
      text: "MXPlayer(Pro)",
      href: `intent:${url}#Intent;package=com.mxtech.videoplayer.pro;S.title=${path};end`,
    },
    { text: "nPlayer", href: `nplayer-${url}` },
    { text: "VLC", href: `vlc://${url}` },
    { text: "PotPlayer", href: `potplayer://${url}` },
  ]
    .map(
      (it) =>
        `<li class="mdui-menu-item"><a href="${it.href}" class="mdui-ripple">${it.text}</a></li>`
    )
    .join("")
  player_items += `<li class="mdui-divider"></li>
                   <li class="mdui-menu-item"><a id="copy-link" class="mdui-ripple">Copy Link</a></li>`
  const playBtn = `
      <button class="mdui-btn mdui-ripple mdui-color-theme-accent" mdui-menu="{target:'#player-items'}">
        <i class="mdui-icon material-icons">&#xe039;</i>Play In External Player<i class="mdui-icon material-icons">&#xe5cf;</i>
      </button>
      <ul class="mdui-menu" id="player-items">${player_items}</ul>`
  const content = `
<div class="mdui-container-fluid">
	<br>
	<div class="mdui-video-fluid mdui-center" id="dplayer"></div>
	<br>${playBtn}
	<!-- ???? -->
	<div class="mdui-textfield">
	  <label class="mdui-textfield-label">Download Link</label>
	  <input class="mdui-textfield-input" type="text" value="${url}"/>
	</div>
</div>
<a href="${url}" class="mdui-fab mdui-fab-fixed mdui-ripple mdui-color-theme-accent"><i class="mdui-icon material-icons">file_download</i></a>`
  $("#content").html(content)
  $("#copy-link").on("click", () => {
    copyToClipboard(url)
  })
  const dp = new DPlayer({
    container: document.getElementById("dplayer"),
    loop: false,
    screenshot: true,
    preload: "auto",
    video: {
      quality: [{ url: url, type: "normal" }],
      autoplay: true,
      defaultQuality: 0,
    },
  })
}
function file_audio(path) {
  let url = window.location.origin + path
  let content = `
<div class="mdui-container-fluid">
	<br>
	<audio class="mdui-center" preload controls>
	  <source src="${url}"">
	</audio>
	<br>
	<!-- ???? -->
	<div class="mdui-textfield">
	  <label class="mdui-textfield-label">Download Link</label>
	  <input class="mdui-textfield-input" type="text" value="${url}"/>
	</div>
</div>
<a href="${url}" class="mdui-fab mdui-fab-fixed mdui-ripple mdui-color-theme-accent"><i class="mdui-icon material-icons">file_download</i></a>`
  $("#content").html(content)
}
function file_pdf(path) {
  const url = window.location.origin + path
  const inline_url = `${url}?inline=true`
  const file_name = decodeURI(
    path.slice(path.lastIndexOf("/") + 1, path.length)
  )
  let content = `
	<object data="${inline_url}" type="application/pdf" name="${file_name}" style="width:100%;height:94vh;"><embed src="${inline_url}" type="application/pdf"/></object>
    <a href="${url}" class="mdui-fab mdui-fab-fixed mdui-ripple mdui-color-theme-accent"><i class="mdui-icon material-icons">file_download</i></a>`
  $("#content")
    .removeClass("mdui-container")
    .addClass("mdui-container-fluid")
    .css({ padding: 0 })
    .html(content)
}
function file_image(path) {
  let url = window.location.origin + path
  const currentPathname = window.location.pathname
  const lastIndex = currentPathname.lastIndexOf("/")
  const fatherPathname = currentPathname.slice(0, lastIndex + 1)
  let target_children = localStorage.getItem(fatherPathname)
  let targetText = ""
  if (target_children) {
    try {
      target_children = JSON.parse(target_children)
      if (!Array.isArray(target_children)) {
        target_children = []
      }
    } catch (e) {
      console.error(e)
      target_children = []
    }
    if (target_children.length > 0 && target_children.includes(path)) {
      let len = target_children.length
      let cur = target_children.indexOf(path)
      let prev_child = cur - 1 > -1 ? target_children[cur - 1] : null
      let next_child = cur + 1 < len ? target_children[cur + 1] : null
      targetText = `
            <div class="mdui-container">
                <div class="mdui-row-xs-2 mdui-m-b-1">
                    <div class="mdui-col">
                        ${
                          prev_child
                            ? `<button id="leftBtn" data-filepath="${prev_child}" class="mdui-btn mdui-btn-block mdui-color-theme-accent mdui-ripple">Previous</button>`
                            : `<button class="mdui-btn mdui-btn-block mdui-color-theme-accent mdui-ripple" disabled>Previous</button>`
                        }
                    </div>
                    <div class="mdui-col">
                        ${
                          next_child
                            ? `<button id="rightBtn" data-filepath="${next_child}" class="mdui-btn mdui-btn-block mdui-color-theme-accent mdui-ripple">Next</button>`
                            : `<button class="mdui-btn mdui-btn-block mdui-color-theme-accent mdui-ripple" disabled>Next</button>`
                        }
                    </div>
                </div>
            </div>`
    }
  }
  let content = `
<div class="mdui-container-fluid">
    <br>
    <div id="imgWrap">
        ${targetText}
	    <img class="mdui-img-fluid" src="${url}"/>
    </div>
	<br>
	<div class="mdui-textfield">
	  <label class="mdui-textfield-label">Download Link</label>
	  <input class="mdui-textfield-input" type="text" value="${url}"/>
	</div>
        <br>
</div>
<a href="${url}" class="mdui-fab mdui-fab-fixed mdui-ripple mdui-color-theme-accent"><i class="mdui-icon material-icons">file_download</i></a>`
  $("#content").html(content)
  $("#leftBtn, #rightBtn").click((e) => {
    let target = $(e.target)
    if (["I", "SPAN"].includes(e.target.nodeName)) {
      target = $(e.target).parent()
    }
    const filepath = target.attr("data-filepath")
    const direction = target.attr("data-direction")
    file(filepath)
  })
}
function utc2beijing(utc_datetime) {
  let T_pos = utc_datetime.indexOf("T")
  let Z_pos = utc_datetime.indexOf("Z")
  let year_month_day = utc_datetime.substr(0, T_pos)
  let hour_minute_second = utc_datetime.substr(T_pos + 1, Z_pos - T_pos - 1)
  let new_datetime = year_month_day + " " + hour_minute_second
  timestamp = new Date(Date.parse(new_datetime))
  timestamp = timestamp.getTime()
  timestamp = timestamp / 1000
  let unixtimestamp = timestamp + 8 * 60 * 60
  unixtimestamp = new Date(unixtimestamp * 1000)
  let year = 1900 + unixtimestamp.getYear()
  let month = "0" + (unixtimestamp.getMonth() + 1)
  let date = "0" + unixtimestamp.getDate()
  let hour = "0" + unixtimestamp.getHours()
  let minute = "0" + unixtimestamp.getMinutes()
  let second = "0" + unixtimestamp.getSeconds()
  return (
    year +
    "-" +
    month.substring(month.length - 2, month.length) +
    "-" +
    date.substring(date.length - 2, date.length) +
    " " +
    hour.substring(hour.length - 2, hour.length) +
    ":" +
    minute.substring(minute.length - 2, minute.length) +
    ":" +
    second.substring(second.length - 2, second.length)
  )
}
function formatFileSize(bytes) {
  if (bytes >= 1000000000) {
    bytes = (bytes / 1000000000).toFixed(2) + " GB"
  } else if (bytes >= 1000000) {
    bytes = (bytes / 1000000).toFixed(2) + " MB"
  } else if (bytes >= 1000) {
    bytes = (bytes / 1000).toFixed(2) + " KB"
  } else if (bytes > 1) {
    bytes = bytes + " bytes"
  } else if (bytes == 1) {
    bytes = bytes + " byte"
  } else {
    bytes = ""
  }
  return bytes
}
String.prototype.trim = function (char) {
  if (char) {
    return this.replace(
      new RegExp("^\\" + char + "+|\\" + char + "+$", "g"),
      ""
    )
  }
  return this.replace(/^\s+|\s+$/g, "")
}
function markdown(el, data) {
  if (window.md == undefined) {
    window.md = window.markdownit()
    markdown(el, data)
  } else {
    let html = md.render(data)
    $(el).show().html(html)
  }
}
window.onpopstate = function () {
  let path = window.location.pathname
  render(path)
}
document.addEventListener("DOMContentLoaded", function(event) {
  init()
  let path = window.location.pathname
  render(path)
})
