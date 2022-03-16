export const authConfig = {
  siteName: "Google Drive Index",
  siteFavicon: "",
  siteAvatar: "",
  client_id: "",
  client_secret: "",
  refresh_token: "",
  /**
  * Set up multiple Drives to be displayed; add multiples by format
  * [id]: It can be team folder id, subfolder id, or "root" (representing the root directory of personal disk);
  * [name]: the displayed name
  * [users]: an object containing pairs of usernames and passwords
  * [protect_file_link]: Whether Basic Auth is used to protect the file link, the default value (when not set) is false, that is, the file link is not protected (convenient for straight chain download / external playback, etc.)
  * Basic Auth of each folder can be set separately. Basic Auth protects all folders / subfolders in the disk by default
  * [Note] By default, the file link is not protected, which can facilitate straight-chain download / external playback;
  * If you want to protect the file link, you need to set protect_file_link to true. At this time, if you want to perform external playback and other operations, you need to replace host with user: pass @ host
  * No need for Basic Auth folder, just keep user and pass empty at the same time. (No need to set it directly)
  * [Note] For the folder whose id is set to the subfolder id, the search function will not be supported (it does not affect other disks).
  **/
  roots: [
    {
      id: "root", //you can use folderid other than root but then search wont work
      name: "Personal Drive",
    },
    {
      id: "drive_id",
      name: "Personal Drive II",
      users: {
        'username': 'password'
      }
    }
  ],

  /**
  * The number of files to display per page. [Recommended value is between 100 and 1000].
  * If this value is greater than 1000, it causes an error when requesting the drive API.
  * If this value is too small, it causes the incremental loading to fail.
  * Another effect of this value is that if the number of files in the directory is greater than this value (i.e., if multiple pages need to be displayed), the results will be cached.
  */
  files_list_page_size: 500,
  // If you want to allow CORS, you can enable this.
  enable_cors_file_down: false,
  /**
  * The basic auth above already includes on-disk global protection, so the default is not to authenticate the password in the .password file. So by default, passwords in .password files are no longer authenticated;
  * If you still need to protect certain directories on top of the global auth using the .password file, set this option to true.
  * Note: If you enable password authentication with .password files, an additional query will be added to each directory to check whether a .password file exists.
  */
  enable_password_file_verify: false,
}
