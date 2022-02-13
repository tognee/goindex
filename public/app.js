document.write(`
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js" integrity="sha512-bLT0Qm9VnAYZDflyKcBaQ2gg0hSYNQrJ8RilYldYQ1FxQYoCLtUjuuRuZo+fjqhx/qtq/1itJ0C2ejDxltZVFg==" crossorigin="anonymous"></script>

  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

  <script src="//cdn.jsdelivr.net/gh/tognee/goindex@2.0.0/js/flv.min.js"></script>
  <script src="//cdn.jsdelivr.net/gh/tognee/goindex@2.0.0/js/DPlayer.min.js"></script>
  <script src="//cdn.jsdelivr.net/npm/markdown-it@10.0.0/dist/markdown-it.min.js"></script>`);

function init() {
  document.siteName = $("title").html();
  if (UI.dark_mode) $(":root").attr("dark", true)
  var html = `
<header>
		<a href="/"><img class="avatar" src="/avatar.jpg"/></a>
    <div id="nav" class="navbar"> </div>
</header>
<div class="container">
	<article id="content">
  </article>
</div>
	`;
  $("body").html(html);
}
const Os = {
  isWindows: navigator.platform.toUpperCase().indexOf("WIN") > -1,
  isMac: navigator.platform.toUpperCase().indexOf("MAC") > -1,
  isMacLike: /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform),
  isIos: /(iPhone|iPod|iPad)/i.test(navigator.platform),
  isMobile: /Android|webOS|iPhone|iPad|iPod|iOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ),
};
function getDocumentHeight() {
  var D = document;
  return Math.max(
    D.body.scrollHeight,
    D.documentElement.scrollHeight,
    D.body.offsetHeight,
    D.documentElement.offsetHeight,
    D.body.clientHeight,
    D.documentElement.clientHeight
  );
}
function render(path) {
  if (path.indexOf("?") > 0) {
    path = path.substr(0, path.indexOf("?"));
  }
  $("title").html(`${document.siteName}`);
  nav(path);
  var reg = /\/\d+:$/g;
  if (window.MODEL.is_search_page) {
    window.scroll_status = { event_bound: !1, loading_lock: !1 };
    render_search_result_list();
  } else if (path.match(reg) || path.substr(-1) == "/") {
    window.scroll_status = { event_bound: !1, loading_lock: !1 };
    list(path);
  } else {
    file(path);
  }
}
function nav(path) {
  var model = window.MODEL;
  var html = "";
  var cur = window.current_drive_order || 0;
  var names = window.drive_names;
  var rootPath = ""
  if (names.length > 1){
    html += `<select onchange="window.location.href=this.value" style="overflow:visible;">`;
    names.forEach((name, idx) => {
      html += `<option value="/${idx}:/" ${idx === cur ? 'selected="selected"' : ""}>${name}</option>`;
    });
    html += `</select>`;
    rootPath = `/${cur}:`
  }
  html += `<a href="${rootPath}/" class="root-folder">${document.siteName}</a>`;
  if (!model.is_search_page) {
    var arr = path.trim("/").split("/");
    var p = "/";
    if (arr.length && arr[0].match(/\d+:$/g)) arr.shift();
    for (i in arr) {
      var n = arr[i];
      n = decodeURI(n);
      p += n + "/";
      if (n == "") {
        break;
      }
      html += `<span class="material-icons" style="margin:0;">chevron_right</span><a href="${rootPath}${p}">${n}</a>`;
    }
  }
  /*var search_text = model.is_search_page ? model.q || "" : "";
  const isMobile = Os.isMobile;
  var search_bar = `<div class="mdui-toolbar-spacer"></div>
        <div id="search_bar" class="mdui-textfield mdui-textfield-expandable mdui-float-right ${model.is_search_page ? "mdui-textfield-expanded" : ""}" style="max-width:${isMobile ? 300 : 400}px">
            <button class="mdui-textfield-icon mdui-btn mdui-btn-icon" onclick="if($('#search_bar').hasClass('mdui-textfield-expanded') && $('#search_bar_form>input').val()) $('#search_bar_form').submit();">
                <i class="mdui-icon material-icons">search</i>
            </button>
            <form id="search_bar_form" method="get" action="${rootPath}search">
            <input class="mdui-textfield-input" type="text" name="q" placeholder="Search in current drive" value="${search_text}"/>
            </form>
            <button class="mdui-textfield-close mdui-btn mdui-btn-icon"><i class="mdui-icon material-icons">close</i></button>
        </div>`;
  if (model.root_type < 2) {
    html += search_bar;
  }*/
  $("#nav").html(html);
  //mdui.mutation();
  //mdui.updateTextFields();
}

