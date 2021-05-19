import unhandled = require('electron-unhandled')
import api = require('./api');
import electron = require('electron');
import { clipboard } from 'electron';

const dialog = electron.dialog || electron.remote.dialog

export function init() {
    unhandled({
        showDialog: true,
        reportButton: async (error: Error) => {
            const reportId = await api.logError(error)
            dialog.showMessageBox({
                title: "Report sent",
                message: `Your report has been sent with id ${reportId}. Contact errors@littlstream.com if you wish to provide more details.`,
                type: "info",
                buttons: ["OK", "Copy id"],
                defaultId: 0,
                cancelId: 0,
            }, (response) => {
                if (response == 0) {
                    clipboard.writeText("Littlstream error report id: " + reportId)
                }
            })
        }
    })

}
