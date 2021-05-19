import { NavbarView, NavbarPresenter } from "./navbar.presenter";

class NavbarViewImpl implements NavbarView {
    bindHelpClick(onClick: () => void) {
        document.getElementById("navbar-button-help")
            .addEventListener("click", onClick)
    }
    bindLogoutClick(onClick: () => void) {
        document.getElementById("navbar-button-logout")
            .addEventListener("click", onClick)
    }
    showVersion(version: string) {
        document.getElementById("version").innerText = version
    }
}

NavbarPresenter(new NavbarViewImpl())