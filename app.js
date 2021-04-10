const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const Security = require(path.join(__dirname, '/lib/security/security.js'))
const cookieParser = require('cookie-parser')
const fs = require('fs')
const axios = require('axios')
const app = express()

app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, "/public/static")))
app.set('view engine', 'ejs')
app.set('views', 'public/views')

/* Render static routing */
app.get('/', (req, res) => { res.render('login') })
app.get('/home', async (req, res) => { 
	new Security().verifyUserTokenAsync(req.sessionID).then(() => {
		res.render('book')
	}).catch((e) => { console.log(e); res.render('404', { errorType: 'internal' }) })
})
app.get('/checkin', async (req, res) => { 
	new Security().verifyUserTokenAsync(req.sessionID).then(() => {
		res.render('checkin')
	}).catch((e) => { console.log(e); res.render('404', { errorType: 'internal' }) })
})
app.get('/myflights', async (req, res) => {
	new Security().verifyUserTokenAsync(req.sessionID).then(() => {
		res.render('myflights')
	}).catch((e) => { console.log(e); res.render('404', { errorType: 'internal' }) })
})

/* Authenticate with auth0 through app request */
app.post('/auth0', (req, res) => { 
	new Security(req.body).authenticateFirstTimeLogin(req.sessionID).then(() => {
		res.redirect('/home')
	}).catch((e) => {
		res.render('404', { errorType: 'internal' })
	})
})

/* Configure book from GET /book route */
app.post('/book', (req, res) => {
	new Security().verifyUserTokenAsync(req.sessionID).then((sessionComponent) => {
		var tripType = req.body['trip-type'] === 'oneway' ? 'ONE WAY' : 'ROUND TRIP'
		axios.post('https://ace-app-version-2.aceairlines.repl.co/destinations')
			.then(({ data }) => {
				/* Search to create session packet */
				var filteredDepartures = []
				data.forEach((departure) => {
					if (req.body.depart.toUpperCase() === departure.icao.toUpperCase() || req.body.depart.toUpperCase() === departure.state.toUpperCase() || req.body.depart.toUpperCase() === departure.city.toUpperCase()) {
						filteredDepartures.push(departure)
					} else { }
				})
				/* Searching arrival input */
				var filteredArrivals = []
				var depatureInstance = 0
				if (filteredDepartures.length != 0) {
					filteredDepartures[0].departures.forEach((arrival) => {
						if (req.body.arrive.toUpperCase() === arrival.arrival.icao.toUpperCase() || req.body.arrive.toUpperCase() === arrival.arrival.state.toUpperCase() || req.body.arrive.toUpperCase() === arrival.arrival.city.toUpperCase()) {
							filteredArrivals.push({
								departure: filteredDepartures[0],
								arrivalIndex: depatureInstance
							})
						} else { }
						depatureInstance++
					})
				} else { }
				req.body['trip-type'] = tripType
				sessionComponent.set({ routetemp: { suggested: filteredArrivals, inputted: req.body }})
				res.redirect('https://flyaceairline.weebly.com/complete-flight')
			})
	}).catch((e) => { console.log(e); res.render('404', { errorType: 'internal' }) })
})

/* Compare your flight options */
app.get('/compare', (req, res) => { 
	new Security().verifyUserTokenAsync(req.sessionID).then((sessionComponent) => {
		res.render('compareFlight', sessionComponent.get('routetemp'))
	}).catch((e) => { console.log(e); res.render('404', { errorType: 'internal' }) })
})

/* Configure final POST route to push destination */
app.post('/request', (req, res) => {
	new Security().verifyUserTokenAsync(req.sessionID).then((sessionComponent) => {
		axios.post('https://ace-app-version-2.aceairlines.repl.co/savebook', { 
			data: {
				digest: JSON.parse(Object.keys(req.body)[0]),
				username: sessionComponent.get('userconfiguration')
			}
		})
			.then(({ data }) => {
				if (data.post === 'successful') {
					res.send({ post: 'successful' })
				} else {
					res.render('404', { errorType: 'internal'})
				}
			}).catch(() => {
				res.render('404', { errorType: 'internal'})
			})
	}).catch((e) => { console.log(e); res.render('404', { errorType: 'internal' }) })
})

/* Basic port listener */
app.listen(3000, () => {
	console.log('Listening::3000')
})