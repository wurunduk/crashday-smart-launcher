const thisVersion = "v1.5.0"

$.getJSON('https://api.github.com/repos/wurunduk/crashday-smart-launcher/tags').done(function(json) {
  var release = json[0]
  if (release['name'] != thisVersion) {
    $('#update-link').attr('href', 'https://github.com/wurunduk/crashday-smart-launcher/releases/latest')
    $('#update-link').show()
    $.toast({title: 'New version found',
             content: 'Hey! New version ' + release['name'] + ' was released!',
             type: 'info', delay: 5000, container: $('#toaster')})
  }
})