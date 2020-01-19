// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { shell } = require('electron')
const remote = require('electron').remote
const app = remote.app
const path = require('path')
const fs = require('fs')

var activeModsAmount = 0
var collectionModsAmount = 0
var totalModsAmount = 0

var selectedCollection = ""

var defaultLauncherCheckbox = document.getElementById('launch-default')

//
//Navbar tabs controlls
//
$(document).on('click', 'a[href^="http"]', (event) => {
  event.preventDefault()
  let link = event.target.href
  shell.openExternal(link)
})

var cfg = LoadConfig()
var launcherConfig = cfg[0]
var collectionConfig = cfg[1]
SaveConfig()
var steamAnswer = ""

document.getElementById('mods-testing').checked = launcherConfig['ModTesting']
document.getElementById('mods-disabled').checked = launcherConfig['DisableMods']

if(collectionConfig['CrashdayPath'] != "")
  $("#cd-file-path").val(collectionConfig['CrashdayPath'])

$("#cd-file-path").on("change", function() {
  var p = $(this).val()
  if(!fs.existsSync(p)) {
    collectionConfig['CrashdayPath'] = ""
  }
  else collectionConfig['CrashdayPath'] = p

  SaveConfig()
})

LoadWorkshop()
LoadCollections()


//
//Main mods table controlls
//
$('#mods-table').on('check.bs.table', function(e, row){
  launcherConfig['WorkshopItems'][row['id']][1] = true
  activeModsAmount += 1
  UpdateModsAmount()
  SaveConfig()
})

$('#mods-table').on('uncheck.bs.table', function(e, row){
  launcherConfig['WorkshopItems'][row['id']][1] = false
  activeModsAmount -= 1
  UpdateModsAmount()
  SaveConfig()
})

$('#mods-table').on('check-all.bs.table', function(e, rowsAfter, rowsBefore){
  for(r in rowsAfter) launcherConfig['WorkshopItems'][rowsAfter[r]['id']][1] = true
  activeModsAmount += rowsAfter.length - rowsBefore.length
  UpdateModsAmount()
  SaveConfig()
})

