//setup existing tabs
$('#tabMods').on('click', (e) => openTab(e, 'mods'))
$('#tabCollections').on('click', (e) => openTab(e, 'collections'))
$('#tabTools').on('click', (e) => openTab(e, 'tools'))

document.getElementById('defaultTab').click()

function openTab(evt, tabName) {
  var i, tabcontent, tablinks

  // Get all elements with class='tabcontent' and hide them
  tabcontent = document.getElementsByClassName('tabcontent')
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].classList.add('invisible')
  }

  // Get all elements with class='tablinks' and remove the class 'active'
  tablinks = document.getElementsByClassName('tablinks')
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active')
  }

  // Show the current tab, and add an 'active' class to the button that opened the tab
  document.getElementById(tabName).classList.remove('invisible')
  evt.currentTarget.parentNode.classList.add('active')
}