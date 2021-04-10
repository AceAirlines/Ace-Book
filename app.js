const express = require('express')
const bodyParser = require('body-parser')
const Security = require(__dirname, '/lib/security/security.js')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const axios = require('axios')
const app = express()

app.use(session({
	secret: 'Ac3@iR1lin3$',
	saveUninitialized: true,
	resave: true,
	maxAge: null
}))

app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static(__dirname, "/public/static"))
app.set('view engine', 'ejs')
app.set('views', 'public/views')

/* Render static routing */
app.get('/', (req, res) => { res.render('login') })
app.get('/home', async (req, res) => { new Security({ auth: req.session.authtoken, redirect: 'book', options: {} }).authenticateTokenAccess(req, res) })
app.get('/checkin', async (req, res) => { new Security({ auth: req.session.authtoken, redirect: 'checkin', options: {} }).authenticateTokenAccess(req, res) })
app.get('/myflights', async (req, res) => { new Security({ auth: req.session.authtoken, redirect: 'myflights', options: {} }).authenticateTokenAccess(req, res) })

/* Render flight template */
/*app.get('/flightstatus', async (req, res) => { 
	new Security({ 
		auth: req.session.authtoken, 
	}).authenticateTokenAccessAsync(req.url).then((response) => {
		axios.post('https://ace-app-version-2.aceairlines.repl.co/returnFlights', {
			username: req.session.userconfiguration
		})
			.then(({ data }) => {
				console.log(data)
			})
	}).catch(({ err }) => {
		res.render('404', { errorType: err })
	})
})*/

/* Authenticate with auth0 through app request */
app.post('/auth0', (req, res) => { new Security(req.body).authenticateFirstTimeLogin(req, res) })

/* Configure book from GET /book route */
app.post('/book', (req, res) => {
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
			req.session.routetemp = { suggested: filteredArrivals, inputted: req.body }
			res.redirect('/compare')

		})
})

/* Compare your flight options */
app.get('/compare', (req, res) => { 
	new Security({ 
		auth: req.session.authtoken, 
		redirect: 'compareFlight', 
		options: req.session.routetemp 
	}).authenticateTokenAccess(req, res) 
})

/* Configure final POST route to push destination */
app.post('/request', (req, res) => {
	new Security({ 
		auth: req.session.authtoken
	}).authenticateTokenAccessAsync(req.url).then((response) => {
		axios.post('https://ace-app-version-2.aceairlines.repl.co/savebook', { 
			data: {
				digest: JSON.parse(Object.keys(req.body)[0]),
				username: req.session.userconfiguration
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
	}).catch((err) => {
		console.log(err)
		res.render('404', { errorType: err.err})
	})
})

/* Basic port listener */
app.listen(3000, () => {
	console.log('Listening.\n\nSERVER REQUESTS on 127.0.0.1::')
})