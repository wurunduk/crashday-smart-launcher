// DISCLAIMER: All of this code is ass and I had no idea what I was doing when I wrote this.
// You probably should not use this as a reference.


// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { ipcRenderer, shell } = require('electron')
const remote = require('electron').remote
const app = remote.app
const path = require('path')
const fs = require('fs')
const Mousetrap = require('mousetrap')

Mousetrap.bind(['command+r', 'ctrl+r', 'f5'], () => {
	remote.getCurrentWindow().reload()
	return false // prevents default behavior and stops event from bubbling
})

let settingsPath = path.join(app.getPath('userData'), '../../Local/Crashday/config/')
console.log('Settings path: ' + settingsPath)

var activeModsAmount = 0
var collectionModsAmount = 0
var totalModsAmount = 0

var selectedCollection = ''

var cfg = LoadConfig()
var launcherConfig = cfg[0]
var collectionConfig = cfg[1] // Treated as smart launcher config. Don't write anything into CD's config as it overwrites all unknown changes.
var steamAnswer = ''
var missingMods = []
SaveConfig()

ipcRenderer.send('app_version')
ipcRenderer.on('app_version', (event, arg) => {
  ipcRenderer.removeAllListeners('app_version')
  $('#version').html('Version ' + arg.version)
})

$('#use-default-launcher').prop('checked', collectionConfig['UseDefaultLauncher'])
$('#mods-testing').prop('checked', launcherConfig['ModTesting'])
$('#mods-disabled').prop('checked', launcherConfig['DisableMods'])

$(document).on('click', 'a[href^="http"]', (event) => {
  event.preventDefault()
  let link = event.target.href
  shell.openExternal(link)
})

if(collectionConfig['CrashdayPath'] != '')
  $('#cd-file-path').val(collectionConfig['CrashdayPath'])

$('#cd-file-path').on('change', function() {
  var p = $(this).val()
  if(!fs.existsSync(p)) {
    collectionConfig['CrashdayPath'] = ''
  }
  else collectionConfig['CrashdayPath'] = p

  SaveConfig()

  $.toast({title: 'CD Path saved!',
           type: 'success', delay: 5000, container: $('#toaster')})
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
  launcherConfig['ModTesting'] = $('#mods-testing').is(':checked')
  SaveConfig()
})

$('#mods-disabled').on('click', function (){
  launcherConfig['DisableMods'] = $('#mods-disabled').is(':checked')
  SaveConfig()
})

$('#use-default-launcher').on('click', function (){
  collectionConfig['UseDefaultLauncher'] = $('#use-default-launcher').is(':checked')
  SaveConfig()
})

$('#play').on('click', function(){
  SaveConfig()
  if($('#use-default-launcher').is(':checked')) shell.openExternal('steam://run/508980')
  else shell.openExternal('steam://run/508980//-skiplauncher/')
})

function GetFileDetailsFromSteam(requestParams, cb){
  const requestJson = JSON.stringify(requestParams, undefined, 0)
  const Http = new XMLHttpRequest()
  const url = 'https://api.steampowered.com/IPublishedFileService/GetDetails/v1/?key=48AD6D31B973C68065FEEEFF16073494&input_json=' + requestJson
  Http.open('GET', url)
  Http.send()
  console.groupCollapsed('Sent a request to Steam')
  console.log(url)
  console.groupEnd()

  Http.onreadystatechange=function(){
    if(this.readyState==4 && this.status==200){
      const response = JSON.parse(Http.responseText)['response']

      console.groupCollapsed('Steam answer')
      console.log(response)
      console.groupEnd()

      cb(response)
    }
    else if(this.readyState == 4){
      $.toast({title: 'Connection error',
              content: 'Could not connect to steam servers. Response code ' + this.status,
              type: 'error', delay: 5000, container: $('#toaster')})
    }
  }
}

