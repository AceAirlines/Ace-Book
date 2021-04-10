"use strict";

const axios = require('axios');
const fs = require('fs')
const path = require('path')
var session = JSON.parse(fs.readFileSync(path.join(__dirname, '/session.json')))

class Security {
    constructor(options) {
        this.options = options
        this.sessionComponent = {
            key: null,
            set: (objectKey) => {
                for (var x = 0; x < session.length; x++) {
                    if (session[x]['session-id'] === this.sessionComponent.key) {
                        session[x]['session-components'][Object.keys(objectKey)[0]] = objectKey[Object.keys(objectKey)[0]]
                    } else { }
                }
                fs.writeFileSync(path.join(__dirname, '/session.json'), JSON.stringify(session))
            },
            get: (objectKey) => {
                var sessObj = session.find((sess) => sess['session-id'] === this.sessionComponent.key)
                return sessObj['session-components'][objectKey]
            }
        }
    }
    verifyUnactiveSession() {  
        session = JSON.parse(fs.readFileSync(path.join(__dirname, '/session.json')))
        var keyAmount = 0
        for (var x = 0; x < session.length; x++) {
            if (session[x]['session-created'] + 6000 < Date.now()) {
                session.splice(x, 1)
                keyAmount++
            }
        }
        if (keyAmount !== 0) { console.log(`[ Server Status Alert ] (${keyAmount}) different session keys were deleted due to session age expiration.`) }
        fs.writeFileSync(path.join(__dirname, '/session.json'), JSON.stringify(session))
    }
    authenticateFirstTimeLogin(sessionID) {
        this.verifyUnactiveSession()
        return new Promise((resolve, reject) => {
            axios.post('https://ace-app-version-2.aceairlines.repl.co/auth0', { usrInfo: Buffer.from(JSON.stringify(this.options)).toString('base64') })
                .then((res) => {
                    if (!session.find((session) => session['session-id'] === sessionID)) {
                        session.push({
                            "session-created": Date.now(),
                            "session-id": sessionID,
                            "session-user": res.data.username,
                            "authentication-method": res.request._redirectable._options.path === '/auth0' ? "authorized/application" : "unknown/application",
                            "session-components": {
                                "userconfiguration": res.data.username
                            }
                        })
                        fs.writeFileSync(path.join(__dirname, '/session.json'), JSON.stringify(session))
                        resolve()
                    } else { resolve() }
                }).catch((e) => {
                    reject()
                })
        })
    }
    verifyUserTokenAsync(sessionID) {
        this.verifyUnactiveSession()
        return new Promise((resolve, reject) => {
            if (session.find(((instance) => instance['session-id'] === sessionID))) {
                this.sessionComponent.key = sessionID
                resolve(this.sessionComponent)
            } else { reject() }
        })
    }
}

module.exports = Security