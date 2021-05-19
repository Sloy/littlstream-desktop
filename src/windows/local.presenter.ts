import { remote, shell } from "electron"
import { JSONStorage } from "node-localstorage";
import fs = require('fs-extra')
import { LocalFeedOptions, loadFeed } from "../core/provider-local"

import { User, Video, Promo } from "../core/model"
import auth = require('../core/auth')
import api = require('../core/api')
import { LocalServer } from "../core/localserver";
import unhandled = require('../core/unhandledSetup')
import { generateMissingThumbnails } from "../core/thumbnail-utils";

const nodeStorage = new JSONStorage(remote.app.getPath('userData'))
const currentUser: User = remote.getGlobal('user')

const ALLOWED_LAYOUTS: string[] = ["sbs", "ou", "2d"]
let view: LocalView
const currentSettings: LocalFeedOptions = {
  dir: "",
  recursive: false,
  type: "180",
  layout: "sbs",
  name: "Name",
  orderBy: "date",
  ...nodeStorage.getItem("settings"),
  fileNameFilter: ""
}
//FIX FOR SIMPLIFYING LAYOUTS
if (!ALLOWED_LAYOUTS.includes(currentSettings.layout)) {
  currentSettings.layout = "sbs"
}
const server = new LocalServer()

export function LocalPresenter(view: LocalView) {
  init(view)
}

function init(viewImplementation: LocalView) {
  view = viewImplementation
  unhandled.init()
  view.updateSettingsUI(currentSettings)
  bindEvents()
  reloadFeedPreview()
  loadPromo()
}

function bindEvents() {
  view.bindSelectFolderClick(() => {
    remote.dialog.showOpenDialog({
      title: "Select VR video folder",
      message: "Select VR video folder",
      properties: ['openDirectory']
    }, (folders) => {
      if (!folders) return
      currentSettings.dir = folders[0]
      view.updateSettingsUI(currentSettings)
      reloadFeedPreview()
    })
  })
  view.bindRecursiveCheckChanged(isChecked => {
    currentSettings.recursive = isChecked
    reloadFeedPreview()
  })
  view.bindLayoutChanged(layout => {
    currentSettings.layout = layout
    reloadFeedPreview()
  })
  view.bindTypeChanged(type => {
    currentSettings.type = type
    reloadFeedPreview()
  })
  view.bindFilterChanged(filter => {
    currentSettings.fileNameFilter = filter
    reloadFeedPreview()
  })
  view.bindDeletedVideo(() => {
    reloadFeedPreview()
  })
  view.bindSurveyClick(() => {
    shell.openExternal("https://www.surveymonkey.com/r/3T9Q3KR")
  })
}

async function reloadFeedPreview() {
  //TODO validate directory here? or before? Show error? Keep the old preview?
  nodeStorage.setItem("settings", currentSettings)
  if (!currentSettings.dir) {
    console.log("Not selected")
    return
  }
  if (!fs.existsSync(currentSettings.dir)) {
    console.log("Doesn't exist")
    return
  }
  try {
    fs.accessSync(currentSettings.dir, fs.constants.W_OK | fs.constants.R_OK)
  } catch (err) {
    console.log("Not allowed")
    return
  }

  const feedPreview = await loadFeed(currentSettings)
  if (feedPreview.videos.length > 0) {
    const videos = feedPreview.videos.map(it => mapVideoModel(it))
    view.showPreview(videos)
    await generateMissingThumbnails(videos,
      (done, total) => {
        console.log(`Generating thumbails: ${done}/${total}`)
      },
      updatedVideo => view.refreshVideoThumbnail(updatedVideo))
  } else {
    view.showPreview([])
  }

  await start()
}

async function start() {
  try {
    server.start(currentSettings.dir)
    let finalFeed = await loadFeed({
      endpoint: server.endpoint,
      ...currentSettings
    })
    let feedUrl = await auth.storeData(currentUser, finalFeed)
    console.log(feedUrl)
    view.showPublishSuccess(feedUrl)
  } catch (error) {
    throw error
  }
}

function stop() {
  server.stop()
}





async function loadPromo() {
  let promos = await api.obtainActivePromos()
  if (promos.length >= 0) {
    view.showPromos(promos)
  }
}
export interface LocalView {
  showPublishSuccess(feedUrl: string): any;
  updateSettingsUI(settings: LocalFeedOptions): void
  showPreview(videos: Array<VideoViewModel>): void
  refreshVideoThumbnail(video: VideoViewModel): void
  showPromos(promos: Promo[]): void

  bindSelectFolderClick(callback: () => void): void
  bindRecursiveCheckChanged(callback: (isChecked: boolean) => void): void
  bindLayoutChanged(callback: (layout: string) => void): void
  bindTypeChanged(callback: (type: string) => void): void
  bindFilterChanged(callback: (filter: string) => void): void
  bindDeletedVideo(callback: () => void): void
  bindSurveyClick(callback: () => void): void
}

export interface VideoViewModel {
  id: string
  title: string,
  file: string,
  layout: string,
  thumbnailFile: string,
  isNew: boolean
}

function mapVideoModel(video: Video): VideoViewModel {
  return {
    id: video.id,
    title: video.title,
    file: video.mp4File,
    layout: video.layout,
    thumbnailFile: video.thumbFile,
    isNew: video.isNew
  }
}