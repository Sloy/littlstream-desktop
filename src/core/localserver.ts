import finalhandler = require('finalhandler');
import path = require('path');
import http = require('http');
import serveStatic = require('serve-static');
import localip = require('my-local-ip');
import { thumbnailsDir } from './thumbnail-utils';
import { setWatched } from './watched-video-util';
import { createIdFromFilename } from './video-id-factory';

export class LocalServer {
  port = 3001
  endpoint = `http://${localip()}:${this.port}/`
  server: http.Server;
  lastVideoPlayed: string

  isStarted() {
    return !!this.server
  }
  start(dir: string) {
    if (this.server) {
      this.stop()
    }
    const serveMp4 = serveStatic(dir, { 'index': false })
    const serveThumbnail = serveStatic(thumbnailsDir, { 'index': false })
    this.server = http.createServer((req, res) => {
      const fileName = req.url.split("/").slice(-1)[0]
      if (req.url.startsWith("/thumb/")) {
        console.log("thumbnail: " + req.url)
        req.url = req.url.replace("/thumb", "")
        serveThumbnail(req, res, finalhandler(req, res))
      } else {
        serveMp4(req, res, finalhandler(req, res))
        this.trackVideo(fileName)
      }
    })
    this.server.listen(this.port)
  }

  stop() {
    if (this.server) {
      this.server.close()
    }
    this.server = null
  }

  private trackVideo(fileName: string) {
    if (this.lastVideoPlayed !== fileName) {
      this.lastVideoPlayed = fileName
      let realFileName = decodeURIComponent(fileName)
      setWatched(createIdFromFilename(realFileName), true)
    }
  }
}