var fs = require('fs')
var path = require('path')
var electron = require('electron')
var md5 = require('md5')

var Handlebars = require('handlebars')
var eatersTpl = Handlebars.compile(fs.readFileSync(path.join(__dirname, 'eaters.hbs'), 'utf8'))

Handlebars.registerHelper('avatar', eater => {
  if (eater.uploadcare) return `http://www.ucarecdn.com/${eater.uploadcare}/-/scale_crop/100x100/center`
  return `http://www.gravatar.com/avatar/${md5(eater.name)}?s=100&d=retro`
})

Handlebars.registerHelper('plus1', n => n + 1)

electron.ipcRenderer.on('render', (event, eaters) => {
  console.log(`Rendering ${eaters.length} eaters`)
  render(eaters)
})

function render (eaters) {
  eaters = eaters || []
  document.body.innerHTML = eatersTpl({eaters})

  addEventListener(document.querySelectorAll('a'), 'click', e => {
    e.preventDefault()
    var url = e.currentTarget.getAttribute('href')
    electron.shell.openExternal(url)
  })
}

function addEventListener (nodeList, event, handler) {
  for (var i = 0; i < nodeList.length; i++) {
    nodeList[i].addEventListener(event, handler)
  }
}

render()
