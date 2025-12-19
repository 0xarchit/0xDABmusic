export namespace services {
	
	export class AudioQuality {
	    maximumBitDepth: number;
	    maximumSamplingRate: number;
	    isHiRes: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AudioQuality(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.maximumBitDepth = source["maximumBitDepth"];
	        this.maximumSamplingRate = source["maximumSamplingRate"];
	        this.isHiRes = source["isHiRes"];
	    }
	}
	export class Config {
	    SPOTIFY_CLIENT_ID: string;
	    SPOTIFY_CLIENT_SECRET: string;
	    SPOTIFY_REDIRECT_URI: string;
	    DAB_API_BASE: string;
	    DAB_AUTH_TOKEN?: string;
	    DAB_EMAIL?: string;
	    DAB_PASSWORD?: string;
	    FUZZY_MATCH_SCALE: number;
	    MAX_CONCURRENCY: number;
	    SPOTIFY_ACCESS_TOKEN?: string;
	    SPOTIFY_REFRESH_TOKEN?: string;
	    SPOTIFY_TOKEN_EXPIRY?: string;
	    DOWNLOAD_PATH: string;
	    MAX_CACHE_SIZE: number;
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.SPOTIFY_CLIENT_ID = source["SPOTIFY_CLIENT_ID"];
	        this.SPOTIFY_CLIENT_SECRET = source["SPOTIFY_CLIENT_SECRET"];
	        this.SPOTIFY_REDIRECT_URI = source["SPOTIFY_REDIRECT_URI"];
	        this.DAB_API_BASE = source["DAB_API_BASE"];
	        this.DAB_AUTH_TOKEN = source["DAB_AUTH_TOKEN"];
	        this.DAB_EMAIL = source["DAB_EMAIL"];
	        this.DAB_PASSWORD = source["DAB_PASSWORD"];
	        this.FUZZY_MATCH_SCALE = source["FUZZY_MATCH_SCALE"];
	        this.MAX_CONCURRENCY = source["MAX_CONCURRENCY"];
	        this.SPOTIFY_ACCESS_TOKEN = source["SPOTIFY_ACCESS_TOKEN"];
	        this.SPOTIFY_REFRESH_TOKEN = source["SPOTIFY_REFRESH_TOKEN"];
	        this.SPOTIFY_TOKEN_EXPIRY = source["SPOTIFY_TOKEN_EXPIRY"];
	        this.DOWNLOAD_PATH = source["DOWNLOAD_PATH"];
	        this.MAX_CACHE_SIZE = source["MAX_CACHE_SIZE"];
	    }
	}
	export class DABTrack {
	    id: any;
	    title: string;
	    artist: string;
	    artistId: any;
	    albumTitle: string;
	    albumCover: string;
	    albumId: any;
	    releaseDate: string;
	    genre: string;
	    duration: any;
	    audioQuality: AudioQuality;
	
	    static createFrom(source: any = {}) {
	        return new DABTrack(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.artist = source["artist"];
	        this.artistId = source["artistId"];
	        this.albumTitle = source["albumTitle"];
	        this.albumCover = source["albumCover"];
	        this.albumId = source["albumId"];
	        this.releaseDate = source["releaseDate"];
	        this.genre = source["genre"];
	        this.duration = source["duration"];
	        this.audioQuality = this.convertValues(source["audioQuality"], AudioQuality);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DownloadItem {
	    id: string;
	    trackId: string;
	    title: string;
	    artist: string;
	    album: string;
	    coverArt: string;
	    status: string;
	    progress: number;
	    error: string;
	    filePath: string;
	    totalSize: number;
	    downloaded: number;
	
	    static createFrom(source: any = {}) {
	        return new DownloadItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.trackId = source["trackId"];
	        this.title = source["title"];
	        this.artist = source["artist"];
	        this.album = source["album"];
	        this.coverArt = source["coverArt"];
	        this.status = source["status"];
	        this.progress = source["progress"];
	        this.error = source["error"];
	        this.filePath = source["filePath"];
	        this.totalSize = source["totalSize"];
	        this.downloaded = source["downloaded"];
	    }
	}
	export class Library {
	    id: string;
	    name: string;
	    trackCount: number;
	
	    static createFrom(source: any = {}) {
	        return new Library(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.trackCount = source["trackCount"];
	    }
	}
	export class LibraryDetailsResponse {
	    id: string;
	    name: string;
	    description: string;
	    isPublic: boolean;
	    tracks: DABTrack[];
	
	    static createFrom(source: any = {}) {
	        return new LibraryDetailsResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.isPublic = source["isPublic"];
	        this.tracks = this.convertValues(source["tracks"], DABTrack);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TrackInfo {
	    title: string;
	    artist: string;
	    isrc: string;
	    duration_ms: number;
	    spotify_id: string;
	    source_id: string;
	    album_title: string;
	    album_cover: string;
	    release_date: string;
	    genre: string;
	
	    static createFrom(source: any = {}) {
	        return new TrackInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.artist = source["artist"];
	        this.isrc = source["isrc"];
	        this.duration_ms = source["duration_ms"];
	        this.spotify_id = source["spotify_id"];
	        this.source_id = source["source_id"];
	        this.album_title = source["album_title"];
	        this.album_cover = source["album_cover"];
	        this.release_date = source["release_date"];
	        this.genre = source["genre"];
	    }
	}
	export class PlaylistInfo {
	    name: string;
	    description: string;
	    tracks: TrackInfo[];
	
	    static createFrom(source: any = {}) {
	        return new PlaylistInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.tracks = this.convertValues(source["tracks"], TrackInfo);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class TransferRecord {
	    id: string;
	    playlistName: string;
	    sourceURL: string;
	    totalTracks: number;
	    matchedTracks: number;
	    addedTracks: number;
	    failedTracks: number;
	    status: string;
	    createdAt: string;
	    completedAt: string;
	    libraryID: string;
	    errorMessage?: string;
	    duration: number;
	    source: string;
	
	    static createFrom(source: any = {}) {
	        return new TransferRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.playlistName = source["playlistName"];
	        this.sourceURL = source["sourceURL"];
	        this.totalTracks = source["totalTracks"];
	        this.matchedTracks = source["matchedTracks"];
	        this.addedTracks = source["addedTracks"];
	        this.failedTracks = source["failedTracks"];
	        this.status = source["status"];
	        this.createdAt = source["createdAt"];
	        this.completedAt = source["completedAt"];
	        this.libraryID = source["libraryID"];
	        this.errorMessage = source["errorMessage"];
	        this.duration = source["duration"];
	        this.source = source["source"];
	    }
	}
	export class TransferStats {
	    total: number;
	    matched: number;
	    added: number;
	    failed: number;
	
	    static createFrom(source: any = {}) {
	        return new TransferStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total = source["total"];
	        this.matched = source["matched"];
	        this.added = source["added"];
	        this.failed = source["failed"];
	    }
	}

}

