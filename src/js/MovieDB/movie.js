import Genre from './genre.js'
import Config from './ApiConfig.js'
import Helpers from '../helpers.js'

const movieBasicProperties = ["id", "title", "original_title", "genres", "overview", "runtime", "release_year", "poster_path", "backdrop_path", "vote_average", "vote_count"];
const movieExtendedProperties = ["videos", "reviews", "similar"];

/**
 * @class Movie. The class for the movie object
 *
 * @hideconstructor
 */
export default class Movie {
    static #privateKey = Symbol();

    // #The retrieved data for this movie (either the basic data or the extended ones).
    #data;

    // #The full url for the poster image.
    #poster_url;

    // #The full url for the backdrop image.
    #backdrop_url;

    // #The retrieved data for this movie.
    #extended = false;

    static #cachedMovies = new Map;

    constructor(data, privateKey) {
        if (privateKey !== Movie.#privateKey) {
            throw new Error('The constructor is private, please use the Movie.parse static function.');
        }

        this.#data = data;
    }

    static async parse(data) {
        if (!data) {
            return null;
        }

        if (data instanceof Movie) {
            return data;
        }

        let id = null;
        if (Helpers.isInteger(data)) {
            id = Number.parseInt(data);
        } else if (Helpers.isInteger(data.id)) {
            id = Number.parseInt(data.id);
        }

        if (id) {
            const movie = await Movie.fetchStoredMovieDetails(id);
            if (movie && movie.id) return movie;
        }

        try {
            const movie = await Movie.#transformData(data);
            if (movie && movie.id) return movie;
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured while transforming the movie data', error, data })
            return null;
        }

        try {
            return id ? (await Movie.fetchMovieDetails(id)) : null;
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured while fetching movie details', error, id });
        }
    }

    static async get(data) {
        return await Movie.parse(data);
    }

    static async #transformData(data) {
        if (!data) return null;

