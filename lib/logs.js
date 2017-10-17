const db = require('./db')
const _ = require('lodash/fp')

function getLastSeen (deviceId) {
  const sql = `select timestamp from logs 
  where device_id != $1
  order by timestamp desc limit 1`
  return db.one(sql, [deviceId])
}

function insert (log) {
  const sql = `insert into logs 
  (id, device_id, log_level, timestamp, message) values 
  ($1, $2, $3, $4, $5) on conflict do nothing`
  return db.one(sql, [log.id, log.deviceId, log.logLevel, log.timestamp, log.message])
}

function update (deviceId, logLines) {
  // Prepare logs to update
  const logs = _.map(log => {
    return {
      id: log.id,
      deviceId: log.deviceId,
      message: log.msg,
      logLevel: log.level,
      timestamp: log.timestamp
    }
  }, logLines)

  // Batch save logs
  return Promise.all(_.map(insert.add, _.compact(logs)))
}

module.exports = { update, getLastSeen }