function requestListPath(path, params, resultCallback, authErrorCallback) {
  var p = {
    password: params.password || null,
    page_token: params.page_token || null,
    page_index: params.page_index || 0,
  };
  $.post(path, p, function (data, status) {
    var res = jQuery.parseJSON(data);
    if (res && res.error && res.error.code == "401") {
      if (authErrorCallback) authErrorCallback(path);
    } else if (res && res.data) {
      if (resultCallback) resultCallback(res, path, p);
    }
  });
}

function requestSearch(params, resultCallback) {
  var p = {
    q: params.q || null,
    page_token: params.page_token || null,
    page_index: params.page_index || 0,
  };
  $.post(`/${window.current_drive_order}:search`, p, function (data, status) {
    var res = jQuery.parseJSON(data);
    if (res && res.data) {
      if (resultCallback) resultCallback(res, p);
    }
  });
}

function list(path) {
  var content = `
  <table id="contentTable">
    <thead>
      <tr>
        <th>
          File
          <span class="material-icons icon-sort" data-sort="name" data-order="more">expand_more</span>
        </th>
        <th class="right hide-on-mobile">
          Date Modified
          <span class="material-icons icon-sort" data-sort="name" data-order="more">expand_more</span>
        </th>
        <th class="right hide-on-mobile">
          Size
          <span class="material-icons icon-sort" data-sort="name" data-order="more">expand_more</span>
        </th>
      </tr>
    </thead>
    <tbody id="list"> </tbody>
  </table>
  <div id="count" class="hidden">Total <span class="number"></span> Item</div>
	`;
  $("#content").html(content);
  var password = localStorage.getItem("password" + path);

  $("#list").html(`<tr><td class="mdui-progress"><div class="mdui-progress-indeterminate"></div></td></tr>`);

  // $("#readme_md").hide().html("");
  // $("#head_md").hide().html("");

  function successResultCallback(res, path, prevReqParams) {
    $("#list")
      .data("nextPageToken", res.nextPageToken)
      .data("curPageIndex", res.curPageIndex);
    $("#spinner").remove();
    if (res.nextPageToken === null) {
      $(window).off("scroll");
      window.scroll_status.event_bound = !1;
      window.scroll_status.loading_lock = !1;
      append_files_to_list(path, res.data.files);
    } else {
      append_files_to_list(path, res.data.files);
      if (window.scroll_status.event_bound !== !0) {
        $(window).on("scroll", function () {
          var scrollTop = $(this).scrollTop();
          var scrollHeight = getDocumentHeight();
          var windowHeight = $(this).height();
          if (
            scrollTop + windowHeight >
            scrollHeight - (Os.isMobile ? 130 : 80)
          ) {
            if (window.scroll_status.loading_lock === !0) {
              return;
            }
            window.scroll_status.loading_lock = !0;
            $(
              `<div id="spinner" class="mdui-spinner mdui-spinner-colorful mdui-center"></div>`
            ).insertBefore("#readme_md");
            //mdui.updateSpinners();
            let $list = $("#list");
            requestListPath(
              path,
              {
                password: prevReqParams.password,
                page_token: $list.data("nextPageToken"),
                page_index: $list.data("curPageIndex") + 1,
              },
              successResultCallback,
              null
            );
          }
        });
        window.scroll_status.event_bound = !0;
      }
    }
    if (window.scroll_status.loading_lock === !0) {
      window.scroll_status.loading_lock = !1;
    }
  }
  requestListPath(
    path,
    { password: password },
    successResultCallback,
    function (path) {
      $("#spinner").remove();
      var pass = prompt("Directory encrypted, Please enter the Password", "");
      localStorage.setItem("password" + path, pass);
      if (pass != null && pass != "") {
        list(path);
      } else {
        history.go(-1);
      }
    }
  );
}

