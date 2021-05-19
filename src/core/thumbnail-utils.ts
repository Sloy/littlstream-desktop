import fs = require('fs-extra')
import { VideoViewModel } from "../windows/local.presenter";
import ffmpeg = require('../core/ffmpeg-wrapper')

export const thumbnailsDir = require('os').homedir() + '/.littlstream/thumb/'

type ProgressCallback = (done: number, total: number) => void
type ThumbnailReadyCallback = (updated: VideoViewModel) => void

export async function generateMissingThumbnails(videos: Array<VideoViewModel>, onProgress: ProgressCallback, onThumbReady: ThumbnailReadyCallback): Promise<void> {
    let missingThumbs = videos.filter(it => !fs.existsSync(it.thumbnailFile))
    if (missingThumbs.length == 0) return Promise.resolve()
    return new Promise<void>(async (resolve, reject) => {
        let queue = missingThumbs.slice()
        let total = queue.length
        let done = 0
        onProgress(done, total)
        while (queue.length > 0) {
            let nextVideo = queue.shift()
            await ffmpeg.generateThumbnail(nextVideo.file, nextVideo.thumbnailFile)
            done++
            onThumbReady(nextVideo)
            onProgress(done, total)
        }
        resolve()
    })
}
