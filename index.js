var path = require('path')
var menubar = require('menubar')
var DDPClient = require('ddp')
var moment = require('moment')

var mb = menubar({
  icon: path.join(__dirname, 'noun_184605.png'),
  height: 50
})

var ddpClient

mb.on('ready', () => {
  console.log('Did you dry these in a rain forest?')

  mb.on('after-create-window', () => {
    mb.window.webContents.on('did-finish-load', send)
  })

  mb.on('show', () => {
    if (!ddpClient) {
      ddpClient = new DDPClient({url: 'wss://makelunch.meteor.com/websocket', useSockJs: false})
      return ddpClient.connect(onConnect)
    }

    send()
  })
})

function onConnect (err, wasReconnect) {
  if (err) {
    console.error('DDP connection error!', err)
    ddpClient.close()
    ddpClient = null
    return
  }

  console.log(`DDP ${wasReconnect ? 're' : ''}connected`)

  ddpClient.subscribe('eaters', [], err => {
    if (err) return console.error('Failed to subscribe to eaters', err)
    send()
  })
}

function send () {
  if (!ddpClient || !mb.window) return
  var eaters = transform(ddpClient.collections.Eaters)
  mb.window.webContents.send('render', eaters)
}

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