function append_files_to_list(path, files) {
  var $list = $("#list");
  var is_lastpage_loaded = null === $list.data("nextPageToken");
  var is_firstpage = "0" == $list.data("curPageIndex");
  html = "";
  let targetFiles = [];
  for (i in files) {
    var item = files[i];
    var p = path + item.name + "/";
    if (item.size == undefined) {
      item.size = "";
    }
    item.modifiedTime = utc2beijing(item.modifiedTime);
    item.size = formatFileSize(item.size);
    if (item.mimeType == "application/vnd.google-apps.folder") {
      html += `
        <tr class="list_item" onclick="window.location='${p}';">
          <td title="${item.name}"><span class="material-icons">folder_open</span> ${item.name}</td>
          <td class="right hide-on-mobile">${item["modifiedTime"]}</td>
          <td class="right hide-on-mobile">${item["size"]}</td>
        </tr>`;
    } else {
      var p = path + item.name;
      const filepath = path + item.name;
      var c = "file";

      // Readme File
      if (is_lastpage_loaded && item.name == "README.md") {
        get_file(p, item, function (data) {
          markdown("#readme_md", data);
        });
      }

      // Header File
      if (item.name == "HEAD.md") {
        get_file(p, item, function (data) {
          markdown("#head_md", data);
        });
      }

      var ext = p.split(".").pop().toLowerCase();
      if (
        "|html|php|css|go|java|js|json|txt|sh|md|mp4|webm|avi|bmp|jpg|jpeg|png|gif|m4a|mp3|flac|wav|ogg|mpg|mpeg|mkv|rm|rmvb|mov|wmv|asf|ts|flv|pdf|".indexOf(`|${ext}|`) >= 0) {
        targetFiles.push(filepath);
        p += "?a=view";
        c += " view";
      }
      html += `
        <tr gd-type="${item.mimeType}" class="list_item ${c}" onclick="window.location='${p}';">
          <td title="${item.name}"><span class="mdui-icon material-icons">insert_drive_file</span> ${item.name}</td>
          <td class="right hide-on-mobile">${item["modifiedTime"]}</td>
          <td class="right hide-on-mobile">${item["size"]}</td>
        </tr>`;
    }
  }
  if (targetFiles.length > 0) {
    let old = localStorage.getItem(path);
    let new_children = targetFiles;
    if (!is_firstpage && old) {
      let old_children;
      try {
        old_children = JSON.parse(old);
        if (!Array.isArray(old_children)) {
          old_children = [];
        }
      } catch (e) {
        old_children = [];
      }
      new_children = old_children.concat(targetFiles);
    }
    localStorage.setItem(path, JSON.stringify(new_children));
  }
  $list.html(($list.data("curPageIndex") == "0" ? "" : $list.html()) + html);
  if (is_lastpage_loaded) {
    $("#count")
      .removeClass("hidden")
      .find(".number")
      .text($list.find("tr.list_item").length);
  }
}
function render_search_result_list() {
  var content = `
	<div id="head_md" class="mdui-typo" style="display:none;padding: 20px 0;"></div>

	 <div class="mdui-row">
	  <ul class="mdui-list">
	   <li class="mdui-list-item th">
	    <div class="pure-u-1 pure-u-sm-14-24">
	     File
	<i class="mdui-icon material-icons icon-sort" data-sort="name" data-order="more">expand_more</i>
	    </div>
	    <div class="pure-u-sm-6-24 mdui-text-right">
	     Date Modified
	<i class="mdui-icon material-icons icon-sort" data-sort="date" data-order="downward">expand_more</i>
	    </div>
	    <div class="pure-u-sm-4-24 mdui-text-right">
	     Size
	<i class="mdui-icon material-icons icon-sort" data-sort="size" data-order="downward">expand_more</i>
	    </div>
	    </li>
	  </ul>
	 </div>
	 <div class="mdui-row">
	  <ul id="list" class="mdui-list">
	  </ul>
	  <div id="count" class="hidden mdui-center mdui-text-center mdui-m-b-3 mdui-typo-subheading mdui-text-color-blue-grey-500">Total <span class="number"></span> Item(s)</div>
	 </div>
	 <div id="readme_md" class="mdui-typo" style="display:none; padding: 20px 0;"></div>
	`;
  $("#content").html(content);
  $("#list").html(
    `<div class="mdui-progress"><div class="mdui-progress-indeterminate"></div></div>`
  );
  $("#readme_md").hide().html("");
  $("#head_md").hide().html("");
  function searchSuccessCallback(res, prevReqParams) {
    $("#list")
      .data("nextPageToken", res.nextPageToken)
      .data("curPageIndex", res.curPageIndex);
    $("#spinner").remove();
    if (res.nextPageToken === null) {
      $(window).off("scroll");
      window.scroll_status.event_bound = !1;
      window.scroll_status.loading_lock = !1;
      append_search_result_to_list(res.data.files);
    } else {
      append_search_result_to_list(res.data.files);
      if (window.scroll_status.event_bound !== !0) {
        $(window).on("scroll", function () {
          var scrollTop = $(this).scrollTop();
          var scrollHeight = getDocumentHeight();
          var windowHeight = $(this).height();
          if (
            scrollTop + windowHeight >
            scrollHeight - (Os.isMobile ? 130 : 80)
          ) {
            if (window.scroll_status.loading_lock === !0) {
              return;
            }
            window.scroll_status.loading_lock = !0;
            $(
              `<div id="spinner" class="mdui-spinner mdui-spinner-colorful mdui-center"></div>`
            ).insertBefore("#readme_md");
            //mdui.updateSpinners();
            let $list = $("#list");
            requestSearch(
              {
                q: window.MODEL.q,
                page_token: $list.data("nextPageToken"),
                page_index: $list.data("curPageIndex") + 1,
              },
              searchSuccessCallback
            );
          }
        });
        window.scroll_status.event_bound = !0;
      }
    }
    if (window.scroll_status.loading_lock === !0) {
      window.scroll_status.loading_lock = !1;
    }
  }
  requestSearch({ q: window.MODEL.q }, searchSuccessCallback);
}
function append_search_result_to_list(files) {
  var $list = $("#list");
  var is_lastpage_loaded = null === $list.data("nextPageToken");
  html = "";
  for (i in files) {
    var item = files[i];
    if (item.size == undefined) {
      item.size = "";
    }
    item.modifiedTime = utc2beijing(item.modifiedTime);
    item.size = formatFileSize(item.size);
    if (item.mimeType == "application/vnd.google-apps.folder") {
      html += `<li class="mdui-list-item mdui-ripple"><a id="${item["id"]}" onclick="onSearchResultItemClick(this)" class="folder">
	            <div class="pure-u-1 pure-u-sm-14-24 mdui-text-truncate" title="${item.name}">
	            <i class="mdui-icon material-icons">folder_open</i>
	              ${item.name}
	            </div>
	            <div class="pure-u-sm-6-24 mdui-text-right">${item["modifiedTime"]}</div>
	            <div class="pure-u-sm-4-24 mdui-text-right">${item["size"]}</div>
	            </a>
	        </li>`;
    } else {
      var c = "file";
      var ext = item.name.split(".").pop().toLowerCase();
      if (
        "|html|php|css|go|java|js|json|txt|sh|md|mp4|webm|avi|bmp|jpg|jpeg|png|gif|m4a|mp3|flac|wav|ogg|mpg|mpeg|mkv|rm|rmvb|mov|wmv|asf|ts|flv|".indexOf(
          `|${ext}|`
        ) >= 0
      ) {
        c += " view";
      }
      html += `<li class="mdui-list-item file mdui-ripple" target="_blank"><a id="${item["id"]}" gd-type="${item.mimeType}" onclick="onSearchResultItemClick(this)" class="${c}">
	          <div class="pure-u-1 pure-u-sm-14-24 mdui-text-truncate" title="${item.name}">
	          <i class="mdui-icon material-icons">insert_drive_file</i>
	            ${item.name}
	          </div>
	          <div class="pure-u-sm-6-24 mdui-text-right">${item["modifiedTime"]}</div>
	          <div class="pure-u-sm-4-24 mdui-text-right">${item["size"]}</div>
	          </a>
	      </li>`;
    }
  }
  $list.html(($list.data("curPageIndex") == "0" ? "" : $list.html()) + html);
  if (is_lastpage_loaded) {
    $("#count")
      .removeClass("hidden")
      .find(".number")
      .text($list.find("li.mdui-list-item").length);
  }
}
/*
function onSearchResultItemClick(a_ele) {
  var me = $(a_ele);
  var can_preview = me.hasClass("view");
  var cur = window.current_drive_order;
  var dialog = mdui.dialog({
    title: "",
    content:
      '<div class="mdui-text-center mdui-typo-title mdui-m-b-1">Getting Target Path...</div><div class="mdui-spinner mdui-spinner-colorful mdui-center"></div>',
    history: !1,
    modal: !0,
    closeOnEsc: !0,
  });
  mdui.updateSpinners();
  $.post(`${rootPath}id2path`, { id: a_ele.id }, function (data) {
    if (data) {
      dialog.close();
      var href = `${rootPath}${data}${can_preview ? "?a=view" : ""}`;
      dialog = mdui.dialog({
        title: '<i class="mdui-icon material-icons"></i>Target Path',
        content: `<a href="${href}">${data}</a>`,
        history: !1,
        modal: !0,
        closeOnEsc: !0,
        buttons: [
          {
            text: "Open in same tab",
            onClick: function () {
              window.location.href = href;
            },
          },
          {
            text: "Open in new tab",
            onClick: function () {
              window.open(href);
            },
          },
          { text: "Cancel" },
        ],
      });
      return;
    }
    dialog.close();
    dialog = mdui.dialog({
      title: '<i class="mdui-icon material-icons">&#xe811;</i>Failed to get the target path',
      content: "It may be because this item does not exist in the Folder! It may also be because the file [Shared with me] has not been added to Personal Drive!",
      history: !1,
      modal: !0,
      closeOnEsc: !0,
      buttons: [{ text: "WTF ???" }],
    });
  });
}
*/
function get_file(path, file, callback) {
  var key = "file_path_" + path + file.modifiedTime;
  var data = localStorage.getItem(key);
  if (data != undefined) {
    return callback(data);
  } else {
    $.get(path, function (d) {
      localStorage.setItem(key, d);
      callback(d);
    });
  }
}
function file(path) {
  var name = path.split("/").pop();
  var ext = name
    .split(".")
    .pop()
    .toLowerCase()
    .replace(`?a=view`, "")
    .toLowerCase();
  if ("|html|php|css|go|java|js|json|txt|sh|md|".indexOf(`|${ext}|`) >= 0) {
    return file_code(path);
  }
  if ("|mp4|webm|avi|".indexOf(`|${ext}|`) >= 0) {
    return file_video(path);
  }
  if ("|mpg|mpeg|mkv|rm|rmvb|mov|wmv|asf|ts|flv|".indexOf(`|${ext}|`) >= 0) {
    return file_video(path);
  }
  if ("|mp3|flac|wav|ogg|m4a|".indexOf(`|${ext}|`) >= 0) {
    return file_audio(path);
  }
  if ("|bmp|jpg|jpeg|png|gif|".indexOf(`|${ext}|`) >= 0) {
    return file_image(path);
  }
  if ("pdf" === ext) return file_pdf(path);
}
function file_code(path) {
  var type = {
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
  };
  var name = path.split("/").pop();
  var ext = name.split(".").pop().toLowerCase();
  var href = window.location.origin + path;
  var content = `
<div class="mdui-container">
<pre id="editor" ></pre>
</div>
<div class="mdui-textfield">
	<label class="mdui-textfield-label">Download Link</label>
	<input class="mdui-textfield-input" type="text" value="${href}"/>
</div>
<a href="${href}" class="mdui-fab mdui-fab-fixed mdui-ripple mdui-color-theme-accent"><i class="mdui-icon material-icons">file_download</i></a>
	`;
  $("#content").html(content);
  $.get(path, function (data) {
    $("#editor").html($("<div/>").text(data).html());
    var code_type = "Text";
    if (type[ext] != undefined) {
      code_type = type[ext];
    }
    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/ambiance");
    editor.setFontSize(18);
    editor.session.setMode("ace/mode/" + code_type);
    editor.setOptions({
      enableBasicAutocompletion: !0,
      enableSnippets: !0,
      enableLiveAutocompletion: !0,
      maxLines: Infinity,
    });
  });
}
function copyToClipboard(str) {
  const $temp = $("<input>");
  $("body").append($temp);
  $temp.val(str).select();
  document.execCommand("copy");
  $temp.remove();
}
function file_video(path) {
  const url = window.location.origin + path;
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
    .join("");
  player_items += `<li class="mdui-divider"></li>
                   <li class="mdui-menu-item"><a id="copy-link" class="mdui-ripple">Copy Link</a></li>`;
  const playBtn = `
      <button class="mdui-btn mdui-ripple mdui-color-theme-accent" mdui-menu="{target:'#player-items'}">
        <i class="mdui-icon material-icons">&#xe039;</i>Play In External Player<i class="mdui-icon material-icons">&#xe5cf;</i>
      </button>
      <ul class="mdui-menu" id="player-items">${player_items}</ul>`;
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
<a href="${url}" class="mdui-fab mdui-fab-fixed mdui-ripple mdui-color-theme-accent"><i class="mdui-icon material-icons">file_download</i></a>
	`;
  $("#content").html(content);
  $("#copy-link").on("click", () => {
    copyToClipboard(url);
    //mdui.snackbar("Copied to clipboard!");
  });
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
  });
}
function file_audio(path) {
  var url = window.location.origin + path;
  var content = `
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
<a href="${url}" class="mdui-fab mdui-fab-fixed mdui-ripple mdui-color-theme-accent"><i class="mdui-icon material-icons">file_download</i></a>
	`;
  $("#content").html(content);
}
function file_pdf(path) {
  const url = window.location.origin + path;
  const inline_url = `${url}?inline=true`;
  const file_name = decodeURI(
    path.slice(path.lastIndexOf("/") + 1, path.length)
  );
  var content = `
	<object data="${inline_url}" type="application/pdf" name="${file_name}" style="width:100%;height:94vh;"><embed src="${inline_url}" type="application/pdf"/></object>
    <a href="${url}" class="mdui-fab mdui-fab-fixed mdui-ripple mdui-color-theme-accent"><i class="mdui-icon material-icons">file_download</i></a>
	`;
  $("#content")
    .removeClass("mdui-container")
    .addClass("mdui-container-fluid")
    .css({ padding: 0 })
    .html(content);
}
function file_image(path) {
  var url = window.location.origin + path;
  const currentPathname = window.location.pathname;
  const lastIndex = currentPathname.lastIndexOf("/");
  const fatherPathname = currentPathname.slice(0, lastIndex + 1);
  let target_children = localStorage.getItem(fatherPathname);
  let targetText = "";
  if (target_children) {
    try {
      target_children = JSON.parse(target_children);
      if (!Array.isArray(target_children)) {
        target_children = [];
      }
    } catch (e) {
      console.error(e);
      target_children = [];
    }
    if (target_children.length > 0 && target_children.includes(path)) {
      let len = target_children.length;
      let cur = target_children.indexOf(path);
      let prev_child = cur - 1 > -1 ? target_children[cur - 1] : null;
      let next_child = cur + 1 < len ? target_children[cur + 1] : null;
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
            </div>
            `;
    }
  }
  var content = `
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
<a href="${url}" class="mdui-fab mdui-fab-fixed mdui-ripple mdui-color-theme-accent"><i class="mdui-icon material-icons">file_download</i></a>
    `;
  $("#content").html(content);
  $("#leftBtn, #rightBtn").click((e) => {
    let target = $(e.target);
    if (["I", "SPAN"].includes(e.target.nodeName)) {
      target = $(e.target).parent();
    }
    const filepath = target.attr("data-filepath");
    const direction = target.attr("data-direction");
    file(filepath);
  });
}
function utc2beijing(utc_datetime) {
  var T_pos = utc_datetime.indexOf("T");
  var Z_pos = utc_datetime.indexOf("Z");
  var year_month_day = utc_datetime.substr(0, T_pos);
  var hour_minute_second = utc_datetime.substr(T_pos + 1, Z_pos - T_pos - 1);
  var new_datetime = year_month_day + " " + hour_minute_second;
  timestamp = new Date(Date.parse(new_datetime));
  timestamp = timestamp.getTime();
  timestamp = timestamp / 1000;
  var unixtimestamp = timestamp + 8 * 60 * 60;
  var unixtimestamp = new Date(unixtimestamp * 1000);
  var year = 1900 + unixtimestamp.getYear();
  var month = "0" + (unixtimestamp.getMonth() + 1);
  var date = "0" + unixtimestamp.getDate();
  var hour = "0" + unixtimestamp.getHours();
  var minute = "0" + unixtimestamp.getMinutes();
  var second = "0" + unixtimestamp.getSeconds();
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
  );
}
function formatFileSize(bytes) {
  if (bytes >= 1000000000) {
    bytes = (bytes / 1000000000).toFixed(2) + " GB";
  } else if (bytes >= 1000000) {
    bytes = (bytes / 1000000).toFixed(2) + " MB";
  } else if (bytes >= 1000) {
    bytes = (bytes / 1000).toFixed(2) + " KB";
  } else if (bytes > 1) {
    bytes = bytes + " bytes";
  } else if (bytes == 1) {
    bytes = bytes + " byte";
  } else {
    bytes = "";
  }
  return bytes;
}
String.prototype.trim = function (char) {
  if (char) {
    return this.replace(
      new RegExp("^\\" + char + "+|\\" + char + "+$", "g"),
      ""
    );
  }
  return this.replace(/^\s+|\s+$/g, "");
};
function markdown(el, data) {
  if (window.md == undefined) {
    window.md = window.markdownit();
    markdown(el, data);
  } else {
    var html = md.render(data);
    $(el).show().html(html);
  }
}
window.onpopstate = function () {
  var path = window.location.pathname;
  render(path);
};
document.addEventListener("DOMContentLoaded", function(event) {
  init();
  var path = window.location.pathname;
  render(path);
});
