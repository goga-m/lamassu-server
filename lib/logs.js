const _ = require('lodash/fp')

const db = require('./db')
const machineLoader = require('./machine-loader')

const NUM_RESULTS = 1000

function getLastSeen (deviceId) {
  const sql = `select timestamp from logs 
  where device_id=$1
  order by timestamp desc limit 1`
  return db.oneOrNone(sql, [deviceId])
  .then(log => log ? log.timestamp : null)
}

function insert (log) {
  console.log('inserting', log)
  const sql = `insert into logs 
  (id, device_id, log_level, timestamp, message) values 
  ($1, $2, $3, $4, $5) on conflict do nothing`
  return db.oneOrNone(sql, [log.id, log.deviceId, log.logLevel, log.timestamp, log.message])
}

function update (deviceId, logLines) {
  // Prepare logs to update
  const logs = _.map(log => {
    return {
      id: log.id,
      deviceId: deviceId,
      message: log.msg,
      logLevel: log.level,
      timestamp: log.timestamp
    }
  }, logLines)
  // Batch save logs
  return Promise.all(_.map(insert, _.compact(logs)))
}

/**
 * Get all logs by machine id
 *
 * @name list
 * @function
 *
 * @param {string} deviceId Machine id to fetch the logs for
 *
 * @returns {array} Array of logs for the requested machinej
 */
function getMachineLogs (deviceId) {
  const sql = `select * from logs 
  where device_id=$1
  order by timestamp desc limit $2`
  return db.any(sql, [ deviceId, NUM_RESULTS ])
  .then(_.map(camelize))
  .then(populateMachineNames)
}

/**
 * Populate logs with machine names
 *
 * @name populateMachineNames
 * @function
 * @async
 *
 * @param {array} logs Array of logs
 *
 * @returns {array} Array of logs populated with machine names
 */
function populateMachineNames (logs) {
  return machineLoader.getMachineNames().then(names => {
    return _.map(log => {
      const machine = _.find({deviceId: log.deviceId}, names) || {}
      return _.assign(log, {name: machine.name})
    }, logs)
  })
}

/**
 * Camelize log fields
 * Note: return null if log is undefined
 *
 * @name camelize
 * @function
 *
 * @param {object} log Log with snake_case fields
 * @returns {object} Camelized Log object
 */
function camelize (log) {
  return log ? _.mapKeys(_.camelCase, log) : null
}

module.exports = { getMachineLogs, update, getLastSeen }