        const transform = async (key) => {
            switch (key) {
                case 'genres':
                    try {
                        return await Promise.all((data.genre_ids || data.genres || []).map(Genre.parse));
                    } catch (error) {
                        Config.debug && console.error({ desc: 'An error occured while transforming the genre data', error, data });
                        return [];
                    }
                case 'release_year':
                    const value = '' + (data.release_date || '');
                    const pos = value.indexOf('-');
                    return Helpers.parseInt(pos === -1 ? value : value.slice(0, pos));
                case 'id':
                case 'vote_count':
                    return Helpers.parseInt(data[key]);
                case 'vote_average':
                    return data[key] / 2.0;
                case 'similar':
                    const similar = data.similar || {};
                    similar.results = await Promise.all((similar.results || []).map(async data => await Movie.#transformData(data)));
                    return similar;
                default:
                    return data[key];
            }
        }

        let movieData = {};
        for (let arr = movieBasicProperties.concat(movieExtendedProperties), i = arr.length - 1; i >= 0; --i) {
            try {
                movieData[arr[i]] = await transform(arr[i]);
            } catch (error) {
                Config.debug && console.error({ desc: 'An error occured in the movie data transform function', error, i, arr, movieData })
                return null;
            }
        }

        const movie = new Movie(movieData, Movie.#privateKey);

        try {
            movie.#poster_url = movie.poster_path ? await Config.getPosterImageUrl(movie.poster_path) : null;
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured while calculating the poster url', error, movieData, movie: movie.toClassDebugView() })
        }


        try {
            movie.#backdrop_url = movie.backdrop_path ? await Config.getBackdropImageUrl(movie.backdrop_path) : null;
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured while calculating the backdrop url', error, movieData, movie: movie.toClassDebugView() })
        }

        return movie;
    }

    static async fetchStoredMovieDetails(movieId) {
        movieId = Helpers.parseInt(movieId);

        if (movieId <= 0) return console.error(`movieId was expected to be a positive integer. ${movieId} was given.`);

        // Check if the movie (or its promise) is cached in the class. 
        // If a request is already on the way await until it is resolved and return the data 
        // without requesting them again to avoid multiple requests for the same data.
        if (Movie.#cachedMovies.has(movieId)) {
            try {
                return await Movie.#cachedMovies.get(movieId);
            } catch (error) {
                Config.debug && console.error({ desc: 'An error occured while retrieving the movie from the cache', error, movieId, cachedMovies: Movie.#cachedMovies })
            }
        }
    }

    static async fetchMovieDetails(movieId) {
        movieId = Helpers.parseInt(movieId);

        const movie = await Movie.fetchStoredMovieDetails(movieId);

        if (movie) return movie;

        const moviePromise = new Promise((resolve, reject) => {
            const q = Helpers.getRequestQuery({
                language: Config.language,
                append_to_response: 'videos,similar,reviews'
            });

            // Request the data from the MovieDB API.
            fetch("/api/movie/" + movieId + q)
                // Convert to JSON
                .then(response => response.json())
                // Transform movie data as needed
                .then(async data => {
                    const movie = await Movie.#transformData(data);
                    movie.#extended = true;
                    resolve(movie);
                })
                // TODO: Handle the error 
                .catch(error => {
                    reject(error);
                });
        });

        // Save the promise object in our class movie storage until the details request is completed
        Movie.#cachedMovies.set(movieId, moviePromise);

        try {
            // Wait until the details request is completed
            const movie = await moviePromise;

            // Save the movie details in our class movie storage
            Movie.#cachedMovies.set(movieId, movie);

            return movie;
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured while fetching/saving the movie details', error, movieId, moviePromise, cachedMovies: Movie.#cachedMovies })
        }
    }

    async extendDetails() {
        // Check if the movie is already retrieved and is extended.
        if (this.#data && this.#extended) {
            return this;
        }

        try {
            const movie = await Movie.fetchMovieDetails(this.id);

            if (movie) {
                this.#data = movie.#data;
                this.#extended = true;
            }
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured while fetching the movie details in function extendDetails', error, id: this.id, class: this.toClassDebugView() })
        }

        return this;
    }

    get id() {
        return this.#data.id;
    }
    get data() {
        return this.#data || [];
    }
    get title() {
        return this.#data.title;
    }
    get original_title() {
        return this.#data.original_title;
    }
    get release_year() {
        return this.#data.release_year;
    }
    get genres() {
        return this.#data.genres || [];
    }
    get vote_average() {
        return this.#data.vote_average;
    }
    get vote_count() {
        return this.#data.vote_count;
    }
    get overview() {
        return this.#data.overview;
    }
    get poster_path() {
        return this.#data.poster_path;
    }
    get backdrop_path() {
        return this.#data.backdrop_path;
    }
    get poster_url() {
        return this.#poster_url;
    }
    get backdrop_url() {
        return this.#backdrop_url;
    }
    get videos() {
        return (this.#data.videos || {}).results || [];
    }
    get reviews() {
        return (this.#data.reviews || {}).results || [];
    }
    get similar() {
        return ((this.#data.similar || {}).results || []);
    }
    get runtime() {
        return Helpers.parseInt(this.#data.runtime);
    }
    get duration() {
        let remains = this.#data.runtime;

        if (!remains) {
            return null
        };

        const mins = remains % 60;
        const hours = (remains - mins) / 60;

        return ((hours > 0 ? `${hours}h ` : '') + (mins > 0 ? `${mins}m ` : '')).trim();
    }

    get trailer_url() {
        /** @type {Array} */
        const videos = this.videos;

        // Find the first video with type trailer that has a non empty key and is for youtube or vimeo
        const trailer = videos.find && videos.find(v => {
            return v && (v.type || '').toLowerCase() === 'trailer'
                && v.key && ['youtube', 'vimeo'].includes(String(v.site).toLowerCase());
        });

        // Form the video url
        const video = trailer ? (String(trailer.site).toLowerCase() === 'youtube'
            ? `https://www.youtube.com/embed/${trailer.key}?autoplay=1`
            : `https://player.vimeo.com/video/${trailer.key}?portrait=0`)
            : null;

        return video;
    }

    /**
     * This packages the movie data in a plain object for handlebars plugin
     */
    toJSON(similar_depth = 0) {
        const json = {
            ...this.#data,
            genres: (this.genres || []).map(x => x.toJSON()),
            trailer_url: this.trailer_url,
            poster_url: this.poster_url,
            backdrop_url: this.backdrop_url,
            reviews: (this.reviews || []).slice(0, 4),
            has_reviews: (this.reviews || []).length > 0,
            has_similar: (this.similar || []).length > 0,
            duration: this.duration
        };
        if (similar_depth > 0) {
            json.similar = this.similar.map(m => {
                return m.toJSON(--similar_depth);
            });
        }
        return json;
    }

    toClassDebugView() {
        return Config.debug ? {
            data: JSON.parse(JSON.stringify(this.#data)),
            poster_url: this.#poster_url,
            backdrop_url: this.#backdrop_url,
            extended: this.#extended,
            cachedMovies: Movie.#cachedMovies
        } : null;
    }
}