import { JSONStorage } from "node-localstorage";
import { remote } from "electron";


const nodeStorage = new JSONStorage(remote.app.getPath('userData'))
let watchedList: Array<string> = nodeStorage.getItem("watched")
if (watchedList == null) {
    watchedList = []
}

export function isWatched(videoId: string) {
    return watchedList.includes(videoId)
}

export function setWatched(videoId: string, isWatched: boolean) {
    if (isWatched) {
        watchedList.push(videoId)
    } else {
        watchedList = watchedList.filter(id => id !== videoId)
    }
    nodeStorage.setItem("watched", watchedList)
    console.log(`Setting ${videoId} as watched=${isWatched}`)
}