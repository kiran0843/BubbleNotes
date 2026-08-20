// Lightweight persistent store, replacing electron-store dependency
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

class Store {
  constructor() {
    this.path = path.join(app.getPath('userData'), 'config.json')
    this.data = this._load()
  }

  _load() {
    try {
      if (fs.existsSync(this.path)) {
        return JSON.parse(fs.readFileSync(this.path, 'utf8'))
      }
    } catch (e) {}
    return {}
  }

  get(key) {
    return this.data[key]
  }

  set(key, value) {
    this.data[key] = value
    fs.writeFileSync(this.path, JSON.stringify(this.data), 'utf8')
  }
}

module.exports = Store
