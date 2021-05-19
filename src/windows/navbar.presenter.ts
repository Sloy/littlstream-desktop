import { User } from "../core/model"
import { remote, shell, ipcRenderer } from "electron"

export function NavbarPresenter(view: NavbarView) {
    init(view)
}

const version: string = remote.getGlobal('version')
let view: NavbarView

function init(viewImplementation: NavbarView) {
    view = viewImplementation
    view.showVersion("v" + version)
    view.bindLogoutClick(() => {
        ipcRenderer.send('logout')
    })
    view.bindHelpClick(() => {
        shell.openExternal("https://littlstream.com/desktop.html")
    })
}

export interface NavbarView {
    bindHelpClick(onClick: () => void): any;
    bindLogoutClick(onClick: () => void): any;
    showVersion(version: string): any;
}