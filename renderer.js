// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { shell } = require('electron')
const remote = require('electron').remote
const app = remote.app
const path = require('path')
const fs = require('fs')

var activeModsAmount = 0
var totalModsAmount = 0

var saveConfigButton = document.getElementById('save-config-button')
var playButton = document.getElementById('play-button')
var defaultLauncherCheckbox = document.getElementById('launch-default')
var modTestingCheckbox = document.getElementById('mods-testing-checkbox')
var modDisableCheckbox = document.getElementById('mods-disable-checkbox')

var launcherConfig = LoadConfig()

document.getElementById('mods-testing-checkbox').checked = launcherConfig['ModTesting']
document.getElementById('mods-disable-checkbox').checked = launcherConfig['DisableMods']

LoadWorkshop()

//
//Table checkbox controlling
//
$('#table').on('check.bs.table', function(e, row){
  launcherConfig['WorkshopItems'][row['id']][1] = true
  activeModsAmount += 1
  UpdateModsAmount()
})

$('#table').on('uncheck.bs.table', function(e, row){
  launcherConfig['WorkshopItems'][row['id']][1] = false
  activeModsAmount -= 1
  UpdateModsAmount()
})

$('#table').on('check-all.bs.table', function(e, rowsAfter, rowsBefore){
  for(r in rowsAfter) launcherConfig['WorkshopItems'][rowsAfter[r]['id']][1] = true
  activeModsAmount += rowsAfter.length - rowsBefore.length
  UpdateModsAmount()
})

$('#table').on('uncheck-all.bs.table', function(e, rowsAfter, rowsBefore){
  for(r in rowsBefore) launcherConfig['WorkshopItems'][rowsBefore[r]['id']][1] = false
  activeModsAmount -= rowsBefore.length + rowsAfter.length
  UpdateModsAmount()
})

$('#table').on('check-some.bs.table', function(e, rows){
  console.log("checked some")
  for(r in rows) UpdateModSelection(rows, r, true)
})

$('#table').on('uncheck-some.bs.table', function(e, rows){
  for(r in rows) UpdateModSelection(rows, r, false)
})

//
//Left menu
//
modTestingCheckbox.addEventListener('click', function (){
  launcherConfig['ModTesting'] = modTestingCheckbox.checked
  SaveConfig()
})

modDisableCheckbox.addEventListener('click', function (){
  launcherConfig['DisableMods'] = modDisableCheckbox.checked
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



function UpdateModSelection(rows, row, newState)
{
  if(launcherConfig['WorkshopItems'][rows[row]['id']][1] == newState) return

  console.log(row + " " + newState)

  launcherConfig['WorkshopItems'][rows[row]['id']][1] = newState
  if(newState) activeModsAmount += 1
  else activeModsAmount -= 1

  UpdateModsAmount()
}

function UpdateModsAmount()
{
  $('#mods-amount').html("Mods enabled: " + activeModsAmount + "\\" + totalModsAmount)
}

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
      table['clickToSelect'] = true
      table['maintainMetaData'] = true
      table['columns'] = [{checkbox: 'enabled', field: 'enabled', sortable:true}, {field: 'id', title: 'ID', sortable:true}, {field: 'title', title: 'Name', sortable: true}, {field: 'itemId', title: 'Item ID'}, {field: 'tags', title: 'Tags', sortable: true}]
      table['rowStyle'] = rowStyle
      table['data'] = []
      for(i in answer['publishedfiledetails']){
        table['data'][i] = {}
        table['data'][i]['id'] = i
        table['data'][i]['enabled'] = launcherConfig['WorkshopItems'][i][1]
        if(table['data'][i]['enabled']) activeModsAmount += 1
        table['data'][i]['itemId'] = launcherConfig['WorkshopItems'][i][0]
        table['data'][i]['title'] = answer['publishedfiledetails'][i]['title']
        table['data'][i]['tags'] = ""
        for(n in answer['publishedfiledetails'][i]['tags']){
          if(n>0) table['data'][i]['tags'] += ", "

          table['data'][i]['tags'] += answer['publishedfiledetails'][i]['tags'][n]['tag']
        }
        totalModsAmount += 1
        UpdateModsAmount()
      }
      $('#loading').children().hide()
      $('#table').bootstrapTable(table)
    }
  }
}

function rowStyle(row, index){
  var c=0,t=0,a=0,m=0;
  if(row['tags'].includes("Car")) c = 1;
  if(row['tags'].includes("Track")) t = 1;
  if(row['tags'].includes("Ambience")) a = 1;
  if(row['tags'].includes("Misc")) m = 1;

  if(c+t+a+m > 1) return{css:{
    color: 'orange'
  }}

  if(c) return{css:{
    color: 'red'
  }}
  if(t) return{css:{
    color: 'green'
  }}
  if(a) return{css:{
    color: 'LightSeaGreen'
  }}
  if(m) return{css:{
    color: 'purple'
  }}

  return{}
}

function LoadConfig(){
  return JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), '../../Local/Crashday/config/launcher.config')))
}

function SaveConfig(){
  fs.writeFileSync(path.join(app.getPath('userData'), '../../Local/Crashday/config/launcher.config'), JSON.stringify(launcherConfig, undefined, 4))
}
