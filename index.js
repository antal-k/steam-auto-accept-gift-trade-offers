const prompt = require('prompt'),
    fs = require('fs'),
    SteamCommunity = require('steamcommunity'),
    TradeOfferManager = require('steam-tradeoffer-manager'),
    steam = new SteamCommunity();


let manager = new TradeOfferManager({
    "domain": 'localhost',
    "language": "en",
    "pollInterval": 30000,
});

manager.on('newOffer', function (offer) {
    if (offer.itemsToGive.length > 0) {
        //
    } else {
        offer.accept(function (err) {
            if (!err) {
                console.log(`#${offer.id} accepted.`);
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
        const properties = [
            {
                name: 'username',
                warning: 'Username must be only letters, spaces, or dashes'
            },
            {
                name: 'password',
                hidden: true
            },
            {
                name: 'twofactor',
                hidden: true
            }
        ];

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
            "accountName": config.username,
            "password": config.password,
            "twoFactorCode": config.twofactor
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