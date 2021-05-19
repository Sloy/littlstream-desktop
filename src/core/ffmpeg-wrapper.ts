import which = require('which')
import fs = require('fs-extra')
import path = require('path')
import { platform } from 'electron-util'
import electron = require('electron')
import { is } from "electron-util"

const dialog = electron.dialog || electron.remote.dialog
const shell = electron.shell || electron.remote.shell


export function exists(): boolean {
  try {
    return true
  } catch (error) {
    return false
  }
}

export async function generateThumbnail(inFile: string, outFile: string): Promise<any> {
  fs.ensureDirSync(path.dirname(outFile))
  const exec = require('util').promisify(require('child_process').exec)
  // TODO: Smaller size: -filter:v scale="280:-1"
  return exec(`"${cmd()}" -ss 60 -i "${inFile}" -y -an -vframes 1 "${outFile}"`)
}

export function showInstallRequiredDialog() {
  dialog.showMessageBox({
    title: "FFmpeg not found",
    message: `FFmpeg is required for thumbnails to work. Please install it, add it to your PATH and try again.`,
    type: "warning",
    buttons: ["OK", "Install help"],
    defaultId: 0,
    cancelId: 0,
  }, (response) => {
    if (response == 1) {
      shell.openExternal(platform({
        windows: "https://www.wikihow.com/Install-FFmpeg-on-Windows",
        macos: "http://macappstore.org/ffmpeg/",
        linux: "https://www.google.es/search?q=install+ffmpeg+on+linux"
      }))
    }
  })
}

function cmd(): string {
  let ffmpegPath = require('ffmpeg-static').path
  if(!is.development){
    ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
  }
  return ffmpegPath
}