import { loadFeed, LocalFeedOptions } from "../core/provider-local"
import auth = require('../core/auth');
import api = require('../core/api');
import { Feed, User } from '../core/model';
import ffmpeg = require('../core/ffmpeg-wrapper')
import fs = require('fs-extra');
import { remote, ipcRenderer, shell, App, clipboard } from "electron"
import { JSONStorage } from "node-localstorage"
import { LocalServer } from "../core/localserver";
import unhandled = require('../core/unhandledSetup')
unhandled.init()

const nodeStorage = new JSONStorage(remote.app.getPath('userData'));
const server = new LocalServer()

const versionText = document.getElementById("version-text");
const emailText = document.getElementById("email-text");
const helpButton = document.getElementById("help-button");
const logoutButton = document.getElementById("logout-button");
const selectFolderButton = document.getElementById("select-folder-button");
const selectedFolderText = <HTMLInputElement>document.getElementById("selected-folder");
const recursiveCheckbox = <HTMLInputElement>document.getElementById("recursive-checkbox");
const filterNameInput = <HTMLInputElement>document.getElementById("filter-name");
const orderOption = <HTMLInputElement>document.getElementById("order-option");
const typeOption = <HTMLInputElement>document.getElementById("type-option");
const layoutOption = <HTMLInputElement>document.getElementById("layout-option");
const publishButton = <HTMLInputElement>document.getElementById("publish-button");
const publishStopButton = <HTMLInputElement>document.getElementById("publish-stop-button");
const previewOutput = document.getElementById("preview-output")
const previewLinkList = document.getElementById("preview-link-list")
const feedLink = <HTMLInputElement>document.getElementById("feed-link")
const feedLinkCopyButton = <HTMLInputElement>document.getElementById("feed-link-copy")
const feedLinkContainer = document.getElementById("feed-link-container")
const generateThumbnailsCard = document.getElementById("generate-thumbnails-card")
const generateThumbnailsButton = document.getElementById("generate-thumbnails-button")
const generateThumbnailsProgress = document.getElementById("generate-thumbnails-progress")

const currentUser: User = remote.getGlobal('user')
const version: string = remote.getGlobal('version')

let settings: LocalFeedOptions = {
  dir: "",
  recursive: false,
  type: "180",
  layout: "sbs",
  name: "Name",
  orderBy: "date",
  ...nodeStorage.getItem("settings"),
  fileNameFilter: ""
};

showBasicInfo()
updateSettingsUI()
reloadFeed()

publishButton.addEventListener("click", start);
publishStopButton.addEventListener("click", stop);
recursiveCheckbox.addEventListener("change", () => {
  settings.recursive = recursiveCheckbox.checked;
  reloadFeed()
});
selectFolderButton.addEventListener("click", () => {
  remote
    .dialog
    .showOpenDialog({
      title: "Select VR video folder",
      message: "Select VR video folder",
      properties: ['openDirectory']
    }, (folders) => {
      settings.dir = folders[0]
      selectedFolderText.value = settings.dir
      reloadFeed()
    })
})
filterNameInput.addEventListener("change", () => {
  settings.fileNameFilter = filterNameInput.value
  console.log("Filter: " + settings.fileNameFilter)
  reloadFeed()
})
orderOption.addEventListener("change", () => {
  settings.orderBy = orderOption.value
  reloadFeed()
})
typeOption.addEventListener("change", () => {
  settings.type = typeOption.value
  reloadFeed()
})
layoutOption.addEventListener("change", () => {
  settings.layout = layoutOption.value
  reloadFeed()
})
helpButton.addEventListener("click", () => {
  shell.openExternal("https://littlstream.com/desktop.html")
})
logoutButton.addEventListener("click", () => {
  ipcRenderer.send('logout')
})
feedLinkCopyButton.addEventListener("click", () => {
  clipboard.writeText(feedLink.value)
})

function showBasicInfo() {
  emailText.innerText = currentUser.email
  versionText.innerText = "v" + version
}