$('#mods-table').on('uncheck-all.bs.table', function(e, rowsAfter, rowsBefore){
  for(r in rowsBefore) launcherConfig['WorkshopItems'][rowsBefore[r]['id']][1] = false
  activeModsAmount -= rowsBefore.length + rowsAfter.length
  UpdateModsAmount()
  SaveConfig()
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


//
//Collections
//
$('#deactivate-mods').on('click', function(e){
  for(i in launcherConfig['WorkshopItems'])
  {
    launcherConfig['WorkshopItems'][i][1] = false
  }

  activeModsAmount = 0
  UpdateModsAmount()
  UpdateModlistData()
})

$('#activate-collection').on('click', function(e){
  if(selectedCollection.length == 0) return

  for(i in collectionConfig['Collections'][selectedCollection])
  {
    for(n in launcherConfig['WorkshopItems'])
    {
      if(launcherConfig['WorkshopItems'][n][0] == collectionConfig['Collections'][selectedCollection][i])
      {
        launcherConfig['WorkshopItems'][n][1] = true
      }
    }
  }
  SaveConfig()
  UpdateModsAmount()
  UpdateModlistData()
})

$('#new-collection').on('click', function(e){
  var i = 1
  //find the next available collection name
  while(collectionConfig['Collections'].hasOwnProperty("new-collection-" + i)) i++
  collectionConfig['Collections']['new-collection-'+i] = []
  //save the newly added collection
  SaveConfig()
  //update the list
  UpdateCollectionsList()
})

$('#delete-collection').on('click', function(e){
  if(selectedCollection.length == 0) return

  $('#collection-name').val("")
  delete collectionConfig['Collections'][selectedCollection]
  selectedCollection = ""
  SaveConfig()
  UpdateCollectionsList()
})

$('#collection-name').change(function(){
  if(selectedCollection.length == 0) return

  var old = collectionConfig['Collections'][selectedCollection]
  delete collectionConfig['Collections'][selectedCollection]
  selectedCollection = $('#collection-name').val()
  collectionConfig['Collections'][selectedCollection] = old
  SaveConfig()
  UpdateCollectionsList()
})

$('#get-steam-collection').on('click', function(e){
  GetCollectionFromLink()
})

$('#collections-list').on('click-row.bs.table', function(e, row){
  SaveConfig()
  selectedCollection = row['name']
  $('#collection-name').val(selectedCollection)
  UpdateCollectionsList()
  LoadCollection()
})

//
//  Collections table
//
$('#current-collection').on('check.bs.table', function(e, row){
  collectionConfig['Collections'][selectedCollection].push(row['itemId'])
  collectionModsAmount += 1
  UpdateCollectionModsAmount()
  SaveConfig()
})

$('#current-collection').on('uncheck.bs.table', function(e, row){
  for(i in collectionConfig['Collections'][selectedCollection])
  {
    if(collectionConfig['Collections'][selectedCollection][i] == row['itemId'])
      collectionConfig['Collections'][selectedCollection].splice(i, 1)
  }
  collectionModsAmount -= 1
  UpdateCollectionModsAmount()
  SaveConfig()
})

$('#current-collection').on('check-all.bs.table', function(e, rowsAfter, rowsBefore){
  for(r in rowsAfter) collectionConfig['Collections'][selectedCollection].push(rowsAfter[r]['itemId'])
  collectionModsAmount += rowsAfter.length - rowsBefore.length
  UpdateCollectionModsAmount()
  SaveConfig()
})

$('#current-collection').on('uncheck-all.bs.table', function(e, rowsAfter, rowsBefore){
  for(r in rowsBefore) {
    for(i in collectionConfig['Collections'][selectedCollection])
    {
      if(collectionConfig['Collections'][selectedCollection][i] == rowsBefore[r]['itemId'])
        collectionConfig['Collections'][selectedCollection].splice(i, 1)
    }
  }

  collectionModsAmount -= rowsBefore.length + rowsAfter.length
  UpdateCollectionModsAmount()
  SaveConfig()
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
  $('.mods-amount').html("Mods enabled: " + activeModsAmount + "\\" + totalModsAmount)
}

function UpdateCollectionModsAmount()
{
  $('#mods-collection-amount').html("Mods in this collection: " + collectionModsAmount + "\\" + totalModsAmount)
}

function LoadWorkshop(){
  var jsonParameter = {}
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
      steamAnswer = JSON.parse(Http.responseText)['response']

      const table = {}
      table['search'] = true
      table['clickToSelect'] = true
      table['maintainMetaData'] = true
      table['columns'] = [{checkbox: 'enabled', field: 'enabled', sortable:true}, {field: 'id', title: 'ID', width: 60, sortable:true}, {field: 'title', title: 'Name', sortable: true}, {field: 'itemId', title: 'Item ID', sortable: true}, {field: 'tags', title: 'Tags', sortable: true}]
      table['rowStyle'] = rowStyle

      $('.loading').children().hide()
      $('#mods-table').bootstrapTable(table)

      UpdateModlistData()
    }else if(this.readyState == 4){
      $.toast({title: "Connection error",
             content: "Could not connect to steam servers. Response code " + this.status,
             type: 'error', delay: 5000, container: $("#toaster")})
    }
  }
}

function GetCollectionFromLink(){
  var jsonParameter = {}
  var collectionUrl
  try {
  	collectionUrl = new URL($('#steam-collection-link').val())
  	collectionUrl = collectionUrl.searchParams.get('id')
  } catch(e){
  	collectionUrl = $('#steam-collection-link').val()
  }

  jsonParameter['publishedfileids'] = [collectionUrl]
  jsonParameter['includetags'] = true
  jsonParameter['includeadditionalpreviews'] = false
  jsonParameter['includechildren'] = true
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
      var response = JSON.parse(Http.responseText)['response']

      if(response['publishedfiledetails'][0]['result'] != 1){
      	$.toast({title: "Collection import error",
             content: "Steam could not find collection with id " + collectionUrl,
             type: 'error', delay: 5000, container: $("#toaster")})
      	return
      }

      var name = response['publishedfiledetails'][0]['title']

      var i = 0
	  //find the next available collection name
	  if(collectionConfig['Collections'].hasOwnProperty(name)){
	  	i = 1
	  	while(collectionConfig['Collections'].hasOwnProperty(name + '-' + i)) i++
	  }
	  if(i != 0) name = name + '-' + i

	  collectionConfig['Collections'][name] = []
    var count = 0
    for(i in response['publishedfiledetails'][0]['children']){
      count ++
    	collectionConfig['Collections'][name].push(parseInt(response['publishedfiledetails'][0]['children'][i]['publishedfileid']))
    }
	  //save the newly added collection
	  SaveConfig()
	  //update the list
	  UpdateCollectionsList()
    $.toast({title: "Collection imported",
             content: "New collection '" + name + "' was succesfully imported with " + count + " mods.",
             type: 'info', delay: 5000, container: $("#toaster")})
    }else if(this.readyState == 4){
      $.toast({title: "Connection error",
             content: "Could not connect to steam servers. Response code " + this.status,
             type: 'error', delay: 5000, container: $("#toaster")})
    }
  }
}

