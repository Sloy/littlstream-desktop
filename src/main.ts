import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import * as path from "path";
import semverCompare = require("semver-compare");
import { is } from "electron-util"
import auth = require('./core/auth');
import api = require('./core/api');
import { User } from "./core/model";
import unhandled = require('./core/unhandledSetup')
unhandled.init()

let mainWindow: Electron.BrowserWindow;
let loginWindow: Electron.BrowserWindow;

global.version = app.getVersion()

function showLogin() {
  loginWindow = new BrowserWindow({
    height: 600, width: 800,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#3c434a',
  });
  loginWindow.loadFile(path.join(__dirname, "../public/login.html"));

}

function showMain() {
  mainWindow = new BrowserWindow({
    height: 900, width: 1200,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
  });
  mainWindow.loadFile(path.join(__dirname, "../public/local.html"));
  if (is.development) {
    mainWindow.webContents.openDevTools();
  }
}

app.on("ready", onReady);
async function onReady() {
  try {
    global.user = await auth.autoSignIn();
    showMain()
  } catch (e) {
    showLogin()
  }

  let currentVersion = global.version
  let versionInfo = await api.getVersionInfo()
  console.log(versionInfo)

  if (semverCompare(currentVersion, versionInfo.minVersion) < 0) {
    mainWindow.loadFile(path.join(__dirname, "../public/update-required.html"));
  } else if (semverCompare(currentVersion, versionInfo.latestVersion) < 0) {
    dialog.showMessageBox({
      title: "Update available",
      message: `There's an update to version ${versionInfo.latestVersion} available.`,
      type: "info",
      buttons: ["Download", "Omit"],
      defaultId: 0,
      cancelId: 1,
    }, (response) => {
      if (response == 0) {
        shell.openExternal("https://littlstream.com/desktop.html")
      }
    })
  }
}

app.on("window-all-closed", () => {
  app.quit()
});

ipcMain.on('login-success', (event: any, user: User) => {
  global.user = user
  showMain()
  loginWindow.close()
  loginWindow = null
})

ipcMain.on('logout', (event: any) => {
  global.user = null
  auth.logout()
  showLogin()
  mainWindow.close()
  mainWindow = null
})