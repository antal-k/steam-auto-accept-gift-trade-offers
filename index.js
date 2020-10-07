const prompt = require('prompt'),
    fs = require('fs'),
    SteamCommunity = require('steamcommunity'),
    TradeOfferManager = require('steam-tradeoffer-manager'),
    SteamTotp = require('steam-totp'),
    steam = new SteamCommunity(),
    util = require('util'),
    globalConfig = require('./config.json'),
    request = require('request'),
    dateFormat = require('date-format'),
    Push = require('pushover-notifications');


let manager = new TradeOfferManager({
    "domain": 'localhost',
    "language": "en",
    "pollInterval": 30000,
});

manager.on('newOffer', function (offer) {
    if (offer.itemsToGive.length > 0) {
        //
    } else {
        const itemNames = [];
        for (var key in offer.itemsToReceive) {
            itemNames.push(offer.itemsToReceive[key].market_hash_name);
        }
        offer.accept(function (err) {
            if (!err) {
                console.log(`#${offer.id} accepted. | ${itemNames.join(', ')}`, true);
            }
        });
    }
});

getConfig().then(config => {
    steamLogin(config).then(success => {
        console.log(`Logged into steam.`);
        console.log(`Started to track for incoming offers.`);
    }).catch(err => {
        console.log(`Steam login failed: ${err.message}`);
    });
}).catch(err => {
    console.log('Input failed.');
});

function getConfig() {
    return new Promise((resolve, reject) => {
        const properties = [];
        if (globalConfig.steamUsername === '') {
            properties.push({
                name: 'username',
                warning: 'Username must be only letters, spaces, or dashes'
            });
        }
        if (globalConfig.steamPassword === '') {
            properties.push({
                name: 'password',
                hidden: true
            });
        }
        if (globalConfig.steamSharedSecret === '') {
            properties.push({
                name: 'twofactor',
                hidden: true
            });
        }
        prompt.start();

        prompt.get(properties, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    })
}
function steamLogin(config) {
    return new Promise((resolve, reject) => {
        const logOnOptions = {
            "accountName": globalConfig.steamUsername ? globalConfig.steamUsername : config.username,
            "password": globalConfig.steamPassword ? globalConfig.steamPassword : config.password,
            "twoFactorCode": globalConfig.steamSharedSecret ? SteamTotp.getAuthCode(globalConfig.steamSharedSecret) : config.twofactor
        };
        if (fs.existsSync('steamguard.txt')) {
            logOnOptions.steamguard = fs.readFileSync('steamguard.txt').toString('utf8');
        }

        if (fs.existsSync('polldata.json')) {
            manager.pollData = JSON.parse(fs.readFileSync('polldata.json'));
        }

        steam.login(logOnOptions, function (err, sessionID, cookies, steamguard) {
            if (err) {
                return reject(err);
            }
            fs.writeFile('steamguard.txt', steamguard, (err) => {
                if (err) throw err;
            });
            manager.setCookies(cookies, function (err) {
                if (err) {
                    return reject(err);
                }
                resolve(true);
            });
        });
    });
}

steam.on('sessionExpired', function (err) {
    console.log('Session expired.', true);
});

let pushoverClient = undefined;
if (globalConfig.pushoverUser) {
    pushoverClient = new Push({
        user: globalConfig.pushoverUser,
        token: globalConfig.pushoverToken,
    });
    pushoverClient.send({
        message: 'Bot Initialized',
        title: '[STEAM] Auto-accept',
    }, (err, result) => {
        if (err) {
            throw err;
        }
    });
}

const colors = {
    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",
};
const log = console.log;

console.log = function (d, dc = false, color = '\x1b[0m') {
    log(color + "[" + dateFormat(new Date(), "yyyy-mm-dd H:MM:ss") + "] " + util.format(d));
    if (dc) {
        sendMessage(d);
    }
};

function sendMessage(msg) {
    if (globalConfig.discordHook) {
        request({
            url: globalConfig.discordHook,
            method: 'POST',
            json: true,
            body: {
                content: msg,
            },
        }, (error, response, b) => {
            //
        });
    }
    if (globalConfig.pushoverUser) {
        pushoverClient.send({
            message: msg,
            title: '[STEAM] Auto-accept',
        }, (err, result) => {
            if (err) {
                throw err;
            }
        });
    }
}