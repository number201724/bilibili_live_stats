global.DB_CONN_STR = 'mongodb://localhost:27017/BMB';

global.MS = {
    Sec: 1000,
    Min: 1000 * 60,
    Hour: 1000 * 60 * 60,
    Day: 1000 * 60 * 60 * 24,
    Week: 1000 * 60 * 60 * 24 * 7
};

global.CloudType = {
    NL4: 1004,
    NL5: 1005,
    NL6: 1006,
    L4: 3004,
    L5: 3005,
    L6: 3006,
    N4: 4004,
    N5: 4005,
    C2: 2002,
    C4: 2004
};

global.EmptyFun = () => {};


/* libs */

global.request = require('request');
global.rp = require('request-promise');
global.NodeRSA = require('node-rsa');

global.DB = require("./DB");
global.Util = require("./Util");