function UpdateModlistData()
{
  totalModsAmount = 0
  activeModsAmount = 0

  $('.loading').children().show()
  var data = []
  for(i in steamAnswer['publishedfiledetails']){
    data[i] = {}
    data[i]['id'] = i
    data[i]['enabled'] = launcherConfig['WorkshopItems'][i][1]
    if(data[i]['enabled']) activeModsAmount += 1
    data[i]['itemId'] = launcherConfig['WorkshopItems'][i][0]
    data[i]['title'] = steamAnswer['publishedfiledetails'][i]['title']
    data[i]['tags'] = ""
    for(n in steamAnswer['publishedfiledetails'][i]['tags']){
      if(n>0) data[i]['tags'] += ", "

      data[i]['tags'] += steamAnswer['publishedfiledetails'][i]['tags'][n]['tag']
    }
    totalModsAmount += 1
    UpdateModsAmount()
  }
  $('.loading').children().hide()
  $('#mods-table').bootstrapTable('load', data)
}

function LoadCollections()
{
  const currentCollectionTable = {}
  currentCollectionTable['columns'] = [{checkbox: 'enabled', field: 'enabled', sortable:true}, {field: 'title', title: 'Name', sortable:true}, {field: 'itemId', title: 'Item ID', sortable: true}, {field: 'tags', title: 'Tags', sortable:true}]
  currentCollectionTable['search'] = true
  currentCollectionTable['clickToSelect'] = true
  currentCollectionTable['maintainMetaData'] = true
  currentCollectionTable['rowStyle'] = rowStyle
  $('#current-collection').bootstrapTable(currentCollectionTable)

  const collectionsTable = {}
  collectionsTable['columns'] = [{checkbox: 'enabled', field: 'enabled', cellStyle: cellStyle}, {field: 'name', title: 'Collections:'}]
  collectionsTable['showHeader'] = false
  collectionsTable['clickToSelect'] = true
  collectionsTable['singleSelect'] = true
  $('#collections-list').bootstrapTable(collectionsTable)
  UpdateCollectionsList()
}

function cellStyle(value, row, index, field){
  return {css:{
    display:'none'
  }}
}

