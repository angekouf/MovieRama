require('dotenv').config(); // Load environment variables from a .env file

const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Set dist folder as root for our web app
app.use(express.static('dist'));

// Serve also the original js files (before transpiling) so we can load those instead of the bundled and transpiled file
app.use('/js', express.static('src/js'));

// Allow access to node_modules folder from the front-end 
app.use('/scripts', express.static(`${__dirname}/node_modules/`));

// Axios Client declaration
const api = axios.create({
  baseURL: process.env.API_URL,
  timeout: Number.parseInt(process.env.TIMEOUT || 5000),
});

// Forward all our api requests to the movieDB Api and return the response
app.use('/api', async (req, res) => {
  // Add our API key to our query parameters
  const params = {
    api_key: process.env.API_KEY,
    ...req.query
  };

  console.log(req.path + '?' + Object.keys(params)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&'));
    
  res.setHeader('Content-Type', 'application/json');
  try {
    // Get the API response data from the MovieDB server to forward to the MovieRama App.
    const { status, data } = await api(req.path, {
      method: req.method,
      params: params
    });
    res.status(status);
    res.json(data);
  } catch (error) {
    res.status(error.response.status);
    return res.json(error.response.data);
  }
})

// Redirect all traffic to index.html
app.use((req, res) => res.sendFile(`${__dirname}/dist/index.html`));

// Listen for HTTP requests on port 3000
app.listen(port, () => {
  console.log('listening on %d', port);
});
