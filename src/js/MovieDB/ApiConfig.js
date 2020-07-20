import Genre from './genre.js'
const imageConfigProperties = ["base_url", "secure_base_url", "poster_sizes", "backdrop_sizes"];

export default class ApiConfig {
    static #imageConfig = null;
    static get debug() { return false };
    static #useCache;

    language = "en-US";
    region = null;

    constructor(lang = "en-US", region) {
        this.language = lang || "en-US";
        this.region = region || null;
    }

    static async #fetchImageConfig() {
        // Check if a request is already on the way to avoid multiple requests of the same data.
        if (ApiConfig.#imageConfig) {
            try {
                if (ApiConfig.#imageConfig = await ApiConfig.#imageConfig) {
                    return ApiConfig.#imageConfig;
                }
            } catch (error) {
                Config.debug && console.error({ desc: 'An error occured while fetching movie details', error, id, class: ApiConfig.toClassDebugView() })
            }
        };

        if (ApiConfig.#useCache) {
            // Get the image config from the locale storage
            const cached = JSON.parse(localStorage.getItem('imageConfig'));

            // Check if the saved data include all the properties we need
            if (cached && imageConfigProperties.every(prop => cached[prop])) {
                ApiConfig.#imageConfig = cached;

                const t = localStorage.getItem('imageConfigTimestamp');
                // If the data was locally stored and were updated within the last 24 hours return the stored data. 
                if (t && (Date.now() - t < 86400000)) {
                    return cached;
                }
            }
        }

        ApiConfig.#imageConfig = new Promise((resolve, reject) => {
            // Request the data from the MovieDB API.
            fetch("/api/configuration")
                //convert to JSON
                .then(response => response.json())
                //Filter only needed properties
                .then(data => imageConfigProperties.reduce((obj, key) => ({ ...obj, [key]: data.images[key] }), {}))
                // Store the data to the local storage
                .then(data => {
                    if (ApiConfig.useCache) {
                        localStorage.setItem('imageConfig', JSON.stringify(data));
                        localStorage.setItem('imageConfigTimestamp', Date.now());
                    }
                    resolve(data);
                })
                // TODO: Handle the error 
                .catch(error => {
                    console.error(error);
                    reject(error);
                });
        })

        try {
            ApiConfig.#imageConfig = await ApiConfig.#imageConfig;
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured while fetching API configuration', error, class: ApiConfig.toClassDebugView() })
        }

        return ApiConfig.#imageConfig;
    }

    static async init() {
        try {
            await Promise.all([
                ApiConfig.#fetchImageConfig(),
                Genre.getGenreMap()
            ]);
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured while initiating ApiConfig', error, class: ApiConfig.toClassDebugView() })
        }
    }

    static async getImageConfig() {
        return ApiConfig.#imageConfig ? ApiConfig.#imageConfig : await ApiConfig.#fetchImageConfig();
    }

    static async getImageBaseUrl() {
        const config = await ApiConfig.getImageConfig();
        return config && config.base_url;
    }

    static async #getImageUrl(size, path = '') {
        try {
            return (await ApiConfig.getImageBaseUrl()) + size + (path.startsWith('/') ? path : `/${path}`);
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured while getting image url from the config', error, class: ApiConfig.toClassDebugView() })
        }
    }

    static async getPosterImageUrl(path = '') {
        return await this.#getImageUrl(await ApiConfig.getImagePosterSize(), path);
    }

    static async getBackdropImageUrl(path = '') {
        return await this.#getImageUrl(await ApiConfig.getImageBackdropSize(), path);
    }

    static async getAvailableImagePosterSizes() {
        const config = await ApiConfig.getImageConfig();
        return config && config.poster_sizes;
    }

    static #selectImageSize(sizes, width = 300) {
        return sizes.find(w => w.replace(/\D/g, "") >= width) || sizes.pop();
    }

    static async setImagePosterSize(width = 300) {
        try {
            const sizes = await ApiConfig.getAvailableImagePosterSizes();
            const size = ApiConfig.#selectImageSize(sizes, width);
            ApiConfig.#imageConfig.posterSize = size;
            if (ApiConfig.useCache) localStorage.setItem('imageConfig', JSON.stringify(ApiConfig.#imageConfig));
            return size;
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured in setImagePosterSize function', error, class: ApiConfig.toClassDebugView() })
        }
    }

    static async getImagePosterSize() {
        const config = await ApiConfig.getImageConfig();

        return config && (config.posterSize ?? await ApiConfig.setImagePosterSize());
    }

    static async getAvailableImageBackdropSizes() {
        const config = await ApiConfig.getImageConfig();
        return config && config.backdrop_sizes;
    }

    static async setImageBackdropSize(width = 700) {
        try {
            const sizes = await ApiConfig.getAvailableImageBackdropSizes();
            const size = ApiConfig.#selectImageSize(sizes, width);
            ApiConfig.#imageConfig.backdropSize = size;
            if (ApiConfig.useCache) localStorage.setItem('imageConfig', JSON.stringify(ApiConfig.#imageConfig));
            return size;
        } catch (error) {
            Config.debug && console.error({ desc: 'An error occured in setImageBackdropSize function', error, class: ApiConfig.toClassDebugView() })
        }
    }

    static async getImageBackdropSize() {
        const config = await ApiConfig.getImageConfig();
        return config && (config.backdropSize || await ApiConfig.setImageBackdropSize());
    }

    static enableCache(enableCache = true) {
        if (!enableCache) return ApiConfig.disableCache();

        ApiConfig.#useCache = true;
    }

    static disableCache() {
        ApiConfig.#useCache = false;
        localStorage.clear();
    }

    static get useCache() { return ApiConfig.#useCache }

    toClassDebugView() {
        return {
            imageConfig: ApiConfig.#imageConfig,
            lang: this.language,
            region: this.region,
            useCache: ApiConfig.#useCache,
        }
    }

    static toClassDebugView() {
        return {
            imageConfig: ApiConfig.#imageConfig,
        }
    }
}