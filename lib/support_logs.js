const _ = require('lodash/fp')
const uuid = require('uuid')

const db = require('./db')

/**
 * Insert a single support_logs row in db
 *
 * @name insert
 * @function
 * @async
 *
 * @param {string} deviceId Machine's id for the log
 *
 * @returns {object} Newly created support_log
 */
function insert (deviceId) {
  const sql = `insert into support_logs 
  (id, device_id) values ($1, $2) returning *`
  return db.one(sql, [uuid.v4(), deviceId])
  .then(_.mapKeys(_.camelCase))
}

/**
 * Get the latest 48-hour logs snapshots
 *
 * @name batch
 * @function
 * @async
 *
 * @returns {array} List of all support_logs rows
 */
function batch () {
  const sql = `select s.device_id, s.timestamp, devices.name from support_logs as s
           inner join devices on s.device_id = devices.device_id
           where timestamp > (now() - interval '2 days')
           order by s.timestamp desc`
  return db.any(sql)
  .then(_.map(_.mapKeys(_.camelCase)))
}

module.exports = { insert, batch }