function LoadCollection()
{
  collectionModsAmount = 0
  data = []
  for(i in steamAnswer['publishedfiledetails']){
    data[i] = {}
    data[i]['id'] = i
    for(n in collectionConfig['Collections'][selectedCollection])
    {
      if(launcherConfig['WorkshopItems'][i][0] == collectionConfig['Collections'][selectedCollection][n])
      {
        data[i]['enabled'] = true
      }
    }
    if(data[i]['enabled']) collectionModsAmount += 1
    data[i]['itemId'] = launcherConfig['WorkshopItems'][i][0]
    data[i]['title'] = steamAnswer['publishedfiledetails'][i]['title']
    data[i]['tags'] = ""
    for(n in steamAnswer['publishedfiledetails'][i]['tags']){
      if(n>0) data[i]['tags'] += ", "

      data[i]['tags'] += steamAnswer['publishedfiledetails'][i]['tags'][n]['tag']
    }
    UpdateCollectionModsAmount()
  }
  $('#current-collection').bootstrapTable('load', data)
}

function UpdateCollectionsList()
{
  data = []
  var n = 0
  for(i in collectionConfig['Collections'])
  {
    data[n] = {}
    data[n]['name'] = i
    if(selectedCollection != "")
      if(i == selectedCollection)
        data[n]['enabled'] = true
    n++
  }

  $('#collections-list').bootstrapTable('load', data)
}

function rowStyle(row, index){
  var c=0,t=0,a=0,m=0
  if(row['tags'].includes("Car")) c = 1
  if(row['tags'].includes("Track")) t = 1
  if(row['tags'].includes("Ambience")) a = 1
  if(row['tags'].includes("Misc")) m = 1

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
  var cfg = fs.readFileSync(path.join(app.getPath('userData'), '../../Local/Crashday/config/launcher.config'))
  var colls = fs.readFileSync(path.join(app.getPath('userData'), '../../Local/Crashday/config/collections.config'), {flag: 'a+'})
  try{
    cfg = JSON.parse(cfg)
  } catch(e){
    cfg = {}
  }

  if(!cfg.hasOwnProperty('WorkshopItems'))
    cfg['WorkshopItems'] = []


  try{
  	colls = JSON.parse(colls)
  } catch(e){
  	colls = {}
  }

  if(!colls.hasOwnProperty('Collections'))
    colls['Collections'] = {}

  if(!colls.hasOwnProperty('CrashdayPath')){
    colls['CrashdayPath'] = ""
  }
  else{
    if(!fs.existsSync(colls['CrashdayPath'])) {
      colls['CrashdayPath'] = ""
    }
  }

  if(colls['CrashdayPath'] == "")
    $.toast({title: "crashday.exe not found",
             content: "Specify crashday.exe path in settings to enable auto scanning for newly subscribed mods. Otherwise default launcher has to be started after subscribing to new mods.",
             type: 'error', delay: 5000, container: $("#toaster")})

  //check for new mods in the workshop folder
  var p = path.join(colls['CrashdayPath'], '../../workshop/content/508980')
  var foundNewMods = 0
  if(fs.existsSync(p)){
    fs.readdirSync(p).forEach(file => {
      var foundFile = false
      for(n in cfg['WorkshopItems'])
      {
        if(cfg['WorkshopItems'][n][0] == parseInt(file))
        {
          foundFile = true
        }
      }
      if(!foundFile){
        cfg['WorkshopItems'].push([parseInt(file), false])
        foundNewMods += 1
      }
    })
  }

  if(foundNewMods > 0){
    $.toast({title: "New mods found",
             content: "Launcher found and added " + foundNewMods + " new mods.",
             type: 'info', delay: 5000, container: $("#toaster")})
  }

  return [cfg, colls]
}

function SaveConfig(){
  fs.writeFileSync(path.join(app.getPath('userData'), '../../Local/Crashday/config/launcher.config'), JSON.stringify(launcherConfig, undefined, 4))
  fs.writeFileSync(path.join(app.getPath('userData'), '../../Local/Crashday/config/collections.config'), JSON.stringify(collectionConfig, undefined, 4))
}
