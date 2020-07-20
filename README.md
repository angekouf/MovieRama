# MovieRama

 A movie catalog where users can check the movies of the week, search for movies and view details about them.

## Intro

This is a frontend only project but for resolving any CORS problems and for making sure our API key is not exposed in th JS code for the world to see, there is a simple express server file to serve the resources to the browser as well as forward all our requests to /api/* to the Movie DB API v3 and returning to the browser the response.

Also the server is setup so that it can serve not only all the resources from the dist folder but also all the javascript files from the src folder. That is setup so that you can either import the bundled js as it is now setup or the original files.


#### To use ES6+ Javascript (with some experimental features as well)
Currently the project loads the bundled and minified files to the browser.

In order to use the unbundled ES6+ files go to the `index.html` in the root folder, 
uncomment line 235:  

<code html>&lt;script src="/js/app.js" type="module">&lt;/script></code>

 and comment line 236:

 <code html>&lt;script src="/js/bundle.js">&lt;/script></code>
 
  Chrome works the same both ways (The experimental features all work as far as I can see).


## Setup

In order to setup the project you first need to make sure you have npm installed.

Open a terminal and go to the project folder.

First let us install the dependencies by using 

<code ssh> npm install</code> 

Then build the project files by typing

<code ssh> npm run build </code> 

and then let us start the server by typing 

<code ssh> npm start </code> 

If you have not changed the port in the ENV file our app will be accessible through <a href="http://localhost:3000">http://localhost:3000</a>.