function PrepareMissingModsModal(){
  $('#missing-mods-modal-loader').children().show()
  var jsonParameter = {}
  jsonParameter['publishedfileids'] = []
  for(i in missingMods){
    jsonParameter['publishedfileids'].push(missingMods[i])
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
  jsonParameter['strip_description_bbcode'] = false

  const Http = new XMLHttpRequest()
  const url = 'https://api.steampowered.com/IPublishedFileService/GetDetails/v1/?key=48AD6D31B973C68065FEEEFF16073494&input_json=' + JSON.stringify(jsonParameter, undefined, 0)
  Http.open('GET', url)
  Http.send()

  console.groupCollapsed('Sent a request to Steam')
  console.log(url)
  console.groupEnd()

  Http.onreadystatechange=function(){
    if(this.readyState==4 && this.status==200){
      var answer = JSON.parse(Http.responseText)['response']

      console.groupCollapsed('Steam answer')
      console.log(answer)
      console.groupEnd()

      $('#missing-mods-modal-list').html('')
      for(i in answer['publishedfiledetails']){
        $('#missing-mods-modal-list').append(
          `<a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${parseInt(missingMods[i])}">${answer['publishedfiledetails'][i]['title']}</a>
           <a href="steam://openurl/https://steamcommunity.com/sharedfiles/filedetails/?id=${parseInt(missingMods[i])}">(open in steam)</a></br>`)
      }

    }else if(this.readyState == 4){
      $('#missing-mods-modal-list').html('')
      for(i in answer['publishedfiledetails']){
        $('#missing-mods-modal-list').append(
        `<a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${parseInt(missingMods[i])}">${answer['publishedfiledetails'][i]['title']}</a>
        <a href="steam://openurl/https://steamcommunity.com/sharedfiles/filedetails/?id=${parseInt(missingMods[i])}">(open in steam)</a></br>`)
      }

      $.toast({title: 'Connection error',
             content: 'Could not connect to steam servers. Response code ' + this.status,
             type: 'error', delay: 5000, container: $('#toaster')})
    }
    $('#missing-mods-modal-loader').children().hide()
  }
}

function UpdateModsAmount()
{
  $('.mods-amount').html(activeModsAmount + ' out of ' + totalModsAmount + ' mods enabled')
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
  jsonParameter['strip_description_bbcode'] = false

  GetFileDetailsFromSteam(jsonParameter, (response) => {
    steamAnswer = response

    const table = {}
    table['search'] = true
    table['clickToSelect'] = true
    table['maintainMetaData'] = true
    table['detailView'] = true
    table['detailViewIcon'] = true
    table['detailFormatter'] = detailFormatter
    table['iconsPrefix'] = 'icon'
    table['icons'] = []
    table['icons']['detailOpen'] = 'ion-md-information-circle-outline'
    table['icons']['detailClose'] = 'ion-md-information-circle'
    table['classes'] = 'table table-hover'
    table['columns'] = [{checkbox: 'enabled', field: 'enabled', order: 'desc', sortable:true}, {field: 'id', title: 'ID', width: 60, sortable:true}, {field: 'title', title: 'Name', sortable: true}, {field: 'itemId', title: 'Item ID', sortable: true}, {field: 'tags', title: 'Tags', sortable: true}]
    table['rowStyle'] = rowStyle

    $('.loading').children().hide()
    $('#mods-table').bootstrapTable(table)

    UpdateModlistData()
  })
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
    data[i]['tags'] = ''
    for(n in steamAnswer['publishedfiledetails'][i]['tags']){
      if(n>0) data[i]['tags'] += ', '

      data[i]['tags'] += steamAnswer['publishedfiledetails'][i]['tags'][n]['tag']
    }
    totalModsAmount += 1
    UpdateModsAmount()
  }
  $('.loading').children().hide()
  $('#mods-table').bootstrapTable('load', data)
}

function rowStyle(row, index){
  var c=0,t=0,tp=0,a=0,m=0
  if(row['tags'].includes('Car')) c = 1
  if(row['tags'].includes('Track')) t = 1
  if(row['tags'].includes('Piece')) tp = 1
  if(row['tags'].includes('Ambience')) a = 1
  if(row['tags'].includes('Misc')) m = 1

  if(c+t+a+m > 1 || c+tp+a+m > 1) return{css:{
    color: 'orange'
  }}

  if(c) return{css:{
    color: 'red'
  }}
  if(tp) return{css:{
    color: 'green'
  }}
  if(t) return{css:{
    color: 'darkslategray'
  }}
  if(a) return{css:{
    color: 'LightSeaGreen'
  }}
  if(m) return{css:{
    color: 'purple'
  }}

  return{}
}

