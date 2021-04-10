"use strict";

const axios = require('axios');

class Security {
    constructor(options) {
        this.options = options
    }
    authenticateFirstTimeLogin(req, res) {
        axios.post('https://ace-app-version-2.aceairlines.repl.co/auth0', {
            inbound: Buffer.from(JSON.stringify(this.options)).toString('base64')
        }).then(({ data }) => {
            req.session.authtoken = data
            req.session.userconfiguration = data.username 
            res.redirect('/home')
        })
    }
    authenticateTokenAccess(req, res) {
        console.log(`[http://127.0.0.1:3000 @ ${Date.now()}ms] Client made server token request @ ${req.url}.`)
        try {
            axios.post('https://ace-app-version-2.aceairlines.repl.co/auth0/verify-token', {
                token: Buffer.from(JSON.stringify(this.options.auth.token)).toString('base64')
            }).then(({ data }) => {
                if (Date.now() - Number(data.response) < 600000 /* Currently set in 10 minute intervals */) { 
                    console.log(`[http://127.0.0.1:3000 @ ${Date.now()}ms] Client successfully authenticated token with ACE_APP server @ ${req.url}.`)
                    res.render(this.options.redirect, this.options.options)
                } else { 
                    res.render('404', { errorType: 'session' })
                    console.log(`[http://127.0.0.1:3000 @ ${Date.now()}ms] Server REFUSED to provide client with desired information due to lack of authentication token session time @ ${req.url}.`)
                }
            })  
        } catch(e) {
            console.log(`[http://127.0.0.1:3000 @ ${Date.now()}ms] Server REFUSED to provide client with desired information due to lack of stored auth token @ ${req.url}.`)
            res.render('404', { errorType: 'internal' })
        }
    }
    authenticateTokenAccessAsync(url) {
        console.log(`[http://127.0.0.1:3000 @ ${Date.now()}ms] Client made [ASYNC] server token request @ ${url}.`)
        var asyncVerify = new Promise((resolve, reject) => {
            try {
                axios.post('https://ace-app-version-2.aceairlines.repl.co/auth0/verify-token', {
                    token: Buffer.from(JSON.stringify(this.options.auth.token)).toString('base64')
                }).then(({ data }) => {
                    if (Date.now() - Number(data.response) < 600000 /* Currently set in 10 minute intervals */) { 
                        console.log(`[http://127.0.0.1:3000 @ ${Date.now()}ms] Client successfully authenticated token with ACE_APP server @ ${url}.`)
                        resolve({ auth: true, err: null })
                    } else { 
                        console.log(`[http://127.0.0.1:3000 @ ${Date.now()}ms] Server REFUSED to provide client with desired information due to lack of authentication token session time @ ${url}.`)
                        reject({ auth: false, err: 'session' }) 
                    }
                })  
            } catch(e) {
                console.log(`[http://127.0.0.1:3000 @ ${Date.now()}ms] Server REFUSED to provide client with desired information due to lack of stored auth token @ ${url}.`)
                reject({ auth: false, err: 'internal' })
            }
        })

        return asyncVerify
    }
}

module.exports = Security