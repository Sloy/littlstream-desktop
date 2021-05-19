import fs = require('fs-extra');
import api = require('./api.js')
import { User, Feed } from "./model"

const OLD_CREDENTIALS_FOLDER = require('os').homedir() + '/.littlstar-feed/'
const CREDENTIALS_FOLDER = require('os').homedir() + '/.littlstream/'
const CREDENTIALS_FILE = CREDENTIALS_FOLDER + 'credentials'

interface StoredCredential {
  refreshToken: string,
  expireDateTimestamp: number
}

function migrateOldFolder() {
  try {
    if (fs.existsSync(OLD_CREDENTIALS_FOLDER)) {
      fs.renameSync(OLD_CREDENTIALS_FOLDER, CREDENTIALS_FOLDER)
    }
  } catch (error) {
    //ignore
  }
}

export async function storeData(user: User, feedJson: Feed): Promise<string> {
  let expireDate = (await findCredential()).expireDateTimestamp
  let now = new Date().getTime()
  if (expireDate <= now) {
    console.log("Expired credentials, refreshing...")
    await autoSignIn()
  }
  return api.storeDataWithAuthorization('Bearer ' + user.idToken, feedJson)
}

export async function findCredential(): Promise<StoredCredential> {
  migrateOldFolder()
  try {
    return await fs.readJson(CREDENTIALS_FILE);
  } catch (error) {
    return Promise.resolve(undefined)
  }
}

async function storeCredentials(refreshToken: string, expiresInSeconds: number) {
  const expireDate = new Date().getTime() + (expiresInSeconds * 1000)
  const credential: StoredCredential = {
    refreshToken: refreshToken,
    expireDateTimestamp: expireDate
  }
  await fs.ensureFile(CREDENTIALS_FILE);
  await fs.writeJson(CREDENTIALS_FILE, credential)
}

export async function signUp(email: string, password: string) {
  const signupResult = await api.signup(email, password);
  await Promise.all([
    api.sendEmailVerification(signupResult.idToken),
    storeCredentials(signupResult.refreshToken, +signupResult.expiresIn)
  ]);
}

export async function signIn(email: string, password: string): Promise<User> {
  const loginResult = await api.login(email, password)
  const user = await api.getUser(loginResult.idToken);
  await storeCredentials(loginResult.refreshToken, +loginResult.expiresIn);
  return user;
}

export function logout() {
  fs.removeSync(CREDENTIALS_FILE)
}

export async function autoSignIn(): Promise<User> {
  const credential = await findCredential();
  if (credential) {
    const loginResult = await api.silentLogin(credential.refreshToken)
    storeCredentials(loginResult.refresh_token, +loginResult.expires_in)
    return await api.getUser(loginResult.id_token)
  } else {
    throw Error("Not logged. Use the login or signup command first.")
  }

}