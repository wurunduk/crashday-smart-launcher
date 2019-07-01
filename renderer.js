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

var selectedCollection = ""

var defaultLauncherCheckbox = document.getElementById('launch-default')

//
//Navbar stuff
//
$(document).on('click', 'a[href^="http"]', (event) => {
  event.preventDefault()
  let link = event.target.href
  shell.openExternal(link)
})

$("#tabMods").on('click', (e) => openTab(e, 'mods'))
$("#tabCollections").on('click', (e) => openTab(e, 'collections'))

document.getElementById("defaultTab").click();

function openTab(evt, tabName) {
  var i, tabcontent, tablinks;

  // Get all elements with class="tabcontent" and hide them
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Get all elements with class="tablinks" and remove the class "active"
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show the current tab, and add an "active" class to the button that opened the tab
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.parentNode.className += " active";
}


var launcherConfig = LoadConfig()

document.getElementById('mods-testing').checked = launcherConfig['ModTesting']
document.getElementById('mods-disabled').checked = launcherConfig['DisableMods']

LoadWorkshop()
LoadCollections()

//
//Mods table checkbox controlling
//
$('#mods-table').on('check.bs.table', function(e, row){
  launcherConfig['WorkshopItems'][row['id']][1] = true
  activeModsAmount += 1
  UpdateModsAmount()
})

$('#mods-table').on('uncheck.bs.table', function(e, row){
  launcherConfig['WorkshopItems'][row['id']][1] = false
  activeModsAmount -= 1
  UpdateModsAmount()
})

$('#mods-table').on('check-all.bs.table', function(e, rowsAfter, rowsBefore){
  for(r in rowsAfter) launcherConfig['WorkshopItems'][rowsAfter[r]['id']][1] = true
  activeModsAmount += rowsAfter.length - rowsBefore.length
  UpdateModsAmount()
})

$('#mods-table').on('uncheck-all.bs.table', function(e, rowsAfter, rowsBefore){
  for(r in rowsBefore) launcherConfig['WorkshopItems'][rowsBefore[r]['id']][1] = false
  activeModsAmount -= rowsBefore.length + rowsAfter.length
  UpdateModsAmount()
})

//
//Left menu of mods list
//
$('#mods-testing').on('click', function (){
  launcherConfig['ModTesting'] = $('#mods-testing').is(":checked")
  SaveConfig()
})

$('#mods-disabled').on('click', function (){
  launcherConfig['DisableMods'] = $('#mods-disabled').is(":checked")
  SaveConfig()
})

$('#play').on('click', function(){
  SaveConfig()
  if(defaultLauncherCheckbox.checked) shell.openExternal("steam://run/508980")
  else shell.openExternal("steam://run/508980//-skiplauncher/")
})

$('#save').on('click', function(){
  SaveConfig()
})


//
//Collections
//
$('#activate-collection').on('click', function(e){
  if(selectedCollection.length == 0) return;

  //turn off all mods
  for(i in launcherConfig['WorkshopItems'])
  {
    launcherConfig['WorkshopItems'][i][1] = false
  }

  var totalEnabledMods = 0

  for(i in launcherConfig['Collections'][selectedCollection])
  {
    for(n in launcherConfig['WorkshopItems'])
    {
      if(launcherConfig['WorkshopItems'][n][0] == launcherConfig['Collections'][selectedCollection][i])
      {
        launcherConfig['WorkshopItems'][n][1] = true;
        totalEnabledMods += 1
      }
    }
  }
  SaveConfig()
  activeModsAmount = totalEnabledMods
  UpdateModsAmount()
})

$('#new-collection').on('click', function(e){
  var i = 1
  //find the next available collection name
  while(launcherConfig['Collections'].hasOwnProperty("new-collection-" + i)) i++;
  launcherConfig['Collections']['new-collection-'+i] = []
  //save the newly added collection
  SaveConfig()
  //update the list
  UpdateCollectionsList()
})

$('#delete-collection').on('click', function(e){
  if(selectedCollection.length == 0) return;

  $('#collection-name').val("")
  delete launcherConfig['Collections'][selectedCollection]
  selectedCollection = ""
  SaveConfig()
  UpdateCollectionsList()
})

$('#collection-name').change(function(){
  if(selectedCollection.length == 0) return;

  console.log("collection name got changed")

  var old = launcherConfig['Collections'][selectedCollection]
  delete launcherConfig['Collections'][selectedCollection]
  selectedCollection = $('#collection-name').val()
  launcherConfig['Collections'][selectedCollection] = old
  SaveConfig()
  UpdateCollectionsList();
})

$('#collections').on('click-row.bs.table', function(e, row){
  SaveConfig()
  selectedCollection = row['name']
  $('#collection-name').val(selectedCollection)
})


function UpdateModSelection(rows, row, newState)
{
  if(launcherConfig['WorkshopItems'][rows[row]['id']][1] == newState) return

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
      table['columns'] = [{checkbox: 'enabled', field: 'enabled', sortable:true}, {field: 'id', title: 'ID', width: 60, sortable:true}, {field: 'title', title: 'Name', sortable: true}, {field: 'itemId', title: 'Item ID'}, {field: 'tags', title: 'Tags', sortable: true}]
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
      $('#mods-table').bootstrapTable(table)
    }
  }
}

function LoadCollections()
{
  const totalMods = {}
  UpdateCollectionsList()
}

function UpdateCollectionsList()
{
  var collectionsTable = {}
  collectionsTable['columns'] = [{field: 'name', title: 'Collections:'}]

  collectionsTable['data'] = []
  var n = 0;
  for(i in launcherConfig['Collections'])
  {
    collectionsTable['data'][n] = {}
    collectionsTable['data'][n]['name'] = i
    n++;
  }
  $('#collections').bootstrapTable(collectionsTable)
  $('#collections').bootstrapTable('load', collectionsTable['data'])
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
  var cfg = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), '../../Local/Crashday/config/launcher.config')))
  if(!cfg.hasOwnProperty('Collections'))
    cfg['Collections'] = {}
  return cfg
}

function SaveConfig(){
  fs.writeFileSync(path.join(app.getPath('userData'), '../../Local/Crashday/config/launcher.config'), JSON.stringify(launcherConfig, undefined, 4))
}
