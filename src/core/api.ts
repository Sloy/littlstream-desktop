import axios, { AxiosAdapter, AxiosError } from 'axios'
import { User, Feed, IdToken, LoginResult, SilentLoginResult, VersionInfo, Promo } from './model';
import auth = require('./auth')
import { platform } from 'os'
import electron = require('electron');

const FUNCTIONS_URL = 'https://us-central1-littlstar-feed.cloudfunctions.net/'
const API_KEY = 'foobar'

const app = electron.app || electron.remote.app;
const user = global.user || electron.remote && electron.remote.getGlobal('user')

const commonHeaders = {
  "Client": "littlstream",
  "Platform": platform,
  "Version": app.getVersion(),
  "User-Id": user && user.idToken
}

export async function logError(error: Error): Promise<any> {
  try {
    const result = await axios.post(FUNCTIONS_URL + 'logError', error.message, {
      headers: {
        "Content-Type": 'text/plain',
        ...commonHeaders
      }
    })
    return result.data
  } catch (error) {
    console.warn(prettyError("Log error failed", error))
  }
}

export async function obtainActivePromos(): Promise<Promo[]> {
  try {
    const result = await axios.get(FUNCTIONS_URL + 'slrpromo', {
      headers: {
        ...commonHeaders
      }
    })
    return result.data
  } catch (error) {
    console.warn(prettyError("Log error failed", error))
    return []
  }
}

export async function getVersionInfo(): Promise<VersionInfo> {
  try {
    const result = await axios.get('https://littlstream.com/desktop/versions.json')
    return result.data
  } catch (error) {
    throw prettyError("Version check failed", error)
  }
}

export async function storeDataWithAuthorization(authorization: string, feedJson: Feed) {
  await auth.findCredential()
  try {
    const result = await axios.post(FUNCTIONS_URL + 'publish/', feedJson, {
      headers: {
        "Authorization": authorization,
        "Content-Type": 'application/json',
        ...commonHeaders
      }
    })
    return result.data
  } catch (error) {
    throw prettyError("Publish failed", error)
  }
}

export async function getUser(idToken: IdToken): Promise<User> {
  const body = {
    idToken: idToken
  };
  try {
    const result = await axios.post('https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=' + API_KEY, body, {
      headers: {
        "Content-Type": 'application/json'
      }
    });
    const userProfile = result.data.users[0]
    return { idToken: idToken, email: userProfile.email, emailVerified: userProfile.emailVerified };
  } catch (error) {
    throw prettyError("User profile failed", error)
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const body = {
    email: email,
    password: password,
    returnSecureToken: true
  };
  try {

    const result = await axios.post('https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=' + API_KEY, body, {
      headers: {
        "Content-Type": 'application/json'
      }
    });
    return result.data
  } catch (error) {
    throw prettyError("Login failed", error)
  }
}

export async function silentLogin(refreshToken: string): Promise<SilentLoginResult> {
  const body = {
    grant_type: "refresh_token",
    refresh_token: refreshToken
  };
  try {
    const result = await axios.post('https://securetoken.googleapis.com/v1/token?key=' + API_KEY, body, {
      headers: {
        "Content-Type": 'application/json'
      }
    });
    return result.data
  } catch (error) {
    throw prettyError("Silent login failed", error)
  }
}

export async function signup(email: string, password: string): Promise<LoginResult> {
  const body = {
    email: email,
    password: password,
    returnSecureToken: true
  };
  try {
    const result = await axios.post('https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=' + API_KEY, body, {
      headers: {
        "Content-Type": 'application/json'
      }
    });
    return result.data
  } catch (error) {
    throw prettyError("Signup failed", error)
  }
}

export async function sendEmailVerification(idToken: IdToken) {
  const body = {
    requestType: "VERIFY_EMAIL",
    idToken: idToken
  };
  try {
    const result = await axios.post('https://www.googleapis.com/identitytoolkit/v3/relyingparty/getOobConfirmationCode?key=' + API_KEY, body, {
      headers: {
        "Content-Type": 'application/json'
      }
    });
    return result.data
  } catch (error) {
    throw prettyError("Signup failed", error)
  }
}

function prettyError(what: string, error: any): Error {
  try {
    return Error(`${what}:\nmessage=${error.message}\n\ndata=${error.response.data}\n\nresponse=${JSON.stringify(error.response)}`)
  } catch (ignore) {
    return Error(`${what}:\n${error.message}`)
  }
}
