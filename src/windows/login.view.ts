import { ipcRenderer, remote, shell } from "electron";
import auth = require('../core/auth');
import { User } from "../core/model";
import unhandled = require('../core/unhandledSetup')
unhandled.init()

const emailField = <HTMLInputElement>document.getElementById("email-field")
const passwordField = <HTMLInputElement>document.getElementById("password-field")
const loginButton = document.getElementById("login-button")
const signupButton = document.getElementById("signup-button")

const version: string = remote.getGlobal('version')
const versionText = document.getElementById("version-text");
versionText.innerText = "v" + version

const helpButton = document.getElementById("help-button");
helpButton.addEventListener("click", () => {
  shell.openExternal("https://littlstream.com/desktop.html")
})

loginButton.addEventListener("click", async () => {
  logIn()
});

signupButton.addEventListener("click", async () => {
  let email = emailField.value
  let password = passwordField.value
  try {
    await auth.signUp(email, password)
    remote.dialog.showMessageBox({
      title: "Account created successfully.",
      message: "Account created successfully!\n\nCheck your inbox and verify your email to continue.",
      type: "info",
      buttons: ["Continue", "Cancel"],
      defaultId: 0,
      cancelId: 1,
    }, (selected) => {
      if (selected == 0) {
        logIn()
      }
    })
  } catch (error) {
    remote.dialog.showErrorBox("Login failed", error.toString())
  }
});

async function logIn() {
  let email = emailField.value
  let password = passwordField.value
  try {
    const user = await auth.signIn(email, password)
    if (user.emailVerified) {
      ipcRenderer.send('login-success', user);
    } else {
      requestEmailVerification(email)
    }
  } catch (error) {
    remote.dialog.showErrorBox("Login failed", error.toString())
  }
}

function requestEmailVerification(email: string) {
  remote.dialog.showMessageBox({
    title: "Email not yet verified",
    message: "The email " + email + " is not verified yet.\n\nCheck your inbox and click the confirmation link.",
    type: "warning",
    buttons: ["Retry", "Cancel"],
    defaultId: 0,
    cancelId: 1,
  }, (selected) => {
    if (selected == 0) {
      logIn()
    }
  })
}