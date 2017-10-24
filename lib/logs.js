const _ = require('lodash/fp')

const db = require('./db')
const settingsLoader = require('./settings-loader')
const configManager = require('./config-manager')

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
  const sql = `select id, log_level, timestamp, message from logs
  where device_id=$1
  order by timestamp desc limit $2`
  return Promise.all([db.any(sql, [ deviceId, NUM_RESULTS ]), getMachineName(deviceId)])
  .then(([logs, machineName]) => ({
    logs: _.map(_.mapKeys(_.camelCase), logs),
    currentMachine: {deviceId, name: machineName}
  }))
}

/**
 * Given the machine id, get the machine name
 *
 * @name getMachineName
 * @function
 * @async
 *
 * @param {string} machineId machine id
 *
 * @returns {string} machine name
 */
function getMachineName (machineId) {
  return settingsLoader.loadRecentConfig()
  .then(config => {
    const machineScoped = configManager.machineScoped(machineId, config)
    return machineScoped.machineName
  })
}

module.exports = { getMachineLogs, update, getLastSeen }
