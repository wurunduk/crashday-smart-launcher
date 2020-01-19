$(window).scroll(function() {
  if ($(this).scrollTop() > 200) {
    $('.go-top').fadeIn(200)
  } else {
    $('.go-top').fadeOut(200)
  }
})

$('.go-top').on('click', function(e) {
  e.preventDefault()
  $('html,body').animate({
    scrollTop: 0
  }, 300)
})