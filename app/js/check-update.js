const { ipcRenderer } = require('electron')

ipcRenderer.on('update_available', () => {
  ipcRenderer.removeAllListeners('update_available')
  $.toast({title: 'New version found',
             content: 'Hey! New version was found and is being downloaded.',
             type: 'info', delay: 15000, container: $('#toaster')})
})

ipcRenderer.on('update_downloaded', () => {
  ipcRenderer.removeAllListeners('update_downloaded')
  $.toast({title: 'New version downloaded',
             content: 'New version was downloaded and will be installed after a restart.',
             type: 'info', delay: 15000, container: $('#toaster')})
})