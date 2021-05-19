export interface Feed {
  info: FeedInfo
  videos: Array<Video>
}

export interface FeedInfo {
  title: string,
  image: string,
  categories: Array<string>,
  provider: string
}

export interface Video {
  id: string,
  mp4Link?: string,
  mp4File: string,
  quality: string,
  title: string,
  description: string,
  duration: number,
  type: string | number
  layout: string
  thumb?: string
  thumbFile: string
  isNew: boolean
}

export interface Scrapper {
  loadFeed(): Promise<Feed>
}


export type IdToken = string

export interface Promo {
  title: string
  thumbnail: string
  url: string
  studio: string
}
export interface User {
  idToken: IdToken
  email: string
  emailVerified: boolean
}
export interface LoginResult {
  kind: string
  idToken: IdToken
  email: string
  refreshToken: string
  expiresIn: string
  localId: string
}
export interface SilentLoginResult {
  expires_in: string
  token_type: string
  refresh_token: string
  id_token: IdToken
  user_id: string
  project_id: string
}

export interface VersionInfo {
  latestVersion: string
  minVersion: string
}