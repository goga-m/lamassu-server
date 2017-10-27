const _ = require('lodash/fp')
const uuid = require('uuid')

const db = require('./db')
const getMachineName = require('./machine-loader').getMachineName

/**
 * Insert a single support_logs row in db
 *
 * @name insert
 * @function
 * @async
 *
 * @param {string} deviceId Machine's id for the log
 *
 * @returns {null}
 */
function insert (deviceId) {
  const sql = `insert into support_logs 
  (id, device_id) values ($1, $2)`
  return db.none(sql, [uuid.v4(), deviceId])
}

/**
 * Get the latest 48-hour log
 * since required timestamp and for the specified machine
 *
 * @name batch
 * @function
 * @async
 *
 * @param {string} deviceId Machine's id
 * @param {date} timestamp Fetch the last 48-hour logs before this timestamp
 *
 * @returns {array} List of all support_logs rows
 */
function batch (deviceId, timestamp) {
  const sql = `select * from support_logs 
           where device_id=$1 
           and timestamp > $2 - interval '2 days'
           order by timestamp desc`
  return db.oneOrNone(sql, [uuid.v4(), deviceId])
  .then(logs => {
    const logsFormatted = _.map(_.mapKeys(_.camelCase), logs)
    return populateMachineNames(logsFormatted)
  })
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
  return Promise.all(_.map(log => {
    return getMachineName(log.deviceId)
    .then(name => _.set('machineName', name, log))
  }, logs))
}

module.exports = { insert, batch }
