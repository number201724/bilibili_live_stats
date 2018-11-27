const fs = require('fs');
const log4js = require('log4js');

if(!fs.existsSync('./logs'))
    fs.mkdir('./logs');

log4js.configure({
    appenders: {
        console: { type: 'console' },
        log: { type: 'file', filename: 'logs/log.txt', maxLogSize: 1024 * 1024, backups: 99 }
    },
    categories: { default: { appenders: ['console', 'log'], level: 'info' } }
});

let logger = log4js.getLogger("Log");

module.exports = logger;