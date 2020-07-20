import Helpers from '../helpers.js'
import Config from './ApiConfig.js'

export default class Genre {
    static #privateKey = Symbol();
    #id;
    #name;

    static #genres;

    constructor(data, privateKey) {
        if (privateKey !== Genre.#privateKey) {
            throw new Error('The constructor is private, please use Genre.getGenre static function.');
        } else if (!data.id) {
            throw new Error('The Genre id is required. An empty id was found.');
        } else if (!data.name) {
            throw new Error('The Genre name is required. An empty name was found.');
        }

        this.#id = data.id;
        this.#name = data.name;
    }

    static async getGenreMap() {
        // Check if a request is already on the way to avoid multiple requests of the same data.
        if (Genre.#genres) {
            return await Genre.#genres;
        }

        if (Config.useCache) {
            // Get the genres from the locale storage
            let cached = JSON.parse(localStorage.getItem('genres'));

            // If the data was locally stored and they had not expired return them. 
            if (cached && localStorage.getItem('genresExpiry') > Date.now()) {
                try {
                    // Convert cached data to an array of Genre objects, store and return the data
                    return Genre.#genres = Helpers.mapBy(cached.map(data => new Genre(data, Genre.#privateKey)));
                } catch (error) {
                    cached = null;
                }
            }
        }

        // Save the promise object in our to avoid duplicate requests
        Genre.#genres = new Promise((resolve, reject) => {
            // Request the data from the MovieDB API.
            fetch("/api/genre/movie/list" + Helpers.getRequestQuery({ language: Config.language }))
                //convert to JSON
                .then(response => response.json())
                //Convert to an array of Genre objects
                .then(data => data && data.genres && data.genres.map(genre => new Genre(genre, Genre.#privateKey)))
                // Store the data to the local storage
                .then(data => {
                    if (Config.useCache) {
                        localStorage.setItem('genres', JSON.stringify(data));
                        localStorage.setItem('genresExpiry', Date.now() + 86400000);
                    }
                    resolve(Helpers.mapBy(data));
                })
                // TODO: Handle the error 
                .catch(error => {
                    console.error(error);
                    reject(error);
                });
        });

        // Set the genres data as soon as the details request is completed and returns the data.
        return Genre.#genres = await Genre.#genres;
    }



    static async parse(data) {
        if (!data) {
            return null;
        }

        if (data instanceof Genre) {
            return data;
        }

        const map = await Genre.getGenreMap();

        if (Helpers.isInteger(data)) {
            return map.get(Number.parseInt(data));
        }

        if (Helpers.isInteger(data.id)) {
            return map.get(Number.parseInt(data.id));
        }
    }

    get id() { return this.#id; }

    get name() { return this.#name; }

    toJSON() {
        return {
            id: this.#id,
            name: this.#name,
        };
    }
}