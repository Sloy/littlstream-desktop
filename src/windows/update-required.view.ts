import { shell } from "electron"
import unhandled = require('../core/unhandledSetup')
unhandled.init()


const downloadUpdateButton = document.getElementById("download-update-button")

downloadUpdateButton.addEventListener("click", async () => {
  shell.openExternal("https://littlstream.com/desktop.html")
})