function updateSettingsUI() {
  if (settings.dir) {
    selectedFolderText.value = settings.dir
  } else {
    selectedFolderText.value = ""
  }
  recursiveCheckbox.checked = settings.recursive
  orderOption.value = settings.orderBy
  typeOption.value = settings.type
  layoutOption.value = settings.layout
}

async function start() {
  server.start(settings.dir)
  let finalFeed = await loadFeed({
    endpoint: server.endpoint,
    ...settings
  })
  let feedUrl = await auth.storeData(currentUser, finalFeed)
  feedLink.value = feedUrl
  feedLinkContainer.classList.remove("d-none")
  publishButton.disabled = true
  publishStopButton.disabled = false
}

async function stop() {
  server.stop()
  publishButton.disabled = false
  publishStopButton.disabled = true
  feedLinkContainer.classList.add("d-none")
}

async function reloadFeed() {
  stop()
  nodeStorage.setItem("settings", settings)
  console.log("Checking " + settings.dir)
  if (!settings.dir) {
    console.log("Empty")
    return
  }
  if (!fs.existsSync(settings.dir)) {
    console.log("Doesn't exist")
    return
  }
  try {
    fs.accessSync(settings.dir, fs.constants.W_OK | fs.constants.R_OK)
  } catch (err) {
    console.log("Not allowed")
    return
  }
  const feedPreview = await loadFeed(settings)
  printPreview(feedPreview)

  let missingThumbnails = !!feedPreview.videos.find(video => !fs.existsSync(video.thumbFile))
  if (missingThumbnails) {
    enableThumbnailGeneration(feedPreview)
    generateThumbnailsCard.classList.remove("d-none")
  } else {
    generateThumbnailsCard.classList.add("d-none")
  }
}

function printPreview(feedPreview: Feed) {
  previewOutput.innerText = `Found ${feedPreview.videos.length} videos`

  while (previewLinkList.firstChild) {
    previewLinkList.removeChild(previewLinkList.firstChild);
  }
  feedPreview.videos.map(video => {
    let thumbnail = document.createElement("div")
    thumbnail.classList.add("float-left")
    thumbnail.classList.add("mr-3")
    thumbnail.classList.add("rounded")
    thumbnail.classList.add("thumbnail-" + video.layout)

    if (fs.existsSync(video.thumbFile)) {
      let img = document.createElement("img")
      img.src = video.thumbFile
      thumbnail.appendChild(img)
    } else {
      thumbnail.classList.add("thumbnail-missing")
    }

    let title = document.createElement("span")
    title.innerText = video.title
    title.classList.add("video-title")

    let container = document.createElement('div');
    container.classList.add("clearfix")
    container.classList.add("mb-2")
    container.appendChild(thumbnail)
    container.appendChild(title);
    return container
  }).forEach(li => {
    previewLinkList.appendChild(li)
  })
}

let thumbnailsClickListener
function enableThumbnailGeneration(previewFeed: Feed) {
  generateThumbnailsButton.classList.remove("d-none")
  generateThumbnailsProgress.classList.add("d-none")

  if (thumbnailsClickListener) {
    generateThumbnailsButton.removeEventListener("click", thumbnailsClickListener)
  }
  thumbnailsClickListener = async function () {
    if(!ffmpeg.exists()){
      ffmpeg.showInstallRequiredDialog()
      return
    }
    generateThumbnailsButton.classList.add("d-none")
    generateThumbnailsProgress.classList.remove("d-none")
    let videos = previewFeed.videos
      .filter(video => !fs.existsSync(video.thumbFile))

    generateThumbnailsProgress.style.width = "5%";
    for (let index = 0; index < videos.length; index++) {
      let video = videos[index];
      await ffmpeg.generateThumbnail(video.mp4File, video.thumbFile)

      let progress = (index + 1 / videos.length) * 100
      generateThumbnailsProgress.style.width = progress + "%";

      printPreview(previewFeed)
    }

    reloadFeed()
  }
  generateThumbnailsButton.addEventListener("click", thumbnailsClickListener)
}