//=============================================================================================
//COLLECTIONS
//=============================================================================================
$('#deactivate-mods').on('click', function(e){
  for(i in launcherConfig['WorkshopItems'])
  {
    launcherConfig['WorkshopItems'][i][1] = false
  }

  activeModsAmount = 0
  UpdateModsAmount()
  UpdateModlistData()
  $.toast({title: 'All mods were turned off!',
           type: 'success', delay: 5000, container: $('#toaster')})
})

$('#activate-collection').on('click', function(e){
  if(selectedCollection.length == 0) return

  var notFoundMods = 0
  var modsEnabled = 0
  missingMods = []
  for(i in collectionConfig['Collections'][selectedCollection])
  {
    var found = false
    for(n in launcherConfig['WorkshopItems'])
    {
      if(launcherConfig['WorkshopItems'][n][0] == collectionConfig['Collections'][selectedCollection][i])
      {
        found = true
        modsEnabled += 1
        launcherConfig['WorkshopItems'][n][1] = true
      }
    }
    if(!found){
      notFoundMods += 1
      missingMods.push(collectionConfig['Collections'][selectedCollection][i])
    }
  }
  SaveConfig()
  UpdateModsAmount()
  UpdateModlistData()
  $.toast({title: 'Collection activated!',
           content: 'Succesfully activated collection ' + selectedCollection + ' with ' + modsEnabled + ' mods. Total mods activated: ' + activeModsAmount,
           type: 'success', delay: 5000, container: $('#toaster')})

  //some of the mods were not found, prepare modal window and show a warning
  if(notFoundMods > 0){
    console.log(missingMods)
    $.toast({title: 'Mods missing!',
           content: notFoundMods + ` of the mods which are in this collection are missing on the local machine!
           You need to subscribe to them in steam.<br/>
           <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#missing-mods-modal">
            Show list
           </button>`,
           type: 'warning', delay: -1, pause_on_hover:true, container: $('#toaster')})
    PrepareMissingModsModal()
  }
})

function UpdateCollectionModsAmount()
{
  var i = collectionConfig['Collections'][selectedCollection].length
  if(collectionModsAmount != i)
    $('#mods-collection-amount').html(`Mods in this collection: ${collectionModsAmount}(${i}) out of ${totalModsAmount}`)
  else
    $('#mods-collection-amount').html(`Mods in this collection: ${collectionModsAmount} out of ${totalModsAmount}`)
}

$('#new-collection').on('click', function(e){
  var i = 1
  //find the next available collection name
  while(collectionConfig['Collections'].hasOwnProperty('new-collection-' + i)) i++
  var name = 'new-collection-'+i
  collectionConfig['Collections'][name] = []
  //save the newly added collection
  SaveConfig()
  selectedCollection = name
  $('#collection-name').val(selectedCollection)
  UpdateCollectionsList()
  LoadCollection()
  $.toast({title: 'Collection created!',
           content: name + ' was created.',
           type: 'success', delay: 5000, container: $('#toaster')})
})

$('#remove-missing-mods').on('click', function(e){
  var removedMods = 0
  for(n in missingMods){
    for(i in collectionConfig['Collections'][selectedCollection])
    {
      if(collectionConfig['Collections'][selectedCollection][i] == missingMods[n]){
        collectionConfig['Collections'][selectedCollection].splice(i, 1)
        removedMods += 1
        break
      }
    }
    collectionModsAmount -= 1
  }
  SaveConfig()
  UpdateCollectionModsAmount()
  LoadCollection()
  $.toast({title: 'Collection cleaned!',
           content: removedMods + ' mods were removed from collection ' + selectedCollection + '.',
           type: 'success', delay: 5000, container: $('#toaster')})
})

$('#delete-collection').on('click', function(e){
  if(selectedCollection.length == 0) return

  var oldName = selectedCollection

  $('#collection-name').val('')
  delete collectionConfig['Collections'][selectedCollection]
  selectedCollection = ''
  SaveConfig()
  UpdateCollectionsList()
  $.toast({title: 'Collection deleted!',
           content: 'Succesfully deleted ' + oldName + ' collection.',
           type: 'success', delay: 5000, container: $('#toaster')})
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
      if(collectionConfig['Collections'][selectedCollection][i] == rowsBefore[r]['itemId']){
        collectionConfig['Collections'][selectedCollection].splice(i, 1)
        break
      }
    }
  }

  collectionModsAmount -= rowsBefore.length + rowsAfter.length
  UpdateCollectionModsAmount()
  SaveConfig()
})

