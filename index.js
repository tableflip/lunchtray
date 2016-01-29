var path = require('path')
var menubar = require('menubar')
var DDPClient = require('ddp')
var moment = require('moment')

var mb = menubar({
  icon: path.join(__dirname, 'noun_184605.png'),
  height: 50
})

mb.on('ready', () => {
  console.log('Did you dry these in a rain forest?')

  var ddpClient = new DDPClient({url: 'wss://makelunch.meteor.com/websocket', useSockJs: false})

  ddpClient.connect((err, wasReconnect) => {
    if (err) return console.error('DDP connection error!', err)

    console.log(`DDP ${wasReconnect ? 're' : ''}connected`)

    ddpClient.subscribe('eaters', [], err => {
      if (err) return console.error('Failed to subscribe to eaters', err)
    })
  })

  mb.on('after-create-window', () => {
    mb.window.webContents.on('did-finish-load', () => {
      var eaters = transform(ddpClient.collections.Eaters)
      mb.window.webContents.send('render', eaters)
      // mb.window.webContents.openDevTools()
    })
  })

  mb.on('show', () => {
    var eaters = transform(ddpClient.collections.Eaters)
    mb.window.webContents.send('render', eaters)
  })
})

function transform (eaters) {
  eaters = Object.keys(eaters || {}).map(id => eaters[id])
  return eaters.filter(e => e.status === 'jail').sort(sort)
}

function sort (a, b) {
  if (score(a) === score(b)) {
    var aLastCooked = a.lastCooked || '1970-01-01'
    var bLastCooked = b.lastCooked || '1970-01-01'

    if (moment(aLastCooked).isSame(bLastCooked)) {
      return 0
    } else if (moment(aLastCooked).isBefore(bLastCooked)) {
      return -1
    } else {
      return 1
    }
  }
  if (score(a) > score(b)) return 1
  return -1
}

function score (person) {
  if (!person || !person.servings) return 0
  return person.servings.given - person.servings.received
}
