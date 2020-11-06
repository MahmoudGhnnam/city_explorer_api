'use strict';

// load dotenv
require('dotenv').config()

// dotenv variables
const PORT = process.env.PORT || 3000;
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const TRAIL_API_KEY = process.env.TRAIL_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

//  Dependencies
const express = require('express');
const superagent = require('superagent');
const cors = require('cors')
const pg = require('pg');

// App setup 
const client = new pg.Client(DATABASE_URL)
const app = express();
app.use(cors());

// Listen
client.connect().then(() => {
  app.listen(PORT, () => console.log(`Listening on localhost: ${PORT}`));
}).catch(() => console.log(`Database connection failed.`));

// Constructors
function Location(city, locationData) {
  this.search_query = city;
  this.formatted_query = locationData.display_name;
  this.latitude = locationData.lat;
  this.longitude = locationData.lon;
}
function Trail(trailData) {
  this.name = trailData.name;
  this.location = trailData.location;
  this.stars = trailData.stars;
  this.star_votes = trailData.starVotes;
  this.summary = trailData.summary;
  this.trail_url = trailData.url;
  this.conditions = trailData.conditionStatus;
  this.condition_date = trailData.conditionDate.split(' ')[0].toString();
  this.condition_time = trailData.conditionDate.split(' ')[1].toString();
}
function Weather(weatherData) {
  this.forecast = weatherData.weather.description;
  this.time = weatherData.valid_date;
}

// Paths
app.get('/', general);
app.get('/location', locationFunction);
app.get('/trails', trailFunction)
app.get('/weather', weatherFunction);
app.use('*', errorFunction);

// Handlers
function general(request, response) {
  response.status(200).send('Welcome to express! Try ../location or ../weather');
}

function locationFunction(request, response) {
  const condition = 'SELECT * FROM locations WHERE search_query=$1;';
  const safeWords = [request.query.city];
  let location;

  client.query(condition, safeWords).then(result => {
      location = new Location(request.query.city, result.rows[0]);
      response.status(200).json(location);
      console.log('\nfrom Database\n');
  }).catch(() => {
    console.log(GEOCODE_API_KEY);
    const url = `https://eu1.locationiq.com/v1/search.php?key=${GEOCODE_API_KEY}&q=${request.query.city}&format=json`;
    superagent.get(url).then(locationData => {
      console.log('\nfrom API\n');
      location = new Location(request.query.city , locationData.body[0]);
      response.status(200).json(location);
      try {
        const insertNew = 'INSERT INTO locations (search_query , display_name , lat , lon) VALUES($1 , $2 , $3 , $4);'
        const data = [location.search_query , location.formatted_query , location.latitude , location.longitude];
        client.query(insertNew,data);
      } catch (error) {
        console.log('Couldn\'t insert API data in table')
      }
    })
  });
}

function trailFunction(request, response) {
  const url = `https://www.hikingproject.com/data/get-trails?lat=${request.query.latitude}&lon=${request.query.longitude}&key=${TRAIL_API_KEY}`;
  let trails = [];
  superagent.get(url).then(trailData => {
    trails = trailData.body.trails.map((value, index) => {
      if (index < 10) { return (new Trail(value)); }
    });
    response.status(200).json(trails);
  })
  // .catch(console.error);
}

function weatherFunction(request, response) {
  const url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${request.query.latitude}&lon=${request.query.longitude}&city=${request.query.search_query}&key=${WEATHER_API_KEY}`;
  let weather = [];
  superagent.get(url).then(weatherData => {
    weather = weatherData.body.data.map((value) => {
      return (new Weather(value));
    });
    response.status(200).json(weather);
  }).catch(console.error);
}

function errorFunction(request, response) {
  response.status(500).send('Sorry, something went wrong');
  // response.status(404).send('Not found');
}