function GetCollectionDetailsRequestJsonparamsById(id){
  var jsonParameter = {}

  jsonParameter['publishedfileids'] = [id]
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
  jsonParameter['strip_description_bbcode'] = false

  return jsonParameter
}

function FindNextAvailableCollectionName(name) {
  if(!collectionConfig['Collections'].hasOwnProperty(name))
    return name

  var i = 1
  while(collectionConfig['Collections'].hasOwnProperty(name + '-' + i)) i++
 return name + '-' + i
}

function AddModsToCollection(name, collectionId) {
  GetFileDetailsFromSteam(GetCollectionDetailsRequestJsonparamsById(collectionId), (response) => {
    if(response['publishedfiledetails'][0]['result'] != 1){
      $.toast({title: 'Collection import error',
        content: 'Steam could not find collection with id ' + collectionId,
        type: 'error', delay: 5000, container: $('#toaster')})
      return
    }

    let updatingCollection = name != ''

    let modTitle = response['publishedfiledetails'][0]['title']

    if (!updatingCollection) {
      name = modTitle
      name = FindNextAvailableCollectionName(name)
      collectionConfig['Collections'][name] = []
    }

    var modsCount = 0
    var childCollectionsCount = 0
    for(i in response['publishedfiledetails'][0]['children']){
      let info = response['publishedfiledetails'][0]['children'][i]
      if (info['file_type'] == 0) { // Workshop item https://partner.steamgames.com/doc/api/ISteamRemoteStorage#EWorkshopFileType
        modsCount ++
        collectionConfig['Collections'][name].push(parseInt(info['publishedfileid']))
      }
      else if (info['file_type'] == 2) { // Collection of other mods
        let id = parseInt(info['publishedfileid'])
        childCollectionsCount ++
        console.log('Adding child collection ' + id)
        AddModsToCollection(name, id)
      }
    }
    //save the newly added collection
    SaveConfig()
    //update the list
    UpdateCollectionsList()
    if (updatingCollection) {
      $.toast({title: 'Child collection added',
              content: 'Updated collection ' + name + ' from collection ' + modTitle + ' with ' + modsCount + ' mods and ' + childCollectionsCount + ' child collections.',
              type: 'success', delay: 5000, container: $('#toaster')})
    } else {
      $.toast({title: 'Collection imported',
              content: 'New collection ' + name + ' was succesfully imported with ' + modsCount + ' mods and ' + childCollectionsCount + ' child collections.',
              type: 'success', delay: 5000, container: $('#toaster')})
    }
  })
}

function GetCollectionFromLink(){
  var collectionUrl
  try {
  	collectionUrl = new URL($('#steam-collection-link').val())
  	collectionUrl = collectionUrl.searchParams.get('id')
  } catch(e){
  	collectionUrl = $('#steam-collection-link').val()
  }

  AddModsToCollection('', collectionUrl)
}

function LoadCollections()
{
  const currentCollectionTable = {}
  currentCollectionTable['columns'] = [{checkbox: 'enabled', field: 'enabled', order: 'desc', sortable:true}, {field: 'title', title: 'Name', sortable:true}, {field: 'itemId', title: 'Item ID', sortable: true}, {field: 'tags', title: 'Tags', sortable:true}]
  currentCollectionTable['sortName'] = 'enabled'
  currentCollectionTable['sortOrder'] = 'desc'
  currentCollectionTable['search'] = true
  currentCollectionTable['clickToSelect'] = true
  currentCollectionTable['maintainMetaData'] = true
  currentCollectionTable['rowStyle'] = rowStyle
  currentCollectionTable['classes'] = 'table table-hover'
  $('#current-collection').bootstrapTable(currentCollectionTable)

  const collectionsTable = {}
  collectionsTable['columns'] = [{checkbox: 'enabled', field: 'enabled', cellStyle: cellStyle}, {field: 'name', title: 'Collections:'}]
  collectionsTable['showHeader'] = false
  collectionsTable['clickToSelect'] = true
  collectionsTable['singleSelect'] = true
  $('#collections-list').bootstrapTable(collectionsTable)
  UpdateCollectionsList()
}

