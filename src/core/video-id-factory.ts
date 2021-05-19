import path = require('path');
import crypto = require('crypto')


export function createIdFromFilename(fileName: string): string {
    let fileNameShort = shortNameFromFileName(fileName)
    return crypto.createHash('md5').update(fileNameShort).digest("hex")
}

export function shortNameFromFileName(fileName: string): string{
    return fileName.split(path.sep).slice(-1)[0].replace(".mp4", "")
}