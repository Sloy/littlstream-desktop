import { LocalView, LocalPresenter, VideoViewModel } from "./local.presenter"
import { LocalFeedOptions } from "../core/provider-local"
import { Promo } from "../core/model";
import { SelectFolderWidget, CheckboxWidget, MultiButtonSelectorWidget, InputWidget, VideoPreviewListWidget, FeedLinkBox, PromoBox } from "./widgets/Widgets";

const selectFolderWidget = new SelectFolderWidget("select-folder-text", "select-folder-button")
const recursiveCheckbox = new CheckboxWidget("recursive-checkbox")
const layoutSelector = new MultiButtonSelectorWidget("layout-button-", ["2d", "sbs", "ou"])
const typeSelector = new MultiButtonSelectorWidget("type-button-", ["ff", "180", "360"])
const filterInput = new InputWidget("filter-text")
const videoPreviewList = new VideoPreviewListWidget("preview-list")
const feedLinkBox = new FeedLinkBox()
const promoBox = new PromoBox()

class LocalViewImpl implements LocalView {
    updateSettingsUI(settings: LocalFeedOptions) {
        selectFolderWidget.showFolderPath(settings.dir)
        recursiveCheckbox.setChecked(settings.recursive)
        layoutSelector.setChoice(settings.layout)
        typeSelector.setChoice(settings.type)
        filterInput.setText(settings.fileNameFilter)
    }
    showPreview(videos: VideoViewModel[]) {
        console.log(`Showing preview with ${videos.length} videos`)
        videoPreviewList.fill(videos)
    }
    refreshVideoThumbnail(video: VideoViewModel) {
        videoPreviewList.update(video)
    }
    showPublishSuccess(feedUrl: string) {
        feedLinkBox.setLink(feedUrl)
    }
    showPromos(promos: Promo[]) {
        promoBox.showPromos(promos)
    }
    bindSelectFolderClick(callback: () => void) {
        selectFolderWidget.onButtonClick = callback
    }
    bindRecursiveCheckChanged(callback: (isChecked: boolean) => void) {
        recursiveCheckbox.onCheckedChanged = callback
    }
    bindLayoutChanged(callback: (layout: string) => void) {
        layoutSelector.onOptionSelected = callback
    }
    bindTypeChanged(callback: (type: string) => void) {
        typeSelector.onOptionSelected = callback
    }
    bindFilterChanged(callback: (filter: string) => void) {
        filterInput.onTextChanged = callback
    }
    bindDeletedVideo(callback: () => void): void {
        videoPreviewList.onVideoDeletedCallback = callback
    }
    bindSurveyClick(callback: () => void): void {
        document.getElementById("answer-survey").addEventListener("click", callback)
    }
}

LocalPresenter(new LocalViewImpl)