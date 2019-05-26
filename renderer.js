// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { shell } = require('electron')
const remote = require('electron').remote
const app = remote.app
const path = require('path')
const fs = require('fs')

var launcherConfig = LoadConfig()

var saveConfigButton = document.getElementById('save-config-button')
var playButton = document.getElementById('play-button')
var defaultLauncherCheckbox = document.getElementById('launch-default')
var modTestingCheckbox = document.getElementById('mods-testing-checkbox')
var modsList = document.getElementById('mods-list')

document.getElementById('mods-testing-checkbox').checked = launcherConfig['ModTesting']

LoadWorkshop()

function LoadWorkshop(){
  var jsonParameter = {};
  jsonParameter['publishedfileids'] = []
  for(i in launcherConfig['WorkshopItems']){
    jsonParameter['publishedfileids'].push(launcherConfig['WorkshopItems'][i][0])
  }

  jsonParameter['includetags'] = true
  jsonParameter['includeadditionalpreviews'] = false
  jsonParameter['includechildren'] = false
  jsonParameter['includekvtags'] = false
  jsonParameter['includevotes'] = false
  jsonParameter['short_description'] = false
  jsonParameter['includeforsaledata'] = false
  jsonParameter['includemetadata'] = false
  jsonParameter['return_playtime_stats'] = false
  jsonParameter['appid'] = 508980
  jsonParameter['strip_description_bbcode'] = true

  const Http = new XMLHttpRequest()
  const url = 'https://api.steampowered.com/IPublishedFileService/GetDetails/v1/?key=48AD6D31B973C68065FEEEFF16073494&input_json=' + JSON.stringify(jsonParameter, undefined, 0)
  Http.open("GET", url)
  Http.send()

  Http.onreadystatechange=function(){
    if(this.readyState==4 && this.status==200){
      const answer = JSON.parse(Http.responseText)['response']
      const table = {}
      table['search'] = true
      table['filterControl'] = true
      table['clickToSelect'] = true
      table['maintainSelected'] = true
      table['columns'] = [{checkbox: 'enabled', field: 'enabled', sortable:true}, {field: 'id', sortable:true}, {field: 'title', title: 'Name', sortable: true}, {field: 'itemId', title: 'Item id'}, {field: 'tags', title: 'Tags', sortable: true}]
      table['data'] = []
      for(i in answer['publishedfiledetails']){
        table['data'][i] = {}
        table['data'][i]['id'] = i
        table['data'][i]['enabled'] = launcherConfig['WorkshopItems'][i][1]
        table['data'][i]['itemId'] = launcherConfig['WorkshopItems'][i][0]
        table['data'][i]['title'] = answer['publishedfiledetails'][i]['title']
        table['data'][i]['tags'] = ""
        for(n in answer['publishedfiledetails'][i]['tags']){
          if(n>0) table['data'][i]['tags'] += ", "

          table['data'][i]['tags'] += answer['publishedfiledetails'][i]['tags'][n]['tag']
        }
      }
      $('#table').bootstrapTable(table)

      console.log($('#table').bootstrapTable('getData'))
    }
  }
}

$('#table').on('check.bs.table', function(e, row){
  launcherConfig['WorkshopItems'][row['id']][1] = true
})

$('#table').on('uncheck.bs.table', function(e, row){
  launcherConfig['WorkshopItems'][row['id']][1] = false
})

$('#table').on('check-all.bs.table', function(e, rows){
  for(r in rows)
    launcherConfig['WorkshopItems'][rows[r]['id']][1] = true
})

$('#table').on('uncheck-all.bs.table', function(e, rows){
  for(r in rows)
    launcherConfig['WorkshopItems'][rows[r]['id']][1] = false
})

$('#table').on('check-some.bs.table', function(e, rows){
  for(r in rows)
    launcherConfig['WorkshopItems'][rows[r]['id']][1] = true
})

$('#table').on('uncheck-some.bs.table', function(e, rows){
  for(r in rows)
    launcherConfig['WorkshopItems'][rows[r]['id']][1] = false
})


modTestingCheckbox.addEventListener('click', function (){
  launcherConfig['ModTesting'] = modTestingCheckbox.checked
  SaveConfig()
})

playButton.addEventListener('click', function(){
  SaveConfig()
  if(defaultLauncherCheckbox.checked) shell.openExternal("steam://run/508980")
  else shell.openExternal("steam://run/508980//-skiplauncher/")
})

saveConfigButton.addEventListener('click', function(){
  SaveConfig()
})

function LoadConfig(){
  return JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), '../../Local/Crashday/config/launcher.config')))
}

function SaveConfig(){
  fs.writeFileSync(path.join(app.getPath('userData'), '../../Local/Crashday/config/launcher.config'), JSON.stringify(launcherConfig, undefined, 4))
}
