import { VideoViewModel } from "../local.presenter";
import fs = require('fs')
import path = require('path')
import { shell, clipboard } from "electron";
import { Promo } from "../../core/model";
import { setWatched } from "../../core/watched-video-util";

export class SelectFolderWidget {
    private folderTextField: HTMLInputElement
    private selectFolderButton: HTMLElement

    onButtonClick: () => void;

    constructor(folderTextFieldId: string, selectFolderButtonId: string) {
        this.folderTextField = <HTMLInputElement>document.getElementById(folderTextFieldId)
        this.selectFolderButton = document.getElementById(selectFolderButtonId)
        this.selectFolderButton.addEventListener("click", () => {
            this.onButtonClick()
        })
    }

    showFolderPath(path: string) {
        this.folderTextField.value = path
    }
}

export class InputWidget {
    private textField: HTMLInputElement
    private timer = 0

    onTextChanged: (text: string) => void

    constructor(textFieldId: string) {
        this.textField = <HTMLInputElement>document.getElementById(textFieldId)
        this.textField.addEventListener("input", () => {
            this.delay(() => this.onTextChanged(this.textField.value))
        })
    }

    setText(text: string) {
        this.textField.value = text
    }

    private delay(block: Function) {
        clearTimeout(this.timer)
        this.timer = setTimeout(block, 500)
    }
}


export class CheckboxWidget {
    private checkbox: HTMLInputElement
    onCheckedChanged: (isChecked: boolean) => void

    constructor(checkboxId: string) {
        this.checkbox = <HTMLInputElement>document.getElementById(checkboxId)
        this.checkbox.addEventListener("change", () => {
            this.onCheckedChanged(this.checkbox.checked)
        })
    }

    setChecked(checked: boolean) {
        this.checkbox.checked = checked
    }
}

export class MultiButtonSelectorWidget {
    private options: string[]
    private buttons: Array<[string, HTMLElement]>

    onOptionSelected: (option: string) => void

    constructor(buttonIdPrefix: string, options: string[]) {
        this.options = options
        this.buttons = options.map(option => {
            let button = document.getElementById(buttonIdPrefix + option)
            button.addEventListener("click", () => {
                this.setChoice(option)
                this.onOptionSelected(option)
            })
            return <[string, HTMLElement]>[option, button]
        });
    }

    setChoice(option: string) {
        this.buttons.map(it => it[1]).forEach(button => button.classList.remove("is-selected", "is-info"));
        this.buttons.find(it => it[0] == option)[1].classList.add("is-selected", "is-info")
    }
}

export class VideoPreviewListWidget {
    private container: HTMLElement
    private renderedVideos: [VideoViewModel, VideoPreviewWidget][]
    onVideoDeletedCallback: () => void

    constructor(containerId: string) {
        this.container = document.getElementById(containerId)
    }

    update(video: VideoViewModel) {
        let existingWidget = this.renderedVideos.find(it => it[0].id == video.id)[1]
        if (existingWidget) {
            existingWidget.renderVideo(video)
        }
    }

    fill(videos: VideoViewModel[]) {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild)
        }
        this.renderedVideos = videos.map(it => {
            return <[VideoViewModel, VideoPreviewWidget]>[it, this.createVideoWidget(it)]
        })
        this.renderedVideos.forEach(pair => {
            this.container.appendChild(pair[1].node)
        })
    }

    private createVideoWidget(video: VideoViewModel): VideoPreviewWidget {
        let html = fs.readFileSync(path.resolve(__dirname, "../../../public/video-preview-template.html"), 'utf8').trim()
        let template = document.createElement('template')
        template.innerHTML = html
        let widget = new VideoPreviewWidget(<HTMLElement>template.content.firstChild, this.onVideoDeletedCallback)
        widget.renderVideo(video)
        return widget
    }
}

export class VideoPreviewWidget {
    private image: HTMLImageElement
    private title: HTMLElement
    private isNewTag: HTMLElement
    private folder: HTMLElement
    private playButton: HTMLElement
    private openFolderButton: HTMLElement
    private deleteButton: HTMLElement
    private markWatchedButton: HTMLElement
    private markNewButton: HTMLElement
    private onVideoDeletedCallback: () => void
    node: HTMLElement

    constructor(node: HTMLElement, onVideoDeletedCallback: () => void) {
        this.node = node
        this.onVideoDeletedCallback = onVideoDeletedCallback
        this.image = <HTMLImageElement>node.querySelector('img[name="thumbnail"]')
        this.title = <HTMLElement>node.querySelector('strong[name="title"]')
        this.isNewTag = <HTMLElement>node.querySelector('span[name="is-new-tag"]')
        this.folder = <HTMLElement>node.querySelector('p[name="folder"]')
        this.playButton = <HTMLElement>node.querySelector('a[name="play-button"]')
        this.openFolderButton = <HTMLElement>node.querySelector('a[name="open-folder-button"]')
        this.deleteButton = <HTMLElement>node.querySelector('a[name="delete-button"]')
        this.markWatchedButton = <HTMLElement>node.querySelector('a[name="mark-watched-button"]')
        this.markNewButton = <HTMLElement>node.querySelector('a[name="mark-new-button"]')
    }

