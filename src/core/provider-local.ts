import path = require('path');
import fs = require('fs-extra');
import readdirRecursive = require('fs-readdir-recursive');
import { Video, Feed } from './model';
import { thumbnailsDir } from './thumbnail-utils';
import { isWatched } from './watched-video-util';
import { shortNameFromFileName, createIdFromFilename } from './video-id-factory';

function mp4Link(options: LocalFeedOptions, fileName: string) {
  if (options.endpoint) {
    return options.endpoint + encodeURIComponent(fileName)
  }
}

function thumbnail(options: LocalFeedOptions, id: string): string {
  if (options.endpoint) {
    return options.endpoint + "thumb" + path.sep + id + ".jpeg"
  }
}

async function getVideoFiles(options: LocalFeedOptions): Promise<Array<string>> {
  let files: Array<string>
  if (options.recursive) {
    files = readdirRecursive(options.dir)
  } else {
    files = await fs.readdir(options.dir)
  }
  return files
    .filter(it => it.endsWith(".mp4"))
    .filter(it => !it.startsWith("."))
    .filter(it => it.toLowerCase().includes(options.fileNameFilter.toLocaleLowerCase()))
}

async function loadVideos(options: LocalFeedOptions): Promise<Array<Video>> {
  const videoFiles = await getVideoFiles(options)
  return videoFiles.map(fileName => {
    let id = createIdFromFilename(fileName)
    let isNew = !isWatched(id)
    let title = shortNameFromFileName(fileName)
    if (isNew) {
      title = "(N) " + title
    }
    return {
      id: id,
      mp4Link: mp4Link(options, fileName),
      mp4File: options.dir + path.sep + fileName,
      thumb: thumbnail(options, id),
      thumbFile: thumbnailsDir + id + ".jpeg",
      quality: 'local',
      title: title,
      description: fileName,
      duration: 90,
      type: options.type,
      layout: options.layout,
      isNew: isNew
    }
  })
}


export async function loadFeed(options: LocalFeedOptions): Promise<Feed> {
  const videos = await loadVideos(options);
  if (options.orderBy === "name") {
  } else if (options.orderBy === "date") {
    videos.sort(sortByDateDesc)
  }
  videos.sort(sortByNew)
  return {
    info: {
      title: options.name,
      image: videos[0] && videos[0].thumb,
      categories: ['Local'],
      provider: "local"
    },
    videos: videos
  }
}

export interface LocalFeedOptions {
  dir: string
  endpoint?: string
  recursive: boolean
  type: string
  layout: string
  name: string
  fileNameFilter: string
  orderBy: string
}

function sortByDateDesc(a: Video, b: Video) {
  let aDate = fs.statSync(a.mp4File).ctime
  let bDate = fs.statSync(b.mp4File).ctime
  return bDate.getTime() - aDate.getTime()
}

function sortByNew(a: Video, b: Video) {
  let x = a.isNew
  let y = b.isNew
  return (x === y) ? 0 : x ? -1 : 1;

}