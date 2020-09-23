var dropZone = document.getElementById('drop-zone')
var uploadForm = document.getElementById('js-upload-form')

var startUpload = function(files) {
    console.log(files)

    var reader = new FileReader()

    reader.readAsArrayBuffer(files[0])

    reader.onload = function(){
        var view = new DataView(reader.result)
        var trk = {}
        
        
    }
}

uploadForm.addEventListener('submit', function(e) {
    var uploadFiles = document.getElementById('js-upload-files').files
    e.preventDefault()

    startUpload(uploadFiles)
})

dropZone.ondrop = function(e) {
    e.preventDefault()
    this.className = 'upload-drop-zone'

    startUpload(e.dataTransfer.files)
}

dropZone.ondragover = function() {
    this.className = 'upload-drop-zone drop'
    return false
}

dropZone.ondragleave = function() {
    this.className = 'upload-drop-zone'
    return false
}