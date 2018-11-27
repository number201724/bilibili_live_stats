const MemoryStream = require('memorystream');
const exec = require('child_process').exec;
const Duplex = require('stream').Duplex;

// primitive class equal

exports.isNull = arg => arg === null;
exports.isUndefined = arg => arg === undefined;
exports.isNullOrUndefined = arg => exports.isNull(arg) || exports.isUndefined(arg);
exports.isObject = arg => typeof arg === 'object' && !exports.isNull(arg);
exports.isBoolean = arg => typeof arg === 'boolean';
exports.isNumber = arg => typeof arg === 'number';
exports.isString = arg => typeof arg === 'string';
exports.isFunction = arg => typeof arg === 'function';

// random

exports.randomBool = () => Math.random() > 0.5;
exports.randomNumber = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

exports.randomLetter = function (lowerCase) {
    if(!exports.isBoolean(lowerCase)) lowerCase = exports.randomBool();
    return String.fromCharCode((lowerCase ? 97 : 65) + Math.floor(Math.random() * 26));
};

exports.randomString = function (length, lowerCase) {
    let string = "";
    for(let i = 0; i < length; i++)
        string += exports.randomBool() ? exports.randomLetter(lowerCase) : exports.randomNumber(0, 9);
    return string;
};

// primitive class extend function

Object.defineProperties(Date.prototype, {
    format: {
        value: function (fmt) {
            let o = {
                "M+": this.getMonth() + 1,
                "d+": this.getDate(),
                "h+": this.getHours(),
                "m+": this.getMinutes(),
                "s+": this.getSeconds(),
                "q+": Math.floor((this.getMonth() + 3) / 3),
                "S": this.getMilliseconds()
            };
            if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
            for (let k in o)
                if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            return fmt;
        }
    }
});

Object.defineProperties(String.prototype, {
    toJSON: {
        value: function () {
            try{ return JSON.parse(this) }
            catch(e){ return null }
        }
    }
});

Object.defineProperties(Array.prototype, {
    random: {
        value: function () {
            return this[exports.randomNumber(0, this.length - 1)];
        }
    },
    remove: {
        value: function (target, multi) {
            for (let i = this.length - 1; i >= 0; i--) {
                if (this[i] === target) {
                    this.splice(i, 1);
                    if (!multi) break;
                }
            }
        }
    }
});

// other

exports.sleep = (time) => new Promise((resolve, reject) => setTimeout(resolve, time));

exports.waitDelete = function (obj, key, interval) {
    return new Promise(async (resolve, reject) => {
        while(obj.hasOwnProperty(key))
            await exports.sleep(interval || 100);
        resolve();
    });
};

let lockFlags = {};
exports.lock = async function (key) {
    return new Promise(async (resolve, reject) => {
        if (lockFlags.hasOwnProperty(key)) {
            lockFlags[key].push(resolve);
        } else {
            lockFlags[key] = [];
            resolve(true); // is self lock
        }
    });
};

exports.unlock = async function (key) {
    if (lockFlags.hasOwnProperty(key)) {
        if (lockFlags[key].length > 0) {
            await lockFlags[key].shift()(false);
        } else {
            delete lockFlags[key];
        }
    }
};

exports.asyncCall = function (obj, fn, ...args) {
    return new Promise(async (resolve, reject) => {
        try {
            args.push(function (err, ...ret) {
                if(err) return reject(err);
                resolve(ret);
            });
            fn.apply(obj, args);
        } catch (err) {
            reject(err);
        }
    });
};

exports.asyncRequest = function () {
    return exports.asyncCall(this, request, ...arguments);
};

exports.asyncRequestFile = function (options) {
    return new Promise((resolve, reject) => {
        let stream = new MemoryStream();
        let buffer = Buffer.alloc(0);

        stream.on('data', chunk => {
            buffer = Buffer.concat([buffer, chunk], buffer.length + chunk.length);
        });

        request(options, function(err, res, body) {
            if(err) return reject(err);
            resolve(buffer);
        }).pipe(stream);
    });
};

exports.serializeSetCookie = function(setCookieArr) {
    if (!Array.isArray(setCookieArr))
        return {};

    let ret = {};
    setCookieArr.forEach(setCookie => {
        let matchRes = setCookie.match(/(.*?)=(.*?);/);
        if (matchRes && matchRes.length > 2)
            ret[matchRes[1]] = matchRes[2];
    });
    return ret;
};

exports.serializeCookie = function(cookie) {
    let ret = {};
    let split = cookie.split(";");
    for (let i = 0; i < split.length; i++) {
        let arr = split[i].split("=");
        if (arr.length === 2)
            ret[arr[0].trim()] = arr[1].trim();
    }
    return ret;
};

exports.cookieObjToStr = function(cookies) {
    let ret = '';
    for (let name in cookies) {
        if (cookies.hasOwnProperty(name))
            ret += `${name}=${cookies[name]}; `;
    }
    return ret.trim();
};

exports.openUrl = function (url) {
    exec('"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" ' + url)
};

exports.bufferToStream = function (buffer) {
    let stream = new Duplex();
    stream.push(buffer);
    stream.push(null);
    return stream;
};