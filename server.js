var http = require('http')
var fs = require('fs')
var path = require('path')

var mime = require('mime')
var csv = require("fast-csv")
var archiveLog = require('debug')('archive')
var staticLog = require('debug')('static')

var LRU = require('lru-cache')
var cache = new LRU({
	max: 1000,
})

var server = http.createServer(function (req, res) {
	var path = resolvePath(req.url)

	fs.stat(path, function (err, stat) {
		if (stat) {
			if (stat.isDirectory()) {
				res.writeHead(403, 'forbidden', {
					'Content-Type': 'text/plain',
					'Content-Length': 'forbidden'.length
				})
				return res.end('forbidden')
			}

			staticLog('static', path)
			fs.stat(path, function (err, stat) {
				if (stat) {
					var type = mime.lookup(path)
					res.setHeader('Content-Type', type)
					res.setHeader('Content-Length', stat.size)
					return fs.createReadStream(path).pipe(res)
				} else {
					return sendError('file does not exist' + path)
				}
			})
		} else {
			return serveArchiveRequest(req, res)
		}
	});
})

function serveArchiveRequest (req, res) {
	var url = req.url
	var archivePath = resolveArchivePath(url)

	archiveLog('archive', url)
	getSegmentInfo(req.url, function (err, segmentInfo) {
		if (err) {
			sendError(err, res)
		}

		if (!segmentInfo) {
			throw new Error('No segment' + url)
		} else {
			//console.log('got segment', segmentInfo)
		}
		sendSegment(req.url, segmentInfo, res)
	})
}

function sendSegment (url, segmentInfo, res) {
	var type = mime.lookup(url)
	res.writeHead(200, {
		'Content-Type': type,
		'Content-Length': segmentInfo[1]
	})

	var archivePath = resolveArchivePath(url)

	var segmentStream = fs.createReadStream(archivePath, {
		flags: 'r',
		start: segmentInfo[0],
		end: segmentInfo[0] + segmentInfo[1]
	})
	
	segmentStream.pipe(res)
}

function sendError (err, res) {
	var err = JSON.stringify(err)
	res.writeHead(500, {
		'Content-Type': 'text/plain',
		'Content-Length': Buffer.byteLength(err)
	})
	res.end(err)
}

function getSegmentInfo (url, cb) {
	var url = normalizeSegmentUrl(url)
	var cacheKey =  getCacheKey(url)
	var entry = cache.get(cacheKey)
	if (entry) {
		cb(null, entry)
	}

	loadIndex(url, function (err) {
		cb(err, cache.get(cacheKey))
	})
}

function normalizeSegmentUrl (url) {
	return url.substring(1, url.length)
}

function loadIndex (url, cb) {
	var indexPath = resolveIndexPath(url)

	fs.exists(indexPath, function (exists) {
		if (exists) {
			csv(indexPath)
				.on("data", function(data){
					var path = data[2]
					var offsetAndLength = data.slice(0, 2).map(function (n) {
						var n = parseInt(n)
						if (n !==n) {
							return cb(new Error('NaN length of offset for ' + path))
						}
						return n
					})
					cache.set(path, offsetAndLength)
				})
				.on("end", function(){
					cb(null)
				})
				.on("error", function (err) {
					cb(err)
				})
			.parse()
		} else {
			console.log('Index file does not exist')
		}
	})
}

function getCacheKey (url) {
	return url;
}

function resolvePath (url) {
	return path.resolve(path.join('./', url))
}

function resolveArchivePath (url) {
	return 'rec.tar';
	return path.resolve(path.join('./', url))
}

function resolveIndexPath (url) {
	return 'rec.idx';
	return path.resolve(path.join('./', url))
}

// function readIndex  (index) {
// 	var contents = yield readFile(index);

// }


server.listen(8484)
console.log('listening on 8484')