//formatting for collections list table
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
    data[i]['tags'] = ''
    for(n in steamAnswer['publishedfiledetails'][i]['tags']){
      if(n>0) data[i]['tags'] += ', '

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
    if(selectedCollection != '')
      if(i == selectedCollection)
        data[n]['enabled'] = true
    n++
  }

  $('#collections-list').bootstrapTable('load', data)
}

//=============================================================================================
//MOD PREVIEW
//=============================================================================================
function modMoveUp(evt){
  //update steamAnswer,
  //update launcherConfig
  //update table view
  steamid = $(this).attr('data-steamid')
  for(i in launcherConfig['WorkshopItems']){
    if(launcherConfig['WorkshopItems'][i][0] == steamid){
      //cant move the item up if its the first one
      if(i == 0) return

      //swap items it steamAnswer
      tmpSAItem = steamAnswer['publishedfiledetails'][i]
      steamAnswer['publishedfiledetails'][i] = steamAnswer['publishedfiledetails'][i-1]
      steamAnswer['publishedfiledetails'][i-1] = tmpSAItem

      //swap items in launcherConfig
      tmpLCItem = launcherConfig['WorkshopItems'][i]
      launcherConfig['WorkshopItems'][i] = launcherConfig['WorkshopItems'][i-1]
      launcherConfig['WorkshopItems'][i-1] = tmpLCItem

      $table = $('#mods-table')

      var tableRow = JSON.parse(JSON.stringify($table.bootstrapTable('getData', {"unfiltered": true} )[i]))
      var tableRowPrev = JSON.parse(JSON.stringify($table.bootstrapTable('getData', {"unfiltered": true})[i-1]))
      tableRow['id'] = (i-1).toString()
      tableRowPrev['id'] = i
      $table.bootstrapTable('updateRow', {index: i, row: tableRowPrev})
      $table.bootstrapTable('updateRow', {index: i-1, row: tableRow})
      $table.bootstrapTable('toggleDetailView', i-1)
      var offset = $('.mod-move-down').offset()
      var height = $('.mod-move-down').height()
      y = evt.pageY - (offset.top + height/2)
      window.scrollBy(0, -y)
      SaveConfig()
      return
    }
  }
}

function modMoveDown(evt){
  //update steamAnswer,
  //update launcherConfig
  //update table view
  steamid = $(this).attr('data-steamid')
  for(i in launcherConfig['WorkshopItems']){
    if(launcherConfig['WorkshopItems'][i][0] == steamid){
      //cant move the item down if its the last one
      if(i == launcherConfig['WorkshopItems'].length - 1) return

      //swap items it steamAnswer
      tmpSAItem = steamAnswer['publishedfiledetails'][parseInt(i)+1]
      steamAnswer['publishedfiledetails'][parseInt(i)+1] = steamAnswer['publishedfiledetails'][i]
      steamAnswer['publishedfiledetails'][i] = tmpSAItem

      //swap items in launcherConfig
      tmpLCItem = launcherConfig['WorkshopItems'][parseInt(i)+1]
      launcherConfig['WorkshopItems'][parseInt(i)+1] = launcherConfig['WorkshopItems'][i]
      launcherConfig['WorkshopItems'][i] = tmpLCItem

      $table = $('#mods-table')

      var tableRow = JSON.parse(JSON.stringify($table.bootstrapTable('getData', {"unfiltered": true})[i]))
      var tableRowPrev = JSON.parse(JSON.stringify($table.bootstrapTable('getData', {"unfiltered": true})[parseInt(i)+1]))
      tableRow['id'] = (parseInt(i)+1).toString()
      tableRowPrev['id'] = i
      $table.bootstrapTable('updateRow', {index: i, row: tableRowPrev})
      $table.bootstrapTable('updateRow', {index: parseInt(i)+1, row: tableRow})
      $table.bootstrapTable('toggleDetailView', parseInt(i)+1)
      var offset = $('.mod-move-down').offset()
      var height = $('.mod-move-down').height()
      y = evt.pageY - (offset.top + height/2)
      window.scrollBy(0, -y)
      SaveConfig()
      return
    }
  }
}


