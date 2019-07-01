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

const thisVersion = "v1.2.0"

$.getJSON("https://api.github.com/repos/wurunduk/crashday-smart-launcher/tags").done(function(json) {
  var release = json[0];
  var downloadURL = release.zipball_url;
  if (release['name'] != thisVersion) {
    $("#update-link").attr("href", downloadURL);
    $('#update-link').show()
  }
});

$(window).scroll(function() {
  if ($(this).scrollTop() > 200) {
    $('.go-top').fadeIn(200)
  } else {
    $('.go-top').fadeOut(200)
  }
})

$('.go-top').on('click', function(e) {
  e.preventDefault();
  $('html,body').animate({
    scrollTop: 0
  }, 300)
})
//
//Navbar tabs controlls
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
var steamAnswer = "";

document.getElementById('mods-testing').checked = launcherConfig['ModTesting']
document.getElementById('mods-disabled').checked = launcherConfig['DisableMods']

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
  UpdateModsAmount()
  UpdateModlistData()
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

  var old = launcherConfig['Collections'][selectedCollection]
  delete launcherConfig['Collections'][selectedCollection]
  selectedCollection = $('#collection-name').val()
  launcherConfig['Collections'][selectedCollection] = old
  SaveConfig()
  UpdateCollectionsList();
})

$('#collections-list').on('click-row.bs.table', function(e, row){
  SaveConfig()
  selectedCollection = row['name']
  $('#collection-name').val(selectedCollection)
  LoadCollection()
})

//
//  Collections table
//
$('#current-collection').on('check.bs.table', function(e, row){
  launcherConfig['Collections'][selectedCollection].push(row['itemId'])
  collectionModsAmount += 1
  UpdateCollectionModsAmount()
  SaveConfig()
})

$('#current-collection').on('uncheck.bs.table', function(e, row){
  for(i in launcherConfig['Collections'][selectedCollection])
  {
    if(launcherConfig['Collections'][selectedCollection][i] == row['itemId'])
      launcherConfig['Collections'][selectedCollection].splice(i, 1)
  }
  collectionModsAmount -= 1
  UpdateCollectionModsAmount()
  SaveConfig()
})

$('#current-collection').on('check-all.bs.table', function(e, rowsAfter, rowsBefore){
  for(r in rowsAfter) launcherConfig['Collections'][selectedCollection].push(rowsAfter[r]['itemId'])
  collectionModsAmount += rowsAfter.length - rowsBefore.length
  UpdateCollectionModsAmount()
  SaveConfig()
})

$('#current-collection').on('uncheck-all.bs.table', function(e, rowsAfter, rowsBefore){
  for(r in rowsBefore) {
    for(i in launcherConfig['Collections'][selectedCollection])
    {
      if(launcherConfig['Collections'][selectedCollection][i] == rowsBefore[r]['itemId'])
        launcherConfig['Collections'][selectedCollection].splice(i, 1)
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
  $('#mods-amount').html("Mods enabled: " + activeModsAmount + "\\" + totalModsAmount)
}

function UpdateCollectionModsAmount()
{
  $('#mods-collection-amount').html("Mods in this collection: " + collectionModsAmount + "\\" + totalModsAmount)
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
      steamAnswer = JSON.parse(Http.responseText)['response']
      const table = {}
      table['search'] = true
      table['clickToSelect'] = true
      table['maintainMetaData'] = true
      table['columns'] = [{checkbox: 'enabled', field: 'enabled', sortable:true}, {field: 'id', title: 'ID', width: 60, sortable:true}, {field: 'title', title: 'Name', sortable: true}, {field: 'itemId', title: 'Item ID'}, {field: 'tags', title: 'Tags', sortable: true}]
      table['rowStyle'] = rowStyle

      $('.loading').children().hide()
      $('#mods-table').bootstrapTable(table)

      UpdateModlistData()
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
  currentCollectionTable['columns'] = [{checkbox: 'enabled', field: 'enabled', sortable:true}, {field: 'title', title: 'Name', sortable:true}, {field: 'tags', title: 'Tags', sortable:true}]
  currentCollectionTable['search'] = true
  currentCollectionTable['clickToSelect'] = true
  currentCollectionTable['maintainMetaData'] = true
  currentCollectionTable['rowStyle'] = rowStyle
  $('#current-collection').bootstrapTable(currentCollectionTable)

  const collectionsTable = {}
  collectionsTable['columns'] = [{field: 'name', title: 'Collections:'}]
  $('#collections-list').bootstrapTable(collectionsTable)
  UpdateCollectionsList()
}

function LoadCollection()
{
  collectionModsAmount = 0
  data = []
  for(i in steamAnswer['publishedfiledetails']){
    data[i] = {}
    data[i]['id'] = i
    for(n in launcherConfig['Collections'][selectedCollection])
    {
      if(launcherConfig['WorkshopItems'][i][0] == launcherConfig['Collections'][selectedCollection][n])
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
  var n = 0;
  for(i in launcherConfig['Collections'])
  {
    data[n] = {}
    data[n]['name'] = i
    n++;
  }

  $('#collections-list').bootstrapTable('load', data)
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