    renderVideo(video: VideoViewModel) {
        this.title.innerText = video.title.replace("(N) ", "")
        this.folder.innerText = video.file
        this.renderIsNew(video.isNew)
        if (fs.existsSync(video.thumbnailFile)) {
            this.image.src = video.thumbnailFile
            this.image.classList.add("layout-" + video.layout)
            this.playButton.addEventListener("click", () => {
                shell.openItem(video.file)
            })
            this.openFolderButton.addEventListener("click", () => {
                shell.showItemInFolder(video.file)
            })
            this.deleteButton.addEventListener("click", () => {
                shell.moveItemToTrash(video.file)
                this.onVideoDeletedCallback()
            })
            this.markNewButton.addEventListener("click", () => {
                video.isNew = true
                this.renderIsNew(true)
                setWatched(video.id, false)
            })
            this.markWatchedButton.addEventListener("click", () => {
                video.isNew = false
                this.renderIsNew(false)
                setWatched(video.id, true)
            })

        }

    }
    renderIsNew(isNew: boolean) {
        if (isNew) {
            this.node.classList.add("is-new")
            this.markNewButton.classList.add("is-gone")
            this.markWatchedButton.classList.remove("is-gone")
            this.isNewTag.style.display = ""
        } else {
            this.node.classList.remove("is-new")
            this.markNewButton.classList.remove("is-gone")
            this.markWatchedButton.classList.add("is-gone")
            this.isNewTag.classList.add("is-gone")
            this.isNewTag.style.display = "none" // Hack because "is-gone" class won't work
        }
    }

}

enum ButtonState { IDLE, LOADING, ACTIVE }
export class PublishButton {
    private button: HTMLElement
    private currentState: ButtonState

    onIdleClick: () => void
    onActiveClick: () => void

    constructor(buttonId: string) {
        this.button = document.getElementById(buttonId)
        this.button.addEventListener("click", () => {
            if (this.currentState == ButtonState.IDLE) {
                this.onIdleClick()
            } else if (this.currentState == ButtonState.ACTIVE) {
                this.onActiveClick()
            }
        })
        this.setIdle()
    }
    setIdle() {
        this.currentState = ButtonState.IDLE
        this.button.classList.remove("is-loading", "is-danger", "is-outlined")
        this.button.classList.add("is-success")
        this.button.innerHTML = "<b>Start streaming</b>"
    }
    setLoading() {
        this.currentState = ButtonState.LOADING
        this.button.classList.add("is-loading")
    }
    setActive() {
        this.currentState = ButtonState.ACTIVE
        this.button.classList.remove("is-loading", "is-success")
        this.button.classList.add("is-danger", "is-outlined")
        this.button.innerHTML = "<b>Stop</b>"
    }
}

export class FeedLinkBox {
    private feedLinkText: HTMLInputElement
    private containerBox: HTMLElement

    constructor() {
        this.containerBox = document.getElementById("feed-link-box")
        this.feedLinkText = <HTMLInputElement>document.getElementById("feed-link-text")
        let copyButton = document.getElementById("feed-link-copy-button")
        copyButton.addEventListener("click", () => {
            clipboard.writeText(this.feedLinkText.value)
            this.feedLinkText.select()
        })
        let littlstarWebLink = document.getElementById("feed-link-littlstar-link")
        littlstarWebLink.addEventListener("click", () => {
            shell.openExternal("https://my.littlstar.com/feeds")
        })
        this.hide()
    }

    setLink(link: string) {
        this.feedLinkText.value = link
        this.show()
    }
    hide() {
        this.containerBox.classList.add("is-gone")
    }
    show() {
        this.containerBox.classList.remove("is-gone")
    }
}

export class PromoBox {
    box: HTMLElement
    itemsContainer: HTMLElement
    closeIcon: HTMLElement

    constructor() {
        this.box = document.getElementById("promo-box")
        this.itemsContainer = document.getElementById("promo-box-items")
        this.closeIcon = document.getElementById("promo-box-close")
        this.closeIcon.addEventListener("click", () => this.hide())
    }
    showPromos(promos: Promo[]) {
        if (promos.length == 0) {
            this.hide()
        } else {
            promos.map(promo => this.createPromoItem(promo))
                .forEach(node => this.itemsContainer.appendChild(node))
            this.show()
        }
    }
    private createPromoItem(promo: Promo): HTMLElement {
        let html = fs.readFileSync(path.resolve(__dirname, "../../../public/promo-item-template.html"), 'utf8').trim()
        let template = document.createElement('template')
        template.innerHTML = html
        let node = <HTMLElement>template.content.firstChild;
        let thumbnail = <HTMLImageElement>node.querySelector('img[name="thumbnail"]')
        let title = <HTMLImageElement>node.querySelector('p[name="title"]')
        thumbnail.src = promo.thumbnail
        title.innerText = promo.studio
        node.addEventListener("click", () => {
            shell.openExternal(promo.url)
        })
        return node
    }
    private hide() {
        this.box.classList.add("is-gone")
    }
    private show() {
        this.box.classList.remove("is-gone")
    }
}