function detailFormatter(index, row) {
  var html = []
  for(i in steamAnswer['publishedfiledetails']){
    if(steamAnswer['publishedfiledetails'][i]['publishedfileid'] == row['itemId']){
      data = fs.readFileSync(path.join(__dirname, '../html/mod-description.html'), 'utf8')
      data = $.parseHTML(data)
      $('.mod-preview-image', data).attr('src', steamAnswer['publishedfiledetails'][i]['preview_url'])
      $('.mod-desc', data).html(steamAnswer['publishedfiledetails'][i]['file_description'])
      $('.mod-views', data).html(steamAnswer['publishedfiledetails'][i]['views'])
      $('.mod-subs', data).html(steamAnswer['publishedfiledetails'][i]['subscriptions'])
      $('.mod-favs', data).html(steamAnswer['publishedfiledetails'][i]['favorited'])
      $('.mod-size', data).html(humanFileSize(steamAnswer['publishedfiledetails'][i]['file_size']))

      $('.mod-open-browser', data).attr("href", "https://steamcommunity.com/sharedfiles/filedetails/?id=" + steamAnswer['publishedfiledetails'][i]['publishedfileid'])
      $('.mod-open-steam', data).attr("href", "steam://openurl/https://steamcommunity.com/sharedfiles/filedetails/?id=" + steamAnswer['publishedfiledetails'][i]['publishedfileid'])

      $('.mod-move-up', data).attr("data-steamid", steamAnswer['publishedfiledetails'][i]['publishedfileid'])
      $('.mod-move-up', data).click(modMoveUp)
      $('.mod-move-down', data).attr("data-steamid", steamAnswer['publishedfiledetails'][i]['publishedfileid'])
      $('.mod-move-down', data).click(modMoveDown)
      html = data
      break
    }
  }
  return html
}

function humanFileSize(size) {
  var i = size == 0 ? 0 : Math.floor( Math.log(size) / Math.log(1024) );
  return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
};

//=============================================================================================
//CONFIG LOADING-SAVING
//=============================================================================================

function LoadConfig(){
  var cfg = fs.readFileSync(path.join(settingsPath, 'launcher.config'))
  var colls = fs.readFileSync(path.join(settingsPath, 'collections.config'), {flag: 'a+'})
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

  if(!colls.hasOwnProperty('UseDefaultLauncher'))
    colls['UseDefaultLauncher'] = true

  if(!colls.hasOwnProperty('CrashdayPath')){
    colls['CrashdayPath'] = ''
  }
  else{
    if(!fs.existsSync(colls['CrashdayPath'])) {
      colls['CrashdayPath'] = ''
    }
  }

  if(colls['CrashdayPath'] == '')
    $.toast({title: 'crashday.exe not found',
             content: 'Specify crashday.exe path in settings to enable auto scanning for newly subscribed mods. Otherwise default launcher has to be started after subscribing to new mods.',
             type: 'error', delay: 5000, container: $('#toaster')})

  //check for new mods in the workshop folder
  var p = path.join(colls['CrashdayPath'], '../../workshop/content/508980')
  var unlistedMods = 0
  var listedMods = 0
  var emptyFolders = 0
  var otherFiles = 0
  if(fs.existsSync(p)){
    fs.readdirSync(p).forEach(file => {
      var foundFile = false
      var name = parseInt(file, 10)
      //skip not numbered folder names
      if(name == NaN) {
        otherFiles++
        return
      }

      folder = fs.statSync(path.join(p, file))
      if(!folder.isDirectory()) {
        otherFiles++
        return
      }
      //check there is a mod file in mod folder
      files = fs.readdirSync(path.join(p, file))
      if(files.length == 0) {
        emptyFolders++
        return
      }

      for(n in cfg['WorkshopItems'])
      {
        if(cfg['WorkshopItems'][n][0] == name)
        {
          listedMods++
          foundFile = true
        }
      }
      if(!foundFile){
        cfg['WorkshopItems'].push([name, false])
        unlistedMods++
      }
    })
  }

  console.log(`Found ${listedMods} listed mods, ${unlistedMods} unlisted mods, ${emptyFolders} empty folders and ${otherFiles} other files in Workshop folder`)

  if(unlistedMods > 0){
    $.toast({title: 'New mods found',
             content: 'Launcher found and added ' + unlistedMods + ' new mods.',
             type: 'info', delay: 5000, container: $('#toaster')})
  }

  return [cfg, colls]
}

function SaveConfig(){
  fs.writeFileSync(path.join(settingsPath, 'launcher.config'), JSON.stringify(launcherConfig, undefined, 4))
  fs.writeFileSync(path.join(settingsPath, 'collections.config'), JSON.stringify(collectionConfig, undefined, 4))
}
