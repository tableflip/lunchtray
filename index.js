var path = require('path')
var menubar = require('menubar')
var DDPClient = require('ddp')
var EJSON = require('ddp-ejson')
var moment = require('moment')

var mb = menubar({
  icon: path.join(__dirname, 'noun_184605.png'),
  height: 50
})

mb.on('ready', () => {
  console.log('Did you dry these in a rain forest?')

  mb.tray.setPressedImage(path.join(__dirname, 'noun_184605_pressed.png'))

  mb.on('after-create-window', () => {
    mb.window.webContents.on('did-finish-load', send)
  })

  mb.on('show', () => {
    getDdpClient()
    send()
  })

  getDdpClient()
})

var getDdpClient = (() => {
  var ddpClient
  var heartbeatTimeout

  return () => {
    if (ddpClient) return ddpClient

    ddpClient = new DDPClient({url: 'wss://makelunch.meteor.com/websocket', useSockJs: false})

    // Close the connection if heartbeat not recieved
    ddpClient.on('message', data => {
      data = EJSON.parse(data)
      if (data.msg !== 'ping') return

      clearTimeout(heartbeatTimeout)

      heartbeatTimeout = setTimeout(() => {
        console.log('DDP heatbeat timeout')
        if (!ddpClient) return
        ddpClient.close()
        ddpClient = null
      }, 60000)
    })

    ddpClient.on('socket-error', err => {
      console.error('DDP socket error', err)
      clearTimeout(heartbeatTimeout)
      if (!ddpClient) return
      ddpClient.close()
      ddpClient = null
    })

    ddpClient.connect(onConnect)

    return ddpClient
  }

  function onConnect (err, wasReconnect) {
    if (err) {
      console.error('DDP connection error', err)
      clearTimeout(heartbeatTimeout)
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
})()

function send () {
  if (!mb.window) return
  var eaters = transform(getDdpClient().collections.Eaters || [])
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
